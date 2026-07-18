export const ANNOTATION_SCHEMA_VERSION = 1;
export const ANNOTATION_LIMITS = Object.freeze({
  paths: 500,
  perPath: 100,
  total: 2_000,
  storageBytes: 2_000_000,
  promptRecords: 50,
  promptRecordCharacters: 6_000,
  promptCharacters: 40_000,
  id: 128,
  path: 1024,
  context: 4_000,
  quote: 8_000,
  prefix: 256,
  suffix: 256,
  renderedText: 8_000,
  anchorLabel: 160
});

const INTENTS = new Set(["change", "question"]);
const TARGET_KINDS = new Set(["selection", "block"]);
const STATUSES = new Set(["attached", "detached"]);

export function normalizeAnnotationData(raw) {
  const source = isRecord(raw?.annotations) ? raw.annotations : {};
  const annotations = {};
  let total = 0;
  let storageBytes = utf8Bytes(
    JSON.stringify({ schemaVersion: ANNOTATION_SCHEMA_VERSION, annotations: {} })
  );

  for (const [rawPath, rawItems] of Object.entries(source).slice(0, ANNOTATION_LIMITS.paths)) {
    const path = boundedString(rawPath, ANNOTATION_LIMITS.path).trim();
    if (!path || !Array.isArray(rawItems)) continue;

    const items = [];
    const ids = new Set();
    const pathBytes = utf8Bytes(JSON.stringify(path)) + 4;
    for (const rawItem of rawItems) {
      const item = normalizeAnnotation(rawItem, path);
      if (!item || ids.has(item.id)) continue;
      const itemBytes = utf8Bytes(JSON.stringify(item));
      if (
        total >= ANNOTATION_LIMITS.total ||
        storageBytes + itemBytes + (items.length === 0 ? pathBytes : 1) >
          ANNOTATION_LIMITS.storageBytes
      )
        break;
      ids.add(item.id);
      items.push(item);
      total += 1;
      storageBytes += itemBytes + (items.length === 1 ? pathBytes : 1);
      if (items.length >= ANNOTATION_LIMITS.perPath) break;
    }
    if (items.length > 0) annotations[path] = items;
  }

  return { schemaVersion: ANNOTATION_SCHEMA_VERSION, annotations };
}

export function normalizeAnnotation(raw, pathOverride) {
  if (!isRecord(raw)) return undefined;
  const path = boundedString(pathOverride ?? raw.path, ANNOTATION_LIMITS.path).trim();
  const id = boundedString(raw.id, ANNOTATION_LIMITS.id).trim();
  const quote = boundedString(raw.quote, ANNOTATION_LIMITS.quote);
  if (!path || !id || !quote) return undefined;

  const from = nonNegativeInteger(raw.range?.from);
  const to = nonNegativeInteger(raw.range?.to);
  if (from === undefined || to === undefined || to < from) return undefined;

  const createdAt = normalizeTimestamp(raw.createdAt);
  const updatedAt = normalizeTimestamp(raw.updatedAt, createdAt);
  return {
    id,
    path,
    intent: INTENTS.has(raw.intent) ? raw.intent : "question",
    context: boundedString(raw.context, ANNOTATION_LIMITS.context),
    quote,
    prefix: boundedString(raw.prefix, ANNOTATION_LIMITS.prefix),
    suffix: boundedString(raw.suffix, ANNOTATION_LIMITS.suffix),
    renderedText: boundedString(raw.renderedText, ANNOTATION_LIMITS.renderedText),
    anchorLabel: boundedString(raw.anchorLabel, ANNOTATION_LIMITS.anchorLabel),
    range: {
      from,
      to,
      start: normalizePosition(raw.range?.start),
      end: normalizePosition(raw.range?.end)
    },
    targetKind: TARGET_KINDS.has(raw.targetKind) ? raw.targetKind : "selection",
    status:
      STATUSES.has(raw.status) && (raw.status === "detached" || to - from === quote.length)
        ? raw.status
        : "detached",
    createdAt,
    updatedAt
  };
}

export function createAnnotation(input, now = new Date().toISOString(), id = createId()) {
  return normalizeAnnotation({
    ...input,
    id: input?.id ?? id,
    createdAt: input?.createdAt ?? now,
    updatedAt: input?.updatedAt ?? now,
    status: input?.status ?? "attached"
  });
}

export function offsetToPosition(text, offset) {
  const source = String(text ?? "");
  const target = Math.min(source.length, Math.max(0, Math.trunc(Number(offset) || 0)));
  let line = 0;
  let lineStart = 0;
  for (let index = 0; index < target; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      lineStart = index + 1;
    }
  }
  const nextNewline = source.indexOf("\n", lineStart);
  const physicalLineEnd = nextNewline < 0 ? source.length : nextNewline;
  const lineEnd =
    physicalLineEnd > lineStart && source[physicalLineEnd - 1] === "\r"
      ? physicalLineEnd - 1
      : physicalLineEnd;
  return { line, ch: Math.min(target, lineEnd) - lineStart };
}

export function positionToOffset(text, position) {
  const source = String(text ?? "");
  const targetLine = nonNegativeInteger(position?.line) ?? 0;
  const targetCh = nonNegativeInteger(position?.ch) ?? 0;
  let line = 0;
  let lineStart = 0;
  while (line < targetLine) {
    const newline = source.indexOf("\n", lineStart);
    if (newline < 0) return source.length;
    line += 1;
    lineStart = newline + 1;
  }
  const newline = source.indexOf("\n", lineStart);
  const physicalLineEnd = newline < 0 ? source.length : newline;
  const lineEnd =
    physicalLineEnd > lineStart && source[physicalLineEnd - 1] === "\r"
      ? physicalLineEnd - 1
      : physicalLineEnd;
  return Math.min(lineEnd, lineStart + targetCh);
}

export function rangeFromOffsets(text, from, to) {
  const source = String(text ?? "");
  const normalizedFrom = Number.isFinite(from) ? Math.trunc(from) : 0;
  const normalizedTo = Number.isFinite(to) ? Math.trunc(to) : normalizedFrom;
  const safeFrom = Math.min(source.length, Math.max(0, normalizedFrom));
  const safeTo = Math.min(source.length, Math.max(safeFrom, normalizedTo));
  return {
    from: safeFrom,
    to: safeTo,
    start: offsetToPosition(source, safeFrom),
    end: offsetToPosition(source, safeTo)
  };
}

function normalizePosition(raw) {
  return {
    line: nonNegativeInteger(raw?.line) ?? 0,
    ch: nonNegativeInteger(raw?.ch) ?? 0
  };
}

function boundedString(value, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function normalizeTimestamp(value, fallback = new Date(0).toISOString()) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return fallback;
  return new Date(value).toISOString();
}

function createId() {
  const activeWindow = typeof window === "undefined" ? undefined : (window.activeWindow ?? window);
  return (
    activeWindow?.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function annotationDataBytes(data) {
  return utf8Bytes(JSON.stringify(data));
}

function utf8Bytes(value) {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
