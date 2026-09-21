import { describe, expect, it, vi } from "vitest";
import { ComposerSuggestions } from "../src/ui/suggestions.mjs";
import { DEFAULT_SETTINGS } from "../src/plugin/settings.mjs";

function createInput(value, selectionStart = value.length) {
  return {
    value,
    selectionStart,
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
    focus() {},
    parentElement: undefined
  };
}

function createPlugin() {
  const files = [{ path: "Folder/Note.md" }, { path: "Other.md" }];
  return {
    settings: { ...DEFAULT_SETTINGS, includeDefaultSkills: false },
    getVaultBasePath: () => "",
    getPiCommands: () => [
      {
        command: "/skill:rpc-skill",
        label: "rpc-skill",
        detail: "Discovered by Pi",
        insertText: "/skill:rpc-skill ",
        source: "skill"
      }
    ],
    app: {
      vault: { getMarkdownFiles: () => files },
      metadataCache: {
        getFileCache: (file) =>
          file.path === "Folder/Note.md"
            ? { tags: [{ tag: "#inline" }], frontmatter: { tags: ["frontmatter"] } }
            : {}
      }
    }
  };
}

describe("ComposerSuggestions", () => {
  it("detects active suggestion triggers", () => {
    const suggestions = new ComposerSuggestions(createInput("Ask @Fol"), createPlugin(), () => {});

    expect(suggestions.getActiveSuggestMatch()).toEqual({
      trigger: "@",
      query: "fol",
      start: 4,
      end: 8
    });
  });

  it("formats quoted attachment inserts", () => {
    const suggestions = new ComposerSuggestions(createInput(""), createPlugin(), () => {});

    expect(suggestions.formatAttachmentInsert("Folder Name/Note")).toBe('@"Folder Name/Note" ');
    expect(suggestions.formatAttachmentInsert("Note")).toBe("@Note ");
  });

  it("returns note, folder, tag, and command suggestions", () => {
    const suggestions = new ComposerSuggestions(createInput(""), createPlugin(), () => {});

    expect(suggestions.getNoteAndFolderSuggestions("folder").map((item) => item.label)).toEqual([
      "Folder/",
      "Folder/Note"
    ]);
    expect(suggestions.getTagSuggestions("front")).toEqual([
      { label: "#frontmatter", detail: "Tag", insertText: "#frontmatter " }
    ]);
    expect(suggestions.getCommandSuggestions("search")).toContainEqual(
      expect.objectContaining({ label: "/search" })
    );
    expect(suggestions.getCommandSuggestions("rpc-skill")).toContainEqual(
      expect.objectContaining({ label: "/skill:rpc-skill", detail: "Skill — Discovered by Pi" })
    );
  });

  it("loads Pi commands when slash suggestions first open", async () => {
    const input = createInput("/");
    const plugin = createPlugin();
    let commands = [];
    let resolveRefresh;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    plugin.commandCatalogLoaded = false;
    plugin.getPiCommands = () => commands;
    plugin.refreshCommandCatalog = vi.fn(() => refreshPromise);
    const suggestions = new ComposerSuggestions(input, plugin, () => {});
    suggestions.render = vi.fn();

    suggestions.update();

    expect(suggestions.suggestions).toContainEqual(expect.objectContaining({ label: "/current" }));
    expect(plugin.refreshCommandCatalog).toHaveBeenCalledTimes(1);
    commands = [
      {
        command: "/skill:discovered",
        detail: "Discovered by Pi",
        insertText: "/skill:discovered "
      }
    ];
    plugin.commandCatalogLoaded = true;
    resolveRefresh();
    await refreshPromise;
    await Promise.resolve();

    expect(suggestions.suggestions).toContainEqual(
      expect.objectContaining({ label: "/skill:discovered" })
    );
    expect(suggestions.render).toHaveBeenCalledTimes(2);
  });

  it("does not reopen dismissed slash suggestions after discovery", async () => {
    const input = createInput("/");
    const plugin = createPlugin();
    let resolveRefresh;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    plugin.commandCatalogLoaded = false;
    plugin.refreshCommandCatalog = () => refreshPromise;
    const suggestions = new ComposerSuggestions(input, plugin, () => {});
    suggestions.render = vi.fn();

    suggestions.update();
    suggestions.close();
    plugin.commandCatalogLoaded = true;
    resolveRefresh();
    await refreshPromise;
    await Promise.resolve();

    expect(suggestions.render).toHaveBeenCalledTimes(1);
    expect(suggestions.suggestions).toEqual([]);
  });

  it("does not loop when slash command discovery fails", async () => {
    const plugin = createPlugin();
    plugin.commandCatalogLoaded = false;
    plugin.refreshCommandCatalog = vi.fn(() => Promise.reject(new Error("unavailable")));
    const suggestions = new ComposerSuggestions(createInput("/"), plugin, () => {});
    suggestions.render = vi.fn();

    suggestions.update();
    await Promise.resolve();
    await Promise.resolve();

    expect(plugin.refreshCommandCatalog).toHaveBeenCalledTimes(1);
    expect(suggestions.render).toHaveBeenCalledTimes(1);
  });

  it("applies the selected suggestion", () => {
    const input = createInput("Ask @Fol");
    let applied = false;
    const suggestions = new ComposerSuggestions(input, createPlugin(), () => {
      applied = true;
    });
    suggestions.activeSuggestRange = { start: 4, end: 8 };
    suggestions.suggestions = [{ label: "Folder/", detail: "Folder", insertText: "@Folder/ " }];

    suggestions.apply(0);

    expect(input.value).toBe("Ask @Folder/ ");
    expect(applied).toBe(true);
  });
});
