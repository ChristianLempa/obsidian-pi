import { describe, expect, it } from "vitest";
import { CHANGE_SNAPSHOT_FILE_LIMIT, ChangeTracker } from "../src/changes/change-tracker.mjs";

function createApp(files, contents) {
  const listeners = new Map();
  const vault = {
    getFiles: () => files,
    getMarkdownFiles: () => files.filter((file) => file.path.endsWith(".md")),
    getAbstractFileByPath: (filePath) => files.find((file) => file.path === filePath),
    cachedRead: async (file) => contents[file.path] ?? "",
    on: (name, callback) => {
      listeners.set(name, [...(listeners.get(name) ?? []), callback]);
      return { name, callback };
    },
    offref: (eventRef) => {
      listeners.set(
        eventRef.name,
        (listeners.get(eventRef.name) ?? []).filter((callback) => callback !== eventRef.callback)
      );
    },
    trigger: (name, ...args) => {
      for (const callback of listeners.get(name) ?? []) callback(...args);
    }
  };

  return { vault };
}

describe("ChangeTracker", () => {
  it("tracks allowed text files only", () => {
    const tracker = new ChangeTracker(
      createApp(
        [{ path: "a.md" }, { path: "node_modules/pkg/index.js" }, { path: "image.png" }],
        {}
      ),
      { ignoredFolders: ["node_modules"] }
    );

    expect(tracker.getTrackedFiles().map((file) => file.path)).toEqual(["a.md"]);
  });

  it("snapshots and diffs vault text files", async () => {
    const files = [{ path: "a.md" }];
    const contents = { "a.md": "before" };
    const app = createApp(files, contents);
    const tracker = new ChangeTracker(app, { ignoredFolders: [] });
    const before = await tracker.snapshot();

    contents["a.md"] = "after";

    expect(await tracker.diff(before)).toMatchObject({
      files: [{ path: "a.md", status: "modified", additions: 1, deletions: 1 }],
      stats: { filesChanged: 1, additions: 1, deletions: 1 },
      sourceEventType: "vault-snapshot"
    });
  });

  it("enforces the internal file snapshot safety limit", async () => {
    const files = Array.from({ length: CHANGE_SNAPSHOT_FILE_LIMIT + 1 }, (_, index) => ({
      path: `${index}.md`
    }));
    const tracker = new ChangeTracker(createApp(files, {}), { ignoredFolders: [] });

    await expect(tracker.snapshot()).rejects.toThrow(
      `exceeds the internal safety limit of ${CHANGE_SNAPSHOT_FILE_LIMIT}`
    );
  });

  it("tracks only files touched by Pi tool events during smart runs", async () => {
    const files = [{ path: "a.md" }, { path: "b.md" }];
    const contents = { "a.md": "before", "b.md": "unchanged" };
    const tracker = new ChangeTracker(createApp(files, contents), {
      ignoredFolders: [],
      maxChangeSnapshotFiles: 500
    });
    const run = await tracker.beginRun();

    run.handlePiEvent({ type: "tool_start", toolName: "edit", toolArgs: { path: "a.md" } });
    contents["a.md"] = "after";

    expect(await run.finish()).toMatchObject({
      files: [{ path: "a.md", status: "modified", additions: 1, deletions: 1 }],
      stats: { filesChanged: 1, additions: 1, deletions: 1 },
      sourceEventType: "touched-files"
    });
  });

  it("falls back to full snapshots when requested", async () => {
    const files = [{ path: "a.md" }, { path: "b.md" }];
    const contents = { "a.md": "before", "b.md": "before" };
    const tracker = new ChangeTracker(createApp(files, contents), {
      ignoredFolders: [],
      maxChangeSnapshotFiles: 500
    });
    const run = await tracker.beginRun({ useFullSnapshot: true });

    contents["b.md"] = "after";

    expect(await run.finish()).toMatchObject({
      files: [{ path: "b.md", status: "modified", additions: 1, deletions: 1 }],
      sourceEventType: "vault-snapshot"
    });
  });
});
