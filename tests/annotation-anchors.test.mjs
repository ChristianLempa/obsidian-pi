import { describe, expect, it } from "vitest";
import {
  captureAnchor,
  reanchorAnnotation,
  validateAnnotationAnchor
} from "../src/annotations/annotation-anchors.mjs";

function annotationFor(text, quote) {
  const from = text.indexOf(quote);
  return {
    id: "a1",
    path: "Note.md",
    intent: "question",
    context: "Why?",
    targetKind: "selection",
    status: "attached",
    ...captureAnchor(text, from, from + quote.length)
  };
}

describe("annotation anchors", () => {
  it("validates the exact quote and bounded surrounding context", () => {
    const text = "before target after";
    const annotation = annotationFor(text, "target");
    expect(validateAnnotationAnchor(annotation, text)).toBe(true);
    expect(validateAnnotationAnchor(annotation, "before changed after")).toBe(false);
  });

  it("re-anchors a unique context-qualified quote after offsets shift", () => {
    const original = "before target after";
    const annotation = annotationFor(original, "target");
    const shifted = `heading\n${original}`;
    const result = reanchorAnnotation(annotation, shifted);

    expect(result.status).toBe("attached");
    expect(result.range.from).toBe(15);
    expect(shifted.slice(result.range.from, result.range.to)).toBe("target");
    expect(result.range.start).toEqual({ line: 1, ch: 7 });
  });

  it("survives a nearby edit when the quote is unique and one context side still matches", () => {
    const original = "before target after";
    const annotation = annotationFor(original, "target");
    const changed = "before newly inserted target after";
    const result = reanchorAnnotation(annotation, changed);

    expect(result.status).toBe("attached");
    expect(changed.slice(result.range.from, result.range.to)).toBe("target");
  });

  it("detaches instead of guessing between duplicate context matches", () => {
    const text = "target";
    const annotation = annotationFor(text, "target");
    const result = reanchorAnnotation(annotation, "target and target");
    expect(result.status).toBe("detached");
    expect(result.range).toEqual(annotation.range);
  });

  it("detaches when quote context no longer agrees", () => {
    const annotation = annotationFor("before target after", "target");
    expect(reanchorAnnotation(annotation, "else target elsewhere").status).toBe("detached");
  });
});
