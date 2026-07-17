import { describe, expect, it, vi } from "vitest";
import { refreshOpenMarkdownViews } from "../src/ui/editor-file-refresh.mjs";

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
