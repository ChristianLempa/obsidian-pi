import { describe, expect, it } from "vitest";
import { parsePromptReferences } from "../src/context/prompt-references.mjs";

describe("prompt reference parsing", () => {
  it("parses note, folder, tag, skill, and command references", () => {
    const result = parsePromptReferences(`Use @[[Projects/Pi Agent]] @"Folder Name/" #pi/agent
/skill:review-patterns focus on UI
/search thread state`);

    expect(result.cleanPrompt).toContain("Projects/Pi Agent");
    expect(result.references).toEqual([
      { type: "note", value: "Projects/Pi Agent" },
      { type: "folder", value: "Folder Name" },
      { type: "tag", value: "#pi/agent" },
      { type: "skill", value: "review-patterns", argument: "focus on UI" },
      { type: "command", value: "search", argument: "thread state" }
    ]);
  });

  it("deduplicates repeated references", () => {
    expect(parsePromptReferences("@Note @Note #tag #tag").references).toEqual([
      { type: "note", value: "Note" },
      { type: "tag", value: "#tag" }
    ]);
  });
});
