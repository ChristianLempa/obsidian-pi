import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  Notice: class {},
  normalizePath: (value) => value
}));

let NoteActions;
let normalizeArchiveFolder;

beforeAll(async () => {
  ({ NoteActions, normalizeArchiveFolder } = await import("../src/ui/note-actions.mjs"));
});

function createActions() {
  return new NoteActions(
    {
      messages: [{ role: "user", content: "Previous", createdAt: 1 }],
      app: { vault: {}, workspace: {} }
    },
    {
      parseVaultLinkTarget: (target) => ({
        path: target.replace(/:\d+$/, ""),
        line: target.match(/:(\d+)$/)?.[1]
      }),
      formatVaultLinkTarget: (target) =>
        target.line ? `${target.path}:${target.line}` : target.path,
      openVaultLink: async () => {}
    }
  );
}

describe("NoteActions", () => {
  it("normalizes archive folders", () => {
    expect(normalizeArchiveFolder("//Pi\\Chats/")).toBe("Pi/Chats");
  });

  it("extracts vault links from responses", () => {
    const actions = createActions();

    expect(
      actions.extractVaultLinks("See [[Note]], [Doc](Folder/Doc.md). Path: Folder/File.md:12")
    ).toEqual(["Note", "Folder/Doc.md", "Folder/File.md:12"]);
  });

  it("formats response titles and previous prompts", () => {
    const actions = createActions();

    expect(actions.getResponseTitle("# Hello: World?\nBody")).toBe("Hello World");
    expect(actions.getPreviousUserPrompt(1)).toBe("Previous");
  });
});
