import { describe, expect, it } from "vitest";
import {
  rangesOverlap,
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

  it("recognizes only genuine range overlap", () => {
    expect(rangesOverlap({ from: 2, to: 5 }, { from: 4, to: 7 })).toBe(true);
    expect(rangesOverlap({ from: 2, to: 5 }, { from: 5, to: 7 })).toBe(false);
  });
});
