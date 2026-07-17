import { describe, expect, it } from "vitest";
import { ContextBuilder } from "../src/context/context-builder.mjs";
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

    expect(builder.getSystemInstructions()).toBe("Bundled\n\nCustom");
    expect(context).not.toHaveProperty("instructions");
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

  it("formats only current-turn context and does not duplicate thread history", async () => {
    const builder = new ContextBuilder(createGraph(), DEFAULT_SETTINGS, "Bundled", "");
    const context = await builder.build("Second prompt", "current selection");
    const priorMessage = "prior-local-message-" + "x".repeat(12_000);
    const formatted = builder.formatPrompt("Second prompt", context, [
      { role: "user", content: priorMessage }
    ]);
    const withoutHistory = builder.formatPrompt("Second prompt", context);

    expect(formatted).toBe(withoutHistory);
    expect(formatted).toContain("## User prompt\nSecond prompt");
    expect(formatted).toContain('"selection": "current selection"');
    expect(formatted).not.toContain("Local chat thread history");
    expect(formatted).not.toContain("prior-local-message");
    expect(formatted).not.toContain("Bundled");
    expect(formatted.length).toBeLessThan(priorMessage.length);
  });
});
