import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  importVaultChatHistory,
  removeImportedVaultChatHistory
} from "../src/threads/chat-history-import.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

describe("vault chat history import", () => {
  it("imports Markdown messages including thinking and removes only managed files", async () => {
    const vault = createVault();
    const chats = path.join(vault, "chats");
    fs.mkdirSync(chats);
    fs.writeFileSync(path.join(chats, "thread-1.md"), markdownThread(), "utf8");
    fs.writeFileSync(path.join(chats, ".pi-agent-migration-backup-v3.json"), "{}\n", "utf8");
    fs.writeFileSync(path.join(chats, "keep.md"), "# Personal note\n", "utf8");

    const imported = await importVaultChatHistory(vault, {
      chatHistoryStorageVersion: 3,
      chatHistoryFolder: "chats",
      currentChatId: "thread-1"
    });

    expect(imported.history.threads).toHaveLength(1);
    expect(imported.history.threads[0].messages[1]).toMatchObject({
      role: "assistant",
      content: "Answer\n\n## Nested heading",
      thinking: "Preserved reasoning"
    });

    await removeImportedVaultChatHistory(vault, imported.managedFiles);
    expect(fs.existsSync(path.join(chats, "thread-1.md"))).toBe(false);
    expect(fs.existsSync(path.join(chats, ".pi-agent-migration-backup-v3.json"))).toBe(false);
    expect(fs.existsSync(path.join(chats, "keep.md"))).toBe(true);
  });

  it("imports direct and indexed JSON layouts without removing malformed files", async () => {
    const vault = createVault();
    const direct = path.join(vault, "chats");
    const indexed = path.join(vault, "pi_sessions", "chats");
    fs.mkdirSync(direct);
    fs.mkdirSync(indexed, { recursive: true });
    fs.writeFileSync(
      path.join(direct, "thread-1.json"),
      JSON.stringify({ schemaVersion: 1, thread: createThread("thread-1", 1) })
    );
    fs.writeFileSync(path.join(direct, "damaged.json"), "{damaged", "utf8");
    fs.writeFileSync(
      path.join(indexed, "thread-2.json"),
      JSON.stringify({ schemaVersion: 1, thread: createThread("thread-2", 2) })
    );

    const imported = await importVaultChatHistory(vault, { chatHistoryStorageVersion: 2 });
    expect(imported.history.threads.map((thread) => thread.id).sort()).toEqual([
      "thread-1",
      "thread-2"
    ]);
    expect(imported.warnings).toHaveLength(1);

    await removeImportedVaultChatHistory(vault, imported.managedFiles);
    expect(fs.existsSync(path.join(direct, "damaged.json"))).toBe(true);
  });
});

function markdownThread() {
  const user = encodeMetadata({ role: "user", createdAt: 1 });
  const assistant = encodeMetadata({
    role: "assistant",
    createdAt: 2,
    thinking: "Preserved reasoning"
  });
  return `---
pi_agent_chat: true
pi_agent_schema: 1
id: "thread-1"
title: "Markdown chat"
created: "2025-01-01T00:00:00.000Z"
updated: "2025-01-01T00:01:00.000Z"
archived: false
favorite: true
pi_session: "session.jsonl"
---

# Markdown chat

## You

<!-- pi-agent-message:start message-user ${user} -->
Prompt
<!-- pi-agent-message:end message-user -->

## Agent

<!-- pi-agent-message:start message-agent ${assistant} -->
Answer

## Nested heading
<!-- pi-agent-message:end message-agent -->
`;
}

function encodeMetadata(metadata) {
  return Buffer.from(JSON.stringify(metadata), "utf8").toString("base64url");
}

function createThread(id, updatedAt) {
  return {
    id,
    title: id,
    messages: [{ role: "user", content: "Prompt", createdAt: updatedAt }],
    createdAt: updatedAt,
    updatedAt,
    archived: false,
    favorite: false
  };
}

function createVault() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pi-agent-import-"));
  temporaryDirectories.push(directory);
  return directory;
}
