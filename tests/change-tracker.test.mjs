import { describe, expect, it } from "vitest";
import { CHANGE_SNAPSHOT_FILE_LIMIT, ChangeTracker } from "../src/changes/change-tracker.mjs";

function createApp(files, contents) {
  return {
    vault: {
      getFiles: () => files,
      getMarkdownFiles: () => files.filter((file) => file.path.endsWith(".md")),
      cachedRead: async (file) => contents[file.path] ?? ""
    }
  };
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
});
