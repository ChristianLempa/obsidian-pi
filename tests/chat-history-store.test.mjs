import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ChatHistoryFileStore,
  hasLegacyChatHistory,
  loadLegacyIndexedHistory,
  normalizeChatHistoryFolder,
  removeLegacyIndexedHistory
} from "../src/threads/chat-history-store.mjs";

const tempDirectories = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("chat history file store", () => {
  it("persists more than 40 chats as directly discoverable JSON files", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    const history = createHistory(41, "thread-1");

    await store.saveHistory(history);
    const loaded = await store.loadHistory("thread-1");
    const chatFiles = fs.readdirSync(path.join(vault, "chats"));

    expect(chatFiles).toHaveLength(41);
    expect(chatFiles).toContain("thread-1.json");
    expect(loaded.threads).toHaveLength(41);
    expect(loaded.currentThreadId).toBe("thread-1");
    expect(fs.existsSync(path.join(vault, "chats", "index.json"))).toBe(false);
  });

  it("selects the most recently updated chat when the saved current ID is missing", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    await store.saveHistory(createHistory(2, "thread-1"));

    const reloadedStore = new ChatHistoryFileStore(vault);
    const loaded = await reloadedStore.loadHistory("missing");

    expect(loaded.threads).toHaveLength(2);
    expect(loaded.currentThreadId).toBe("thread-2");
  });

  it("keeps malformed files for recovery while loading valid chats", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    await store.saveHistory(createHistory(1));
    const malformedPath = path.join(vault, "chats", "damaged.json");
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
    expect(fs.readdirSync(path.join(vault, "custom", "history"))).toHaveLength(4);
  });

  it("removes deleted managed chats without touching unknown recovery files", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    const history = createHistory(2);
    await store.saveHistory(history);
    const unknownPath = path.join(vault, "chats", "manual.json");
    fs.writeFileSync(unknownPath, "{}\n", "utf8");

    await store.saveHistory({ currentThreadId: "thread-2", threads: [history.threads[1]] });

    expect((await store.loadHistory()).threads).toHaveLength(1);
    expect(fs.existsSync(unknownPath)).toBe(true);
  });

  it("imports and cleans the short-lived indexed development layout", async () => {
    const vault = createVault();
    const oldRoot = path.join(vault, "pi_sessions");
    const oldChats = path.join(oldRoot, "chats");
    fs.mkdirSync(oldChats, { recursive: true });
    const history = createHistory(2, "thread-1");
    for (const thread of history.threads) {
      fs.writeFileSync(
        path.join(oldChats, `old-${thread.id}.json`),
        `${JSON.stringify({ schemaVersion: 1, thread }, null, 2)}\n`
      );
    }
    fs.writeFileSync(
      path.join(oldRoot, "index.json"),
      JSON.stringify({ schemaVersion: 1, currentThreadId: "thread-1", threads: [] })
    );

    const loaded = await loadLegacyIndexedHistory(vault);
    await removeLegacyIndexedHistory(vault);

    expect(loaded).toMatchObject({ currentThreadId: "thread-1" });
    expect(loaded.threads).toHaveLength(2);
    expect(fs.existsSync(oldRoot)).toBe(false);
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
