import { describe, expect, it } from "vitest";
import {
  createExcerpt,
  escapeRegExp,
  rankSearchResults,
  scoreSearchResult,
  tokenizeQuery
} from "../src/shared/text.mjs";

describe("text search helpers", () => {
  it("tokenizes useful query terms", () => {
    expect(tokenizeQuery("A Pi agent note")).toEqual(["pi", "agent", "note"]);
  });

  it("scores path, title, and content matches", () => {
    expect(scoreSearchResult("Projects/Pi Agent.md", "Pi Pi tools", ["pi", "tools"])).toBe(19);
  });

  it("creates excerpts around the first match", () => {
    const excerpt = createExcerpt(`${"x".repeat(80)} needle ${"y".repeat(80)}`, ["needle"], 30);

    expect(excerpt).toContain("needle");
    expect(excerpt.startsWith("...")).toBe(true);
    expect(excerpt.endsWith("...")).toBe(true);
  });

  it("ranks positive results", () => {
    expect(
      rankSearchResults(
        [
          { path: "b.md", score: 1 },
          { path: "a.md", score: 5 },
          { path: "c.md", score: 0 }
        ],
        2
      ).map((result) => result.path)
    ).toEqual(["a.md", "b.md"]);
  });

  it("escapes regular expression syntax", () => {
    expect(new RegExp(escapeRegExp("a+b")).test("a+b")).toBe(true);
  });
});
