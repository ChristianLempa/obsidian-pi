import { describe, expect, it } from "vitest";
import { resolveMarkdownBlockRange } from "../src/annotations/markdown-block-range.mjs";

describe("resolveMarkdownBlockRange", () => {
  it("captures a contiguous prose paragraph", () => {
    const text = "First line\nsecond line\n\nNext";
    expect(resolveMarkdownBlockRange(text, text.indexOf("second"))).toMatchObject({
      from: 0,
      to: 22
    });
  });

  it("keeps structural Markdown targets to one physical line", () => {
    const text = "- first\n- second\nplain";
    const from = text.indexOf("- second");
    expect(resolveMarkdownBlockRange(text, from)).toMatchObject({
      from,
      to: from + "- second".length
    });
  });

  it("does not cross a heading when expanding prose", () => {
    const text = "# Heading\nparagraph one\nparagraph two";
    expect(resolveMarkdownBlockRange(text, text.indexOf("paragraph one"))).toMatchObject({
      from: text.indexOf("paragraph one"),
      to: text.length
    });
  });

  it("does not move an end-of-document cursor off an empty trailing line", () => {
    expect(resolveMarkdownBlockRange("paragraph\n", 10)).toMatchObject({ from: 10, to: 10 });
  });

  it("returns an empty range for an empty document", () => {
    expect(resolveMarkdownBlockRange("", 0)).toMatchObject({ from: 0, to: 0 });
  });
});
