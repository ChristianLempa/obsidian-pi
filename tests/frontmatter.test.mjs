import { describe, expect, it } from "vitest";
import { previewFrontmatterPatch, readFrontmatter } from "../src/shared/frontmatter.mjs";

describe("frontmatter helpers", () => {
  it("adds frontmatter when a note has none", () => {
    expect(previewFrontmatterPatch("# Note\n", { type: "note", tags: ["pi"] })).toBe(
      "---\ntype: note\ntags:\n  - pi\n---\n# Note\n"
    );
  });

  it("updates only requested fields and preserves unknown fields", () => {
    const markdown = "---\ntitle: Keep me\ntags:\n  - old\n---\nBody";

    expect(previewFrontmatterPatch(markdown, { tags: ["new"], updated: "2026-05-04" })).toBe(
      "---\ntitle: Keep me\ntags:\n  - new\nupdated: 2026-05-04\n---\nBody"
    );
  });

  it("detects CRLF frontmatter instead of adding a duplicate YAML block", () => {
    const markdown = "---\r\ntitle: Keep me\r\n---\r\nBody";

    expect(previewFrontmatterPatch(markdown, { updated: "2026-05-04" })).toBe(
      "---\ntitle: Keep me\nupdated: 2026-05-04\n---\nBody"
    );
  });

  it("parses simple scalar and list values", () => {
    expect(
      readFrontmatter("---\ndraft: true\ncount: 2\ntags: [a, b]\n---\nBody").frontmatter
    ).toEqual({
      draft: true,
      count: 2,
      tags: ["a", "b"]
    });
  });
});
