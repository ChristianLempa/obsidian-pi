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

export function rangesOverlap(first, second) {
  return first?.from < second?.to && second?.from < first?.to;
}
