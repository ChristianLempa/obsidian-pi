import { describe, expect, it } from "vitest";
import { formatContextShowResponse, isContextShowPrompt } from "../src/context/context-show.mjs";

describe("context show command", () => {
  it("matches slash and bare context show prompts", () => {
    expect(isContextShowPrompt("context show")).toBe(true);
    expect(isContextShowPrompt("/context show")).toBe(true);
    expect(isContextShowPrompt("context")).toBe(false);
    expect(isContextShowPrompt("/context hide")).toBe(false);
  });

  it("formats the context inspection as a readable response", () => {
    expect(formatContextShowResponse({ activeNote: { path: "Note.md" } })).toBe(
      'Current Obsidian context:\n\n```json\n{\n  "activeNote": {\n    "path": "Note.md"\n  }\n}\n```'
    );
  });
});
