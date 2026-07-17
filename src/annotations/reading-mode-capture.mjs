import { ANNOTATION_LIMITS, rangeFromOffsets } from "./annotation-model.mjs";

/**
 * Resolve a rendered Markdown target against the current source. A rendered
 * selection is only treated as a source selection when its text has one exact,
 * unique occurrence in the renderer-provided source section.
 */
export function resolveReadingModeCapture(source, sectionInfo, renderedSelection = "") {
  const text = String(source ?? "");
  const section = resolveSectionRange(text, sectionInfo);
  if (!section) return { error: "This rendered block is no longer tied to the current note." };
  if (section.to <= section.from) return { error: "Choose a non-empty rendered Markdown block." };

  const selectedText = String(renderedSelection ?? "");
  if (selectedText.length > ANNOTATION_LIMITS.quote)
    return { error: "The rendered selection is too large to annotate." };

  if (selectedText) {
    const sectionSource = text.slice(section.from, section.to);
    const first = sectionSource.indexOf(selectedText);
    const second = first < 0 ? -1 : sectionSource.indexOf(selectedText, first + 1);
    if (first >= 0 && second < 0) {
      return {
        range: rangeFromOffsets(
          text,
          section.from + first,
          section.from + first + selectedText.length
        ),
        targetKind: "selection"
      };
    }
  }

  if (section.to - section.from > ANNOTATION_LIMITS.quote)
    return { error: "This rendered Markdown block is too large to annotate." };
  if (!selectedText) return { range: section, targetKind: "block" };

  return {
    range: section,
    targetKind: "block",
    renderedText: selectedText,
    anchorLabel: "Rendered selection (anchored to containing source block)",
    notice:
      "This rendered selection cannot be mapped exactly; it will use the containing source block as its anchor."
  };
}

export function resolveSectionRange(source, sectionInfo) {
  const text = String(source ?? "");
  const lineStart = sectionInfo?.lineStart;
  const lineEnd = sectionInfo?.lineEnd;
  if (
    !Number.isInteger(lineStart) ||
    !Number.isInteger(lineEnd) ||
    lineStart < 0 ||
    lineEnd < lineStart
  )
    return undefined;

  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") starts.push(index + 1);
  }
  if (lineStart >= starts.length || lineEnd >= starts.length) return undefined;
  const from = starts[lineStart];
  let to = lineEnd + 1 < starts.length ? starts[lineEnd + 1] - 1 : text.length;
  if (to > from && text[to - 1] === "\r") to -= 1;

  const range = rangeFromOffsets(text, from, to);
  const reported =
    typeof sectionInfo.text === "string" ? sectionInfo.text.replace(/\r\n/g, "\n") : "";
  const actual = text.slice(range.from, range.to).replace(/\r\n/g, "\n");
  if (reported && reported.replace(/\n$/, "") !== actual.replace(/\n$/, "")) return undefined;
  return range;
}

export function mapRenderedChunksToSource(source, sectionInfo, chunks) {
  return mapRenderedChunkCandidatesToSource(source, sectionInfo, chunks)[0] ?? [];
}

export function mapRenderedChunkCandidatesToSource(source, sectionInfo, chunks) {
  const text = String(source ?? "");
  const section = resolveSectionRange(text, sectionInfo);
  const renderedChunks = (Array.isArray(chunks) ? chunks : [])
    .map((chunk) => ({ key: chunk?.key, text: String(chunk?.text ?? "") }))
    .filter((chunk) => chunk.text);
  if (!section || renderedChunks.length === 0) return [];
  const sectionSource = text.slice(section.from, section.to);
  const candidates = [];
  let firstIndex = sectionSource.indexOf(renderedChunks[0].text);
  while (firstIndex >= 0 && candidates.length < 128) {
    let cursor = firstIndex;
    const mappings = [];
    for (const chunk of renderedChunks) {
      const index = sectionSource.indexOf(chunk.text, cursor);
      if (index < 0) break;
      mappings.push({
        key: chunk.key,
        text: chunk.text,
        from: section.from + index,
        to: section.from + index + chunk.text.length
      });
      cursor = index + chunk.text.length;
    }
    if (mappings.length === renderedChunks.length) candidates.push(mappings);
    firstIndex = sectionSource.indexOf(renderedChunks[0].text, firstIndex + 1);
  }
  return candidates;
}

export function renderedPointToSourceOffset(mappings, key, offset) {
  const mapping = (Array.isArray(mappings) ? mappings : []).find((item) => item.key === key);
  if (!mapping) return undefined;
  const relative = Math.min(mapping.text.length, Math.max(0, Math.trunc(Number(offset) || 0)));
  return mapping.from + relative;
}

export function resolveAnnotationReplacementRange(annotation, source) {
  const text = String(source ?? "");
  const prefix = String(annotation?.prefix ?? "");
  const suffix = String(annotation?.suffix ?? "");
  const maxLength = ANNOTATION_LIMITS.quote * 2;
  const starts = prefix ? occurrences(text, prefix).map((index) => index + prefix.length) : [0];
  const candidates = [];
  for (const from of starts) {
    if (!suffix) {
      if (text.length - from <= maxLength) candidates.push({ from, to: text.length });
      continue;
    }
    let to = text.indexOf(suffix, from);
    while (to >= 0 && to - from <= maxLength) {
      candidates.push({ from, to });
      to = text.indexOf(suffix, to + 1);
    }
  }
  if (candidates.length !== 1 || candidates[0].to < candidates[0].from) return undefined;
  return rangeFromOffsets(text, candidates[0].from, candidates[0].to);
}

export function rangesOverlap(first, second) {
  return first?.from < second?.to && second?.from < first?.to;
}

function occurrences(text, needle) {
  const matches = [];
  let index = text.indexOf(needle);
  while (index >= 0) {
    matches.push(index);
    index = text.indexOf(needle, index + 1);
  }
  return matches;
}
