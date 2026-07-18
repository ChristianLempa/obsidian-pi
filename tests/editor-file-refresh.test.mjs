import { describe, expect, it, vi } from "vitest";
import {
  getSuccessfulMarkdownMutationPath,
  refreshOpenMarkdownViews
} from "../src/ui/editor-file-refresh.mjs";

function leaf(path, content) {
  return {
    view: {
      file: { path },
      data: content,
      editor: { getValue: () => content },
      setViewData: vi.fn()
    }
  };
}

describe("agent file refresh", () => {
  it("recognizes only successful edit/write completion paths", () => {
    expect(
      getSuccessfulMarkdownMutationPath({
        type: "tool_end",
        toolName: "edit",
        toolArgs: { path: "./Note.md", edits: [{ oldText: "old", newText: "new" }] },
        isError: false
      })
    ).toBe("Note.md");
    expect(
      getSuccessfulMarkdownMutationPath({
        type: "tool_end",
        toolName: "write",
        toolArgs: { path: "Folder/New.md" }
      })
    ).toBe("Folder/New.md");
    expect(
      getSuccessfulMarkdownMutationPath(
        {
          type: "tool_end",
          toolName: "edit",
          toolArgs: { path: "/vault/Folder/Note.md" }
        },
        "/vault"
      )
    ).toBe("Folder/Note.md");
    expect(
      getSuccessfulMarkdownMutationPath(
        {
          type: "tool_end",
          toolName: "edit",
          toolArgs: { path: "/outside/Note.md" }
        },
        "/vault"
      )
    ).toBeUndefined();
    for (const event of [
      { type: "tool_start", toolName: "edit", toolArgs: { path: "Note.md" } },
      { type: "tool_end", toolName: "edit", toolArgs: { path: "Note.md" }, isError: true },
      { type: "tool_end", toolName: "read", toolArgs: { path: "Note.md" } },
      { type: "tool_end", toolName: "edit", toolArgs: { path: "data.json" } }
    ]) {
      expect(getSuccessfulMarkdownMutationPath(event)).toBeUndefined();
    }
  });

  it("reloads every stale open view of an externally changed Markdown file", async () => {
    const first = leaf("Note.md", "old");
    const second = leaf("Note.md", "old");
    const other = leaf("Other.md", "other");
    const app = {
      vault: { read: vi.fn().mockResolvedValue("new") },
      workspace: { getLeavesOfType: vi.fn(() => [first, second, other]) }
    };

    await expect(refreshOpenMarkdownViews(app, { path: "Note.md", extension: "md" })).resolves.toBe(
      2
    );
    expect(first.view.data).toBe("new");
    expect(second.view.data).toBe("new");
    expect(first.view.setViewData).toHaveBeenCalledWith("new", false);
    expect(second.view.setViewData).toHaveBeenCalledWith("new", false);
    expect(other.view.setViewData).not.toHaveBeenCalled();
  });

  it("restores each refreshed view's scroll once inside the targeted refresh", async () => {
    const current = leaf("Note.md", "old");
    current.view.editor.getScrollInfo = vi.fn(() => ({ left: 4, top: 120 }));
    current.view.editor.scrollTo = vi.fn();
    const app = {
      vault: { read: vi.fn().mockResolvedValue("new") },
      workspace: { getLeavesOfType: vi.fn(() => [current]) }
    };

    await refreshOpenMarkdownViews(app, { path: "Note.md", extension: "md" });

    expect(current.view.editor.scrollTo).toHaveBeenCalledOnce();
    expect(current.view.editor.scrollTo).toHaveBeenCalledWith(4, 120);
  });

  it("does not reset an editor that already reflects the vault contents", async () => {
    const current = leaf("Note.md", "same");
    const app = {
      vault: { read: vi.fn().mockResolvedValue("same") },
      workspace: { getLeavesOfType: vi.fn(() => [current]) }
    };

    await expect(refreshOpenMarkdownViews(app, { path: "Note.md", extension: "md" })).resolves.toBe(
      0
    );
    expect(current.view.setViewData).not.toHaveBeenCalled();
  });
});
