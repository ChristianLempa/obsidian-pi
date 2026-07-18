import { describe, expect, it } from "vitest";
import {
  mapRenderedChunkCandidatesToSource,
  mapRenderedChunksToSource,
  rangesOverlap,
  renderedPointToSourceOffset,
  resolveReadingModeCapture,
  resolveSectionRange
} from "../src/annotations/reading-mode-capture.mjs";

const source = "Heading\n\nA **unique** value.\n\nrepeated repeated.";

function section(text, lineStart, lineEnd = lineStart) {
  return { text, lineStart, lineEnd };
}

describe("reading mode annotation capture", () => {
  it("maps a unique rendered selection inside its exact source section", () => {
    expect(
      resolveReadingModeCapture(source, section("A **unique** value.", 2), "unique")
    ).toMatchObject({
      range: { from: 13, to: 19 },
      targetKind: "selection"
    });
  });

  it("preserves an ambiguous rendered selection while anchoring its source block", () => {
    const result = resolveReadingModeCapture(source, section("repeated repeated.", 4), "repeated");
    expect(result).toMatchObject({
      range: { from: 30, to: 48 },
      targetKind: "block",
      renderedText: "repeated",
      anchorLabel: "Rendered selection (anchored to containing source block)"
    });
  });

  it("rejects stale section information instead of guessing", () => {
    expect(resolveReadingModeCapture(source, section("changed", 2), "unique").error).toMatch(
      /no longer tied/
    );
    expect(resolveSectionRange(source, { lineStart: 99, lineEnd: 99, text: "" })).toBeUndefined();
  });

  it("maps exact rendered character points through inline Markdown and across sections", () => {
    const first = mapRenderedChunksToSource(
      "First **word** here.\n\nSecond paragraph.",
      section("First **word** here.", 0),
      [
        { key: "before", text: "First " },
        { key: "word", text: "word" },
        { key: "after", text: " here." }
      ]
    );
    const second = mapRenderedChunksToSource(
      "First **word** here.\n\nSecond paragraph.",
      section("Second paragraph.", 2),
      [{ key: "second", text: "Second paragraph." }]
    );

    expect(renderedPointToSourceOffset(first, "word", 0)).toBe(8);
    expect(renderedPointToSourceOffset(first, "word", 4)).toBe(12);
    expect(renderedPointToSourceOffset(second, "second", 6)).toBe(28);
  });

  it("keeps all exact candidates when several rendered blocks share one broad source section", () => {
    const broadSource = "Repeated alpha.\n\nRepeated beta.";
    const candidates = mapRenderedChunkCandidatesToSource(broadSource, section(broadSource, 0, 2), [
      { key: "word", text: "Repeated" }
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate[0].from)).toEqual([0, 17]);
  });

  it("recognizes only genuine range overlap", () => {
    expect(rangesOverlap({ from: 2, to: 5 }, { from: 4, to: 7 })).toBe(true);
    expect(rangesOverlap({ from: 2, to: 5 }, { from: 5, to: 7 })).toBe(false);
  });
});
