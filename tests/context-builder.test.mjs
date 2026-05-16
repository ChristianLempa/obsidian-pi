import { describe, expect, it } from "vitest";
import { ContextBuilder, truncateThreadHistoryContent } from "../src/context/context-builder.mjs";
import { DEFAULT_SETTINGS } from "../src/plugin/settings.mjs";

function createGraph() {
  const activeNote = {
    path: "Active.md",
    title: "Active",
    selection: "selected",
    backlinks: [{ path: "Back.md", count: 1 }],
    outgoingLinks: [{ path: "Out.md", count: 1 }],
    unresolvedLinks: [],
    tags: ["#pi"],
    headings: ["Heading"]
  };

  return {
    activeNote,
    getActiveNoteContext: async (selection) => ({ ...activeNote, selection }),
    getLinkedNeighborhood: async () => [{ path: "Linked.md" }],
    searchNotes: async (query) => [{ path: "Search.md", score: query.length }],
    resolveNoteFile: () => ({ path: "Attached.md" }),
    getNoteContext: async () => ({ path: "Attached.md", title: "Attached" }),
    readVaultFile: async () => "attached content",
    getFolderSummary: async (folder) => [{ path: `${folder}/Note.md` }],
    getNotesByTag: async (tag) => [{ path: "Tag.md", tags: [tag] }],
    getBacklinks: async () => [{ path: "Back.md", count: 1 }],
    getOutgoingLinks: () => [{ path: "Out.md", count: 1 }]
  };
}

describe("ContextBuilder", () => {
  it("builds pre-attached context from active notes, explicit attachments, commands, and inspection", async () => {
    const builder = new ContextBuilder(
      createGraph(),
      { ...DEFAULT_SETTINGS, includeDefaultSkills: false, customInstructions: "Custom" },
      "Bundled",
      ""
    );

    const context = await builder.build(
      "Use @Attached #tag\n/search topic\n/backlinks",
      "selection text"
    );

    expect(context.instructions).toBe("Bundled\n\nCustom");
    expect(context.activeNote.selection).toBe("selection text");
    expect(context.linkedNeighborhood).toEqual([{ path: "Linked.md" }]);
    expect(context.searchResults).toEqual([]);
    expect(context.attachments).toMatchObject([
      { type: "note", label: "Attached" },
      { type: "tag", label: "#tag" },
      { type: "command", label: "/search" },
      { type: "command", label: "/backlinks" }
    ]);
    expect(context.inspection).toMatchObject({
      activeNote: { path: "Active.md", hasSelection: true },
      attachments: { total: 4 },
      searchResults: { count: 0 },
      linkedNeighborhood: { count: 1 }
    });
  });

  it("formats prompts and truncates long history", async () => {
    const builder = new ContextBuilder(createGraph(), DEFAULT_SETTINGS, "Bundled", "");
    const context = await builder.build("Prompt", "");
    const formatted = builder.formatPrompt("Prompt", context, [
      { role: "user", content: "x".repeat(1300) }
    ]);

    expect(formatted).toContain("## User prompt\nPrompt");
    expect(formatted).toContain("[...truncated for context budget...]");
    expect(truncateThreadHistoryContent("short", 10)).toBe("short");
  });
});
