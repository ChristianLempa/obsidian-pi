import { describe, expect, it, vi } from "vitest";
import { captureAnchor } from "../src/annotations/annotation-anchors.mjs";
import { ANNOTATION_LIMITS } from "../src/annotations/annotation-model.mjs";
import { AnnotationStore } from "../src/annotations/annotation-store.mjs";

function input(path = "Note.md", id = "a1") {
  const text = "before target after";
  return {
    id,
    path,
    intent: "change",
    context: "Rewrite this",
    targetKind: "selection",
    ...captureAnchor(text, 7, 13)
  };
}

describe("AnnotationStore", () => {
  it("supports CRUD and emits persistence changes", () => {
    const onChange = vi.fn();
    const store = new AnnotationStore(undefined, onChange);
    const created = store.create(input());
    expect(store.get("Note.md", created.id)?.context).toBe("Rewrite this");

    store.update("Note.md", created.id, { intent: "question", context: "Why?" });
    expect(store.list("Note.md")[0]).toMatchObject({ intent: "question", context: "Why?" });
    expect(store.delete("Note.md", created.id)).toBe(true);
    expect(store.list("Note.md")).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("moves records on rename, merges safely, and removes deleted-note records", () => {
    const store = new AnnotationStore({
      schemaVersion: 1,
      annotations: {
        "Old.md": [input("Old.md", "old")],
        "New.md": [input("New.md", "existing")]
      }
    });

    expect(store.renamePath("Old.md", "New.md")).toBe(true);
    expect(store.list("Old.md")).toEqual([]);
    expect(store.list("New.md").map((item) => item.id)).toEqual(["existing", "old"]);
    expect(store.list("New.md")[1].path).toBe("New.md");
    expect(store.deletePath("New.md")).toBe(true);
    expect(store.toJSON().annotations).toEqual({});
  });

  it("leaves both paths intact when a rename would collide instead of dropping records", () => {
    const store = new AnnotationStore({
      annotations: {
        "Old.md": [input("Old.md", "same")],
        "New.md": [input("New.md", "same")]
      }
    });

    expect(store.renamePath("Old.md", "New.md")).toBe(false);
    expect(store.list("Old.md")).toHaveLength(1);
    expect(store.list("New.md")).toHaveLength(1);
  });

  it("reconciles persisted anchors and saves only when their attachment changes", () => {
    const onChange = vi.fn();
    const store = new AnnotationStore(undefined, onChange);
    store.create(input());
    onChange.mockClear();

    const shifted = store.reanchorPath("Note.md", "heading\nbefore target after");
    expect(shifted[0]).toMatchObject({ status: "attached", range: { from: 15, to: 21 } });
    expect(onChange).toHaveBeenCalledTimes(1);
    store.reanchorPath("Note.md", "heading\nbefore target after");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.reanchorPath("Note.md", "target elsewhere")[0].status).toBe("detached");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("bounds normalized total records and serialized storage", () => {
    const annotations = {};
    for (let pathIndex = 0; pathIndex < 30; pathIndex += 1) {
      const path = `Note-${pathIndex}.md`;
      annotations[path] = Array.from({ length: 100 }, (_, itemIndex) => ({
        ...input(path, `${pathIndex}-${itemIndex}`),
        context: "x".repeat(4_000),
        quote: "q".repeat(8_000)
      }));
    }
    const store = new AnnotationStore({ annotations });
    const data = store.toJSON();
    const count = Object.values(data.annotations).reduce((sum, items) => sum + items.length, 0);

    expect(count).toBeLessThanOrEqual(ANNOTATION_LIMITS.total);
    expect(new globalThis.TextEncoder().encode(JSON.stringify(data)).length).toBeLessThanOrEqual(
      ANNOTATION_LIMITS.storageBytes
    );
  });

  it("returns copies rather than exposing persisted state", () => {
    const store = new AnnotationStore();
    store.create(input());
    const listed = store.list("Note.md");
    listed[0].context = "mutated";
    expect(store.list("Note.md")[0].context).toBe("Rewrite this");
  });
});
