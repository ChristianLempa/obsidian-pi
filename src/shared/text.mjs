export function tokenizeQuery(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

export function scoreSearchResult(path, content, terms) {
  const normalizedPath = path.toLowerCase();
  const normalizedContent = content.toLowerCase();
  const basename = path.split("/").pop()?.replace(/\.md$/i, "").toLowerCase() ?? path;
  let score = 0;

  for (const term of terms) {
    if (basename.includes(term)) score += 12;
    if (normalizedPath.includes(term)) score += 4;

    const matches = normalizedContent.match(new RegExp(escapeRegExp(term), "g"));
    if (matches) score += Math.min(matches.length, 10);
  }

  return score;
}

export function createExcerpt(content, terms, maxLength = 240) {
  const text = content.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;

  const normalizedText = text.toLowerCase();
  const firstMatchIndex = terms
    .map((term) => normalizedText.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const start = Math.max(0, (firstMatchIndex ?? 0) - Math.floor(maxLength / 3));
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function rankSearchResults(results, limit) {
  return results
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, limit);
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
