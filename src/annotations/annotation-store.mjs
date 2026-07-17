import { reanchorAnnotation } from "./annotation-anchors.mjs";
import {
  ANNOTATION_LIMITS,
  annotationDataBytes,
  createAnnotation,
  normalizeAnnotation,
  normalizeAnnotationData
} from "./annotation-model.mjs";

export class AnnotationStore {
  constructor(rawData, onChange = () => {}) {
    this.data = normalizeAnnotationData(rawData);
    this.onChange = onChange;
  }

  toJSON() {
    return structuredCloneSafe(this.data);
  }

  list(path) {
    return structuredCloneSafe(this.data.annotations[String(path ?? "")] ?? []);
  }

  get(path, id) {
    return this.list(path).find((annotation) => annotation.id === id);
  }

  create(input) {
    const annotation = createAnnotation(input);
    if (!annotation) throw new Error("Invalid annotation.");
    const current = this.data.annotations[annotation.path] ?? [];
    if (current.length >= ANNOTATION_LIMITS.perPath)
      throw new Error(`A note can have at most ${ANNOTATION_LIMITS.perPath} annotations.`);
    if (
      !this.data.annotations[annotation.path] &&
      Object.keys(this.data.annotations).length >= ANNOTATION_LIMITS.paths
    )
      throw new Error(`Annotations can cover at most ${ANNOTATION_LIMITS.paths} notes.`);
    if (this.count() >= ANNOTATION_LIMITS.total)
      throw new Error(`At most ${ANNOTATION_LIMITS.total} annotations can be stored.`);
    if (current.some((item) => item.id === annotation.id))
      throw new Error("Annotation ID already exists.");

    this.assertStorageBudget({
      ...this.data.annotations,
      [annotation.path]: [...current, annotation]
    });
    this.data.annotations[annotation.path] = [...current, annotation];
    this.changed();
    return structuredCloneSafe(annotation);
  }

  update(path, id, patch) {
    const items = this.data.annotations[String(path ?? "")];
    const index = items?.findIndex((annotation) => annotation.id === id) ?? -1;
    if (index < 0) return undefined;
    const existing = items[index];
    const updated = normalizeAnnotation(
      {
        ...existing,
        ...patch,
        id: existing.id,
        path: existing.path,
        range: patch?.range ?? existing.range,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      },
      existing.path
    );
    if (!updated) throw new Error("Invalid annotation update.");
    const updatedItems = items.map((item, itemIndex) => (itemIndex === index ? updated : item));
    this.assertStorageBudget({ ...this.data.annotations, [existing.path]: updatedItems });
    items[index] = updated;
    this.changed();
    return structuredCloneSafe(updated);
  }

  delete(path, id) {
    const key = String(path ?? "");
    const items = this.data.annotations[key];
    if (!items) return false;
    const remaining = items.filter((annotation) => annotation.id !== id);
    if (remaining.length === items.length) return false;
    if (remaining.length > 0) this.data.annotations[key] = remaining;
    else delete this.data.annotations[key];
    this.changed();
    return true;
  }

  renamePath(oldPath, newPath) {
    const oldKey = String(oldPath ?? "");
    const newKey = String(newPath ?? "");
    const moving = this.data.annotations[oldKey];
    if (!moving || !newKey || oldKey === newKey) return false;
    const existing = this.data.annotations[newKey] ?? [];
    const ids = new Set(existing.map((annotation) => annotation.id));
    if (
      existing.length + moving.length > ANNOTATION_LIMITS.perPath ||
      moving.some((annotation) => ids.has(annotation.id))
    )
      return false;

    const moved = [...existing, ...moving.map((annotation) => ({ ...annotation, path: newKey }))];
    const next = { ...this.data.annotations, [newKey]: moved };
    delete next[oldKey];
    try {
      this.assertStorageBudget(next);
    } catch {
      return false;
    }
    this.data.annotations = next;
    this.changed();
    return true;
  }

  deletePath(path) {
    const key = String(path ?? "");
    if (!this.data.annotations[key]) return false;
    delete this.data.annotations[key];
    this.changed();
    return true;
  }

  reanchorPath(path, text) {
    const key = String(path ?? "");
    const items = this.data.annotations[key];
    if (!items) return [];

    let didChange = false;
    const now = new Date().toISOString();
    const reconciled = items.map((annotation) => {
      const result = reanchorAnnotation(annotation, text);
      const anchorChanged =
        result.status !== annotation.status ||
        result.range.from !== annotation.range.from ||
        result.range.to !== annotation.range.to ||
        result.range.start.line !== annotation.range.start.line ||
        result.range.start.ch !== annotation.range.start.ch ||
        result.range.end.line !== annotation.range.end.line ||
        result.range.end.ch !== annotation.range.end.ch;
      if (!anchorChanged) return annotation;
      didChange = true;
      return { ...result, updatedAt: now };
    });
    if (didChange) {
      this.data.annotations[key] = reconciled;
      this.changed();
    }
    return this.list(key);
  }

  replacePath(path, annotations) {
    const key = String(path ?? "");
    const normalized =
      normalizeAnnotationData({ annotations: { [key]: annotations } }).annotations[key] ?? [];
    const next = { ...this.data.annotations };
    if (normalized.length > 0) next[key] = normalized;
    else delete next[key];
    const total = Object.values(next).reduce((sum, items) => sum + items.length, 0);
    if (total > ANNOTATION_LIMITS.total)
      throw new Error(`At most ${ANNOTATION_LIMITS.total} annotations can be stored.`);
    this.assertStorageBudget(next);
    this.data.annotations = next;
    this.changed();
    return this.list(key);
  }

  count() {
    return Object.values(this.data.annotations).reduce((total, items) => total + items.length, 0);
  }

  assertStorageBudget(annotations) {
    if (
      annotationDataBytes({ schemaVersion: this.data.schemaVersion, annotations }) >
      ANNOTATION_LIMITS.storageBytes
    )
      throw new Error("Annotation storage limit reached.");
  }

  changed() {
    this.onChange(this.toJSON());
  }
}

function structuredCloneSafe(value) {
  return typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}
