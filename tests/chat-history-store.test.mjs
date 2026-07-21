import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ChatHistoryFileStore,
  hasLegacyChatHistory,
  normalizeChatHistoryFolder
} from "../src/threads/chat-history-store.mjs";

const tempDirectories = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("chat history file store", () => {
  it("persists more than 40 chats as separate versioned JSON files", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    const history = createHistory(41, "thread-1");

    await store.saveHistory(history);
    const loaded = await store.loadHistory();
    const chatFiles = fs.readdirSync(path.join(vault, "pi_sessions", "chats"));

    expect(chatFiles).toHaveLength(41);
    expect(loaded.threads).toHaveLength(41);
    expect(loaded.currentThreadId).toBe("thread-1");
    expect(
      JSON.parse(fs.readFileSync(path.join(vault, "pi_sessions", "index.json"), "utf8"))
    ).toMatchObject({ schemaVersion: 1, currentThreadId: "thread-1" });
  });

  it("rebuilds current history from chat files when the index is missing", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    await store.saveHistory(createHistory(2, "thread-1"));
    fs.rmSync(path.join(vault, "pi_sessions", "index.json"));

    const reloadedStore = new ChatHistoryFileStore(vault);
    const loaded = await reloadedStore.loadHistory();

    expect(loaded.threads).toHaveLength(2);
    expect(loaded.currentThreadId).toBe("thread-2");
    expect(reloadedStore.lastLoadHadValidIndex).toBe(false);
  });

  it("keeps malformed files for recovery while loading valid chats", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    await store.saveHistory(createHistory(1));
    const malformedPath = path.join(vault, "pi_sessions", "chats", "damaged.json");
    fs.writeFileSync(malformedPath, "{not json", "utf8");

    const loaded = await store.loadHistory();
    await store.saveHistory(loaded);

    expect(loaded.threads).toHaveLength(1);
    expect(store.warnings[0]).toContain("damaged.json");
    expect(fs.existsSync(malformedPath)).toBe(true);
  });

  it("creates and verifies a reusable legacy migration backup", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault, "custom/history");
    const history = createHistory(3, "thread-2");

    await store.migrateLegacyHistory(history);
    const backupPath = store.getMigrationBackupPath();
    const firstBackup = fs.readFileSync(backupPath, "utf8");
    await store.migrateLegacyHistory(history);

    expect(JSON.parse(firstBackup).chatHistory.threads).toHaveLength(3);
    expect(fs.readFileSync(backupPath, "utf8")).toBe(firstBackup);
  });

  it("removes deleted managed chats without touching unknown recovery files", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    const history = createHistory(2);
    await store.saveHistory(history);
    const unknownPath = path.join(vault, "pi_sessions", "chats", "manual.json");
    fs.writeFileSync(unknownPath, "{}\n", "utf8");

    await store.saveHistory({ currentThreadId: "thread-2", threads: [history.threads[1]] });

    expect((await store.loadHistory()).threads).toHaveLength(1);
    expect(fs.existsSync(unknownPath)).toBe(true);
  });

  it("accepts only safe vault-relative folders and detects meaningful legacy history", () => {
    expect(normalizeChatHistoryFolder(" chats\\pi ")).toBe("chats/pi");
    expect(() => normalizeChatHistoryFolder("../outside")).toThrow("vault-relative");
    expect(() => normalizeChatHistoryFolder("/absolute")).toThrow("vault-relative");
    expect(hasLegacyChatHistory({ threads: [{ title: "New chat", messages: [] }] })).toBe(false);
    expect(
      hasLegacyChatHistory({
        threads: [{ title: "Saved", messages: [{ role: "user", content: "Hi" }] }]
      })
    ).toBe(true);
  });
});

function createVault() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pi-agent-history-"));
  tempDirectories.push(directory);
  return directory;
}

function createHistory(count, currentThreadId = `thread-${count}`) {
  return {
    currentThreadId,
    threads: Array.from({ length: count }, (_, index) => ({
      id: `thread-${index + 1}`,
      title: `Chat ${index + 1}`,
      messages: [
        { role: "user", content: `Prompt ${index + 1}`, createdAt: index * 2 + 1 },
        { role: "assistant", content: `Answer ${index + 1}`, createdAt: index * 2 + 2 }
      ],
      createdAt: index + 1,
      updatedAt: index + 1,
      archived: false,
      favorite: false,
      piSessionId: `session-${index + 1}.jsonl`
    }))
  };
}
