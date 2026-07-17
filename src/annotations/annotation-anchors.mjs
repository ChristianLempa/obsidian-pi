import { ANNOTATION_LIMITS, rangeFromOffsets } from "./annotation-model.mjs";

export function captureAnchor(text, from, to) {
  const source = String(text ?? "");
  const requestedRange = rangeFromOffsets(source, from, to);
  const range = rangeFromOffsets(
    source,
    requestedRange.from,
    Math.min(requestedRange.to, requestedRange.from + ANNOTATION_LIMITS.quote)
  );
  return {
    quote: source.slice(range.from, range.to),
    prefix: source
      .slice(Math.max(0, range.from - ANNOTATION_LIMITS.prefix), range.from)
      .slice(-ANNOTATION_LIMITS.prefix),
    suffix: source.slice(range.to, range.to + ANNOTATION_LIMITS.suffix),
    range
  };
}

export function validateAnnotationAnchor(annotation, text) {
  const source = String(text ?? "");
  const from = annotation?.range?.from;
  const to = annotation?.range?.to;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from) return false;
  if (source.slice(from, to) !== annotation.quote) return false;
  return contextSupportsMatch(source, from, to, annotation.prefix, annotation.suffix);
}

export function reanchorAnnotation(annotation, text) {
  const source = String(text ?? "");
  const quote = String(annotation?.quote ?? "");
  if (!quote) return { ...annotation, status: "detached" };

  const candidates = [];
  let from = source.indexOf(quote);
  while (from >= 0) {
    const to = from + quote.length;
    if (contextSupportsMatch(source, from, to, annotation.prefix, annotation.suffix))
      candidates.push(from);
    from = source.indexOf(quote, from + 1);
  }

  if (candidates.length !== 1) return { ...annotation, status: "detached" };
  const match = candidates[0];
  return {
    ...annotation,
    status: "attached",
    range: rangeFromOffsets(source, match, match + quote.length)
  };
}

function contextSupportsMatch(source, from, to, prefix, suffix) {
  const expectedPrefix = String(prefix ?? "");
  const expectedSuffix = String(suffix ?? "");
  const prefixMatches =
    Boolean(expectedPrefix) &&
    source.slice(Math.max(0, from - expectedPrefix.length), from) === expectedPrefix;
  const suffixMatches =
    Boolean(expectedSuffix) && source.slice(to, to + expectedSuffix.length) === expectedSuffix;

  // One unchanged side plus a unique quote is enough to survive common nearby
  // edits. Requiring both complete context windows would detach an anchor after
  // any insertion immediately before or after it. Empty context only occurs at
  // document boundaries, where quote uniqueness remains the deciding guard.
  return prefixMatches || suffixMatches || (!expectedPrefix && !expectedSuffix);
}
