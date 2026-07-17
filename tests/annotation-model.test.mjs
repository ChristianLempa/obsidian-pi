import { describe, expect, it } from "vitest";
import {
  ANNOTATION_LIMITS,
  normalizeAnnotationData,
  offsetToPosition,
  positionToOffset,
  rangeFromOffsets
} from "../src/annotations/annotation-model.mjs";

function rawAnnotation(overrides = {}) {
  return {
    id: "annotation-1",
    path: "Note.md",
    intent: "change",
    context: "Explain this",
    quote: "😀 target",
    prefix: "before ",
    suffix: " after",
    range: { from: 7, to: 16, start: { line: 0, ch: 7 }, end: { line: 0, ch: 16 } },
    targetKind: "selection",
    status: "attached",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("annotation model", () => {
  it("normalizes malformed persistence and enforces bounds", () => {
    const normalized = normalizeAnnotationData({
      schemaVersion: 99,
      annotations: {
        "Note.md": [
          rawAnnotation({ context: "x".repeat(ANNOTATION_LIMITS.context + 10) }),
          rawAnnotation(),
          { nope: true }
        ],
        "Empty.md": "not-an-array"
      }
    });

    expect(normalized.schemaVersion).toBe(1);
    expect(normalized.annotations["Note.md"]).toHaveLength(1);
    expect(normalized.annotations["Note.md"][0].context).toHaveLength(ANNOTATION_LIMITS.context);
    expect(normalized.annotations["Empty.md"]).toBeUndefined();
  });

  it("converts UTF-16 offsets and line/ch positions without counting code points", () => {
    const text = "a😀b\nsecond";
    expect(offsetToPosition(text, 3)).toEqual({ line: 0, ch: 3 });
    expect(offsetToPosition(text, 6)).toEqual({ line: 1, ch: 1 });
    expect(positionToOffset(text, { line: 0, ch: 3 })).toBe(3);
    expect(positionToOffset(text, { line: 1, ch: 2 })).toBe(7);
    expect(offsetToPosition("one\r\ntwo", 3)).toEqual({ line: 0, ch: 3 });
    expect(positionToOffset("one\r\ntwo", { line: 1, ch: 1 })).toBe(6);
    expect(rangeFromOffsets(text, 1, 4)).toEqual({
      from: 1,
      to: 4,
      start: { line: 0, ch: 1 },
      end: { line: 0, ch: 4 }
    });
  });
});
