import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ChatHistoryFileStore,
  hasLegacyChatHistory,
  loadLegacyIndexedHistory,
  loadLegacyJsonHistory,
  normalizeChatHistoryFolder,
  removeLegacyIndexedHistory,
  removeLegacyJsonHistory
} from "../src/threads/chat-history-store.mjs";

const tempDirectories = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("chat history file store", () => {
  it("persists more than 40 chats as directly discoverable Markdown files", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    const history = createHistory(41, "thread-1");

    await store.saveHistory(history);
    const loaded = await store.loadHistory("thread-1");
    const chatFiles = fs.readdirSync(path.join(vault, "chats"));
    const firstChat = fs.readFileSync(path.join(vault, "chats", "thread-1.md"), "utf8");

    expect(chatFiles).toHaveLength(41);
    expect(chatFiles).toContain("thread-1.md");
    expect(loaded.threads).toHaveLength(41);
    expect(loaded.currentThreadId).toBe("thread-1");
    expect(firstChat).toContain("pi_agent_chat: true");
    expect(firstChat).toContain('id: "thread-1"');
    expect(firstChat).toContain("<!-- pi-agent-message:start");
    expect(firstChat).toContain("Prompt 1");
    expect(fs.existsSync(path.join(vault, "chats", "index.json"))).toBe(false);
  });

  it("creates visible Markdown through the Obsidian vault API", async () => {
    const vaultPath = createVault();
    const vault = new FakeVault(vaultPath);
    const store = new ChatHistoryFileStore(vaultPath, "chats", vault);

    await store.saveHistory(createHistory(2));
    const loaded = await store.loadHistory("thread-1");

    expect(vault.createdPaths).toEqual(
      expect.arrayContaining(["chats/thread-1.md", "chats/thread-2.md"])
    );
    expect(vault.getMarkdownFiles().filter((file) => file.path.startsWith("chats/"))).toHaveLength(
      2
    );
    expect(loaded.threads).toHaveLength(2);
  });

  it("round-trips edited Markdown bodies with arbitrary headings and code fences", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    await store.saveHistory(createHistory(1));
    const chatPath = path.join(vault, "chats", "thread-1.md");
    let markdown = fs.readFileSync(chatPath, "utf8");
    markdown = markdown.replace(
      "Answer 1",
      ["Edited answer", "", "## A heading inside the response", "", "```js", "x();", "```"].join(
        "\n"
      )
    );
    fs.writeFileSync(chatPath, markdown, "utf8");

    const reloaded = await new ChatHistoryFileStore(vault).loadHistory("thread-1");

    expect(reloaded.threads[0].messages[1].content).toContain("## A heading inside the response");
    expect(reloaded.threads[0].messages[1].content).toContain("```js\nx();\n```");
  });

  it("selects the most recently updated chat when the saved current ID is missing", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    await store.saveHistory(createHistory(2, "thread-1"));

    const loaded = await new ChatHistoryFileStore(vault).loadHistory("missing");

    expect(loaded.threads).toHaveLength(2);
    expect(loaded.currentThreadId).toBe("thread-2");
  });

  it("keeps malformed managed Markdown and unrelated notes for recovery", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    await store.saveHistory(createHistory(1));
    const malformedPath = path.join(vault, "chats", "damaged.md");
    const unrelatedPath = path.join(vault, "chats", "notes.md");
    fs.writeFileSync(
      malformedPath,
      "---\npi_agent_chat: true\npi_agent_schema: 1\n---\nBroken chat\n",
      "utf8"
    );
    fs.writeFileSync(unrelatedPath, "# Ordinary note\n", "utf8");

    const loaded = await store.loadHistory();
    await store.saveHistory(loaded);

    expect(loaded.threads).toHaveLength(1);
    expect(store.warnings[0]).toContain("damaged.md");
    expect(fs.existsSync(malformedPath)).toBe(true);
    expect(fs.existsSync(unrelatedPath)).toBe(true);
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

  it("removes deleted managed chats without touching unrelated Markdown files", async () => {
    const vault = createVault();
    const store = new ChatHistoryFileStore(vault);
    const history = createHistory(2);
    await store.saveHistory(history);
    const unrelatedPath = path.join(vault, "chats", "manual.md");
    fs.writeFileSync(unrelatedPath, "# Keep me\n", "utf8");

    await store.saveHistory({ currentThreadId: "thread-2", threads: [history.threads[1]] });

    expect((await store.loadHistory()).threads).toHaveLength(1);
    expect(fs.existsSync(path.join(vault, "chats", "thread-1.md"))).toBe(false);
    expect(fs.existsSync(unrelatedPath)).toBe(true);
  });

  it("imports and cleans the direct JSON development layout", async () => {
    const vault = createVault();
    const history = createHistory(2, "thread-1");
    const root = path.join(vault, "chats");
    writeLegacyJsonThreads(root, history);

    const loaded = await loadLegacyJsonHistory(vault, "chats", "thread-1");
    await removeLegacyJsonHistory(vault);

    expect(loaded).toMatchObject({ currentThreadId: "thread-1" });
    expect(loaded.threads).toHaveLength(2);
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("imports and cleans the short-lived indexed development layout", async () => {
    const vault = createVault();
    const oldRoot = path.join(vault, "pi_sessions");
    const oldChats = path.join(oldRoot, "chats");
    const history = createHistory(2, "thread-1");
    writeLegacyJsonThreads(oldChats, history);
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

class FakeVault {
  constructor(root) {
    this.root = root;
    this.createdPaths = [];
  }

  getMarkdownFiles() {
    return listFiles(this.root)
      .filter((filePath) => filePath.endsWith(".md"))
      .map((filePath) => this.toFile(path.relative(this.root, filePath)));
  }

  getAbstractFileByPath(vaultPath) {
    const absolutePath = path.join(this.root, vaultPath);
    if (!fs.existsSync(absolutePath)) return null;
    return fs.statSync(absolutePath).isDirectory() ? { path: vaultPath } : this.toFile(vaultPath);
  }

  async createFolder(vaultPath) {
    fs.mkdirSync(path.join(this.root, vaultPath));
  }

  async create(vaultPath, content) {
    fs.writeFileSync(path.join(this.root, vaultPath), content, "utf8");
    this.createdPaths.push(vaultPath);
    return this.toFile(vaultPath);
  }

  async read(file) {
    return fs.readFileSync(path.join(this.root, file.path), "utf8");
  }

  async modify(file, content) {
    fs.writeFileSync(path.join(this.root, file.path), content, "utf8");
  }

  async delete(file) {
    fs.rmSync(path.join(this.root, file.path));
  }

  toFile(vaultPath) {
    return {
      path: vaultPath.replaceAll(path.sep, "/"),
      name: path.basename(vaultPath),
      extension: path.extname(vaultPath).slice(1)
    };
  }
}

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function writeLegacyJsonThreads(folder, history) {
  fs.mkdirSync(folder, { recursive: true });
  for (const thread of history.threads) {
    fs.writeFileSync(
      path.join(folder, `${thread.id}.json`),
      `${JSON.stringify({ schemaVersion: 1, thread }, null, 2)}\n`
    );
  }
}

function createHistory(count, currentThreadId = `thread-${count}`) {
  return {
    currentThreadId,
    threads: Array.from({ length: count }, (_, index) => ({
      id: `thread-${index + 1}`,
      title: `Chat ${index + 1}`,
      messages: [
        { role: "user", content: `Prompt ${index + 1}`, createdAt: index * 2 + 1 },
        {
          role: "assistant",
          content: `Answer ${index + 1}`,
          createdAt: index * 2 + 2,
          thinking: `Thinking ${index + 1}`,
          toolErrors: index === 0 ? ["Example error"] : undefined
        }
      ],
      createdAt: index + 1,
      updatedAt: index + 1,
      archived: false,
      favorite: false,
      piSessionId: `session-${index + 1}.jsonl`
    }))
  };
}
