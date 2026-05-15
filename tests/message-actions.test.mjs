import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  Menu: class {},
  Modal: class {},
  Notice: class {},
  Setting: class {},
  TFile: class {}
}));

let MessageActions;
let getDiffStats;

beforeAll(async () => {
  ({ MessageActions, getDiffStats } = await import("../src/ui/message-actions.mjs"));
});

describe("message actions helpers", () => {
  it("extracts diff stats from fenced diffs", () => {
    expect(getDiffStats("```diff\n--- a.md\n+++ a.md\n-old\n+new\n```")).toEqual({
      additions: 1,
      deletions: 1
    });
  });

  it("detects message change metadata", () => {
    const actions = new MessageActions({}, {});

    expect(actions.messageHasChanges({ changedFiles: [{ path: "a.md" }] })).toBe(true);
    expect(actions.messageHasChanges({ content: "done" })).toBe(false);
    expect(actions.getMessageChangeStats({ content: "```diff\n+a\n-b\n```" })).toEqual({
      filesChanged: 0,
      additions: 1,
      deletions: 1
    });
  });
});
