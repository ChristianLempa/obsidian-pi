export function readFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { frontmatter: {}, body: markdown, raw: "" };
  }

  const raw = match[1].trim();
  const body = markdown.slice(match[0].length);
  return { frontmatter: parseSimpleYaml(raw), body, raw };
}

export function previewFrontmatterPatch(markdown, patch) {
  const parsed = readFrontmatter(markdown);
  if (!parsed.raw) {
    return `---\n${formatSimpleYaml(patch)}\n---\n${markdown}`;
  }

  const lines = parsed.raw.split(/\r?\n/);
  const replacements = Object.fromEntries(
    Object.entries(patch)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, formatYamlEntry(key, value).split(/\r?\n/)])
  );

  const next = [];
  let index = 0;

  while (index < lines.length) {
    const match = lines[index].match(/^([A-Za-z0-9_-]+):\s*/);
    if (match && replacements[match[1]]) {
      next.push(...replacements[match[1]]);
      delete replacements[match[1]];
      index++;
      while (index < lines.length && !/^[A-Za-z0-9_-]+:\s*/.test(lines[index])) index++;
      continue;
    }

    next.push(lines[index]);
    index++;
  }

  for (const value of Object.values(replacements)) next.push(...value);

  return `---\n${next.join("\n")}\n---\n${parsed.body}`;
}

export function parseSimpleYaml(raw) {
  const result = {};
  const lines = raw.split(/\r?\n/);
  let currentKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && currentKey) {
      const existing = Array.isArray(result[currentKey]) ? result[currentKey] : [];
      existing.push(parseYamlScalar(listItem[1]));
      result[currentKey] = existing;
      continue;
    }

    const entry = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!entry) continue;

    currentKey = entry[1];
    result[currentKey] = entry[2] === "" ? [] : parseYamlScalar(entry[2]);
  }

  return result;
}

export function formatSimpleYaml(value) {
  return Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .map(([key, item]) => formatYamlEntry(key, item))
    .join("\n");
}

function formatYamlEntry(key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return `${key}: []`;
    return `${key}:\n${value.map((item) => `  - ${formatYamlScalar(item)}`).join("\n")}`;
  }

  return `${key}: ${formatYamlScalar(value)}`;
}

function parseYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/^["']|["']$/g, ""));
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

function formatYamlScalar(value) {
  if (typeof value === "string") {
    return /[:#\n\r]/.test(value) ? JSON.stringify(value) : value;
  }

  return String(value);
}
