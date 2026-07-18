import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const notices = [];
vi.mock("obsidian", () => ({
  Notice: class {
    constructor(message) {
      notices.push(message);
    }
  }
}));

let classifyVaultLinkTarget;
let createView;

beforeAll(async () => {
  const methods = await import("../src/ui/vault-link-actions.mjs");
  ({ classifyVaultLinkTarget } = methods);
  createView = (workspace, contextPath = "Projects/Current Note.md") => ({
    activeWindow: globalThis,
    plugin: {
      app: { workspace },
      getCurrentContextFile: () => (contextPath ? { path: contextPath } : undefined)
    },
    ...methods
  });
});

beforeEach(() => notices.splice(0));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("vault link classification", () => {
  it("preserves native Obsidian link text", () => {
    for (const linkText of [
      "../Relative Note",
      "Folder/Note With Spaces",
      " Note With Significant Edges ",
      "case-Sensitive Name",
      "Note#Exact Heading",
      "Note#^block-id",
      "Note|Display alias"
    ]) {
      expect(classifyVaultLinkTarget(linkText)).toEqual({ kind: "internal", linkText });
    }
  });

  it("separates only the explicit legacy line suffix", () => {
    expect(classifyVaultLinkTarget("Folder/Note.md:42")).toEqual({
      kind: "internal",
      linkText: "Folder/Note.md",
      line: 42
    });
    expect(classifyVaultLinkTarget("Folder/Note:topic")).toEqual({
      kind: "internal",
      linkText: "Folder/Note:topic"
    });
  });

  it("classifies external and invalid targets without treating them as vault notes", () => {
    expect(classifyVaultLinkTarget("https://example.com:443/page").kind).toBe("external");
    expect(classifyVaultLinkTarget("mailto:person@example.com").kind).toBe("external");
    expect(classifyVaultLinkTarget("  ").kind).toBe("invalid");
  });
});

describe("native vault link opening", () => {
  it.each([
    "../Relative Note",
    "Folder/Note With Spaces",
    "case-Sensitive Name",
    "Note#Exact Heading",
    "Note#^block-id",
    "Note|Display alias"
  ])("delegates %s unchanged to Obsidian", async (linkText) => {
    const workspace = { openLinkText: vi.fn().mockResolvedValue(undefined) };
    const view = createView(workspace);

    await expect(view.openVaultLink(linkText, true)).resolves.toBe(true);

    expect(workspace.openLinkText).toHaveBeenCalledOnce();
    expect(workspace.openLinkText).toHaveBeenCalledWith(linkText, "Projects/Current Note.md", true);
  });

  it("falls back to the active file as the native source path", async () => {
    const workspace = {
      getActiveFile: () => ({ path: "Fallback/Active Note.md" }),
      openLinkText: vi.fn().mockResolvedValue(undefined)
    };
    const view = createView(workspace, "");

    await view.openVaultLink("../Sibling", false);

    expect(workspace.openLinkText).toHaveBeenCalledWith(
      "../Sibling",
      "Fallback/Active Note.md",
      false
    );
  });

  it("supports the explicit legacy :line suffix after native opening", async () => {
    vi.useFakeTimers();
    const editor = {
      setCursor: vi.fn(),
      scrollIntoView: vi.fn(),
      focus: vi.fn()
    };
    const workspace = {
      activeLeaf: { view: { editor } },
      openLinkText: vi.fn().mockResolvedValue(undefined)
    };
    const view = createView(workspace);

    await view.openVaultLink("Folder/Note.md:42");
    await vi.runAllTimersAsync();

    expect(workspace.openLinkText).toHaveBeenCalledWith(
      "Folder/Note.md",
      "Projects/Current Note.md",
      false
    );
    expect(editor.setCursor).toHaveBeenCalledWith({ line: 41, ch: 0 });
  });

  it("does not send external links to the native vault API", async () => {
    const workspace = { openLinkText: vi.fn() };
    const view = createView(workspace);

    await expect(view.openVaultLink("https://example.com/note")).resolves.toBe(false);

    expect(workspace.openLinkText).not.toHaveBeenCalled();
    expect(notices).toEqual([]);
  });

  it("reports native missing-target failures without attempting custom resolution", async () => {
    const workspace = { openLinkText: vi.fn().mockRejectedValue(new Error("missing")) };
    const view = createView(workspace);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(view.openVaultLink("Missing Note#Heading")).resolves.toBe(false);

    expect(notices).toEqual(["Note not found: Missing Note#Heading"]);
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it("gives invalid targets a useful notice without calling Obsidian", async () => {
    const workspace = { openLinkText: vi.fn() };
    const view = createView(workspace);

    await expect(view.openVaultLink("  ")).resolves.toBe(false);

    expect(workspace.openLinkText).not.toHaveBeenCalled();
    expect(notices).toEqual(["Note not found:   "]);
  });
});
