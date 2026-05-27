import { describe, expect, it } from "vitest";
import { ThreadStore } from "../src/threads/thread-store.mjs";

describe("ThreadStore", () => {
  it("creates a current thread from legacy messages", () => {
    const store = new ThreadStore(
      undefined,
      [{ role: "user", content: "# Hello thread", createdAt: 1 }],
      "session-1"
    );
    const current = store.getCurrentThread();

    expect(current.title).toBe("Hello thread");
    expect(current.piSessionId).toBe("session-1");
    expect(store.getCurrentMessages()).toEqual([
      { role: "user", content: "# Hello thread", createdAt: 1 }
    ]);
  });

  it("adds messages and renames new chats from the first user prompt", () => {
    const store = new ThreadStore();
    const threadId = store.getCurrentThread().id;

    store.addMessageToThread(threadId, { role: "user", content: "Build a plan", createdAt: 10 });

    expect(store.getCurrentThread()).toMatchObject({ id: threadId, title: "Build a plan" });
    expect(store.getCurrentMessages()).toEqual([
      { role: "user", content: "Build a plan", createdAt: 10 }
    ]);
  });

  it("forks, switches, archives, and deletes threads", () => {
    const store = new ThreadStore();
    const originalId = store.getCurrentThread().id;
    store.addMessage({ role: "user", content: "Original", createdAt: 1 });

    const fork = store.forkCurrentThread("fork-session");
    expect(fork).toMatchObject({ title: "Original (fork)", piSessionId: "fork-session" });
    expect(store.switchThread(originalId)).toBe(true);
    expect(store.archiveThread(originalId)).toBe(true);
    expect(store.listThreads().map((thread) => thread.id)).not.toContain(originalId);
    expect(store.deleteThread(originalId)).toBe(true);
  });

  it("drops legacy change metadata from messages", () => {
    const store = new ThreadStore(undefined, [
      {
        role: "assistant",
        content: "done",
        createdAt: 1,
        changedFiles: [{ path: "a.md", additions: 1, deletions: 0 }],
        changeStats: { filesChanged: 1, additions: 1, deletions: 0 },
        changeSummaries: [{ files: [{ path: "a.md" }], unifiedDiff: "diff" }]
      }
    ]);

    expect(store.getCurrentMessages()[0]).toEqual({
      role: "assistant",
      content: "done",
      createdAt: 1
    });
  });
});
