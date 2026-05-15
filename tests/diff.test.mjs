import { describe, expect, it } from "vitest";
import {
  diffLines,
  formatUnifiedDiff,
  splitLines,
  summarizeChangedFiles
} from "../src/changes/diff.mjs";

describe("diff helpers", () => {
  it("splits empty and non-empty text", () => {
    expect(splitLines("")).toEqual([]);
    expect(splitLines("a\nb")).toEqual(["a", "b"]);
  });

  it("creates line diffs and unified diff text", () => {
    const changes = diffLines(["a", "b"], ["a", "c"]);

    expect(changes).toEqual([
      { kind: "same", text: "a" },
      { kind: "delete", text: "b" },
      { kind: "add", text: "c" }
    ]);
    expect(formatUnifiedDiff("note.md", changes)).toBe(
      "--- a/note.md\n+++ b/note.md\n@@\n a\n-b\n+c"
    );
  });

  it("summarizes changed file stats", () => {
    expect(
      summarizeChangedFiles([
        { path: "a.md", additions: 2, deletions: 1 },
        { path: "b.md", additions: 3, deletions: 0 }
      ])
    ).toEqual({ filesChanged: 2, additions: 5, deletions: 1 });
  });
});
