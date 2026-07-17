import { rangeFromOffsets } from "./annotation-model.mjs";

const STRUCTURAL_LINE = /^\s*(?:#{1,6}\s|>|[-+*]\s|\d+[.)]\s|```|~~~|(?:[-*_]\s*){3,}$|\|)/;

/**
 * Resolve the smallest useful source target at an offset. Prose lines form a
 * paragraph; Markdown structure is intentionally kept to one physical line so
 * capture never guesses across lists, quotes, tables, headings, or fences.
 */
export function resolveMarkdownBlockRange(text, offset) {
  const source = String(text ?? "");
  if (!source) return rangeFromOffsets(source, 0, 0);

  const safeOffset = Math.min(source.length, Math.max(0, Math.trunc(Number(offset) || 0)));
  const lines = source.split("\n");
  const starts = [];
  let cursor = 0;
  for (const line of lines) {
    starts.push(cursor);
    cursor += line.length + 1;
  }

  let lineIndex = 0;
  while (lineIndex + 1 < starts.length && starts[lineIndex + 1] <= safeOffset) lineIndex += 1;
  const cleanLine = (index) => lines[index].replace(/\r$/, "");
  const selected = cleanLine(lineIndex);

  if (!selected.trim() || STRUCTURAL_LINE.test(selected)) {
    return rangeFromOffsets(source, starts[lineIndex], starts[lineIndex] + selected.length);
  }

  let first = lineIndex;
  let last = lineIndex;
  while (first > 0) {
    const previous = cleanLine(first - 1);
    if (!previous.trim() || STRUCTURAL_LINE.test(previous)) break;
    first -= 1;
  }
  while (last + 1 < lines.length) {
    const next = cleanLine(last + 1);
    if (!next.trim() || STRUCTURAL_LINE.test(next)) break;
    last += 1;
  }
  return rangeFromOffsets(source, starts[first], starts[last] + cleanLine(last).length);
}
