import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readChatHistoryBackup,
  writeChatHistoryBackup
} from "../src/threads/chat-history-backup.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

describe("chat history backups", () => {
  it("writes checksummed current and previous snapshots", async () => {
    const pluginDirectory = createDirectory();
    const first = createHistory(2);
    const second = createHistory(3);

    await writeChatHistoryBackup(pluginDirectory, first);
    await writeChatHistoryBackup(pluginDirectory, second);

    expect(await readChatHistoryBackup(pluginDirectory)).toEqual(second);
    const previous = JSON.parse(
      fs.readFileSync(path.join(pluginDirectory, "chat-history.backup.previous.json"), "utf8")
    );
    expect(previous.chatHistory).toEqual(first);
    expect(previous.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("falls back to the previous snapshot when the current backup is damaged", async () => {
    const pluginDirectory = createDirectory();
    const first = createHistory(2);
    await writeChatHistoryBackup(pluginDirectory, first);
    await writeChatHistoryBackup(pluginDirectory, createHistory(3));
    fs.writeFileSync(path.join(pluginDirectory, "chat-history.backup.json"), "{damaged", "utf8");

    expect(await readChatHistoryBackup(pluginDirectory)).toEqual(first);
  });
});

function createDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pi-agent-backup-"));
  temporaryDirectories.push(directory);
  return directory;
}

function createHistory(count) {
  return {
    currentThreadId: `thread-${count}`,
    threads: Array.from({ length: count }, (_, index) => ({
      id: `thread-${index + 1}`,
      title: `Chat ${index + 1}`,
      messages: [],
      createdAt: index + 1,
      updatedAt: index + 1,
      archived: false,
      favorite: false
    }))
  };
}
