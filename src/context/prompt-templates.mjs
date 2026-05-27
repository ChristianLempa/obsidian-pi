import fs from "node:fs";
import path from "node:path";

const PROMPT_TEMPLATE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const RESERVED_SLASH_COMMANDS = new Set([
  "backlinks",
  "compact",
  "current",
  "links",
  "search",
  "skill"
]);

export function expandPromptTemplate(prompt, basePath) {
  const match = String(prompt || "").match(
    /^\/([A-Za-z0-9_-]+)(?:\s+([^\r\n]*))?(?:\r?\n([\s\S]*))?$/
  );
  if (!match) return prompt;

  if (RESERVED_SLASH_COMMANDS.has(match[1].toLowerCase())) return prompt;

  const template = findPromptTemplate(basePath, match[1]);
  if (!template) return prompt;

  const args = parseTemplateArgs(match[2] ?? "");
  const expanded = applyTemplateArguments(template.content, args).trim();
  const remainder = (match[3] ?? "").trim();

  return [expanded, remainder].filter(Boolean).join("\n\n");
}

export function getPromptTemplateSlashCommands(basePath) {
  return discoverPromptTemplates(basePath).map((template) => ({
    command: `/${template.name}`,
    label: "Prompt template",
    detail: template.description || `Expand ${template.relativePath}`,
    insertText: `/${template.name} `,
    argumentHint: template.argumentHint,
    implemented: true
  }));
}

export function discoverPromptTemplates(basePath) {
  const promptsDir = basePath ? path.join(basePath, ".pi", "prompts") : "";
  if (!promptsDir) return [];

  try {
    return fs
      .readdirSync(promptsDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.toLowerCase().endsWith(".md") &&
          PROMPT_TEMPLATE_NAME_PATTERN.test(path.basename(entry.name, ".md")) &&
          !RESERVED_SLASH_COMMANDS.has(path.basename(entry.name, ".md").toLowerCase())
      )
      .map((entry) => readPromptTemplate(path.join(promptsDir, entry.name), basePath))
      .filter(Boolean)
      .sort((a, b) => a.command.localeCompare(b.command));
  } catch {
    return [];
  }
}

function findPromptTemplate(basePath, name) {
  if (!basePath || !PROMPT_TEMPLATE_NAME_PATTERN.test(name)) return undefined;

  return readPromptTemplate(path.join(basePath, ".pi", "prompts", `${name}.md`), basePath);
}

function readPromptTemplate(filePath, basePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = parsePromptTemplateContent(raw);
    const name = path.basename(filePath, ".md");

    return {
      name,
      command: `/${name}`,
      path: filePath,
      relativePath: basePath ? path.relative(basePath, filePath) : filePath,
      ...parsed
    };
  } catch {
    return undefined;
  }
}

function parsePromptTemplateContent(raw) {
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const metadata = frontmatter ? parseFrontmatter(frontmatter[1]) : {};
  const content = frontmatter ? raw.slice(frontmatter[0].length) : raw;

  return {
    content,
    description: metadata.description || firstNonEmptyLine(content),
    argumentHint: metadata["argument-hint"] || ""
  };
}

function parseFrontmatter(frontmatter) {
  const metadata = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) metadata[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }

  return metadata;
}

function firstNonEmptyLine(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function applyTemplateArguments(content, args) {
  const allArgs = args.join(" ");

  return content.replace(
    /\$ARGUMENTS|\$@|\$\{@:(\d+)(?::(\d+))?\}|\$(\d+)/g,
    (match, sliceStart, sliceLength, positionalIndex) => {
      if (match === "$ARGUMENTS" || match === "$@") return allArgs;
      if (positionalIndex) return args[Number(positionalIndex) - 1] ?? "";

      const startIndex = Number(sliceStart) - 1;
      const selected = args.slice(
        startIndex,
        sliceLength === undefined ? undefined : startIndex + Number(sliceLength)
      );
      return selected.join(" ");
    }
  );
}

function parseTemplateArgs(input) {
  const args = [];
  let current = "";
  let quote = "";
  let escaping = false;

  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += "\\";
  if (current) args.push(current);
  return args;
}
