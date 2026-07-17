"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod
  )
);
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.js
var main_exports = {};
__export(main_exports, {
  default: () => main_default
});
module.exports = __toCommonJS(main_exports);

// src/plugin/PiAgentPlugin.mjs
var import_node_fs6 = __toESM(require("node:fs"), 1);
var P = __toESM(require("obsidian"), 1);

// src/plugin/settings.mjs
var CUSTOM_MODEL_VALUE = "__custom";
var EMPTY_MODEL_OPTIONS = {
  "": "Use Pi default",
  [CUSTOM_MODEL_VALUE]: "Custom model ID"
};
var REASONING_LABELS = {
  "": "Pi default",
  off: "Off",
  minimal: "Minimal - may be unavailable with tools",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh - deepest"
};
var DEFAULT_SETTINGS = {
  model: "",
  customModel: "",
  reasoningEffort: "",
  sandboxMode: "read-only",
  acknowledgedToolRisk: false,
  availableModels: [],
  dryRun: false,
  ignoredFolders: [".obsidian", ".git", "node_modules", "Templates"],
  customInstructions: "",
  piExecutablePath: "",
  includeDefaultSkills: true,
  additionalSkillFolders: [],
  effectiveModel: "",
  effectiveReasoning: "",
  dismissedPiSetup: false
};
function normalizeSettings(rawSettings = {}) {
  const {
    maxSearchResults: _maxSearchResults,
    maxSearchFiles: _maxSearchFiles,
    maxFileChars: _maxFileChars,
    maxChangeSnapshotFiles: _maxChangeSnapshotFiles,
    ...supportedSettings
  } = rawSettings;
  const settings = { ...DEFAULT_SETTINGS, ...supportedSettings };
  settings.model = normalizeString(settings.model);
  settings.customModel = normalizeString(settings.customModel);
  settings.reasoningEffort = normalizeString(settings.reasoningEffort);
  settings.sandboxMode = normalizeToolMode(settings.sandboxMode);
  settings.acknowledgedToolRisk = settings.acknowledgedToolRisk === true;
  settings.availableModels = Array.isArray(settings.availableModels)
    ? settings.availableModels
    : [];
  settings.dryRun = false;
  settings.ignoredFolders = normalizeStringList(
    settings.ignoredFolders,
    DEFAULT_SETTINGS.ignoredFolders
  );
  settings.customInstructions = normalizeString(settings.customInstructions);
  settings.piExecutablePath = normalizeString(settings.piExecutablePath);
  settings.includeDefaultSkills = settings.includeDefaultSkills !== false;
  settings.additionalSkillFolders = normalizeStringList(settings.additionalSkillFolders, []);
  settings.effectiveModel = normalizeString(settings.effectiveModel);
  settings.effectiveReasoning = normalizeString(settings.effectiveReasoning);
  settings.dismissedPiSetup = settings.dismissedPiSetup === true;
  return settings;
}
function getModelOptions(settings) {
  const models = settings.availableModels;
  const options = { "": "Use Pi default" };
  if (models.length === 0)
    return { ...EMPTY_MODEL_OPTIONS, ...options, [CUSTOM_MODEL_VALUE]: "Custom model ID" };
  for (const model of models) options[model.slug] = formatModelOptionLabel(model);
  options[CUSTOM_MODEL_VALUE] = "Custom model ID";
  return options;
}
function getReasoningOptions(settings) {
  const model = getSelectedModelInfo(settings) ?? getEffectiveModelInfo(settings);
  const supportedReasoningLevels = model?.supportedReasoningLevels ?? [];
  if (supportedReasoningLevels.length === 0) return { "": "Use Pi/model default" };
  const options = { "": "Use Pi/model default" };
  for (const reasoningLevel of supportedReasoningLevels) {
    options[reasoningLevel] = REASONING_LABELS[reasoningLevel] ?? reasoningLevel;
  }
  return options;
}
function getResolvedReasoning(settings) {
  if (settings.reasoningEffort) return settings.reasoningEffort;
  const model = getSelectedModelInfo(settings) ?? getEffectiveModelInfo(settings);
  return model?.defaultReasoningLevel ?? settings.effectiveReasoning ?? "pi-default";
}
function getEffectiveModelInfo(settings) {
  return settings.effectiveModel
    ? settings.availableModels.find((model) => model.slug === settings.effectiveModel)
    : void 0;
}
function getSelectedModelInfo(settings) {
  const modelId = settings.model === CUSTOM_MODEL_VALUE ? settings.customModel : settings.model;
  return settings.availableModels.find((model) => model.slug === modelId);
}
function getToolModeOptions() {
  return {
    chat: "Chat \u2014 no Pi CLI tools",
    "read-only": "Review \u2014 read/search/list only",
    edit: "Edit \u2014 edit/write, no shell",
    "full-agent": "Full agent \u2014 edit/write and shell"
  };
}
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeStringList(value, fallback) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => normalizeString(item)).filter(Boolean);
}
function normalizeToolMode(value) {
  return value === "chat" || value === "read-only" || value === "edit" || value === "full-agent"
    ? value
    : value === "workspace-write" || value === "danger-full-access"
      ? "edit"
      : DEFAULT_SETTINGS.sandboxMode;
}
function formatModelOptionLabel(model) {
  const details = [
    model.supportedReasoningLevels.length > 0
      ? `thinking ${model.supportedReasoningLevels.join("/")}`
      : ""
  ].filter(Boolean);
  return details.length > 0 ? `${model.displayName} - ${details.join(", ")}` : model.displayName;
}

// src/context/prompt-templates.mjs
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var PROMPT_TEMPLATE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
var RESERVED_SLASH_COMMANDS = /* @__PURE__ */ new Set([
  "backlinks",
  "compact",
  "current",
  "links",
  "search",
  "skill"
]);
async function expandPromptTemplate(prompt, basePath) {
  const match = String(prompt || "").match(
    /^\/([A-Za-z0-9_-]+)(?:\s+([^\r\n]*))?(?:\r?\n([\s\S]*))?$/
  );
  if (!match) return prompt;
  if (RESERVED_SLASH_COMMANDS.has(match[1].toLowerCase())) return prompt;
  const template = await findPromptTemplate(basePath, match[1]);
  if (!template) return prompt;
  const args = parseTemplateArgs(match[2] ?? "");
  const expanded = applyTemplateArguments(template.content, args).trim();
  const remainder = (match[3] ?? "").trim();
  return [expanded, remainder].filter(Boolean).join("\n\n");
}
function getPromptTemplateSlashCommands(basePath) {
  return discoverPromptTemplates(basePath).map((template) => ({
    command: `/${template.name}`,
    label: "Prompt template",
    detail: template.description || `Expand ${template.relativePath}`,
    insertText: `/${template.name} `,
    argumentHint: template.argumentHint,
    implemented: true
  }));
}
function discoverPromptTemplates(basePath) {
  const promptsDir = basePath ? import_node_path.default.join(basePath, ".pi", "prompts") : "";
  if (!promptsDir) return [];
  try {
    return import_node_fs.default
      .readdirSync(promptsDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.toLowerCase().endsWith(".md") &&
          PROMPT_TEMPLATE_NAME_PATTERN.test(import_node_path.default.basename(entry.name, ".md")) &&
          !RESERVED_SLASH_COMMANDS.has(
            import_node_path.default.basename(entry.name, ".md").toLowerCase()
          )
      )
      .map((entry) =>
        readPromptTemplate(import_node_path.default.join(promptsDir, entry.name), basePath)
      )
      .filter(Boolean)
      .sort((a, b) => a.command.localeCompare(b.command));
  } catch {
    return [];
  }
}
async function findPromptTemplate(basePath, name) {
  if (!basePath || !PROMPT_TEMPLATE_NAME_PATTERN.test(name)) return void 0;
  return readPromptTemplateFile(
    import_node_path.default.join(basePath, ".pi", "prompts", `${name}.md`),
    basePath
  );
}
function readPromptTemplate(filePath, basePath) {
  try {
    return createPromptTemplate(
      filePath,
      basePath,
      import_node_fs.default.readFileSync(filePath, "utf8")
    );
  } catch {
    return void 0;
  }
}
async function readPromptTemplateFile(filePath, basePath) {
  try {
    return createPromptTemplate(
      filePath,
      basePath,
      await import_node_fs.default.promises.readFile(filePath, "utf8")
    );
  } catch {
    return void 0;
  }
}
function createPromptTemplate(filePath, basePath, raw) {
  const parsed = parsePromptTemplateContent(raw);
  const name = import_node_path.default.basename(filePath, ".md");
  return {
    name,
    command: `/${name}`,
    path: filePath,
    relativePath: basePath ? import_node_path.default.relative(basePath, filePath) : filePath,
    ...parsed
  };
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
        sliceLength === void 0 ? void 0 : startIndex + Number(sliceLength)
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

// src/context/prompt-references.mjs
function parsePromptReferences(prompt) {
  const references = [];
  const addAttachment = (rawValue) => {
    const value = rawValue
      .trim()
      .replace(/^\[\[|\]\]$/g, "")
      .replace(/\|.*$/, "");
    if (!value) return;
    references.push(
      value.endsWith("/")
        ? { type: "folder", value: value.replace(/\/+$/, "") }
        : { type: "note", value }
    );
  };
  for (const match of prompt.matchAll(/(?:^|\s)@\[\[([^\]]+)\]\]/g)) addAttachment(match[1]);
  for (const match of prompt.matchAll(/(?:^|\s)@"([^"]+)"/g)) addAttachment(match[1]);
  for (const match of prompt.matchAll(/(?:^|\s)@'([^']+)'/g)) addAttachment(match[1]);
  for (const match of prompt.matchAll(/(?:^|\s)@([^\s"'[]+)/g)) addAttachment(match[1]);
  for (const match of prompt.matchAll(/(?:^|\s)#([A-Za-z0-9/_-]+)/g)) {
    references.push({ type: "tag", value: `#${match[1]}` });
  }
  for (const line of prompt.split(/\r?\n/)) {
    const skillCommand = line.match(/^\/skill:([a-z0-9-]+)(?:\s+(.+))?$/i);
    if (skillCommand) {
      references.push({
        type: "skill",
        value: skillCommand[1].toLowerCase(),
        argument: skillCommand[2]?.trim() ?? ""
      });
    }
    const contextCommand = line.match(/^\/([A-Za-z0-9_-]+)(?:\s+(.+))?$/);
    if (contextCommand) {
      references.push({
        type: "command",
        value: contextCommand[1],
        argument: contextCommand[2]?.trim() ?? ""
      });
    }
  }
  return { cleanPrompt: prompt, references: dedupeReferences(references) };
}
function dedupeReferences(references) {
  const seen = /* @__PURE__ */ new Set();
  return references.filter((reference) => {
    const key = JSON.stringify(reference);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// src/context/skills.mjs
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// src/shared/paths.mjs
function normalizeVaultFolder(value, fallback = "Pi") {
  const cleaned = String(value || "")
    .split(/[\\/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
  return cleaned || fallback;
}
function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

// src/context/skills.mjs
var DEFAULT_SKILL_SEARCH_LIMIT = 100;
var DEFAULT_SKILL_SEARCH_DEPTH = 5;
var skillCommandCache = { key: "", at: 0, commands: [] };
function normalizeSkillFolderList(value) {
  return normalizeList(value);
}
function getConfiguredSkillPaths(settings, basePath) {
  return normalizeSkillFolderList(settings?.additionalSkillFolders)
    .map((skillPath) => resolveSkillPath(skillPath, basePath))
    .filter(Boolean);
}
function getSkillSlashCommands(settings, basePath) {
  const cacheKey = JSON.stringify({
    defaults: !settings || settings.includeDefaultSkills !== false,
    additional: normalizeSkillFolderList(settings?.additionalSkillFolders),
    base: basePath || ""
  });
  const now = Date.now();
  if (skillCommandCache.key === cacheKey && now - skillCommandCache.at < 5e3) {
    return skillCommandCache.commands;
  }
  skillCommandCache = {
    key: cacheKey,
    at: now,
    commands: discoverSkillCommands(settings, basePath)
  };
  return skillCommandCache.commands;
}
function discoverSkillCommands(settings, basePath) {
  return discoverSkills(settings, basePath)
    .sort(
      (left, right) => left.sourceRank - right.sourceRank || left.name.localeCompare(right.name)
    )
    .map((skill) => ({
      command: `/skill:${skill.name}`,
      label: skill.name,
      detail: skill.description || "Pi skill",
      insertText: `/skill:${skill.name} `,
      implemented: true
    }));
}
function discoverSkills(settings, basePath) {
  const roots = [];
  const addRoot = (skillPath, rank) => {
    if (skillPath && !roots.some((root) => root.path === skillPath))
      roots.push({ path: skillPath, rank });
  };
  for (const skillPath of normalizeSkillFolderList(settings?.additionalSkillFolders)) {
    addRoot(resolveSkillPath(skillPath, basePath), 0);
  }
  if (!settings || settings.includeDefaultSkills !== false) {
    if (basePath) {
      addRoot(import_node_path2.default.join(basePath, ".pi", "skills"), 1);
      addRoot(import_node_path2.default.join(basePath, ".agents", "skills"), 1);
    }
    for (const skillPath of getSettingsSkillPaths(basePath)) addRoot(skillPath, 1);
  }
  const skills = /* @__PURE__ */ new Map();
  for (const root of roots) {
    for (const skillFile of findSkillFiles(root.path)) {
      try {
        const skill = parseSkillFile(skillFile, root.rank);
        if (skill?.name && !skills.has(skill.name)) skills.set(skill.name, skill);
      } catch {}
    }
  }
  return [...skills.values()];
}
function findSkillByName(settings, basePath, name) {
  return discoverSkills(settings, basePath).find((skill) => skill.name === name);
}
function readSkillContent(skillPath) {
  return import_node_fs2.default.readFileSync(skillPath, "utf8");
}
function resolveSkillPath(skillPath, basePath) {
  let resolved = String(skillPath || "").trim();
  if (!resolved) return "";
  if (resolved.startsWith("~")) return "";
  return import_node_path2.default.isAbsolute(resolved)
    ? resolved
    : import_node_path2.default.join(basePath || "", resolved);
}
function findSkillFiles(
  skillPath,
  depth = DEFAULT_SKILL_SEARCH_DEPTH,
  includeSiblingMarkdown = true,
  results = []
) {
  if (!skillPath || results.length >= DEFAULT_SKILL_SEARCH_LIMIT) return results;
  let stats;
  try {
    stats = import_node_fs2.default.statSync(skillPath);
  } catch {
    return results;
  }
  if (stats.isFile()) {
    if (/(^|\/)SKILL\.md$/i.test(skillPath) || /\.md$/i.test(skillPath)) results.push(skillPath);
    return results;
  }
  if (!stats.isDirectory() || depth < 0) return results;
  const directSkillFile = import_node_path2.default.join(skillPath, "SKILL.md");
  try {
    if (import_node_fs2.default.existsSync(directSkillFile)) results.push(directSkillFile);
  } catch {}
  let entries;
  try {
    entries = import_node_fs2.default.readdirSync(skillPath, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (results.length >= DEFAULT_SKILL_SEARCH_LIMIT) break;
    const childPath = import_node_path2.default.join(skillPath, entry.name);
    if (entry.isDirectory()) {
      findSkillFiles(childPath, depth - 1, false, results);
    } else if (
      includeSiblingMarkdown &&
      /\.md$/i.test(entry.name) &&
      entry.name.toUpperCase() !== "SKILL.MD"
    ) {
      results.push(childPath);
    }
  }
  return results;
}
function parseSkillFile(skillPath, sourceRank = 1) {
  const content = import_node_fs2.default.readFileSync(skillPath, "utf8").slice(0, 8192);
  const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const frontmatter = frontmatterMatch ? parseSkillFrontmatter(frontmatterMatch[1]) : {};
  const name = normalizeSkillName(frontmatter.name || inferSkillNameFromPath(skillPath));
  const description = frontmatter.description || inferSkillDescription(content, frontmatterMatch);
  return name
    ? {
        name,
        description: description || "Pi skill",
        path: skillPath,
        sourceRank
      }
    : void 0;
}
function parseSkillFrontmatter(raw) {
  const values = {};
  let currentKey = "";
  let currentBlockStyle = "";
  let currentLines = [];
  const flushBlock = () => {
    if (!currentKey) return;
    values[currentKey] = cleanSkillYamlValue(
      (currentBlockStyle === "|"
        ? currentLines.join("\n")
        : currentLines.join(" ").replace(/\s+/g, " ")
      ).trim()
    );
    currentKey = "";
    currentBlockStyle = "";
    currentLines = [];
  };
  for (const line of raw.split(/\r?\n/)) {
    const entry = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (entry) {
      flushBlock();
      const key = entry[1];
      const value = entry[2].trim();
      if (/^[>|][+-]?$/.test(value)) {
        currentKey = key;
        currentBlockStyle = value.charAt(0);
        currentLines = [];
        continue;
      }
      values[key] = cleanSkillYamlValue(value);
    } else if (currentKey && /^\s+/.test(line)) {
      currentLines.push(line.trim());
    }
  }
  flushBlock();
  return values;
}
function normalizeSkillName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 64);
}
function getSettingsSkillPaths(basePath) {
  const skillPaths = [];
  const collect = (settings, settingsBasePath) => {
    for (const skillPath of normalizeSkillFolderList(settings.skills)) {
      skillPaths.push(resolveSkillPath(skillPath, settingsBasePath));
    }
  };
  if (basePath)
    collect(
      readJsonFile(import_node_path2.default.join(basePath, ".pi", "settings.json")),
      basePath
    );
  return skillPaths.filter(Boolean);
}
function readJsonFile(filePath) {
  try {
    return filePath && import_node_fs2.default.existsSync(filePath)
      ? JSON.parse(import_node_fs2.default.readFileSync(filePath, "utf8"))
      : {};
  } catch {
    return {};
  }
}
function cleanSkillYamlValue(value) {
  return String(value || "")
    .trim()
    .replace(/^[']|[']$/g, "")
    .replace(/^["]|["]$/g, "");
}
function inferSkillNameFromPath(skillPath) {
  return import_node_path2.default.basename(skillPath).toLowerCase() === "skill.md"
    ? import_node_path2.default.basename(import_node_path2.default.dirname(skillPath))
    : import_node_path2.default.basename(skillPath, import_node_path2.default.extname(skillPath));
}
function inferSkillDescription(content, frontmatterMatch) {
  const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;
  const heading = body.match(/^#\s+(.+)$/m);
  const firstParagraph = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#") && !line.startsWith("---"));
  return firstParagraph || (heading ? heading[1].trim() : "Pi skill");
}

// src/context/slash-commands.mjs
var BUILTIN_SLASH_COMMANDS = [
  {
    command: "/current",
    label: "Current note",
    detail: "Attach the active note, selection, links, tags, headings, and frontmatter.",
    insertText: "/current ",
    implemented: true
  },
  {
    command: "/backlinks",
    label: "Backlinks",
    detail: "Attach notes that link to the active note.",
    insertText: "/backlinks ",
    implemented: true
  },
  {
    command: "/links",
    label: "Outgoing links",
    detail: "Attach notes linked from the active note.",
    insertText: "/links ",
    implemented: true
  },
  {
    command: "/search",
    label: "Vault search",
    detail: "Attach ranked vault note matches for a query.",
    insertText: "/search ",
    argumentHint: "query",
    implemented: true
  },
  {
    command: "/compact",
    label: "Compact Pi context",
    detail: "Ask Pi to compact the current session context, optionally with custom instructions.",
    insertText: "/compact ",
    argumentHint: "instructions",
    implemented: true
  },
  {
    command: "/context show",
    label: "Show context",
    detail: "Display the current Obsidian context packet without calling Pi.",
    insertText: "/context show ",
    implemented: true
  }
];
function getSlashCommands(settings, basePath) {
  return [
    ...BUILTIN_SLASH_COMMANDS.map((command) => ({ ...command })),
    ...getPromptTemplateSlashCommands(basePath),
    ...getSkillSlashCommands(settings, basePath)
  ];
}

// src/context/context-builder.mjs
var ContextBuilder = class {
  constructor(graph, settings, bundledInstructions, vaultBasePath) {
    this.graph = graph;
    this.settings = settings;
    this.bundledInstructions = bundledInstructions;
    this.vaultBasePath = vaultBasePath;
  }
  async build(prompt, selection = "") {
    const userPrompt = await expandPromptTemplate(prompt, this.vaultBasePath);
    const parsedPrompt = parsePromptReferences(userPrompt);
    const preAttachedContext = await this.buildPreAttachedContext(parsedPrompt, selection);
    const toolCatalog = this.getToolCatalog();
    const slashCommands = getSlashCommands(this.settings, this.vaultBasePath);
    const inspection = this.createInspection(preAttachedContext);
    return {
      ...preAttachedContext,
      instructions: [this.bundledInstructions, this.settings.customInstructions]
        .map((value) => value.trim())
        .filter(Boolean)
        .join("\n\n"),
      toolCatalog,
      inspection,
      slashCommands,
      userPrompt
    };
  }
  /**
   * Builds the context packet that is attached before Pi starts.
   *
   * Keep this deliberately small and predictable: active note context, one-hop
   * linked/backlinked note context, and user-explicit prompt references. Broad
   * vault exploration belongs to Pi's read/search/list tools in Review, Edit,
   * and Full agent modes. Chat mode has no tools, so users can still attach
   * additional context explicitly with @note, #tag, /search, or folder refs.
   */
  async buildPreAttachedContext(parsedPrompt, selection = "") {
    const activeNote = await this.graph.getActiveNoteContext(selection);
    const linkedNeighborhood = activeNote
      ? await this.graph.getLinkedNeighborhood(activeNote.path, 1)
      : [];
    const attachments = await this.resolveAttachments(parsedPrompt.references, activeNote);
    return {
      activeNote,
      linkedNeighborhood,
      searchResults: [],
      attachments
    };
  }
  async inspectContext(prompt, selection = "") {
    return (await this.build(prompt, selection)).inspection;
  }
  formatPrompt(prompt, context, threadHistory = []) {
    return [
      "Use the following Obsidian vault context as a starting point.",
      "When read/search/list tools are enabled, inspect additional files yourself instead of assuming the pre-attached context is complete.",
      "Prefer cited wikilinks or vault paths when referring to notes.",
      "Respect the selected tool mode. Chat has no Pi CLI tools. Review can read/search/list only. Edit can edit/write but not run shell commands. Full agent can edit/write and run shell commands. Tool modes are not an OS-level sandbox.",
      "",
      "## User prompt",
      prompt,
      "",
      "## Instructions",
      context.instructions,
      "",
      "## Obsidian context helpers",
      context.toolCatalog.map((tool) => `- ${tool}`).join("\n"),
      "",
      "## Context inspection",
      JSON.stringify(context.inspection, null, 2),
      "",
      "## Slash commands",
      context.slashCommands
        .map((command) => {
          const argumentHint = command.argumentHint ? ` <${command.argumentHint}>` : "";
          return `- ${command.command}${argumentHint}: ${command.label} - ${command.detail}`;
        })
        .join("\n"),
      "",
      "## Local chat thread history",
      this.formatThreadHistory(threadHistory),
      "",
      "## Active note",
      JSON.stringify(context.activeNote ?? null, null, 2),
      "",
      "## Linked neighborhood",
      JSON.stringify(context.linkedNeighborhood, null, 2),
      "",
      "## Search results",
      JSON.stringify(context.searchResults, null, 2),
      "",
      "## Explicit prompt attachments",
      JSON.stringify(context.attachments, null, 2)
    ].join("\n");
  }
  formatThreadHistory(threadHistory) {
    let remainingBudget = 6e3;
    const messages = [];
    for (const message of threadHistory.slice(-8).reverse()) {
      if (remainingBudget <= 0) break;
      const content = truncateThreadHistoryContent(
        message.content,
        Math.min(1200, remainingBudget)
      );
      remainingBudget -= content.length;
      messages.unshift({ role: message.role, content });
    }
    return messages.length === 0 ? "[]" : JSON.stringify(messages, null, 2);
  }
  async resolveAttachments(references, activeNote) {
    const attachments = [];
    for (const reference of references) {
      try {
        if (reference.type === "note") {
          const noteFile = this.graph.resolveNoteFile(reference.value);
          attachments.push({
            type: "note",
            label: reference.value,
            content: noteFile
              ? {
                  context: await this.graph.getNoteContext(noteFile),
                  content: await this.graph.readVaultFile(noteFile.path)
                }
              : { error: `Note not found: ${reference.value}` }
          });
        } else if (reference.type === "folder") {
          attachments.push({
            type: "folder",
            label: reference.value,
            content: await this.graph.getFolderSummary(reference.value)
          });
        } else if (reference.type === "tag") {
          attachments.push({
            type: "tag",
            label: reference.value,
            content: await this.graph.getNotesByTag(reference.value)
          });
        } else if (reference.type === "skill") {
          attachments.push({
            type: "skill",
            label: `/skill:${reference.value}`,
            content: this.resolveSkill(reference.value, reference.argument)
          });
        } else if (reference.type === "command") {
          attachments.push({
            type: "command",
            label: `/${reference.value}`,
            content: await this.resolveCommand(reference.value, reference.argument, activeNote)
          });
        }
      } catch (error) {
        attachments.push({
          type: reference.type,
          label: "value" in reference ? reference.value : "command",
          content: { error: error instanceof Error ? error.message : String(error) }
        });
      }
    }
    return attachments;
  }
  resolveSkill(name, argument = "") {
    const skill = findSkillByName(this.settings, this.vaultBasePath, name);
    return skill
      ? {
          name: skill.name,
          description: skill.description,
          path: skill.path,
          argument,
          instructions: readSkillContent(skill.path)
        }
      : { error: `Skill not found: ${name}` };
  }
  async resolveCommand(command, argument, activeNote) {
    return command === "current"
      ? activeNote != null
        ? activeNote
        : null
      : command === "backlinks"
        ? activeNote
          ? await this.graph.getBacklinks(activeNote.path)
          : []
        : command === "links"
          ? activeNote
            ? this.graph.getOutgoingLinks(activeNote.path)
            : []
          : command === "search"
            ? argument
              ? await this.graph.searchNotes(argument)
              : []
            : command === "compact"
              ? { action: "Pi CLI session compaction", instructions: argument || void 0 }
              : { error: `Unknown command: /${command}` };
  }
  getToolCatalog() {
    const mode =
      this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    if (mode === "chat")
      return ["No Pi CLI tools enabled. Use pre-attached Obsidian context only."];
    const tools = ["read(path)", "grep(pattern, path)", "find(glob)", "ls(path)"];
    if (mode === "edit" || mode === "full-agent")
      tools.push("edit(path, oldText, newText)", "write(path, content)");
    if (mode === "full-agent") tools.push("bash(command)");
    tools.push(
      "Tool modes are not an OS-level sandbox; avoid destructive actions unless explicitly requested."
    );
    return tools;
  }
  createInspection(context) {
    return {
      activeNote: context.activeNote
        ? {
            path: context.activeNote.path,
            title: context.activeNote.title,
            hasSelection: context.activeNote.selection.trim().length > 0,
            selectionLength: context.activeNote.selection.length,
            backlinkCount: context.activeNote.backlinks.length,
            outgoingLinkCount: context.activeNote.outgoingLinks.length,
            unresolvedLinkCount: context.activeNote.unresolvedLinks.length,
            tagCount: context.activeNote.tags.length,
            headingCount: context.activeNote.headings.length
          }
        : void 0,
      attachments: this.summarizeAttachments(context.attachments),
      searchResults: {
        count: context.searchResults.length,
        paths: context.searchResults.map((result) => result.path)
      },
      linkedNeighborhood: {
        count: context.linkedNeighborhood.length,
        paths: context.linkedNeighborhood.map((note) => note.path)
      },
      tools: { badges: this.getToolBadges() },
      run: {
        model: this.getEffectiveModelSummary(),
        reasoning: getResolvedReasoning(this.settings),
        mode: this.settings.sandboxMode,
        dryRun: this.settings.dryRun
      }
    };
  }
  summarizeAttachments(attachments) {
    const byType = {};
    for (const attachment of attachments)
      byType[attachment.type] = (byType[attachment.type] ?? 0) + 1;
    return {
      total: attachments.length,
      byType,
      items: attachments.map((attachment) => ({ type: attachment.type, label: attachment.label }))
    };
  }
  getToolBadges() {
    const mode =
      this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    const canRead = mode !== "chat";
    const canWrite = mode === "edit" || mode === "full-agent";
    const canUseShell = mode === "full-agent";
    return [
      {
        id: "read",
        label: "Read files",
        detail: canRead
          ? "Pi can read files via CLI tools."
          : "Pi CLI file reads are disabled; only attached Obsidian context is available.",
        enabled: canRead,
        kind: "read"
      },
      {
        id: "search",
        label: "Search files",
        detail: canRead
          ? "Pi can search/list files via CLI tools."
          : "Pi CLI search/list tools are disabled.",
        enabled: canRead,
        kind: "search"
      },
      {
        id: "write",
        label: "Edit files",
        detail: canWrite
          ? "Pi can edit and write files. Not OS-sandboxed."
          : "File editing is disabled in this mode.",
        enabled: canWrite,
        kind: "write"
      },
      {
        id: "shell",
        label: "Shell",
        detail: canUseShell
          ? "Pi can run shell commands. Not OS-sandboxed."
          : "Shell commands are disabled in this mode.",
        enabled: canUseShell,
        kind: "shell"
      }
    ];
  }
  getEffectiveModelSummary() {
    return this.settings.model === CUSTOM_MODEL_VALUE
      ? this.settings.customModel.trim() || "custom"
      : this.settings.model.trim() || "default";
  }
};
function truncateThreadHistoryContent(content, maxLength) {
  const text = String(content ?? "");
  return text.length <= maxLength
    ? text
    : `${text.slice(0, Math.max(0, maxLength - 34))}
[...truncated for context budget...]`;
}

// src/context/context-show.mjs
function isContextShowPrompt(prompt) {
  return /^(?:\/)?context\s+show\s*$/i.test(String(prompt || "").trim());
}
function formatContextShowResponse(inspection) {
  return [
    "Current Obsidian context:",
    "",
    "```json",
    JSON.stringify(inspection ?? {}, null, 2),
    "```"
  ].join("\n");
}

// src/context/vault-graph.mjs
var import_obsidian = require("obsidian");

// src/shared/text.mjs
function tokenizeQuery(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}
function scoreSearchResult(path6, content, terms) {
  const normalizedPath = path6.toLowerCase();
  const normalizedContent = content.toLowerCase();
  const basename = path6.split("/").pop()?.replace(/\.md$/i, "").toLowerCase() ?? path6;
  let score = 0;
  for (const term of terms) {
    if (basename.includes(term)) score += 12;
    if (normalizedPath.includes(term)) score += 4;
    const matches = normalizedContent.match(new RegExp(escapeRegExp(term), "g"));
    if (matches) score += Math.min(matches.length, 10);
  }
  return score;
}
function createExcerpt(content, terms, maxLength = 240) {
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
function rankSearchResults(results, limit) {
  return results
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, limit);
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/context/vault-graph.mjs
var CONTEXT_RESULT_LIMIT = 8;
var NOTE_CONTEXT_CHAR_LIMIT = 12e3;
var VaultGraph = class {
  constructor(app, settings, getCurrentContextFile) {
    this.app = app;
    this.settings = settings;
    this.getCurrentContextFile = getCurrentContextFile;
  }
  getMarkdownFiles() {
    return this.app.vault.getMarkdownFiles().filter((file) => this.isPathAllowed(file.path));
  }
  async searchNotes(query, options = {}) {
    const terms = tokenizeQuery(query);
    if (terms.length === 0) return [];
    const limit = options.limit ?? CONTEXT_RESULT_LIMIT;
    const files = this.getMarkdownFiles().filter(
      (file) => !options.folder || file.path.startsWith(options.folder)
    );
    const results = [];
    for (const file of files) {
      const content = await this.readFile(file, NOTE_CONTEXT_CHAR_LIMIT);
      const score = scoreSearchResult(file.path, content, terms);
      const cache = this.app.metadataCache.getFileCache(file);
      results.push({
        path: file.path,
        title: file.basename,
        score,
        excerpt: createExcerpt(content, terms),
        tags: this.getTags(cache)
      });
    }
    return rankSearchResults(results, limit);
  }
  async getActiveNoteContext(selection = "") {
    const file = this.getActiveFile();
    if (!file) return void 0;
    const content = await this.readFile(file, NOTE_CONTEXT_CHAR_LIMIT);
    return { ...(await this.getNoteContext(file)), content, selection };
  }
  async getNoteContext(fileOrPath) {
    const file =
      typeof fileOrPath === "string"
        ? this.app.vault.getAbstractFileByPath(fileOrPath)
        : fileOrPath;
    if (!(file instanceof import_obsidian.TFile))
      throw new Error(`Note not found: ${String(fileOrPath)}`);
    const cache = this.app.metadataCache.getFileCache(file);
    const content = await this.readFile(file, NOTE_CONTEXT_CHAR_LIMIT);
    return {
      path: file.path,
      title: file.basename,
      frontmatter: cache?.frontmatter ?? {},
      tags: this.getTags(cache),
      aliases: this.getAliases(cache),
      headings: this.getHeadings(cache),
      backlinks: await this.getBacklinks(file.path),
      outgoingLinks: this.getOutgoingLinks(file.path),
      unresolvedLinks: this.getUnresolvedLinks(file.path),
      excerpt: createExcerpt(content, tokenizeQuery(file.basename), 320)
    };
  }
  async findReferences(query) {
    const titleMatches = this.getMarkdownFiles()
      .filter((file) => file.basename.toLowerCase().includes(query.toLowerCase()))
      .map((file) => ({
        path: file.path,
        title: file.basename,
        score: 20,
        excerpt: "Title match",
        tags: this.getTags(this.app.metadataCache.getFileCache(file))
      }));
    const searchMatches = await this.searchNotes(query, { limit: CONTEXT_RESULT_LIMIT });
    return rankSearchResults([...titleMatches, ...searchMatches], CONTEXT_RESULT_LIMIT);
  }
  async getFolderSummary(folderPath) {
    const normalizedFolderPath = folderPath.replace(/^\/+|\/+$/g, "");
    const files = this.getMarkdownFiles()
      .filter((file) => file.path.startsWith(`${normalizedFolderPath}/`))
      .slice(0, CONTEXT_RESULT_LIMIT);
    const results = [];
    for (const file of files) {
      const content = await this.readFile(file, NOTE_CONTEXT_CHAR_LIMIT);
      results.push({
        path: file.path,
        title: file.basename,
        score: 1,
        excerpt: createExcerpt(content, tokenizeQuery(file.basename), 260),
        tags: this.getTags(this.app.metadataCache.getFileCache(file))
      });
    }
    return results;
  }
  async getNotesByTag(tag) {
    const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;
    const results = [];
    for (const file of this.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      const tags = this.getTags(cache);
      if (!tags.includes(normalizedTag) && !tags.includes(normalizedTag.slice(1))) continue;
      const content = await this.readFile(file, NOTE_CONTEXT_CHAR_LIMIT);
      results.push({
        path: file.path,
        title: file.basename,
        score: 1,
        excerpt: createExcerpt(content, tokenizeQuery(normalizedTag), 260),
        tags
      });
      if (results.length >= CONTEXT_RESULT_LIMIT) break;
    }
    return results;
  }
  resolveNoteFile(notePath) {
    const normalizedPath = notePath.replace(/^\/+/, "").replace(/#.*$/, "");
    const candidates = [
      normalizedPath,
      normalizedPath.endsWith(".md") ? normalizedPath : `${normalizedPath}.md`,
      normalizedPath.replace(/\.md$/i, "")
    ];
    for (const candidate of candidates) {
      const directFile = this.app.vault.getAbstractFileByPath(candidate);
      if (directFile instanceof import_obsidian.TFile && this.isPathAllowed(directFile.path))
        return directFile;
      const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
        candidate.replace(/\.md$/i, ""),
        ""
      );
      if (linkedFile && this.isPathAllowed(linkedFile.path)) return linkedFile;
    }
    return void 0;
  }
  async getBacklinks(filePath) {
    const backlinkEntries = Object.entries(this.app.metadataCache.resolvedLinks)
      .map(([path6, links]) => ({ path: path6, count: links[filePath] || 0 }))
      .filter(
        (backlink) =>
          backlink.path !== filePath && backlink.count > 0 && this.isPathAllowed(backlink.path)
      )
      .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path))
      .slice(0, CONTEXT_RESULT_LIMIT);
    const backlinks = [];
    for (const backlink of backlinkEntries) {
      const file = this.app.vault.getAbstractFileByPath(backlink.path);
      let excerpt = "";
      if (file instanceof import_obsidian.TFile) {
        const content = await this.readFile(file, NOTE_CONTEXT_CHAR_LIMIT);
        excerpt = createExcerpt(content, tokenizeQuery(filePath.replace(/\.md$/i, "")), 220);
      }
      backlinks.push({
        path: backlink.path,
        display: backlink.path.replace(/\.md$/i, ""),
        count: backlink.count,
        excerpt
      });
    }
    return backlinks;
  }
  getOutgoingLinks(filePath) {
    const links = this.app.metadataCache.resolvedLinks[filePath] ?? {};
    return Object.entries(links)
      .filter(([path6]) => this.isPathAllowed(path6))
      .map(([path6, count]) => ({
        path: path6,
        display: path6.replace(/\.md$/i, ""),
        count
      }))
      .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));
  }
  getUnresolvedLinks(filePath) {
    const links = this.app.metadataCache.unresolvedLinks[filePath] ?? {};
    return Object.entries(links)
      .map(([path6, count]) => ({ path: path6, display: path6, count }))
      .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));
  }
  async getLinkedNeighborhood(filePath, depth = 1) {
    const seen = /* @__PURE__ */ new Set([filePath]);
    let frontier = [filePath];
    const notes = [];
    for (let index = 0; index < depth; index++) {
      const nextFrontier = /* @__PURE__ */ new Set();
      for (const path6 of frontier) {
        const outgoingLinks = this.getOutgoingLinks(path6);
        const backlinks = await this.getBacklinks(path6);
        for (const link of [...outgoingLinks, ...backlinks]) {
          if (!seen.has(link.path) && link.path.endsWith(".md")) {
            seen.add(link.path);
            nextFrontier.add(link.path);
          }
        }
      }
      const limitedNextFrontier = [...nextFrontier].slice(0, CONTEXT_RESULT_LIMIT);
      for (const path6 of limitedNextFrontier) {
        try {
          notes.push(await this.getNoteContext(path6));
        } catch {}
      }
      frontier = limitedNextFrontier;
    }
    return notes.slice(0, CONTEXT_RESULT_LIMIT);
  }
  getActiveFile() {
    const file = this.getCurrentContextFile?.() ?? this.app.workspace.getActiveFile();
    return file && file.extension === "md" && this.isPathAllowed(file.path) ? file : void 0;
  }
  async readVaultFile(filePath) {
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof import_obsidian.TFile)) throw new Error(`File not found: ${filePath}`);
    if (!this.isPathAllowed(file.path)) throw new Error(`Path is not allowed: ${filePath}`);
    return this.readFile(file, NOTE_CONTEXT_CHAR_LIMIT);
  }
  async readFile(file, maxChars = NOTE_CONTEXT_CHAR_LIMIT) {
    const content = await this.app.vault.cachedRead(file);
    return content.length > maxChars
      ? `${content.slice(0, maxChars)}
...[truncated]`
      : content;
  }
  isPathAllowed(filePath) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    return !this.settings.ignoredFolders.some((ignoredFolder) => {
      const normalizedIgnoredFolder = ignoredFolder.replace(/\/+$/, "");
      return (
        normalizedPath === normalizedIgnoredFolder ||
        normalizedPath.startsWith(`${normalizedIgnoredFolder}/`)
      );
    });
  }
  getTags(cache) {
    const tags = /* @__PURE__ */ new Set();
    for (const tag of cache?.tags ?? []) tags.add(tag.tag);
    const frontmatterTags = cache?.frontmatter?.tags;
    if (Array.isArray(frontmatterTags)) {
      for (const tag of frontmatterTags) tags.add(String(tag));
    } else if (typeof frontmatterTags === "string") {
      tags.add(frontmatterTags);
    }
    return [...tags].sort();
  }
  getAliases(cache) {
    const aliases = cache?.frontmatter?.aliases;
    return Array.isArray(aliases)
      ? aliases.map(String)
      : typeof aliases === "string"
        ? [aliases]
        : [];
  }
  getHeadings(cache) {
    return (cache?.headings ?? [])
      .map((heading) => heading.heading)
      .filter(Boolean)
      .slice(0, 20);
  }
};

// src/pi/health.mjs
var import_node_child_process = require("node:child_process");

// src/pi/diagnostics.mjs
var PI_INSTALL_COMMAND = "npm install -g @earendil-works/pi-coding-agent";
var PI_CLI_MISSING_MESSAGE = `Pi CLI was not found. Install it with \`${PI_INSTALL_COMMAND}\`, then restart Obsidian so it can find \`pi\` on PATH.`;
var NODE_RUNTIME_MISSING_MESSAGE =
  "Pi CLI was found, but Node.js is not available to Obsidian. Install Node.js, then fully restart Obsidian. If you use nvm, fnm, asdf, or another version manager, make sure its Node bin directory is available to GUI apps or install Node with Homebrew/the official installer.";
var NODE_RUNTIME_MISSING_PATTERNS = [
  /env:\s*node:\s*No such file or directory/i,
  /usr\/bin\/env:\s*['"]?node['"]?:\s*No such file or directory/i,
  /\/usr\/bin\/env:\s*node:\s*No such file or directory/i,
  /spawn\s+node\s+ENOENT/i
];
function createPiCliError(options = {}) {
  return new Error(formatPiCliFailure(options));
}
function formatPiCliFailure(options = {}) {
  return diagnosePiCliFailure(options).message;
}
function diagnosePiCliFailure({
  context = "Could not run Pi CLI",
  error,
  stderr,
  stdout,
  exitCode
} = {}) {
  const text = getCombinedErrorText(error, stderr, stdout);
  if (isPiCliMissing(error)) return { kind: "pi-missing", message: PI_CLI_MISSING_MESSAGE };
  if (isNodeRuntimeMissing(text)) {
    return { kind: "node-missing", message: NODE_RUNTIME_MISSING_MESSAGE };
  }
  const detail =
    text || (typeof exitCode === "number" ? `Pi exited with code ${exitCode}.` : "Unknown error.");
  return { kind: "generic", message: `${context}: ${detail}` };
}
function isNodeRuntimeMissing(text = "") {
  return NODE_RUNTIME_MISSING_PATTERNS.some((pattern) => pattern.test(text));
}
function isPiCliMissing(error) {
  return error && error.code === "ENOENT";
}
function getCombinedErrorText(error, stderr, stdout) {
  return [getErrorMessage(error), stderr, stdout]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join("\n");
}
function getErrorMessage(error) {
  if (!error) return "";
  return error instanceof Error ? error.message : String(error);
}

// src/pi/environment.mjs
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var POSIX_PI_CANDIDATES = ["/opt/homebrew/bin/pi", "/usr/local/bin/pi", "/usr/bin/pi"];
var WINDOWS_PI_CANDIDATES = ["pi.cmd", "pi.exe", "pi"];
var POSIX_PATH_CANDIDATES = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin"
];
function findPiExecutable(configuredPath = "") {
  const configuredExecutable = normalizePiExecutablePath(configuredPath);
  if (configuredExecutable) return configuredExecutable;
  if (process.platform === "win32") return WINDOWS_PI_CANDIDATES[0];
  for (const candidate of POSIX_PI_CANDIDATES) {
    if (import_node_fs3.default.existsSync(candidate)) return candidate;
  }
  const piNode = findPiNodeExecutable();
  if (piNode) return piNode;
  return "pi";
}
function normalizePiExecutablePath(executablePath) {
  const normalizedPath = typeof executablePath === "string" ? executablePath.trim() : "";
  if (!normalizedPath) return "";
  return expandEnvironmentVariables(expandHomeDirectory(normalizedPath));
}
function expandHomeDirectory(executablePath) {
  const home = process.env.HOME;
  if (!home) return executablePath;
  if (executablePath === "~") return home;
  return executablePath.startsWith(`~${import_node_path3.default.sep}`)
    ? import_node_path3.default.join(home, executablePath.slice(2))
    : executablePath;
}
function expandEnvironmentVariables(executablePath) {
  return executablePath.replace(/\$(\w+)|\$\{([^}]+)\}/g, (match, name, bracedName) => {
    const value = process.env[name || bracedName];
    return value === void 0 ? match : value;
  });
}
function findPiNodeExecutable() {
  const home = process.env.HOME;
  if (!home) return null;
  const root = import_node_path3.default.join(home, ".local", "share", "pi-node");
  try {
    const versions = import_node_fs3.default
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => import_node_path3.default.join(root, d.name));
    for (const v of versions) {
      const candidate = import_node_path3.default.join(v, "bin", "pi");
      if (import_node_fs3.default.existsSync(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
}
function buildPiProcessInvocation(piExecutable, args = [], options = {}) {
  const processOptions = buildPiProcessOptions(piExecutable, options);
  return shouldUseWindowsCommandShell(piExecutable)
    ? {
        command: process.env.ComSpec || "cmd.exe",
        args: ["/d", "/s", "/c", quoteWindowsCommand([piExecutable, ...args])],
        options: {
          ...processOptions,
          windowsVerbatimArguments: true
        }
      }
    : {
        command: piExecutable,
        args,
        options: processOptions
      };
}
function buildPiProcessOptions(piExecutable = findPiExecutable(), options = {}) {
  return {
    ...options,
    env: buildPiProcessEnv(piExecutable)
  };
}
function buildPiProcessEnv(piExecutable = findPiExecutable()) {
  if (process.platform === "win32") return process.env;
  return {
    ...process.env,
    PATH: buildPosixPath(piExecutable)
  };
}
function shouldUseWindowsCommandShell(piExecutable) {
  return process.platform === "win32" && !/\.exe$/i.test(piExecutable);
}
function quoteWindowsCommand(parts) {
  const command = parts.map((part) => `"${String(part).replace(/"/g, '""')}"`).join(" ");
  return `"${command}"`;
}
function buildPosixPath(piExecutable) {
  return uniqueExistingDirectories([
    ...getExecutableDirectory(piExecutable),
    ...POSIX_PATH_CANDIDATES,
    ...getPiNodePaths(),
    ...getNodeVersionManagerDirectories(),
    ...getExistingPathEntries()
  ]).join(import_node_path3.default.delimiter);
}
function getPiNodePaths() {
  const home = process.env.HOME;
  if (!home) return [];
  const root = import_node_path3.default.join(home, ".local", "share", "pi-node");
  try {
    return import_node_fs3.default
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => import_node_path3.default.join(root, d.name, "bin"));
  } catch {
    return [];
  }
}
function getExistingPathEntries() {
  return (process.env.PATH ?? "").split(import_node_path3.default.delimiter).filter(Boolean);
}
function getExecutableDirectory(executable) {
  return import_node_path3.default.isAbsolute(executable)
    ? [import_node_path3.default.dirname(executable)]
    : [];
}
function getNodeVersionManagerDirectories() {
  const home = process.env.HOME;
  if (!home) return [];
  return [
    ...getNvmNodeBinDirectories(import_node_path3.default.join(home, ".nvm", "versions", "node")),
    ...getFnmNodeBinDirectories(import_node_path3.default.join(home, ".fnm", "node-versions")),
    import_node_path3.default.join(home, ".asdf", "shims"),
    import_node_path3.default.join(home, ".volta", "bin")
  ];
}
function getNvmNodeBinDirectories(root) {
  return getChildDirectories(root).map((directory) =>
    import_node_path3.default.join(directory, "bin")
  );
}
function getFnmNodeBinDirectories(root) {
  return getChildDirectories(root).map((directory) =>
    import_node_path3.default.join(directory, "installation", "bin")
  );
}
function getChildDirectories(root) {
  try {
    return import_node_fs3.default
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => import_node_path3.default.join(root, entry.name));
  } catch {
    return [];
  }
}
function uniqueExistingDirectories(directories) {
  const seen = /* @__PURE__ */ new Set();
  return directories.filter((directory) => {
    if (!directory || seen.has(directory) || !import_node_fs3.default.existsSync(directory))
      return false;
    seen.add(directory);
    return true;
  });
}

// src/pi/health.mjs
function warmupPiCli(piExecutablePath = "", cwd) {
  try {
    const piExecutable = findPiExecutable(piExecutablePath);
    const invocation = buildPiProcessInvocation(piExecutable, ["--version"], {
      ...(cwd ? { cwd } : {}),
      detached: process.platform !== "win32",
      stdio: "ignore",
      windowsHide: true
    });
    const child = (0, import_node_child_process.spawn)(
      invocation.command,
      invocation.args,
      invocation.options
    );
    child.on("error", () => {});
    child.unref?.();
  } catch {}
}
function checkPiInstallation(piExecutablePath = "") {
  const piExecutable = findPiExecutable(piExecutablePath);
  const invocation = buildPiProcessInvocation(piExecutable, ["--version"], {
    encoding: "utf8",
    timeout: 5e3
  });
  const result = (0, import_node_child_process.spawnSync)(
    invocation.command,
    invocation.args,
    invocation.options
  );
  if (result.error) {
    const diagnostic = diagnosePiCliFailure({ error: result.error });
    return {
      ok: false,
      kind: diagnostic.kind,
      message: diagnostic.message
    };
  }
  if (result.status !== 0) {
    const diagnostic = diagnosePiCliFailure({
      stderr: result.stderr,
      stdout: result.stdout,
      exitCode: result.status
    });
    return {
      ok: false,
      kind: diagnostic.kind,
      message: diagnostic.message
    };
  }
  return {
    ok: true,
    version: (result.stdout || result.stderr || "Pi CLI found.").trim(),
    message: (result.stdout || result.stderr || "Pi CLI found.").trim()
  };
}

// src/pi/model-catalog.mjs
var import_node_child_process2 = require("node:child_process");
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);
var REASONING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"];
var ESCAPE_CHARACTER = String.fromCharCode(27);
var ANSI_ESCAPE_PATTERN = new RegExp(`${ESCAPE_CHARACTER}\\[[0-9;?]*[ -/]*[@-~]`, "g");
var PiModelCatalog = class {
  constructor(pluginDirectory, settings = {}) {
    this.pluginDirectory = pluginDirectory;
    this.settings = settings;
  }
  async getAvailableModels() {
    const piExecutable = findPiExecutable(this.settings.piExecutablePath);
    const output = await this.execPi(piExecutable, ["--list-models"]);
    return parseModelCatalog(output);
  }
  getEffectiveConfig(vaultBasePath) {
    return getEffectiveConfig(vaultBasePath);
  }
  execPi(command, args) {
    return new Promise((resolve, reject) => {
      const invocation = buildPiProcessInvocation(command, args, { timeout: 2e4 });
      (0, import_node_child_process2.execFile)(
        invocation.command,
        invocation.args,
        invocation.options,
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new Error(
                formatPiCliFailure({
                  context: "Could not query Pi model registry",
                  error,
                  stderr,
                  stdout
                })
              )
            );
            return;
          }
          resolve(stdout || stderr);
        }
      );
    });
  }
};
function parseModelCatalog(output) {
  return output
    .replace(ANSI_ESCAPE_PATTERN, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("provider"))
    .map((line) => line.split(/\s{2,}/))
    .filter((parts) => parts.length >= 5)
    .map((parts) => {
      const provider = parts[0];
      const model = parts[1];
      const supportedReasoningLevels = normalizeReasoningLevels(parts[4]);
      return {
        slug: `${provider}/${model}`,
        displayName: `${provider}: ${model}`,
        contextWindow: parseTokenAmount(parts[2]),
        maxOutputTokens: parseTokenAmount(parts[3]),
        defaultReasoningLevel: supportedReasoningLevels.includes("medium")
          ? "medium"
          : supportedReasoningLevels[0] || "off",
        supportedReasoningLevels
      };
    });
}
function parseTokenAmount(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  const multiplier = match[2] === "B" ? 1e9 : match[2] === "M" ? 1e6 : match[2] === "K" ? 1e3 : 1;
  return Math.round(amount * multiplier);
}
function normalizeReasoningLevels(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return !normalized || normalized === "no" || normalized === "false"
    ? ["off"]
    : normalized === "yes" || normalized === "true"
      ? [...REASONING_LEVELS]
      : normalized
          .split(/[/,|]+/)
          .map((level) => level.trim())
          .filter(Boolean)
          .filter((level) => REASONING_LEVELS.includes(level));
}
function getEffectiveConfig(vaultBasePath) {
  const vaultSettingsPath = vaultBasePath
    ? import_node_path4.default.join(vaultBasePath, ".pi", "settings.json")
    : "";
  const settings = readJsonFile2(vaultSettingsPath);
  const defaultModel = settings.defaultModel ? String(settings.defaultModel) : "";
  const defaultProvider = settings.defaultProvider ? String(settings.defaultProvider) : "";
  const effectiveModel = defaultModel
    ? defaultModel.includes("/")
      ? defaultModel
      : defaultProvider
        ? `${defaultProvider}/${defaultModel}`
        : defaultModel
    : "";
  const effectiveReasoning = settings.defaultThinkingLevel
    ? String(settings.defaultThinkingLevel)
    : "";
  return { effectiveModel, effectiveReasoning };
}
function readJsonFile2(filePath) {
  try {
    return filePath && import_node_fs4.default.existsSync(filePath)
      ? JSON.parse(import_node_fs4.default.readFileSync(filePath, "utf8"))
      : {};
  } catch {
    return {};
  }
}

// src/pi/runner.mjs
var import_node_child_process3 = require("node:child_process");
var import_node_fs5 = __toESM(require("node:fs"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);

// src/pi/token-usage.mjs
function calculateContextTokens(usage) {
  return usage
    ? Number(usage.input || 0) + Number(usage.cacheRead || 0) + Number(usage.cacheWrite || 0)
    : 0;
}
function normalizeTokenUsage(usage) {
  if (!usage) return void 0;
  const contextWindow = Number(usage.contextWindow || usage.context_window || 0);
  return {
    input: Number(usage.input || 0),
    output: Number(usage.output || 0),
    cacheRead: Number(usage.cacheRead || 0),
    cacheWrite: Number(usage.cacheWrite || 0),
    totalTokens: Number(usage.totalTokens || 0),
    ...(contextWindow > 0 ? { contextWindow } : {})
  };
}
function createContextUsage(usage, contextWindow) {
  const tokens = calculateContextTokens(usage);
  const windowSize = Number(contextWindow || usage?.contextWindow || 0);
  if (tokens <= 0) return void 0;
  return {
    tokens,
    contextWindow: windowSize,
    percent: windowSize > 0 ? (tokens / windowSize) * 100 : void 0
  };
}
function formatContextUsageBadge(contextUsage, tokenUsage) {
  if (!contextUsage) return void 0;
  const usageText = `${formatTokenCount(contextUsage.tokens)}/${contextUsage.contextWindow > 0 ? formatTokenCount(contextUsage.contextWindow) : "?"}`;
  const base =
    contextUsage.contextWindow > 0
      ? `ctx ${formatPercent(contextUsage.percent)} \xB7 ${usageText}`
      : `ctx ${usageText}`;
  return {
    label: tokenUsage
      ? `${base} \xB7 \u2191${formatTokenCount(calculateContextTokens(tokenUsage))} \u2193${formatTokenCount(
          tokenUsage.output || 0
        )}`
      : base,
    title: formatContextUsageTitle(contextUsage, tokenUsage)
  };
}
function formatContextUsageTitle(contextUsage, tokenUsage) {
  const lines = [
    contextUsage.contextWindow > 0
      ? `Context used: ${formatPercent(contextUsage.percent)} (${formatTokenCount(
          contextUsage.tokens
        )} of ${formatTokenCount(contextUsage.contextWindow)} tokens)`
      : `Context used: ${formatTokenCount(contextUsage.tokens)} tokens (context window unknown)`
  ];
  if (tokenUsage) {
    lines.push(
      `\u2191 Input context: ${formatTokenCount(calculateContextTokens(tokenUsage))} tokens`,
      `\u2193 Output: ${formatTokenCount(tokenUsage.output || 0)} tokens`
    );
  }
  return lines.join("\n");
}
function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.max(0, Math.round(value))}%` : "?%";
}
function formatTokenCount(value) {
  const count = Number(value || 0);
  return count >= 1e6
    ? `${formatCompactNumber(count / 1e6)}M`
    : count >= 1e3
      ? `${formatCompactNumber(count / 1e3)}K`
      : String(Math.round(count));
}
function formatCompactNumber(value) {
  return value >= 100
    ? String(Math.round(value))
    : value >= 10
      ? value.toFixed(1).replace(/\.0$/, "")
      : value.toFixed(1).replace(/\.0$/, "");
}

// src/pi/events.mjs
function handlePiJsonEventLine(line, callbacks, events, appendText, updateRunState) {
  if (!line.trim()) return;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }
  const type = String(event.type ?? "event");
  const emit = (normalizedEvent) => {
    events.push(normalizedEvent);
    callbacks?.onEvent?.(normalizedEvent);
  };
  const captureRunState = (messageOrMessages) => {
    const runState = getAssistantRunState(messageOrMessages);
    if (runState) updateRunState(runState);
  };
  if (event.message) captureRunState(event.message);
  if (Array.isArray(event.messages)) captureRunState(event.messages);
  if (type === "tool_execution_start" || type === "tool_execution_update") {
    emit({
      type: type === "tool_execution_start" ? "tool_start" : "tool_update",
      raw: event,
      message: String(event.toolName ?? "tool"),
      toolName: String(event.toolName ?? "tool"),
      toolCallId: String(event.toolCallId ?? ""),
      toolArgs: event.args ?? {}
    });
    return;
  }
  if (type === "tool_execution_end") {
    emit({
      type: "tool_end",
      raw: event,
      message: String(event.toolName ?? "tool"),
      toolName: String(event.toolName ?? "tool"),
      toolCallId: String(event.toolCallId ?? ""),
      toolArgs: event.args ?? {},
      isError: event.isError === true
    });
    return;
  }
  const assistantEvent = event.assistantMessageEvent;
  if (type === "message_update" && assistantEvent) {
    if (assistantEvent.type === "text_delta") {
      const delta = assistantEvent.delta ?? "";
      appendText(delta);
      const textEvent = { type: "text_delta", raw: event, textDelta: delta, assistantEvent };
      emit(textEvent);
      callbacks?.onTextDelta?.(delta, textEvent);
      return;
    }
    const toolCall = extractToolCallFromAssistantEvent(assistantEvent);
    emit({
      type: assistantEvent.type,
      raw: event,
      assistantEvent,
      toolName: toolCall?.name ?? void 0,
      toolArgs: toolCall?.arguments ?? void 0,
      toolCallId: toolCall?.id ?? void 0
    });
    return;
  }
  if (type === "message_end") {
    emit({ type: "message_end", raw: event, fallbackText: extractAssistantText(event.message) });
    return;
  }
  if (type === "turn_end") {
    emit({ type: "turn_end", raw: event, fallbackText: extractAssistantText(event.message) });
    return;
  }
  if (type === "agent_end") {
    const agentEndEvent = {
      type: "agent_end",
      raw: event,
      fallbackText: extractLatestAssistantText(event.messages)
    };
    emit(agentEndEvent);
    updateRunState({ fallbackText: agentEndEvent.fallbackText?.trim() ?? "" });
    return;
  }
  emit({ type, raw: event });
}
function extractAssistantText(message) {
  if (!message || message.role !== "assistant") return "";
  const content = message.content ?? [];
  return typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .filter((part) => part && part.type === "text")
          .map((part) => String(part.text || ""))
          .join("")
      : "";
}
function extractLatestAssistantText(messages) {
  if (!Array.isArray(messages)) return "";
  for (let index = messages.length - 1; index >= 0; index--) {
    const text = extractAssistantText(messages[index]);
    if (text.trim()) return text;
  }
  return "";
}
function getAssistantRunState(messageOrMessages) {
  const message = Array.isArray(messageOrMessages)
    ? findLatestAssistantMessage(messageOrMessages)
    : messageOrMessages;
  if (!message || message.role !== "assistant") return void 0;
  const tokenUsage = normalizeTokenUsage(message.usage);
  if (tokenUsage) {
    tokenUsage.provider = typeof message.provider === "string" ? message.provider : "";
    tokenUsage.model = typeof message.model === "string" ? message.model : "";
    tokenUsage.modelId =
      tokenUsage.provider && tokenUsage.model ? `${tokenUsage.provider}/${tokenUsage.model}` : "";
  }
  return {
    fallbackText: extractAssistantText(message).trim(),
    errorMessage:
      message.stopReason === "error" || message.stopReason === "aborted"
        ? message.errorMessage || `Request ${message.stopReason}`
        : void 0,
    tokenUsage
  };
}
function extractEventTokenUsage(event) {
  if (!event) return void 0;
  const runState = getAssistantRunState(
    event.message ?? (Array.isArray(event.messages) ? event.messages : void 0)
  );
  return runState?.tokenUsage;
}
function extractToolCallFromAssistantEvent(event) {
  const toolCall = event?.toolCall;
  if (toolCall) return toolCall;
  const content = event?.partial?.content?.[event.contentIndex];
  return content && content.type === "toolCall"
    ? {
        id: content.id ?? content.toolCallId,
        name: content.name,
        arguments: content.arguments ?? content.args
      }
    : void 0;
}
function findLatestAssistantMessage(messages) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === "assistant") return messages[index];
  }
  return void 0;
}

// src/pi/runner.mjs
function isPiCliCommandPrompt(prompt) {
  return /^\/(compact)(?:\s|$)/i.test(prompt.trim());
}
function getCompactInstructions(prompt) {
  const match = prompt.trim().match(/^\/compact(?:\s+([\s\S]+))?$/i);
  return match ? (match[1] ?? "").trim() : void 0;
}
var PiRunner = class {
  constructor(settings, contextBuilder, workingDirectory, pluginDirectory) {
    this.settings = settings;
    this.contextBuilder = contextBuilder;
    this.workingDirectory = workingDirectory;
    this.pluginDirectory = pluginDirectory;
    this.cancelRequested = false;
  }
  async run(prompt, context, sessionId, threadHistory = [], callbacks) {
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");
    const compactInstructions = getCompactInstructions(prompt);
    if (compactInstructions !== void 0)
      return this.settings.dryRun
        ? this.formatDryRunCompactResponse(sessionId)
        : this.runPiRpcCompact(sessionId, compactInstructions, callbacks);
    const effectivePrompt = context?.userPrompt ?? prompt;
    const formattedPrompt = this.contextBuilder.formatPrompt(
      effectivePrompt,
      context,
      threadHistory
    );
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");
    return this.settings.dryRun
      ? {
          finalResponse: this.formatDryRunResponse(prompt, context),
          sessionId,
          threadId: sessionId,
          events: []
        }
      : this.runPiCli(formattedPrompt, sessionId, callbacks);
  }
  cancelCurrentRun() {
    this.cancelRequested = true;
    if (!this.activeChild) return;
    this.terminateActiveChild("SIGTERM");
    window.setTimeout(() => {
      if (this.activeChild) this.terminateActiveChild("SIGKILL");
    }, 1500);
  }
  terminateActiveChild(signal) {
    const child = this.activeChild;
    if (!child) return;
    try {
      if (process.platform === "win32" && child.pid) {
        (0, import_node_child_process3.execFileSync)(
          "taskkill",
          ["/pid", String(child.pid), "/T", "/F"],
          {
            timeout: 2e3,
            windowsHide: true
          }
        );
      } else if (child.pid) {
        process.kill(-child.pid, signal);
      } else {
        child.kill(signal);
      }
    } catch {
      try {
        child.kill(signal);
      } catch {}
    }
  }
  runPiCli(prompt, sessionId, callbacks) {
    if (!this.pluginDirectory) throw new Error("Plugin directory is not available.");
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");
    const session = this.resolveOrCreateSession(sessionId);
    const args = this.buildPiArgs(session.path, "json");
    return new Promise((resolve, reject) => {
      this.cancelRequested = false;
      const piExecutable = findPiExecutable(this.settings.piExecutablePath);
      const invocation = buildPiProcessInvocation(piExecutable, args, {
        cwd: this.workingDirectory ?? this.pluginDirectory,
        detached: process.platform !== "win32"
      });
      const child = (0, import_node_child_process3.spawn)(
        invocation.command,
        invocation.args,
        invocation.options
      );
      this.activeChild = child;
      callbacks?.onEvent?.({
        type: "pi_start",
        raw: {
          args: args.slice(1),
          cwd: this.workingDirectory ?? this.pluginDirectory
        }
      });
      let stdoutBuffer = "";
      let stderr = "";
      let finalResponse = "";
      let settled = false;
      const events = [];
      let runState;
      const updateRunState = (nextRunState) => {
        if (nextRunState) runState = { ...runState, ...nextRunState };
      };
      const failOnce = (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      const flushStdoutBuffer = () => {
        if (!stdoutBuffer.trim()) return;
        handlePiJsonEventLine(
          stdoutBuffer.trim(),
          callbacks,
          events,
          (delta) => {
            finalResponse += delta;
          },
          updateRunState
        );
        stdoutBuffer = "";
      };
      const getErrorText = () =>
        runState?.errorMessage ?? stderr.trim() ?? runState?.fallbackText?.trim();
      child.stdout.on("data", (chunk) => {
        stdoutBuffer += chunk.toString("utf8");
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? "";
        for (const line of lines) {
          handlePiJsonEventLine(
            line,
            callbacks,
            events,
            (delta) => {
              finalResponse += delta;
            },
            updateRunState
          );
        }
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      child.once("error", (error) => {
        failOnce(createPiCliError({ error }));
      });
      child.once("close", (exitCode) => {
        if (this.activeChild === child) this.activeChild = void 0;
        if (settled) return;
        if (this.cancelRequested) {
          this.cancelRequested = false;
          failOnce(new Error("Pi run canceled."));
          return;
        }
        flushStdoutBuffer();
        const errorText = getErrorText();
        if (exitCode && exitCode !== 0) {
          failOnce(
            new Error(formatPiCliFailure({ context: "Pi run failed", stderr: errorText, exitCode }))
          );
          return;
        }
        if (runState?.errorMessage) {
          failOnce(new Error(runState.errorMessage));
          return;
        }
        settled = true;
        resolve({
          finalResponse: this.getFinalResponse(
            finalResponse,
            runState?.fallbackText,
            events,
            isPiCliCommandPrompt(prompt)
          ),
          sessionId: session.reference,
          threadId: session.reference,
          events,
          contextUsage: this.getRunContextUsage(runState?.tokenUsage, events),
          contextCompacted: this.didCompactContext(events),
          tokenUsage: runState?.tokenUsage ?? void 0
        });
      });
      child.stdin.write(prompt);
      child.stdin.end();
    });
  }
  runPiRpcCompact(sessionId, customInstructions = "", callbacks) {
    if (!this.pluginDirectory) throw new Error("Plugin directory is not available.");
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");
    const session = this.resolveOrCreateSession(sessionId);
    const args = this.buildPiArgs(session.path, "rpc");
    return new Promise((resolve, reject) => {
      this.cancelRequested = false;
      const piExecutable = findPiExecutable(this.settings.piExecutablePath);
      const invocation = buildPiProcessInvocation(piExecutable, args, {
        cwd: this.workingDirectory ?? this.pluginDirectory,
        detached: process.platform !== "win32"
      });
      const child = (0, import_node_child_process3.spawn)(
        invocation.command,
        invocation.args,
        invocation.options
      );
      this.activeChild = child;
      callbacks?.onEvent?.({
        type: "pi_start",
        raw: { args: args.slice(1), cwd: this.workingDirectory ?? this.pluginDirectory }
      });
      let stdoutBuffer = "";
      let stderr = "";
      let settled = false;
      const events = [];
      const requestId = `compact-${Date.now()}`;
      const failOnce = (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      const finishOnce = (response) => {
        if (settled) return;
        settled = true;
        this.terminateActiveChild("SIGTERM");
        const result = response.data;
        resolve({
          finalResponse: response.success
            ? "Context compacted."
            : `Context compaction failed: ${response.error ?? "Unknown error"}`,
          sessionId: session.reference,
          threadId: session.reference,
          events,
          contextUsage: void 0,
          contextCompacted: response.success === true,
          tokenUsage: void 0,
          compactionResult: result
        });
      };
      const handleLine = (line) => {
        if (!line.trim()) return;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }
        if (event.type === "response" && event.id === requestId && event.command === "compact") {
          finishOnce(event);
          return;
        }
        handlePiJsonEventLine(
          line,
          callbacks,
          events,
          () => {},
          () => {}
        );
      };
      child.stdout.on("data", (chunk) => {
        stdoutBuffer += chunk.toString("utf8");
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? "";
        for (const line of lines) handleLine(line);
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      child.once("error", (error) => {
        failOnce(createPiCliError({ error }));
      });
      child.once("close", (exitCode) => {
        if (this.activeChild === child) this.activeChild = void 0;
        if (settled) return;
        if (this.cancelRequested) {
          this.cancelRequested = false;
          failOnce(new Error("Pi run canceled."));
          return;
        }
        if (stdoutBuffer.trim()) handleLine(stdoutBuffer.trim());
        if (settled) return;
        failOnce(
          new Error(formatPiCliFailure({ context: "Pi RPC compact failed", stderr, exitCode }))
        );
      });
      child.stdin.write(
        `${JSON.stringify({
          id: requestId,
          type: "compact",
          ...(customInstructions ? { customInstructions } : {})
        })}
`
      );
    });
  }
  getFinalResponse(finalResponse, fallbackText, events, isCommandPrompt = false) {
    const response = (finalResponse.trim() || (fallbackText || "").trim()).trim();
    if (response) return response;
    const compactionEnd = [...events]
      .reverse()
      .find((event) => this.normalizeCompactionEventType(event.type) === "compaction_end");
    if (!compactionEnd || !isCommandPrompt) return response;
    if (compactionEnd.raw?.errorMessage)
      return `Context compaction failed: ${String(compactionEnd.raw.errorMessage)}`;
    if (compactionEnd.raw?.aborted) return "Context compaction skipped.";
    return "Context compacted.";
  }
  getRunContextUsage(tokenUsage, events = []) {
    if (this.didCompactContext(events)) return void 0;
    const model = this.getModelInfoForTokenUsage(tokenUsage) ?? this.getSelectedModelInfo();
    const contextWindow = model?.contextWindow ?? tokenUsage?.contextWindow ?? 0;
    return createContextUsage(tokenUsage, contextWindow);
  }
  didCompactContext(events = []) {
    return events.some((event) => {
      if (this.normalizeCompactionEventType(event.type) !== "compaction_end") return false;
      return !event.raw?.errorMessage && !event.raw?.aborted;
    });
  }
  normalizeCompactionEventType(type) {
    return type === "auto_compaction_start" || type === "session_before_compact"
      ? "compaction_start"
      : type === "auto_compaction_end" || type === "session_compact"
        ? "compaction_end"
        : type;
  }
  getModelInfoForTokenUsage(tokenUsage) {
    if (!tokenUsage) return void 0;
    const modelId =
      tokenUsage.modelId ||
      (tokenUsage.provider && tokenUsage.model ? `${tokenUsage.provider}/${tokenUsage.model}` : "");
    if (modelId) {
      const exactMatch = this.settings.availableModels.find((model) => model.slug === modelId);
      if (exactMatch) return exactMatch;
    }
    return tokenUsage.model
      ? this.settings.availableModels.find((model) => model.slug.endsWith(`/${tokenUsage.model}`))
      : void 0;
  }
  getSelectedModelInfo() {
    let modelId =
      this.settings.model === CUSTOM_MODEL_VALUE ? this.settings.customModel : this.settings.model;
    if (!modelId) modelId = this.settings.effectiveModel;
    return modelId ? this.settings.availableModels.find((model) => model.slug === modelId) : void 0;
  }
  buildPiArgs(sessionId, mode = "json") {
    const args = ["--mode", mode, "--session", sessionId];
    const model =
      this.settings.model === CUSTOM_MODEL_VALUE ? this.settings.customModel : this.settings.model;
    if (model) args.push("--model", model);
    if (this.settings.reasoningEffort) args.push("--thinking", this.settings.reasoningEffort);
    if (this.settings.includeDefaultSkills === false) args.push("--no-skills");
    for (const skillPath of getConfiguredSkillPaths(this.settings, this.workingDirectory)) {
      args.push("--skill", skillPath);
    }
    const toolMode =
      this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    if (toolMode === "chat") {
      args.push("--no-tools");
    } else {
      args.push(
        "--tools",
        toolMode === "full-agent"
          ? "read,grep,find,ls,edit,write,bash"
          : toolMode === "edit"
            ? "read,grep,find,ls,edit,write"
            : "read,grep,find,ls"
      );
    }
    return args;
  }
  getSessionDirectory() {
    return import_node_path5.default.resolve(this.pluginDirectory ?? ".", "pi-sessions");
  }
  createSessionFilePath() {
    const sessionDir = this.getSessionDirectory();
    import_node_fs5.default.mkdirSync(sessionDir, { recursive: true });
    return import_node_path5.default.join(
      sessionDir,
      `${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`
    );
  }
  createSessionReference(sessionPath) {
    const sessionDir = this.getSessionDirectory();
    const relativePath = import_node_path5.default.relative(
      sessionDir,
      import_node_path5.default.resolve(sessionPath)
    );
    return relativePath && isSafeRelativePath(relativePath) ? relativePath : void 0;
  }
  resolveSessionPath(sessionReference) {
    if (!sessionReference) return void 0;
    const sessionDir = this.getSessionDirectory();
    const resolvedPath = import_node_path5.default.isAbsolute(sessionReference)
      ? import_node_path5.default.resolve(sessionReference)
      : import_node_path5.default.resolve(sessionDir, sessionReference);
    const relativePath = import_node_path5.default.relative(sessionDir, resolvedPath);
    if (!relativePath || !isSafeRelativePath(relativePath)) return void 0;
    return resolvedPath;
  }
  resolveOrCreateSession(sessionReference) {
    const existingPath = this.resolveSessionPath(sessionReference);
    const sessionPath =
      existingPath && import_node_fs5.default.existsSync(existingPath)
        ? existingPath
        : this.createSessionFilePath();
    return {
      path: sessionPath,
      reference: this.createSessionReference(sessionPath) ?? sessionPath
    };
  }
  createForkSessionFile(sessionReference) {
    const sessionPath = this.resolveSessionPath(sessionReference);
    if (!sessionPath || !import_node_fs5.default.existsSync(sessionPath)) return void 0;
    const events = import_node_fs5.default
      .readFileSync(sessionPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const sessionEvent = events.find((event) => event.type === "session");
    if (!sessionEvent) return void 0;
    const forkSessionPath = this.createSessionFilePath();
    const forkSessionEvent = {
      ...sessionEvent,
      id: createSessionId(),
      timestamp: /* @__PURE__ */ new Date().toISOString(),
      cwd: this.workingDirectory || sessionEvent.cwd,
      parentSession: this.createSessionReference(sessionPath) ?? sessionPath
    };
    import_node_fs5.default.writeFileSync(
      forkSessionPath,
      `${JSON.stringify(forkSessionEvent)}
${events
  .filter((event) => event.type !== "session")
  .map((event) => JSON.stringify(event))
  .join("\n")}
`,
      "utf8"
    );
    return this.createSessionReference(forkSessionPath) ?? forkSessionPath;
  }
  formatDryRunCompactResponse(sessionId) {
    return {
      finalResponse: "Dry run: context would be compacted.",
      sessionId,
      threadId: sessionId,
      events: [],
      contextCompacted: true
    };
  }
  formatDryRunResponse(prompt, context) {
    const lines = [
      "Dry run: Pi CLI was not called.",
      "",
      `Prompt: ${prompt}`,
      "",
      context.activeNote
        ? `Active note: [[${context.activeNote.path.replace(/\.md$/i, "")}]]`
        : "Active note: none",
      `Automatic search results: ${context.searchResults.length}`,
      `Linked notes: ${context.linkedNeighborhood.length}`
    ];
    if (context.activeNote) {
      lines.push(
        "",
        "Backlinks:",
        ...context.activeNote.backlinks
          .slice(0, 8)
          .map((backlink) => `- [[${backlink.path.replace(/\.md$/i, "")}]] (${backlink.count})`),
        "",
        "Outgoing links:",
        ...context.activeNote.outgoingLinks
          .slice(0, 8)
          .map(
            (outgoingLink) =>
              `- [[${outgoingLink.path.replace(/\.md$/i, "")}]] (${outgoingLink.count})`
          ),
        "",
        "Unresolved links:",
        ...context.activeNote.unresolvedLinks
          .slice(0, 8)
          .map((unresolvedLink) => `- [[${unresolvedLink.display}]] (${unresolvedLink.count})`)
      );
    }
    if (context.searchResults.length > 0) {
      lines.push(
        "",
        "Automatic note matches:",
        ...context.searchResults.map(
          (result) => `- [[${result.path.replace(/\.md$/i, "")}]] score=${result.score}`
        )
      );
    }
    return lines.join("\n");
  }
};
function isSafeRelativePath(relativePath) {
  return (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${import_node_path5.default.sep}`) &&
    !import_node_path5.default.isAbsolute(relativePath)
  );
}
function createSessionId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  return randomUUID
    ? randomUUID.call(globalThis.crypto)
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// src/plugin/settings-tab.mjs
var import_obsidian3 = require("obsidian");

// src/ui/modals/confirm-modal.mjs
var import_obsidian2 = require("obsidian");
function confirmWithModal(app, options) {
  return new Promise((resolve) => {
    new ConfirmModal(app, options, resolve).open();
  });
}
var ConfirmModal = class extends import_obsidian2.Modal {
  constructor(app, options, resolve) {
    super(app);
    this.options = options;
    this.resolve = resolve;
    this.settled = false;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new import_obsidian2.Setting(contentEl).setName(this.options.title).setHeading();
    contentEl.createEl("p", { text: this.options.message });
    const actionsEl = contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    actionsEl
      .createEl("button", { text: this.options.cancelText ?? "Cancel" })
      .addEventListener("click", () => {
        this.finish(false);
        this.close();
      });
    actionsEl
      .createEl("button", {
        text: this.options.confirmText ?? "Continue",
        cls: this.options.warning ? "mod-warning" : "mod-cta"
      })
      .addEventListener("click", () => {
        this.finish(true);
        this.close();
      });
  }
  onClose() {
    this.finish(false);
    this.contentEl.empty();
  }
  finish(value) {
    if (this.settled) return;
    this.settled = true;
    this.resolve(value);
  }
};

// src/plugin/settings-tab.mjs
var PiAgentSettingTab = class extends import_obsidian3.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian3.Setting(containerEl)
      .setName("Model")
      .setDesc(
        "Provider/model from Pi's built-in and custom model registry. Use default to follow ~/.pi/agent/settings.json or .pi/settings.json."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(getModelOptions(this.plugin.settings))
          .setValue(this.getModelDropdownValue())
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            this.plugin.settings.reasoningEffort = "";
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Refresh")
          .setTooltip("Refresh models from Pi")
          .onClick(async () => {
            button.setButtonText("Refreshing...");
            button.setDisabled(true);
            await this.plugin.refreshModelCatalog(true);
            this.display();
          })
      );
    if (this.plugin.settings.model === CUSTOM_MODEL_VALUE) {
      new import_obsidian3.Setting(containerEl)
        .setName("Custom model ID")
        .setDesc("Provider/model ID, for example anthropic/claude-sonnet-4-5.")
        .addText((text) =>
          text
            .setPlaceholder("e.g. anthropic/claude-sonnet-4-5")
            .setValue(this.plugin.settings.customModel)
            .onChange(async (value) => {
              this.plugin.settings.customModel = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }
    new import_obsidian3.Setting(containerEl)
      .setName("Thinking level")
      .setDesc(
        "Controls reasoning effort only. Values come from the selected model returned by Pi."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(this.getReasoningOptions())
          .setValue(this.getReasoningDropdownValue())
          .onChange(async (value) => {
            this.plugin.settings.reasoningEffort = value;
            await this.plugin.saveSettings();
          })
      );
    new import_obsidian3.Setting(containerEl)
      .setName("Tool mode")
      .setDesc("Controls which Pi CLI tools are enabled. Tool modes are not an OS-level sandbox.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(getToolModeOptions())
          .setValue(this.plugin.settings.sandboxMode)
          .onChange(async (value) => {
            if (
              (value === "edit" || value === "full-agent" || value === "workspace-write") &&
              !this.plugin.settings.acknowledgedToolRisk &&
              !(await confirmWithModal(this.app, {
                title: "Enable write tools?",
                message:
                  "Pi tool modes are not an OS-level sandbox. Edit and Full agent can modify vault/project files, and Full agent can run shell commands.",
                confirmText: "Enable tools",
                warning: true
              }))
            ) {
              this.display();
              return;
            }
            this.plugin.settings.sandboxMode = value;
            if (value === "edit" || value === "full-agent" || value === "workspace-write") {
              this.plugin.settings.acknowledgedToolRisk = true;
            }
            await this.plugin.saveSettings();
          })
      );
    new import_obsidian3.Setting(containerEl)
      .setName("Custom instructions")
      .setDesc("Vault-specific instructions added to every Pi run.")
      .addTextArea((text) =>
        text
          .setPlaceholder("Prefer PARA folders. Keep project notes concise.")
          .setValue(this.plugin.settings.customInstructions)
          .onChange(async (value) => {
            this.plugin.settings.customInstructions = value;
            await this.plugin.saveSettings();
          })
      );
    new import_obsidian3.Setting(containerEl).setName("Pi CLI").setHeading();
    new import_obsidian3.Setting(containerEl)
      .setName("Pi executable path")
      .setDesc(
        "Optional path to the Pi CLI. Leave empty to auto-detect common install locations. Supports ~ and environment variables like ${USER}."
      )
      .addText((text) =>
        text
          .setPlaceholder("/etc/profiles/per-user/${USER}/bin/pi")
          .setValue(this.plugin.settings.piExecutablePath)
          .onChange(async (value) => {
            this.plugin.settings.piExecutablePath = value.trim();
            await this.plugin.saveSettings();
          })
      );
    new import_obsidian3.Setting(containerEl)
      .setName("Check Pi installation")
      .setDesc("Verify that Obsidian can run the Pi CLI from its current environment.")
      .addButton((button) =>
        button.setButtonText("Check").onClick(() => {
          this.plugin.checkPiInstallation(true);
        })
      );
    new import_obsidian3.Setting(containerEl).setName("Skills").setHeading();
    new import_obsidian3.Setting(containerEl)
      .setName("Include default Pi skills")
      .setDesc(
        "Load skills discovered by Pi from global and vault/project skill locations. Turn this off to use only the additional skill folders below."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeDefaultSkills !== false)
          .onChange(async (value) => {
            this.plugin.settings.includeDefaultSkills = value;
            await this.plugin.saveSettings();
          })
      );
    new import_obsidian3.Setting(containerEl)
      .setName("Additional skill folders")
      .setDesc(
        "One trusted skill file or folder per line. Supports absolute and vault-relative paths."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder(".pi/skills\n/path/to/my-skills")
          .setValue(
            normalizeSkillFolderList(this.plugin.settings.additionalSkillFolders).join("\n")
          )
          .onChange(async (value) => {
            this.plugin.settings.additionalSkillFolders = value
              .split(/\r?\n/)
              .map((item) => item.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );
    new import_obsidian3.Setting(containerEl).setName("Context and file access").setHeading();
    new import_obsidian3.Setting(containerEl)
      .setName("Ignored folders/directories")
      .setDesc(
        "Comma-separated folder prefixes that Pi pre-attached context and retrieval should ignore."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder(".obsidian, .git, node_modules")
          .setValue(this.plugin.settings.ignoredFolders.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.ignoredFolders = value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );
  }
  getModelDropdownValue() {
    const { model } = this.plugin.settings;
    return Object.prototype.hasOwnProperty.call(getModelOptions(this.plugin.settings), model)
      ? model
      : CUSTOM_MODEL_VALUE;
  }
  getReasoningOptions() {
    return getReasoningOptions(this.plugin.settings);
  }
  getReasoningDropdownValue() {
    const options = this.getReasoningOptions();
    const value = this.plugin.settings.reasoningEffort;
    return Object.prototype.hasOwnProperty.call(options, value) ? value : "";
  }
};

// src/plugin/constants.mjs
var PI_AGENT_VIEW_TYPE = "pi-agent-view";
var PI_AGENT_DISPLAY_NAME = "Pi Agent";
var PI_AGENT_ICON_ID = "pi-agent";
var PI_AGENT_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M165.29 165.29H517.36V400H400V517.36H282.65V634.72H165.29ZM282.65 282.65V400H400V282.65Z"/><path fill="currentColor" d="M517.36 400H634.72V634.72H517.36Z"/></svg>';

// src/ui/modals/approval-modal.mjs
var import_obsidian4 = require("obsidian");

// src/shared/frontmatter.mjs
function readFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { frontmatter: {}, body: markdown, raw: "" };
  }
  const raw = match[1].trim();
  const body = markdown.slice(match[0].length);
  return { frontmatter: parseSimpleYaml(raw), body, raw };
}
function previewFrontmatterPatch(markdown, patch) {
  const parsed = readFrontmatter(markdown);
  if (!parsed.raw) {
    return `---
${formatSimpleYaml(patch)}
---
${markdown}`;
  }
  const lines = parsed.raw.split(/\r?\n/);
  const replacements = Object.fromEntries(
    Object.entries(patch)
      .filter(([, value]) => value !== void 0)
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
  return `---
${next.join("\n")}
---
${parsed.body}`;
}
function parseSimpleYaml(raw) {
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
function formatSimpleYaml(value) {
  return Object.entries(value)
    .filter(([, item]) => item !== void 0)
    .map(([key, item]) => formatYamlEntry(key, item))
    .join("\n");
}
function formatYamlEntry(key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return `${key}: []`;
    return `${key}:
${value.map((item) => `  - ${formatYamlScalar(item)}`).join("\n")}`;
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

// src/ui/modals/approval-modal.mjs
var ApprovalModal = class extends import_obsidian4.Modal {
  constructor(plugin, change, onDone) {
    super(plugin.app);
    this.change = change;
    this.onDone = onDone;
    this.settled = false;
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("pi-agent-approval");
    new import_obsidian4.Setting(contentEl).setName("Approve vault change").setHeading();
    contentEl.createEl("p", { text: `${this.change.path} - ${this.change.reason}` });
    const previewEl = contentEl.createEl("div", { cls: "pi-agent-change-preview" });
    previewEl.createEl("h3", { text: "Before" });
    previewEl.createEl("pre", { text: this.change.before || "(new file)" });
    previewEl.createEl("h3", { text: "After" });
    previewEl.createEl("pre", { text: this.change.after });
    const actionsEl = contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    actionsEl.createEl("button", { text: "Reject" }).addEventListener("click", () => {
      this.finish();
      this.close();
    });
    actionsEl
      .createEl("button", { text: "Apply change", cls: "mod-cta" })
      .addEventListener("click", async () => {
        await this.applyChange();
        this.finish();
        this.close();
      });
  }
  onClose() {
    this.finish();
    this.contentEl.empty();
  }
  async applyChange() {
    const file = this.app.vault.getAbstractFileByPath(this.change.path);
    if (file instanceof import_obsidian4.TFile) {
      await this.app.vault.process(file, (content) => {
        if (this.change.before !== void 0 && content !== this.change.before) {
          throw new Error("File changed since Pi prepared this change.");
        }
        return this.change.frontmatterPatch
          ? previewFrontmatterPatch(content, this.change.frontmatterPatch)
          : this.change.after;
      });
    } else {
      await this.app.vault.create(this.change.path, this.change.after);
    }
    new import_obsidian4.Notice(`Applied Pi change to ${this.change.path}`);
  }
  finish() {
    if (this.settled) return;
    this.settled = true;
    this.onDone();
  }
};

// src/ui/modals/pi-setup-modal.mjs
var import_obsidian5 = require("obsidian");
var INSTALL_COMMAND = "npm install -g @earendil-works/pi-coding-agent";
var PiSetupModal = class extends import_obsidian5.Modal {
  constructor(plugin, health) {
    super(plugin.app);
    this.plugin = plugin;
    this.health = health;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new import_obsidian5.Setting(contentEl).setName("Set up Pi CLI").setHeading();
    contentEl.createEl("p", {
      text: this.health?.message ?? "Pi Agent needs the Pi CLI before it can run prompts."
    });
    const needsNode = this.health?.kind === "node-missing";
    contentEl.createEl("p", {
      text: needsNode
        ? "Install Node.js or make your Node version manager available to GUI apps, then fully restart Obsidian. After that, run pi --version in a terminal to confirm Pi still works."
        : "Install Pi in a terminal, authenticate it if needed, then restart Obsidian so it can pick up your updated PATH."
    });
    const commandText = needsNode
      ? "node --version\npi --version"
      : `${INSTALL_COMMAND}
pi --version`;
    contentEl.createEl("pre", { text: commandText });
    contentEl.createEl("p", {
      text: "Start in Chat or Review mode. Only enable Edit or Full agent in vaults you are comfortable letting Pi modify."
    });
    const actionsEl = contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    actionsEl
      .createEl("button", { text: needsNode ? "Copy diagnostic commands" : "Copy install command" })
      .addEventListener("click", async () => {
        await navigator.clipboard.writeText(needsNode ? commandText : INSTALL_COMMAND);
        new import_obsidian5.Notice(
          needsNode ? "Copied diagnostic commands." : "Copied Pi install command."
        );
      });
    actionsEl
      .createEl("button", { text: "Do not show again" })
      .addEventListener("click", async () => {
        this.plugin.settings.dismissedPiSetup = true;
        await this.plugin.saveSettings();
        this.close();
      });
    actionsEl
      .createEl("button", { text: "Close", cls: "mod-cta" })
      .addEventListener("click", () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/ui/PiAgentView.mjs
var f5 = __toESM(require("obsidian"), 1);

// src/ui/message-actions.mjs
var import_obsidian6 = require("obsidian");
var MessageActions = class {
  constructor(plugin, callbacks) {
    this.plugin = plugin;
    this.callbacks = callbacks;
  }
  showMessageMenu(event, message, messageIndex) {
    const menu = new import_obsidian6.Menu();
    if (message.role === "user") {
      menu.addItem((item) =>
        item
          .setTitle("Edit and resend")
          .setIcon("pencil")
          .onClick(() => {
            const input = this.callbacks.getInput();
            if (input) {
              input.value = message.content;
              input.focus();
            }
          })
      );
      menu.addItem((item) =>
        item
          .setTitle("Search vault for this")
          .setIcon("search")
          .onClick(() =>
            this.callbacks.runPrompt(`Search the vault for notes related to:

${message.content}`)
          )
      );
    } else {
      menu.addItem((item) =>
        item
          .setTitle("Copy response")
          .setIcon("copy")
          .onClick(() => this.copyResponse(message.content))
      );
      menu.addItem((item) =>
        item
          .setTitle("Insert into current note")
          .setIcon("file-plus")
          .onClick(() => this.callbacks.insertIntoCurrentNote(message.content))
      );
      menu.addItem((item) =>
        item
          .setTitle("Create note from response")
          .setIcon("file-text")
          .onClick(() => this.callbacks.createNoteFromResponse(message.content))
      );
      menu.addItem((item) =>
        item
          .setTitle("Open cited notes")
          .setIcon("links-coming-in")
          .setDisabled(this.callbacks.extractVaultLinks(message.content).length === 0)
          .onClick(() => this.callbacks.openCitedNotes(message.content))
      );
      menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle("Regenerate")
          .setIcon("refresh-cw")
          .setDisabled(!this.callbacks.getPreviousUserPrompt(messageIndex))
          .onClick(() => {
            const prompt = this.callbacks.getPreviousUserPrompt(messageIndex);
            if (prompt) this.callbacks.runPrompt(prompt);
          })
      );
    }
    menu.showAtMouseEvent(event);
  }
  async copyResponse(content) {
    await navigator.clipboard.writeText(content);
    new import_obsidian6.Notice("Copied response.");
  }
};

// src/ui/note-actions.mjs
var import_obsidian7 = require("obsidian");
var NoteActions = class {
  constructor(plugin, callbacks) {
    this.plugin = plugin;
    this.callbacks = callbacks;
  }
  async copyText(text) {
    await navigator.clipboard.writeText(text);
    new import_obsidian7.Notice("Copied to clipboard.");
  }
  insertIntoCurrentNote(text) {
    const editor = this.plugin.app.workspace.activeEditor?.editor;
    if (!editor) {
      new import_obsidian7.Notice("Open a note first.");
      return;
    }
    editor.replaceSelection(text);
  }
  async createNoteFromResponse(response) {
    const title = this.getResponseTitle(response);
    const path6 = await this.getAvailableNotePath(`${title}.md`);
    await this.ensureFolder("Pi");
    const file = await this.plugin.app.vault.create(path6, response);
    await this.plugin.app.workspace.getLeaf(false).openFile(file);
  }
  async openCitedNotes(text) {
    const links = this.extractVaultLinks(text);
    if (links.length === 0) {
      new import_obsidian7.Notice("No vault links found.");
      return;
    }
    for (const link of links.slice(0, 5)) await this.callbacks.openVaultLink(link);
  }
  getPreviousUserPrompt(messageIndex) {
    for (let index = messageIndex - 1; index >= 0; index--) {
      const message = this.plugin.messages[index];
      if (message?.role === "user") return message.content;
    }
    return void 0;
  }
  extractVaultLinks(text) {
    const links = /* @__PURE__ */ new Set();
    for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
      links.add(match[1]);
    }
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+\.md)(?:#[^)]+)?\)/g)) {
      links.add(
        this.callbacks.formatVaultLinkTarget(
          this.callbacks.parseVaultLinkTarget(match[1]) ?? { path: match[1] }
        )
      );
    }
    for (const match of text.matchAll(
      /(^|\s)((?:\/?[A-Za-z0-9 _.-]+\/)+[A-Za-z0-9 _.-]+\.md(?::\d+)?)/g
    )) {
      const rawTarget = match[2];
      const target = this.callbacks.parseVaultLinkTarget(rawTarget);
      links.add(target ? this.callbacks.formatVaultLinkTarget(target) : rawTarget);
    }
    return [...links];
  }
  getResponseTitle(response) {
    const heading = response.match(/^#\s+(.+)$/m)?.[1];
    return (
      (heading ?? response.split(/\r?\n/).find((line) => line.trim()) ?? "Agent response")
        .replace(/[\\/:*?"<>|#[\]]/g, "")
        .trim()
        .slice(0, 80) || "Agent response"
    );
  }
  async ensureFolder(folder) {
    const parts = normalizeArchiveFolder(folder).split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.plugin.app.vault.getAbstractFileByPath(current)) {
        await this.plugin.app.vault.createFolder(current);
      }
    }
  }
  async getAvailableNotePath(name, folder = "Pi") {
    const normalizedFolder = normalizeArchiveFolder(folder);
    const path6 = `${normalizedFolder}/${name}`;
    if (!this.plugin.app.vault.getAbstractFileByPath(path6)) return path6;
    const basename = name.replace(/\.md$/i, "");
    for (let index = 2; index < 100; index++) {
      const candidate = `${normalizedFolder}/${basename} ${index}.md`;
      if (!this.plugin.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }
    return `${normalizedFolder}/${basename} ${Date.now()}.md`;
  }
};
function normalizeArchiveFolder(folder) {
  return (0, import_obsidian7.normalizePath)(normalizeVaultFolder(folder, "Pi"));
}

// src/ui/prompt-queue.mjs
var prompt_queue_exports = {};
__export(prompt_queue_exports, {
  enqueuePrompt: () => enqueuePrompt,
  prioritizeQueuedPrompt: () => prioritizeQueuedPrompt,
  removeQueuedPrompt: () => removeQueuedPrompt,
  renderPromptQueue: () => renderPromptQueue,
  runNextQueuedPrompt: () => runNextQueuedPrompt
});
var f = __toESM(require("obsidian"), 1);
function enqueuePrompt(e, t = this.plugin.getCurrentThread().id) {
  let n = e.trim();
  if (!n) return;
  (this.promptQueue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    prompt: n,
    threadId: t
  }),
    this.renderPromptQueue(),
    this.syncCurrentRunFlags(),
    this.setRunningState(this.running),
    new f.Notice(
      this.promptQueue.length === 1
        ? "Message queued. It will send after the current run finishes."
        : `${this.promptQueue.length} messages queued.`
    ));
}
function runNextQueuedPrompt() {
  if (this.canceling || this.promptQueue.length === 0) return;
  let t = this.promptQueue.findIndex((n) => !this.isThreadRunning(n.threadId));
  if (t < 0) return;
  let [e] = this.promptQueue.splice(t, 1);
  (this.renderPromptQueue(),
    this.syncCurrentRunFlags(),
    this.setRunningState(this.running),
    e && this.runPrompt(e.prompt, e.threadId));
}
function removeQueuedPrompt(e) {
  let t = this.promptQueue.length;
  ((this.promptQueue = this.promptQueue.filter((n) => n.id !== e)),
    this.promptQueue.length !== t &&
      (this.renderPromptQueue(), this.syncCurrentRunFlags(), this.setRunningState(this.running)));
}
function prioritizeQueuedPrompt(e) {
  let t = this.promptQueue.findIndex((n2) => n2.id === e);
  if (t <= 0) return;
  let [n] = this.promptQueue.splice(t, 1);
  (this.promptQueue.unshift(n),
    this.renderPromptQueue(),
    this.syncCurrentRunFlags(),
    this.setRunningState(this.running));
}
function renderPromptQueue() {
  if (!this.promptQueueEl) return;
  let e = this.promptQueueEl;
  if (
    (e.empty(),
    e.toggleClass("is-empty", this.promptQueue.length === 0),
    this.promptQueue.length === 0)
  )
    return;
  let t = e.createDiv({ cls: "pi-agent-prompt-queue-heading" });
  (t.createSpan({
    text: `${this.promptQueue.length} queued message${this.promptQueue.length === 1 ? "" : "s"}`
  }),
    t.createSpan({
      cls: "pi-agent-prompt-queue-hint",
      text: "Runs after the current response."
    }));
  for (let [n, s] of this.promptQueue.entries()) {
    let a = e.createDiv({ cls: "pi-agent-prompt-queue-item" });
    a.createDiv({ cls: "pi-agent-prompt-queue-text", text: s.prompt });
    let o = a.createDiv({ cls: "pi-agent-prompt-queue-actions" });
    if (n > 0) {
      let l = o.createEl("button", {
        cls: "clickable-icon pi-agent-prompt-queue-action",
        attr: { "aria-label": "Run this queued message next", title: "Run next" }
      });
      ((0, f.setIcon)(l, "corner-up-left"),
        l.addEventListener("click", () => this.prioritizeQueuedPrompt(s.id)));
    }
    let d = o.createEl("button", {
      cls: "clickable-icon pi-agent-prompt-queue-action",
      attr: { "aria-label": "Remove queued message", title: "Remove" }
    });
    ((0, f.setIcon)(d, "x"), d.addEventListener("click", () => this.removeQueuedPrompt(s.id)));
  }
}

// src/ui/thread-list-view.mjs
var thread_list_view_exports = {};
__export(thread_list_view_exports, {
  deleteThreadFromList: () => deleteThreadFromList,
  formatThreadDate: () => formatThreadDate,
  formatThreadMeta: () => formatThreadMeta,
  renderThreadList: () => renderThreadList,
  renderThreadListRow: () => renderThreadListRow,
  showThreadList: () => showThreadList,
  showThreadRowMenu: () => showThreadRowMenu,
  startThreadListRename: () => startThreadListRename,
  toggleThreadFavorite: () => toggleThreadFavorite
});
var f2 = __toESM(require("obsidian"), 1);
function showThreadList() {
  ((this.showingThreadList = true), this.renderThreadList());
}
function renderThreadList() {
  var a;
  let e = this.containerEl.children[1],
    t = this.plugin.listThreads({ includeArchived: true }),
    n = this.plugin.getCurrentThread();
  ((a = this.suggestions) == null || a.close(),
    this.cleanupComposerBarObserver(),
    (this.messagesEl = void 0),
    (this.inputEl = void 0),
    (this.sendButtonEl = void 0),
    (this.composerBarEl = void 0),
    (this.composerBarExpandEl = void 0),
    (this.runSettings = void 0),
    (this.toolBadgesEl = void 0),
    (this.threadTitleEl = void 0),
    e.empty(),
    e.addClass("pi-agent-view"));
  let s = e.createDiv({ cls: "pi-agent-thread-list-header" }),
    o = s.createEl("button", {
      cls: "clickable-icon pi-agent-header-action",
      attr: { "aria-label": "Back to chat", title: "Back to chat" }
    });
  ((0, f2.setIcon)(o, "arrow-left"), o.addEventListener("click", () => this.renderChatView()));
  let l = s.createDiv({ cls: "pi-agent-thread-list-heading" });
  (l.createDiv({ cls: "pi-agent-thread-list-title-heading", text: "Threads" }),
    l.createDiv({
      cls: "pi-agent-thread-list-subtitle",
      text: `${t.length} chat${t.length === 1 ? "" : "s"}`
    }));
  let d = s.createEl("button", {
    cls: "clickable-icon pi-agent-header-action",
    attr: { "aria-label": "New chat", title: "New chat" }
  });
  ((0, f2.setIcon)(d, "plus"),
    d.addEventListener("click", () => {
      (this.plugin.startNewThread(), this.renderChatView());
    }));
  let h = e.createDiv({ cls: "pi-agent-thread-list" });
  t.length === 0
    ? h.createDiv({ cls: "pi-agent-empty", text: "No chat threads." })
    : t.forEach((m) => this.renderThreadListRow(h, m, m.id === n.id));
}
function renderThreadListRow(e, t, n) {
  let s = e.createDiv({
      cls: `pi-agent-thread-list-row${n ? " is-current" : ""}`
    }),
    a = s.createDiv({ cls: "pi-agent-thread-list-info" }),
    o = a.createDiv({
      cls: "pi-agent-thread-list-title",
      attr: { title: "Open chat" }
    });
  if (this.isThreadRunning(t.id)) {
    let h2 = o.createSpan({
      cls: "pi-agent-thread-list-running",
      attr: { title: "Agent is running in this chat" }
    });
    (0, f2.setIcon)(h2, "loader");
  }
  if (t.favorite) {
    let h2 = o.createSpan({
      cls: "pi-agent-thread-list-favorite-indicator",
      attr: { title: "Favorite chat" }
    });
    (0, f2.setIcon)(h2, "star");
  }
  o.createSpan({ text: t.title });
  (s.addEventListener("click", () => {
    (this.plugin.switchThread(t.id), this.renderChatView());
  }),
    a.createDiv({ cls: "pi-agent-thread-list-meta", text: this.formatThreadMeta(t, n) }));
  let l = s.createDiv({ cls: "pi-agent-thread-list-actions" }),
    d = l.createEl("button", {
      cls: `clickable-icon pi-agent-thread-list-action pi-agent-thread-favorite${t.favorite ? " is-favorite" : ""}`,
      attr: {
        "aria-label": t.favorite ? "Remove favorite" : "Mark as favorite",
        title: t.favorite ? "Remove favorite" : "Mark as favorite"
      }
    }),
    h = l.createEl("button", {
      cls: "clickable-icon pi-agent-thread-list-action",
      attr: { "aria-label": "Thread actions", title: "Thread actions" }
    });
  ((0, f2.setIcon)(d, t.favorite ? "star" : "star"),
    d.addEventListener("click", (u) => {
      (u.preventDefault(), u.stopPropagation(), this.toggleThreadFavorite(t));
    }),
    (0, f2.setIcon)(h, "more-horizontal"),
    h.addEventListener("click", (u) => {
      (u.preventDefault(), u.stopPropagation(), this.showThreadRowMenu(u, t, n, o));
    }));
}
function showThreadRowMenu(e, t, n, s) {
  let a = new f2.Menu();
  (a.addItem((o) =>
    o
      .setTitle(n ? "Current chat" : "Open")
      .setIcon(n ? "check" : "arrow-right")
      .setDisabled(n)
      .onClick(() => {
        (this.plugin.switchThread(t.id), this.renderChatView());
      })
  ),
    a.addItem((o) =>
      o
        .setTitle(t.favorite ? "Remove favorite" : "Mark as favorite")
        .setIcon("star")
        .onClick(() => this.toggleThreadFavorite(t))
    ),
    a.addItem((o) =>
      o
        .setTitle("Rename")
        .setIcon("pencil")
        .onClick(() => this.startThreadListRename(t, s))
    ),
    a.addSeparator(),
    a.addItem((o) =>
      o
        .setTitle("Delete")
        .setIcon("trash-2")
        .onClick(() => this.deleteThreadFromList(t))
    ),
    a.showAtMouseEvent(e));
}
function startThreadListRename(e, t) {
  let n = document.createElement("input");
  (n.addClass("pi-agent-thread-list-title-input"),
    n.setAttr("type", "text"),
    n.setAttr("aria-label", "Chat title"),
    (n.value = e.title),
    t.replaceWith(n));
  let s = (a) => {
    let o = n.value.trim();
    (a && o && o !== e.title && this.plugin.renameThread(e.id, o), this.renderThreadList());
  };
  (n.addEventListener("click", (a) => a.stopPropagation()),
    n.addEventListener("keydown", (a) => {
      a.key === "Enter"
        ? (a.preventDefault(), s(true))
        : a.key === "Escape" && (a.preventDefault(), s(false));
    }),
    n.addEventListener("blur", () => s(true)),
    n.focus(),
    n.select());
}
function toggleThreadFavorite(e) {
  this.plugin.toggleThreadFavorite(e.id)
    ? this.renderThreadList()
    : new f2.Notice("Chat thread was not found.");
}
async function deleteThreadFromList(e) {
  if (this.isThreadRunning(e.id)) {
    new f2.Notice("Wait for the agent run to finish before deleting this chat.");
    return;
  }
  let t = await confirmWithModal(this.plugin.app, {
    title: "Delete chat?",
    message: `Delete chat "${e.title}" from plugin history?`,
    confirmText: "Delete",
    warning: true
  });
  if (!t) return;
  this.plugin.deleteThread(e.id)
    ? (new f2.Notice("Chat deleted."), this.renderThreadList())
    : new f2.Notice("Chat thread was not found.");
}
function formatThreadMeta(e, t) {
  let n = this.plugin.getThreadDisplayMessageCount
      ? this.plugin.getThreadDisplayMessageCount(e)
      : e.messages.length,
    s = `${n} message${n === 1 ? "" : "s"} \u2022 Updated ${this.formatThreadDate(e.updatedAt)}`;
  return t ? `Current \u2022 ${s}` : s;
}
function formatThreadDate(e) {
  try {
    return new Date(e).toLocaleString();
  } catch {
    return "unknown date";
  }
}

// src/ui/vault-link-actions.mjs
var vault_link_actions_exports = {};
__export(vault_link_actions_exports, {
  formatVaultLinkTarget: () => formatVaultLinkTarget,
  getLinkLabel: () => getLinkLabel,
  getLinkSourcePath: () => getLinkSourcePath,
  getVaultBasePath: () => getVaultBasePath,
  normalizeVaultPath: () => normalizeVaultPath,
  openVaultLink: () => openVaultLink,
  openVaultPath: () => openVaultPath,
  parseVaultLinkTarget: () => parseVaultLinkTarget,
  resolveDirectVaultFile: () => resolveDirectVaultFile,
  revealLine: () => revealLine
});
var f3 = __toESM(require("obsidian"), 1);
async function openVaultLink(e, t = false) {
  var h, u, g;
  let n = typeof e == "string" ? this.parseVaultLinkTarget(e) : e;
  if (!n) {
    new f3.Notice(`Note not found: ${String(e)}`);
    return;
  }
  let s = n.path,
    a = s.replace(/\.md$/i, ""),
    o = this.getLinkSourcePath(),
    l =
      (g =
        (u = (h = this.resolveDirectVaultFile(s)) != null ? h : this.resolveDirectVaultFile(a)) !=
        null
          ? u
          : this.plugin.app.metadataCache.getFirstLinkpathDest(a, o)) != null
        ? g
        : this.plugin.app.metadataCache.getFirstLinkpathDest(s, o);
  if (!l) {
    new f3.Notice(`Note not found: ${this.formatVaultLinkTarget(n)}`);
    return;
  }
  let d = this.plugin.app.workspace.getLeaf(t);
  (await d.openFile(l, { active: true }), this.revealLine(d, n.line));
}
function parseVaultLinkTarget(e) {
  let t = e
      .trim()
      .replace(/^obsidian:\/\//, "")
      .replace(/\|.*$/, "")
      .replace(/#.*$/, ""),
    n = t.match(/:(\d+)$/),
    s = n ? Number.parseInt(n[1], 10) : void 0,
    a = n ? t.slice(0, -n[0].length) : t,
    o = this.normalizeVaultPath(a);
  return o ? { path: o, line: s } : void 0;
}
function normalizeVaultPath(e) {
  let t = e.replace(/\\/g, "/"),
    n = this.getVaultBasePath();
  return (n && t.startsWith(`${n}/`) ? t.slice(n.length + 1) : t)
    .replace(/^\/+/, "")
    .replace(/\.md$/i, ".md");
}
function formatVaultLinkTarget(e) {
  return e.line ? `${e.path}:${e.line}` : e.path;
}
function getLinkLabel(e) {
  var s, a;
  let t = this.parseVaultLinkTarget(e),
    n = (s = t == null ? void 0 : t.path) != null ? s : e;
  return (a = n.split("/").pop()) != null ? a : n;
}
function getLinkSourcePath() {
  var e, t, n, s;
  return (s =
    (n = (e = this.plugin.getCurrentContextFile()) == null ? void 0 : e.path) != null
      ? n
      : (t = this.plugin.app.workspace.getActiveFile()) == null
        ? void 0
        : t.path) != null
    ? s
    : "";
}
function getVaultBasePath() {
  var t, n;
  let e = this.plugin.app.vault.adapter;
  return (n = (t = e.getBasePath) == null ? void 0 : t.call(e)) == null
    ? void 0
    : n.replace(/\\/g, "/").replace(/\/+$/, "");
}
function resolveDirectVaultFile(e) {
  let t = [e, e.endsWith(".md") ? e : `${e}.md`];
  for (let n of t) {
    let s = this.plugin.app.vault.getAbstractFileByPath(n);
    if (s instanceof f3.TFile) return s;
  }
}
function revealLine(e, t) {
  !t ||
    t < 1 ||
    window.setTimeout(() => {
      var o, l, d;
      let s = e.view.editor;
      if (!s) return;
      let a = { line: t - 1, ch: 0 };
      ((o = s.setCursor) == null || o.call(s, a),
        (l = s.scrollIntoView) == null || l.call(s, { from: a, to: a }, true),
        (d = s.focus) == null || d.call(s));
    }, 50);
}
async function openVaultPath(e, t = "tab") {
  let n = this.parseVaultLinkTarget(e);
  if (!n) {
    new f3.Notice(`Note not found: ${e}`);
    return;
  }
  let s = n.path,
    a = this.plugin.app.vault.getAbstractFileByPath(s);
  if (a instanceof f3.TFile) {
    let o = this.plugin.app.workspace.getLeaf(t);
    (await o.openFile(a, { active: true }), this.revealLine(o, n.line));
    return;
  }
  await this.openVaultLink(n, t);
}

// src/ui/message-renderer.mjs
var message_renderer_exports = {};
__export(message_renderer_exports, {
  getVisibleActivityDetails: () => getVisibleActivityDetails,
  renderActivityDetails: () => renderActivityDetails,
  renderActivityMessage: () => renderActivityMessage,
  renderEmptyState: () => renderEmptyState,
  renderMessage: () => renderMessage,
  renderMessages: () => renderMessages,
  renderPlainMessageContent: () => renderPlainMessageContent,
  renderRoleLabel: () => renderRoleLabel,
  renderStreamingAssistantMessage: () => renderStreamingAssistantMessage,
  restoreMessagesScroll: () => restoreMessagesScroll,
  unloadMessageRenderComponents: () => unloadMessageRenderComponents
});
var f4 = __toESM(require("obsidian"), 1);

// src/ui/activity.mjs
function isStickyActivityKind(kind) {
  return kind === "read" || kind === "search" || kind === "edit" || kind === "shell";
}
function shouldBypassActivityStickiness(kind) {
  return kind === "answer" || kind === "finishing" || kind === "error";
}
function getToolKind(toolName) {
  const name = String(toolName || "").toLowerCase();
  return name === "bash"
    ? "shell"
    : name === "edit" || name === "write"
      ? "edit"
      : name === "grep" || name === "find" || name === "ls"
        ? "search"
        : name === "read"
          ? "read"
          : "thinking";
}
function formatToolStatus(toolName, toolArgs, phase = "running") {
  const name = String(toolName || "tool").toLowerCase();
  const kind = getToolKind(name);
  const target = formatToolTarget(name, toolArgs);
  const verb = getToolVerb(name, phase);
  const label = target ? `${verb} ${target}` : verb;
  return { label: truncateActivityText(label), kind, detail: "" };
}
function getToolEventKey(event) {
  return String(
    event.toolCallId ||
      `${event.toolName || event.message || "tool"}:${JSON.stringify(event.toolArgs || {}).slice(
        0,
        80
      )}`
  );
}
function formatRetryDetail(event) {
  if (!event || typeof event !== "object") return "";
  const attempt =
    event.attempt && event.maxAttempts ? `attempt ${event.attempt}/${event.maxAttempts}` : "";
  return [attempt, event.errorMessage ? String(event.errorMessage).slice(0, 120) : ""]
    .filter(Boolean)
    .join(" \u2014 ");
}
function getToolVerb(toolName, phase) {
  if (phase === "preparing") {
    return toolName === "bash"
      ? "Preparing command"
      : toolName === "edit"
        ? "Preparing edit"
        : toolName === "write"
          ? "Preparing write"
          : toolName === "grep" || toolName === "find" || toolName === "ls"
            ? "Preparing search"
            : toolName === "read"
              ? "Preparing read"
              : "Preparing action";
  }
  return toolName === "bash"
    ? "Running"
    : toolName === "edit"
      ? "Editing"
      : toolName === "write"
        ? "Writing"
        : toolName === "grep"
          ? "Searching"
          : toolName === "find"
            ? "Finding"
            : toolName === "ls"
              ? "Listing"
              : toolName === "read"
                ? "Reading"
                : "Using";
}
function formatToolTarget(toolName, toolArgs) {
  if (toolName === "bash") return "command";
  if (toolName === "grep") {
    const pattern = sanitizeActivityDetail(pickNestedString(toolArgs, ["pattern", "query"]));
    const path6 = formatPathForActivity(pickNestedString(toolArgs, ["path", "directory", "dir"]));
    return pattern && path6 ? `"${pattern}" in ${path6}` : pattern ? `"${pattern}"` : path6;
  }
  if (toolName === "find") {
    return sanitizeActivityDetail(pickNestedString(toolArgs, ["glob", "pattern", "query", "path"]));
  }
  if (toolName === "ls") {
    return formatPathForActivity(pickNestedString(toolArgs, ["path", "directory", "dir"]));
  }
  return formatPathForActivity(
    pickNestedString(toolArgs, [
      "path",
      "filePath",
      "file",
      "target",
      "command",
      "cmd",
      "pattern",
      "query"
    ])
  );
}
function formatPathForActivity(value) {
  const path6 = sanitizeActivityDetail(value).replace(/\\/g, "/").replace(/\/$/, "");
  return path6 ? path6.split("/").pop() || path6 : "";
}
function sanitizeActivityDetail(value) {
  return value ? String(value).replace(/\s+/g, " ").trim() : "";
}
function truncateActivityText(value) {
  const detail = sanitizeActivityDetail(value);
  return detail.length > 120 ? `${detail.slice(0, 117)}\u2026` : detail;
}
function pickNestedString(value, keys, seen = /* @__PURE__ */ new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key];
  }
  for (const key of ["input", "args", "arguments", "parameters", "params", "toolInput", "data"]) {
    if (!value[key]) continue;
    const nested = pickNestedString(value[key], keys, seen);
    if (nested) return nested;
  }
  for (const nestedValue of Object.values(value)) {
    const nested = pickNestedString(nestedValue, keys, seen);
    if (nested) return nested;
  }
  return "";
}

// src/ui/message-renderer.mjs
function renderMessages() {
  this.syncCurrentRunFlags();
  if (!this.messagesEl) return;
  let e = this.messagesEl,
    t = this.stickToBottom,
    n = e.scrollTop;
  ((this.isRenderingMessages = true),
    (this.activityItemEl = void 0),
    (this.activityInlineEl = void 0),
    (this.activityInlineTextEl = void 0),
    this.unloadMessageRenderComponents(),
    (this.activityDetailsEl = void 0),
    (this.activityDetailsSignature = ""),
    e.empty());
  let s = this.plugin.messages;
  if (s.length === 0) {
    (this.renderEmptyState(),
      this.restoreMessagesScroll(e, t, n),
      (this.isRenderingMessages = false));
    return;
  }
  for (let a = 0; a < s.length; a++) this.renderMessage(s[a], a);
  (this.running && this.streamingAssistantContent
    ? this.renderStreamingAssistantMessage()
    : this.running && this.activityText && this.renderActivityMessage(),
    this.restoreMessagesScroll(e, t, n),
    (this.isRenderingMessages = false));
}
function restoreMessagesScroll(e, t, n) {
  t ? (e.scrollTop = e.scrollHeight) : (e.scrollTop = Math.min(n, e.scrollHeight));
}
function renderEmptyState() {
  if (!this.messagesEl) return;
  let t = this.messagesEl
    .createDiv({ cls: "pi-agent-empty-state" })
    .createSpan({ cls: "pi-agent-empty-icon" });
  (0, f4.setIcon)(t, "messages-square");
}
function renderMessage(e, t) {
  if (!this.messagesEl) return;
  let n = this.messagesEl.createDiv({
    cls: `pi-agent-message pi-agent-message-${e.role}`
  });
  this.renderRoleLabel(n, e.role === "user" ? "user" : "pi", e, t);
  let s = n.createDiv({ cls: "pi-agent-message-content" });
  this.renderPlainMessageContent(s, e.content);
}
function renderPlainMessageContent(container, content) {
  container.empty();
  container.addClass("markdown-rendered");
  const component = new f4.Component();
  component.load();
  this.messageRenderComponents.push(component);
  f4.MarkdownRenderer.render(
    this.plugin.app,
    content || "",
    container,
    this.plugin.getCurrentContextFile()?.path ?? "",
    component
  ).catch((err) => {
    console.error("Pi Agent: Markdown render error", err);
    container.setText(content || "");
  });
}
function unloadMessageRenderComponents() {
  for (const component of this.messageRenderComponents.splice(0)) component.unload();
}
function renderStreamingAssistantMessage() {
  if (!this.messagesEl) return;
  let e = this.messagesEl.createDiv({
    cls: "pi-agent-message pi-agent-message-assistant pi-agent-message-streaming"
  });
  ((this.streamingItemEl = e), this.renderRoleLabel(e, "pi"));
  let t = e.createDiv({
    cls: "pi-agent-message-content pi-agent-message-content-streaming"
  });
  ((this.streamingTextEl = t.createSpan({
    cls: "pi-agent-streaming-text"
  })),
    this.streamingTextEl.setText(this.streamingAssistantContent),
    t.createSpan({ cls: "pi-agent-typing-cursor", text: "\u258C" }));
}
function renderActivityMessage() {
  if (!this.messagesEl) return;
  let e = this.messagesEl.createDiv({
    cls: "pi-agent-message pi-agent-message-assistant pi-agent-message-activity"
  });
  this.activityItemEl = e;
  this.renderRoleLabel(e, "pi");
  let t = this.getVisibleActivityDetails();
  t.length > 0 && this.renderActivityDetails(e, t);
}
function getVisibleActivityDetails() {
  if (this.activeToolCalls.size < 2) return [];
  return [...this.activeToolCalls.values()].map(
    (e) => formatToolStatus(e.name, e.args, "running").label
  );
}
function renderActivityDetails(e, t) {
  let n = e.createDiv({ cls: "pi-agent-activity-details" });
  ((this.activityDetailsEl = n), (this.activityDetailsSignature = t.join("\n")));
  for (let s of t.slice(0, 5)) n.createDiv({ cls: "pi-agent-activity-detail", text: s });
}
function renderRoleLabel(e, t, n, s) {
  let a = e.createDiv({ cls: "pi-agent-message-role" }),
    o = a.createSpan({ cls: "pi-agent-message-role-title" }),
    l = o.createSpan({
      cls: `pi-agent-role-icon pi-agent-role-icon-${t}`
    });
  if (t === "user") ((0, f4.setIcon)(l, "user"), o.createSpan({ text: "You" }));
  else if (
    (this.renderPiIcon(l), o.createSpan({ text: "Agent" }), !n && this.running && this.activityText)
  ) {
    let h = o.createSpan({
      cls: `pi-agent-inline-activity pi-agent-activity-${this.activityKind}`,
      attr: { title: this.activityDetail || this.activityText }
    });
    ((this.activityInlineEl = h),
      (this.activityInlineTextEl = h.createSpan({
        cls: "pi-agent-inline-activity-text",
        text: this.activityText
      })));
  }
  if (n && s !== void 0) {
    let u = a.createEl("button", {
      cls: "clickable-icon pi-agent-message-actions",
      attr: { "aria-label": "Message actions" }
    });
    ((0, f4.setIcon)(u, "ellipsis"),
      u.addEventListener("click", (g) => {
        var m;
        (g.preventDefault(),
          g.stopPropagation(),
          (m = this.messageActions) == null || m.showMessageMenu(g, n, s));
      }));
  }
}

// src/ui/run-activity-state.mjs
var run_activity_state_exports = {};
__export(run_activity_state_exports, {
  applyActivity: () => applyActivity,
  captureContextUsage: () => captureContextUsage,
  clearPendingActivityTimer: () => clearPendingActivityTimer,
  flushPendingActivity: () => flushPendingActivity,
  formatActiveToolStatus: () => formatActiveToolStatus,
  getContextUsageForTokens: () => getContextUsageForTokens,
  handleRunEvent: () => handleRunEvent,
  normalizeRunEventType: () => normalizeRunEventType,
  queuePendingActivity: () => queuePendingActivity,
  refreshActivityDetailsDom: () => refreshActivityDetailsDom,
  rememberAction: () => rememberAction,
  schedulePendingActivity: () => schedulePendingActivity,
  setActivity: () => setActivity,
  trackActiveTool: () => trackActiveTool,
  untrackActiveTool: () => untrackActiveTool,
  updateActivityDom: () => updateActivityDom
});
var ACTIVITY_STICKY_MS = 1200;
function setActivity(e, t, n = "") {
  let s = Date.now(),
    a = isStickyActivityKind(t),
    o = !a && !shouldBypassActivityStickiness(t) && s < this.activityStickyUntil;
  if (o) {
    this.queuePendingActivity(e, t, n);
    return;
  }
  this.applyActivity(e, t, n, a ? s + ACTIVITY_STICKY_MS : 0);
}
function applyActivity(e, t, n = "", s = 0) {
  let a = this.activityText === e && this.activityKind === t && this.activityDetail === n;
  ((this.activityText = e),
    (this.activityKind = t),
    (this.activityDetail = n),
    (this.activityStickyUntil = s),
    s && ((this.pendingActivity = void 0), this.clearPendingActivityTimer()),
    n && t !== "context" && t !== "thinking" && this.rememberAction(n),
    a || this.updateActivityDom() || this.renderMessages());
}
function queuePendingActivity(e, t, n = "") {
  ((this.pendingActivity = { text: e, kind: t, detail: n }), this.schedulePendingActivity());
}
function schedulePendingActivity() {
  if (this.pendingActivityTimer) return;
  let e = Math.max(0, this.activityStickyUntil - Date.now());
  this.pendingActivityTimer = window.setTimeout(() => {
    ((this.pendingActivityTimer = void 0), this.flushPendingActivity());
  }, e);
}
function clearPendingActivityTimer() {
  (this.pendingActivityTimer && window.clearTimeout(this.pendingActivityTimer),
    (this.pendingActivityTimer = void 0));
}
function flushPendingActivity() {
  if (!this.pendingActivity || Date.now() < this.activityStickyUntil) {
    this.pendingActivity && this.schedulePendingActivity();
    return;
  }
  if (!this.running || this.streamingAssistantContent || this.activeToolCalls.size > 0) {
    this.pendingActivity = void 0;
    return;
  }
  let e = this.pendingActivity;
  ((this.pendingActivity = void 0), this.applyActivity(e.text, e.kind, e.detail));
}
function updateActivityDom() {
  if (
    !this.running ||
    this.streamingAssistantContent ||
    !this.activityText ||
    !this.activityItemEl ||
    !this.activityInlineEl ||
    !this.activityInlineTextEl ||
    !this.activityItemEl.isConnected ||
    !this.activityInlineEl.isConnected
  )
    return false;
  let e = `pi-agent-inline-activity pi-agent-activity-${this.activityKind}`,
    t = this.activityDetail;
  (this.activityInlineEl.getAttribute("class") !== e && this.activityInlineEl.setAttr("class", e),
    this.activityInlineEl.getAttribute("title") !== t && this.activityInlineEl.setAttr("title", t),
    this.activityInlineTextEl.textContent !== this.activityText &&
      this.activityInlineTextEl.setText(this.activityText),
    this.refreshActivityDetailsDom());
  return true;
}
function refreshActivityDetailsDom() {
  var e;
  let t = this.getVisibleActivityDetails(),
    n = t.join("\n");
  if (this.activityDetailsSignature === n) return;
  ((this.activityDetailsSignature = n),
    (e = this.activityDetailsEl) == null || e.remove(),
    (this.activityDetailsEl = void 0));
  t.length > 0 && this.activityItemEl && this.renderActivityDetails(this.activityItemEl, t);
}
function rememberAction(e) {
  e &&
    this.recentActions[this.recentActions.length - 1] !== e &&
    (this.recentActions = [...this.recentActions, e].slice(-5));
}
function captureContextUsage(e) {
  let t = extractEventTokenUsage(e == null ? void 0 : e.raw),
    n = this.getContextUsageForTokens(t);
  n &&
    (this.runningThreadId && this.invalidatedContextThreadIds.delete(this.runningThreadId),
    (this.currentRunContextUsage = { contextUsage: n, tokenUsage: t }),
    this.updateActivityDom(),
    this.renderToolBadges());
}
function getContextUsageForTokens(e) {
  var a;
  if (!e) return;
  let t = this.plugin.getSelectedModelInfo(e),
    n = (a = t == null ? void 0 : t.contextWindow) != null ? a : e?.contextWindow;
  return createContextUsage(e, n);
}
function handleRunEvent(e) {
  let t = this.normalizeRunEventType(e.type);
  this.captureContextUsage(e);
  if (t === "context_ready") {
    this.setActivity("Starting Pi", "context");
    return;
  }
  if (t === "compaction_start") {
    let n = this.currentRunContextUsage?.contextUsage
      ? formatContextUsageTitle(
          this.currentRunContextUsage.contextUsage,
          this.currentRunContextUsage.tokenUsage
        )
      : "";
    (this.runningThreadId && this.invalidatedContextThreadIds.add(this.runningThreadId),
      (this.currentRunContextUsage = void 0),
      this.renderToolBadges(),
      this.setActivity("Compacting context", "context", n));
    return;
  }
  if (t === "compaction_end") {
    if (e.raw && e.raw.errorMessage) {
      this.setActivity("Compaction failed", "error", String(e.raw.errorMessage));
      return;
    }
    if (e.raw && e.raw.aborted) {
      this.setActivity("Compaction skipped", "thinking");
      return;
    }
    let n = e.raw && e.raw.result ? e.raw.result.tokensBefore : void 0;
    (this.runningThreadId && this.invalidatedContextThreadIds.add(this.runningThreadId),
      (this.currentRunContextUsage = {
        compacted: true,
        contextWindow: this.plugin.getSelectedModelInfo()?.contextWindow
      }),
      this.renderToolBadges(),
      this.setActivity(
        e.raw && e.raw.willRetry ? "Compacted context, retrying" : "Finishing",
        e.raw && e.raw.willRetry ? "context" : "finishing",
        n ? `Before compaction: ${formatTokenCount(n)} tokens` : ""
      ));
    return;
  }
  if (t === "auto_retry_start") {
    this.setActivity("Retrying", "finishing", formatRetryDetail(e.raw));
    return;
  }
  if (
    t === "pi_start" ||
    t === "agent_start" ||
    t === "turn_start" ||
    t === "message_start" ||
    t === "thinking_start" ||
    t === "thinking_delta" ||
    t === "thinking_end"
  ) {
    this.streamingAssistantContent || this.setActivity("Thinking", "thinking");
    return;
  }
  if (t === "toolcall_start" || t === "toolcall_delta" || t === "toolcall_end") {
    let n = formatToolStatus(e.toolName, e.toolArgs, "preparing");
    this.setActivity(n.label, n.kind, n.detail);
    return;
  }
  if (t === "tool_start" || t === "tool_update") {
    this.trackActiveTool(e);
    let n = this.formatActiveToolStatus();
    this.setActivity(n.label, n.kind, n.detail);
    return;
  }
  if (t === "tool_end") {
    this.untrackActiveTool(e);
    if (this.activeToolCalls.size > 0) {
      let n = this.formatActiveToolStatus();
      this.setActivity(n.label, n.kind, n.detail);
      return;
    }
    this.streamingAssistantContent ||
      this.setActivity(
        e.isError ? "Tool failed" : "Reviewing results",
        e.isError ? "error" : "thinking"
      );
    return;
  }
  if (t === "text_start") {
    this.setActivity("Responding", "answer");
    return;
  }
  if (t === "message_end" || t === "turn_end") {
    this.streamingAssistantContent || this.setActivity("Thinking", "thinking");
    return;
  }
  t === "agent_end" &&
    ((this.activityText = ""),
    (this.activityDetail = ""),
    (this.activityStickyUntil = 0),
    (this.pendingActivity = void 0),
    this.clearPendingActivityTimer(),
    this.activeToolCalls.clear(),
    this.renderMessages());
}
function normalizeRunEventType(e) {
  return e === "auto_compaction_start" || e === "session_before_compact"
    ? "compaction_start"
    : e === "auto_compaction_end" || e === "session_compact"
      ? "compaction_end"
      : e;
}
function trackActiveTool(e) {
  let t = getToolEventKey(e),
    n = String(e.toolName || e.message || "tool"),
    s = e.toolArgs || {};
  this.activeToolCalls.set(t, { name: n, args: s });
}
function untrackActiveTool(e) {
  this.activeToolCalls.delete(getToolEventKey(e));
}
function formatActiveToolStatus() {
  let e = [...this.activeToolCalls.values()];
  if (e.length === 0) return { label: "Thinking", kind: "thinking", detail: "" };
  if (e.length === 1) return formatToolStatus(e[0].name, e[0].args, "running");
  let t = e.map((n) => formatToolStatus(n.name, n.args, "running"));
  return {
    label: `Running ${e.length} actions`,
    kind: t.some((n) => n.kind === "shell")
      ? "shell"
      : t.some((n) => n.kind === "edit")
        ? "edit"
        : t.some((n) => n.kind === "search")
          ? "search"
          : "read",
    detail: t.map((n) => n.label).join(" \u2022 ")
  };
}

// src/ui/run-settings.mjs
var import_obsidian8 = require("obsidian");
var RunSettingsControls = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  render(containerEl) {
    this.row = containerEl.createDiv({ cls: "pi-agent-run-settings" });
    this.populate(this.row);
  }
  refresh() {
    if (!this.row) return;
    this.row.empty();
    this.populate(this.row);
  }
  populate(containerEl) {
    this.addRunSetting(
      containerEl,
      "Model",
      "sparkles",
      getModelOptions(this.plugin.settings),
      this.plugin.settings.model,
      async (value) => {
        this.plugin.settings.model = value;
        this.plugin.settings.reasoningEffort = "";
        if (value === CUSTOM_MODEL_VALUE && !this.plugin.settings.customModel) {
          new import_obsidian8.Notice("Set custom model ID in plugin settings.");
        }
        await this.plugin.saveSettings();
        this.refresh();
      }
    );
    this.addRunSetting(
      containerEl,
      "Think",
      "brain",
      getReasoningOptions(this.plugin.settings),
      this.plugin.settings.reasoningEffort,
      async (value) => {
        this.plugin.settings.reasoningEffort = value;
        await this.plugin.saveSettings();
      }
    );
    this.addRunSetting(
      containerEl,
      "Tools",
      this.getRunSettingIcon("Tools", this.plugin.settings.sandboxMode),
      getToolModeOptions(),
      this.plugin.settings.sandboxMode,
      async (value) => {
        if (
          (value === "edit" || value === "full-agent" || value === "workspace-write") &&
          !this.plugin.settings.acknowledgedToolRisk &&
          !(await confirmWithModal(this.plugin.app, {
            title: "Enable write tools?",
            message:
              "Pi tool modes are not an OS-level sandbox. Edit and Full agent can modify vault/project files, and Full agent can run shell commands.",
            confirmText: "Enable tools",
            warning: true
          }))
        ) {
          this.refresh();
          return;
        }
        this.plugin.settings.sandboxMode = value;
        if (value === "edit" || value === "full-agent" || value === "workspace-write") {
          this.plugin.settings.acknowledgedToolRisk = true;
        }
        await this.plugin.saveSettings();
      }
    );
  }
  addRunSetting(containerEl, name, icon, options, value, onChange) {
    const selectedValue =
      Object.prototype.hasOwnProperty.call(options, value) || value ? value : "";
    const selectedLabel = options[selectedValue] ?? value ?? "Default";
    const displayLabel = this.formatRunSettingDisplayLabel(name, selectedValue, selectedLabel);
    const buttonEl = containerEl.createEl("button", {
      cls: `clickable-icon pi-agent-run-setting ${this.getRunSettingClass(name, selectedValue)}`,
      attr: { "aria-label": `${name}: ${selectedLabel}`, title: `${name}: ${selectedLabel}` }
    });
    (0, import_obsidian8.setIcon)(buttonEl, icon);
    buttonEl.createSpan({ cls: "pi-agent-control-label", text: displayLabel });
    buttonEl.addEventListener("click", async (event) => {
      event.preventDefault();
      const menu = new import_obsidian8.Menu();
      for (const [optionValue, optionLabel] of Object.entries(options)) {
        menu.addItem((item) => {
          item.setTitle(optionLabel).onClick(async () => {
            await onChange(optionValue);
            this.refresh();
          });
          if (optionValue === selectedValue) item.setIcon("check");
        });
      }
      menu.showAtMouseEvent(event);
    });
  }
  formatRunSettingDisplayLabel(name, value, label) {
    return name === "Model"
      ? value === CUSTOM_MODEL_VALUE
        ? this.plugin.settings.customModel.trim() || "Custom"
        : value
          ? label.split(" - ")[0].replace(/^GPT-/i, "GPT-")
          : this.formatDefaultModelLabel()
      : name === "Think"
        ? value
          ? label.split(" - ")[0].replace(/^XHigh$/i, "XHigh")
          : this.formatDefaultReasoningLabel()
        : name === "Tools"
          ? value === "chat"
            ? "Chat"
            : value === "read-only"
              ? "Review"
              : value === "full-agent"
                ? "Full"
                : value === "edit" || value === "workspace-write"
                  ? "Edit"
                  : label
          : label;
  }
  formatDefaultModelLabel() {
    const model = this.plugin.settings.effectiveModel;
    return model ? model.split("/").pop() || model : "Default";
  }
  formatDefaultReasoningLabel() {
    const reasoning = this.plugin.settings.effectiveReasoning;
    return reasoning
      ? this.formatReasoningLabel(reasoning)
      : this.formatReasoningLabel(getResolvedReasoning(this.plugin.settings));
  }
  formatReasoningLabel(reasoning) {
    return reasoning === "pi-default" || reasoning === "cli-default"
      ? "Pi default"
      : reasoning === "xhigh"
        ? "XHigh"
        : reasoning.charAt(0).toUpperCase() + reasoning.slice(1);
  }
  getRunSettingIcon(name, value) {
    return name === "Tools"
      ? value === "chat"
        ? "message-square"
        : value === "full-agent"
          ? "terminal"
          : value === "edit" || value === "workspace-write"
            ? "pencil-line"
            : "eye"
      : "";
  }
  getRunSettingClass(name, value) {
    return name === "Tools"
      ? value === "full-agent"
        ? "pi-agent-run-setting-mode-full"
        : value === "edit" || value === "workspace-write"
          ? "pi-agent-run-setting-mode-write"
          : "pi-agent-run-setting-mode-read"
      : "";
  }
};

// src/ui/suggestions.mjs
var ComposerSuggestions = class {
  constructor(inputEl, plugin, onApply) {
    this.inputEl = inputEl;
    this.plugin = plugin;
    this.onApply = onApply;
    this.suggestions = [];
    this.selectedSuggestionIndex = 0;
  }
  update() {
    const match = this.getActiveSuggestMatch();
    if (!match) {
      this.close();
      return;
    }
    this.activeSuggestRange = { start: match.start, end: match.end };
    this.suggestions = this.getSuggestions(match.trigger, match.query).slice(0, 16);
    this.selectedSuggestionIndex = 0;
    if (this.suggestions.length === 0) {
      this.close();
      return;
    }
    this.render();
  }
  handleKeydown(event) {
    if (!this.suggestEl || this.suggestions.length === 0) return false;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % this.suggestions.length;
      this.render();
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.selectedSuggestionIndex =
        (this.selectedSuggestionIndex - 1 + this.suggestions.length) % this.suggestions.length;
      this.render();
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      this.apply(this.selectedSuggestionIndex);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return true;
    }
    return false;
  }
  close() {
    this.suggestEl?.remove();
    this.suggestEl = void 0;
    this.suggestions = [];
    this.activeSuggestRange = void 0;
    this.selectedSuggestionIndex = 0;
  }
  getActiveSuggestMatch() {
    const cursor = this.inputEl.selectionStart;
    const prefix = this.inputEl.value.slice(0, cursor);
    const match = prefix.match(/(^|\s)([@#/])([^\s]*)$/);
    if (!match || match.index === void 0) return void 0;
    const start = match.index + match[1].length;
    if (
      match[2] === "/" &&
      prefix.slice(prefix.lastIndexOf("\n", start - 1) + 1, start).trim().length > 0
    ) {
      return void 0;
    }
    return { trigger: match[2], query: match[3].toLowerCase(), start, end: cursor };
  }
  getSuggestions(trigger, query) {
    return trigger === "@"
      ? this.getNoteAndFolderSuggestions(query)
      : trigger === "#"
        ? this.getTagSuggestions(query)
        : this.getCommandSuggestions(query);
  }
  formatAttachmentInsert(value) {
    return /\s/.test(value) ? `@"${value.replace(/"/g, '\\"')}" ` : `@${value} `;
  }
  getNoteAndFolderSuggestions(query) {
    const files = this.plugin.app.vault.getMarkdownFiles();
    const folders = /* @__PURE__ */ new Set();
    for (const file of files) {
      const parts = file.path.split("/");
      for (let index = 1; index < parts.length; index++)
        folders.add(parts.slice(0, index).join("/"));
    }
    const folderSuggestions = [...folders].map((folder) => ({
      label: `${folder}/`,
      detail: "Folder",
      insertText: this.formatAttachmentInsert(`${folder}/`)
    }));
    const noteSuggestions = files.map((file) => {
      const label = file.path.replace(/\.md$/i, "");
      return {
        label,
        detail: "Note",
        insertText: this.formatAttachmentInsert(label)
      };
    });
    return [...folderSuggestions, ...noteSuggestions]
      .filter((suggestion) => suggestion.label.toLowerCase().includes(query))
      .sort((left, right) => left.label.localeCompare(right.label));
  }
  getTagSuggestions(query) {
    const tags = /* @__PURE__ */ new Set();
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      for (const tag of cache?.tags ?? []) tags.add(tag.tag);
      const frontmatterTags = cache?.frontmatter?.tags;
      if (Array.isArray(frontmatterTags)) {
        for (const tag of frontmatterTags)
          tags.add(String(tag).startsWith("#") ? String(tag) : `#${tag}`);
      } else if (typeof frontmatterTags === "string") {
        tags.add(frontmatterTags.startsWith("#") ? frontmatterTags : `#${frontmatterTags}`);
      }
    }
    return [...tags]
      .filter((tag) => tag.toLowerCase().includes(query))
      .sort()
      .map((tag) => ({ label: tag, detail: "Tag", insertText: `${tag} ` }));
  }
  getCommandSuggestions(query) {
    return getSlashCommands(this.plugin.settings, this.plugin.getVaultBasePath())
      .map((command) => ({
        label: command.command,
        detail: command.command.startsWith("/skill:")
          ? `Skill \u2014 ${command.detail}`
          : command.detail,
        insertText: command.insertText
      }))
      .filter((suggestion) =>
        `${suggestion.label} ${suggestion.detail} ${suggestion.insertText}`
          .toLowerCase()
          .includes(query)
      );
  }
  render() {
    this.suggestEl?.remove();
    const parentEl = this.inputEl.parentElement;
    if (!parentEl) return;
    this.suggestEl = parentEl.createDiv({
      cls: "pi-agent-suggest",
      attr: { role: "listbox" }
    });
    for (let index = 0; index < this.suggestions.length; index++) {
      const suggestion = this.suggestions[index];
      const itemEl = this.suggestEl.createDiv({
        cls: `pi-agent-suggest-item${index === this.selectedSuggestionIndex ? " is-selected" : ""}`,
        attr: {
          role: "option",
          "aria-selected": index === this.selectedSuggestionIndex ? "true" : "false"
        }
      });
      itemEl.createSpan({ cls: "pi-agent-suggest-label", text: suggestion.label });
      itemEl.createSpan({ cls: "pi-agent-suggest-detail", text: suggestion.detail });
      itemEl.addEventListener("mousedown", (event) => {
        event.preventDefault();
        this.apply(index);
      });
    }
  }
  apply(index) {
    if (!this.activeSuggestRange) return;
    const suggestion = this.suggestions[index];
    if (!suggestion) return;
    const value = this.inputEl.value;
    this.inputEl.value =
      value.slice(0, this.activeSuggestRange.start) +
      suggestion.insertText +
      value.slice(this.activeSuggestRange.end);
    const cursor = this.activeSuggestRange.start + suggestion.insertText.length;
    this.inputEl.setSelectionRange(cursor, cursor);
    this.close();
    this.onApply();
    this.inputEl.focus();
  }
};

// src/ui/thread-actions.mjs
var import_obsidian9 = require("obsidian");
var ThreadActions = class {
  constructor(plugin, callbacks) {
    this.plugin = plugin;
    this.callbacks = callbacks;
  }
  startNewChat() {
    this.plugin.startNewThread();
    this.callbacks.resetThreadUiState?.();
    this.callbacks.renderThreadTitle();
    this.callbacks.renderMessages();
    this.callbacks.renderToolBadges?.();
  }
  forkChat() {
    this.plugin.forkCurrentThread()
      ? (this.callbacks.resetThreadUiState?.(),
        this.callbacks.renderThreadTitle(),
        this.callbacks.renderMessages(),
        this.callbacks.renderToolBadges?.())
      : new import_obsidian9.Notice("Nothing to fork yet.");
  }
};

// src/ui/view/run-metadata.mjs
function getCurrentRunMetadata(settings) {
  return {
    model: getDisplayedModel(settings),
    reasoning: settings.reasoningEffort || settings.effectiveReasoning || "Pi default",
    toolMode: settings.sandboxMode,
    toolModeLabel: formatToolModeLabel(settings.sandboxMode)
  };
}
function formatToolModeLabel(toolMode) {
  return toolMode === "chat"
    ? "Chat"
    : toolMode === "edit" || toolMode === "workspace-write"
      ? "Edit"
      : toolMode === "full-agent"
        ? "Full agent"
        : "Review";
}
function getDisplayedModel(settings) {
  if (settings.model === CUSTOM_MODEL_VALUE) return settings.customModel || "Custom";
  return settings.model || settings.effectiveModel || "Pi default";
}

// src/ui/PiAgentView.mjs
var PiAgentView = class extends f5.ItemView {
  constructor(e, t) {
    super(e);
    this.plugin = t;
    this.running = false;
    this.canceling = false;
    this.composerBarExpanded = false;
    this.activityText = "Thinking";
    this.activityKind = "thinking";
    this.activityDetail = "";
    this.activityStickyUntil = 0;
    this.pendingActivity = void 0;
    this.pendingActivityTimer = void 0;
    this.isRenderingMessages = false;
    this.activeToolCalls = /* @__PURE__ */ new Map();
    this.recentActions = [];
    this.currentRunContextUsage = void 0;
    this.invalidatedContextThreadIds = /* @__PURE__ */ new Set();
    this.streamingAssistantContent = "";
    this.promptQueue = [];
    this.messageRenderComponents = [];
    this.activeRuns = /* @__PURE__ */ new Map();
    this.activeEditorScrollSnapshot = void 0;
    this.stickToBottom = true;
  }
  getViewType() {
    return PI_AGENT_VIEW_TYPE;
  }
  getDisplayText() {
    return PI_AGENT_DISPLAY_NAME;
  }
  getIcon() {
    return PI_AGENT_ICON_ID;
  }
  async onOpen() {
    this.registerDomEvent(document, "keydown", (e) => {
      (this.syncCurrentRunFlags(),
        e.key !== "Escape" || !this.running || (e.preventDefault(), this.cancelCurrentRun()));
    });
    this.registerEvent(
      this.plugin.app.workspace.on("file-open", () => {
        this.renderToolBadges();
      })
    );
    this.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        this.renderToolBadges();
      })
    );
    this.registerEvent(
      this.plugin.app.vault.on("modify", (e) => {
        this.handleVaultFileModify(e);
      })
    );
    this.renderChatView();
  }
  renderChatView() {
    this.showingThreadList = false;
    let currentThreadId = this.getCurrentThreadId();
    if (this.renderedThreadId !== currentThreadId) this.resetTransientRunUiState();
    this.renderedThreadId = currentThreadId;
    this.syncCurrentRunFlags();
    this.cleanupComposerBarObserver();
    let e = this.containerEl.children[1];
    (e.empty(),
      e.addClass("pi-agent-view"),
      (this.noteActions = new NoteActions(this.plugin, {
        parseVaultLinkTarget: (c) => this.parseVaultLinkTarget(c),
        formatVaultLinkTarget: (c) => this.formatVaultLinkTarget(c),
        openVaultLink: (c) => this.openVaultLink(c)
      })),
      (this.messageActions = new MessageActions(this.plugin, {
        getInput: () => this.inputEl,
        runPrompt: (c) => {
          this.runPrompt(c);
        },
        insertIntoCurrentNote: (c) => {
          var p;
          return (p = this.noteActions) == null ? void 0 : p.insertIntoCurrentNote(c);
        },
        createNoteFromResponse: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.createNoteFromResponse(c)) != null
            ? v
            : Promise.resolve();
        },
        openCitedNotes: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.openCitedNotes(c)) != null
            ? v
            : Promise.resolve();
        },
        extractVaultLinks: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.extractVaultLinks(c)) != null
            ? v
            : [];
        },
        getPreviousUserPrompt: (c) => {
          var p;
          return (p = this.noteActions) == null ? void 0 : p.getPreviousUserPrompt(c);
        }
      })),
      (this.threadMenu = new ThreadActions(this.plugin, {
        renderThreadTitle: () => this.renderThreadTitle(),
        renderMessages: () => this.renderMessages(),
        renderToolBadges: () => this.renderToolBadges(),
        resetThreadUiState: () => {
          this.renderedThreadId = this.getCurrentThreadId();
          this.resetTransientRunUiState();
          this.syncCurrentRunFlags();
          this.renderPromptQueue();
          this.setRunningState(this.running);
        }
      })));
    let t = e.createDiv({ cls: "pi-agent-header" }),
      n = t.createDiv({ cls: "pi-agent-brand" }),
      s = n.createSpan({
        cls: "pi-agent-brand-icon",
        attr: { title: "Pi Agent" }
      });
    (this.renderPiIcon(s),
      (this.threadTitleEl = n.createSpan({
        cls: "pi-agent-thread-title",
        attr: { role: "button", tabindex: "0", title: "Rename chat" }
      })),
      this.threadTitleEl.addEventListener("click", () => this.startThreadTitleRename()),
      this.threadTitleEl.addEventListener("keydown", (c) => {
        (c.key === "Enter" || c.key === " ") && (c.preventDefault(), this.startThreadTitleRename());
      }),
      this.renderThreadTitle());
    let a = t.createDiv({ cls: "pi-agent-header-actions" }),
      o = a.createEl("button", {
        cls: "clickable-icon pi-agent-header-action",
        attr: { "aria-label": "New chat", title: "New chat" }
      });
    ((0, f5.setIcon)(o, "plus"),
      o.addEventListener("click", (c) => {
        var p;
        (c.preventDefault(), (p = this.threadMenu) == null || p.startNewChat());
      }));
    let l = a.createEl("button", {
      cls: "clickable-icon pi-agent-header-action",
      attr: { "aria-label": "Fork chat", title: "Fork chat" }
    });
    ((0, f5.setIcon)(l, "split"),
      l.addEventListener("click", (c) => {
        var p;
        if ((c.preventDefault(), this.isThreadRunning(this.plugin.getCurrentThread().id))) {
          new f5.Notice("Wait for this chat's agent run to finish before forking it.");
          return;
        }
        ((p = this.threadMenu) == null || p.forkChat(), this.renderToolBadges());
      }));
    let u = a.createEl("button", {
      cls: "clickable-icon pi-agent-thread-menu",
      attr: {
        "aria-label": "Manage chat threads",
        title: "Manage chat threads"
      }
    });
    ((0, f5.setIcon)(u, "list"),
      u.addEventListener("click", (c) => {
        (c.preventDefault(), this.showThreadList());
      }));
    ((this.messagesEl = e.createDiv({ cls: "pi-agent-messages" })),
      this.messagesEl.addEventListener("scroll", () => {
        if (!this.messagesEl || this.isRenderingMessages) return;
        let c =
          this.messagesEl.scrollHeight - this.messagesEl.scrollTop - this.messagesEl.clientHeight;
        this.stickToBottom = c < 40;
      }));
    let d = e.createDiv({ cls: "pi-agent-composer" });
    ((this.toolBadgesEl = d.createDiv({ cls: "pi-agent-tool-badges" })),
      this.renderToolBadges(),
      (this.promptQueueEl = d.createDiv({ cls: "pi-agent-prompt-queue" })),
      this.renderPromptQueue(),
      (this.inputEl = d.createEl("textarea", {
        placeholder: "Ask the agent about your vault... Enter sends, Shift+Enter adds a line."
      })),
      this.inputEl.addEventListener("keydown", (c) => {
        var p;
        ((p = this.suggestions) != null && p.handleKeydown(c)) ||
          (c.key === "Enter" &&
            !c.shiftKey &&
            !c.isComposing &&
            (c.preventDefault(), this.submitInput()),
          c.key === "Escape" &&
            (this.syncCurrentRunFlags(), this.running) &&
            (c.preventDefault(), this.cancelCurrentRun()));
      }),
      this.inputEl.addEventListener("input", () => {
        var c;
        (this.syncCurrentRunFlags(),
          this.resizeInput(),
          (c = this.suggestions) == null || c.update(),
          this.setRunningState(this.running));
      }),
      this.inputEl.addEventListener("click", () => {
        var c;
        return (c = this.suggestions) == null ? void 0 : c.update();
      }),
      this.inputEl.addEventListener("blur", () => {
        window.setTimeout(() => {
          var c;
          return (c = this.suggestions) == null ? void 0 : c.close();
        }, 120);
      }),
      (this.suggestions = new ComposerSuggestions(this.inputEl, this.plugin, () =>
        this.resizeInput()
      )),
      this.resizeInput());
    let h = d.createDiv({ cls: "pi-agent-composer-bar" });
    ((this.composerBarEl = h),
      (this.runSettings = new RunSettingsControls(this.plugin)),
      this.runSettings.render(h));
    let m = h.createEl("button", {
      cls: "clickable-icon pi-agent-send-button",
      attr: { "aria-label": "Send message", title: "Send message" }
    });
    ((0, f5.setIcon)(m, "send"),
      m.createSpan({ cls: "pi-agent-control-label", text: "Send" }),
      (this.sendButtonEl = m),
      m.addEventListener("click", () => this.handleSendButtonClick()),
      this.observeComposerBar(h),
      this.renderMessages(),
      this.setRunningState(this.running));
  }
  async onClose() {
    var e;
    ((this.messagesEl = void 0),
      (this.inputEl = void 0),
      (this.promptQueueEl = void 0),
      (this.sendButtonEl = void 0),
      (this.composerBarEl = void 0),
      (this.composerBarExpandEl = void 0),
      (this.runSettings = void 0),
      (this.toolBadgesEl = void 0),
      (this.threadTitleEl = void 0),
      this.cleanupComposerBarObserver(),
      this.clearPendingActivityTimer(),
      this.unloadMessageRenderComponents(),
      (this.messageActions = void 0),
      (this.noteActions = void 0),
      (this.threadMenu = void 0),
      (e = this.suggestions) == null || e.close(),
      (this.suggestions = void 0));
  }
  renderToolBadges() {
    let e = this.toolBadgesEl;
    if (!e) return;
    e.empty();
    let t = this.plugin.getCurrentContextFile(),
      n = t
        ? { label: `Current: ${t.basename}`, enabled: true, title: t.path }
        : {
            label: "No current note",
            enabled: false,
            title: "Open a markdown note to attach it automatically"
          };
    e.createSpan({
      cls: `pi-agent-tool-badge${n.enabled ? " is-enabled" : ""}`,
      text: n.label,
      attr: { title: n.title }
    });
    this.renderToolBadgesContextUsage(e);
  }
  renderToolBadgesContextUsage(e) {
    let t = this.getDisplayedContextUsage(),
      n = t?.compacted
        ? {
            label: `ctx compacted \xB7 ?/${formatTokenCount(t.contextWindow || 0)}`,
            title:
              "Pi compacted this session. Exact context usage is unknown until the next model response returns fresh token usage."
          }
        : t
          ? formatContextUsageBadge(t.contextUsage, t.tokenUsage)
          : void 0;
    e.createSpan({
      cls: `pi-agent-tool-badge pi-agent-tool-badge-context${n ? " is-enabled" : ""}`,
      text: n ? n.label : "ctx --",
      attr: {
        title: n
          ? n.title
          : "Context usage appears after Pi returns token usage for the selected model."
      }
    });
  }
  getDisplayedContextUsage() {
    var n;
    if (this.currentRunContextUsage) return this.currentRunContextUsage;
    let e = this.plugin.getCurrentThread();
    if (this.invalidatedContextThreadIds.has(e.id))
      return { compacted: true, contextWindow: this.plugin.getSelectedModelInfo()?.contextWindow };
    let t = (n = e.messages) != null ? n : [];
    for (let s = t.length - 1; s >= 0; s--) {
      let a = t[s];
      if (a.role === "assistant" && a.contextUsage)
        return { contextUsage: a.contextUsage, tokenUsage: a.tokenUsage };
    }
  }
  renderThreadTitle() {
    if (!this.threadTitleEl) return;
    let e = this.plugin.getCurrentThread();
    (this.threadTitleEl.empty(), this.threadTitleEl.createSpan({ text: e.title }));
  }
  startThreadTitleRename() {
    var a;
    if (!((a = this.threadTitleEl) != null && a.isConnected)) return;
    let e = this.plugin.getCurrentThread();
    (this.threadTitleEl.empty(), this.threadTitleEl.addClass("is-editing"));
    let t = this.threadTitleEl.createEl("input", {
        cls: "pi-agent-thread-title-input",
        attr: { type: "text", value: e.title, "aria-label": "Chat title" }
      }),
      n = (o) => {
        var d;
        let l = t.value.trim();
        ((d = this.threadTitleEl) == null || d.removeClass("is-editing"),
          o && l && l !== e.title && this.plugin.renameThread(e.id, l),
          this.renderThreadTitle());
      },
      s = (o) => {
        o.stopPropagation();
      };
    (t.addEventListener(
      "keydown",
      (o) => {
        (s(o), o.key === "Enter" && n(true), o.key === "Escape" && n(false));
      },
      { capture: true }
    ),
      t.addEventListener("keypress", s, { capture: true }),
      t.addEventListener("keyup", s, { capture: true }),
      t.addEventListener("click", (o) => o.stopPropagation()),
      t.addEventListener("blur", () => n(true)),
      t.focus(),
      t.select());
  }
  submitInput() {
    var t, n;
    let e = (t = this.inputEl) == null ? void 0 : t.value.trim();
    if (!e) return;
    (this.inputEl && (this.inputEl.value = ""),
      (n = this.suggestions) == null || n.close(),
      this.resizeInput(),
      this.syncCurrentRunFlags(),
      this.running ? this.enqueuePrompt(e) : this.runPrompt(e),
      this.setRunningState(this.running));
  }
  handleSendButtonClick() {
    var t;
    this.syncCurrentRunFlags();
    if (this.running && !((t = this.inputEl) != null && t.value.trim())) {
      this.cancelCurrentRun();
      return;
    }
    this.submitInput();
  }
  cancelCurrentRun() {
    this.syncCurrentRunFlags();
    let e = this.getCurrentThreadRun();
    e &&
      !e.canceling &&
      ((e.canceling = true),
      (this.canceling = true),
      this.setActivity("Canceling", "finishing"),
      this.plugin.cancelPiRun(e.runner),
      this.setRunningState(true),
      this.renderThreadListIfVisible());
  }
  finishCanceledRun() {
    ((this.running = false),
      (this.canceling = false),
      (this.streamingAssistantContent = ""),
      (this.streamingItemEl = void 0),
      (this.streamingTextEl = void 0),
      (this.activityText = ""),
      (this.activityDetail = ""),
      (this.activityStickyUntil = 0),
      (this.pendingActivity = void 0),
      this.clearPendingActivityTimer(),
      this.activeToolCalls.clear(),
      (this.currentRunContextUsage = void 0),
      (this.runningThreadId = void 0),
      (this.activeEditorScrollSnapshot = void 0),
      this.plugin.cancelPiRun(),
      this.renderPromptQueue(),
      this.setRunningState(false),
      this.renderMessages(),
      this.renderToolBadges());
  }
  cleanupComposerBarObserver() {
    this.composerBarCleanup && (this.composerBarCleanup(), (this.composerBarCleanup = void 0));
  }
  observeComposerBar(e) {
    this.cleanupComposerBarObserver();
    let t = () => this.updateComposerBarMode(e.clientWidth);
    if ((t(), typeof ResizeObserver == "undefined")) {
      window.addEventListener("resize", t);
      let n2 = false,
        s2 = () => {
          n2 || ((n2 = true), window.removeEventListener("resize", t));
        };
      ((this.composerBarCleanup = s2), this.register(s2));
      return;
    }
    let n = new ResizeObserver((a2) => {
        var l, d;
        let o =
          (d = (l = a2[0]) == null ? void 0 : l.contentRect.width) != null ? d : e.clientWidth;
        this.updateComposerBarMode(o);
      }),
      s = false,
      a = () => {
        s || ((s = true), n.disconnect());
      };
    (n.observe(e), (this.composerBarCleanup = a), this.register(a));
  }
  updateComposerBarMode(e) {
    let t = this.composerBarEl;
    if (!t) return;
    let n = e < 560,
      s = e < 390;
    (!n && this.composerBarExpanded && (this.composerBarExpanded = false),
      t.toggleClass("is-compact", n),
      t.toggleClass("is-narrow", s),
      this.updateComposerBarExpansion());
  }
  updateComposerBarExpansion() {
    let e = this.composerBarEl,
      t = this.composerBarExpandEl;
    if (!e || !t) return;
    let n = this.composerBarExpanded && e.hasClass("is-compact");
    (e.toggleClass("is-expanded", n),
      t.setAttr("aria-label", n ? "Collapse run options" : "Expand run options"),
      t.setAttr("title", n ? "Collapse run options" : "Expand run options"),
      (0, f5.setIcon)(t, n ? "chevrons-right" : "chevrons-left"));
  }
  resizeInput() {
    this.inputEl &&
      ((this.inputEl.style.height = "auto"),
      (this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 160)}px`));
  }
  getCurrentThreadId() {
    var e;
    return (e = this.plugin.getCurrentThread()) == null ? void 0 : e.id;
  }
  isCurrentThread(e) {
    return this.getCurrentThreadId() === e;
  }
  isThreadRunning(e) {
    return this.activeRuns.has(e);
  }
  getCurrentThreadRun() {
    let e = this.getCurrentThreadId();
    return e ? this.activeRuns.get(e) : void 0;
  }
  syncCurrentRunFlags() {
    let e = this.getCurrentThreadRun();
    ((this.running = !!e), (this.canceling = e?.canceling === true));
  }
  resetTransientRunUiState() {
    ((this.activityText = ""),
      (this.activityKind = "thinking"),
      (this.activityDetail = ""),
      (this.activityStickyUntil = 0),
      (this.pendingActivity = void 0),
      this.clearPendingActivityTimer(),
      this.activeToolCalls.clear(),
      (this.recentActions = []),
      (this.currentRunContextUsage = void 0),
      (this.streamingAssistantContent = ""),
      (this.streamingItemEl = void 0),
      (this.streamingTextEl = void 0));
  }
  renderThreadListIfVisible() {
    this.showingThreadList && this.renderThreadList();
  }
  async runPrompt(e, t = this.plugin.getCurrentThread().id) {
    if (this.isThreadRunning(t)) {
      this.enqueuePrompt(e, t);
      return;
    }
    let n = { canceling: false, runner: this.plugin.createPiRunner() };
    (this.activeRuns.set(t, n),
      this.syncCurrentRunFlags(),
      (this.runningThreadId = t),
      (this.running = this.isCurrentThread(t)),
      (this.canceling = false),
      (this.activityText = "Preparing context"),
      (this.activityKind = "context"),
      (this.activityDetail =
        "Collecting current note, links, backlinks, and explicit attachments."),
      (this.activityStickyUntil = 0),
      (this.pendingActivity = void 0),
      this.clearPendingActivityTimer(),
      this.activeToolCalls.clear(),
      (this.recentActions = []),
      (this.currentRunContextUsage = void 0),
      (this.streamingAssistantContent = ""),
      (this.activeEditorScrollSnapshot = this.isCurrentThread(t)
        ? this.getActiveEditorScrollSnapshot()
        : this.activeEditorScrollSnapshot),
      (this.stickToBottom = true),
      this.setRunningState(this.running),
      this.plugin.addMessageToThread(t, {
        role: "user",
        content: e,
        createdAt: Date.now()
      }),
      this.isCurrentThread(t) && (this.renderThreadTitle(), this.renderMessages()));
    this.renderThreadListIfVisible();
    let s = getCurrentRunMetadata(this.plugin.settings);
    try {
      let a = await this.plugin.runPiPrompt(
        e,
        {
          isCanceled: () => n.canceling,
          onEvent: (o) => this.isCurrentThread(t) && this.handleRunEvent(o),
          onTextDelta: (o) => this.isCurrentThread(t) && this.appendStreamingDelta(o)
        },
        t,
        n.runner
      );
      ((this.streamingAssistantContent = ""),
        (this.streamingItemEl = void 0),
        (this.streamingTextEl = void 0),
        this.plugin.addMessageToThread(t, {
          role: "assistant",
          content: a.finalResponse,
          createdAt: Date.now(),
          contextUsage: a.contextUsage,
          tokenUsage: a.tokenUsage,
          runMetadata: s
        }),
        a.contextUsage && !a.contextCompacted && this.invalidatedContextThreadIds.delete(t),
        a.contextCompacted && this.invalidatedContextThreadIds.add(t),
        this.isCurrentThread(t) &&
          (this.renderThreadTitle(), this.renderMessages(), this.renderToolBadges()));
    } catch (a) {
      let o = a instanceof Error ? a.message : String(a);
      if (o === "Pi run canceled.") {
        new f5.Notice("Agent run canceled.");
        return;
      }
      (this.plugin.addMessageToThread(t, {
        role: "assistant",
        content: `Agent run failed: ${o}`,
        createdAt: Date.now()
      }),
        this.isCurrentThread(t) &&
          (this.renderThreadTitle(), this.renderMessages(), this.renderToolBadges()),
        new f5.Notice(o));
    } finally {
      (this.activeRuns.delete(t),
        this.syncCurrentRunFlags(),
        (this.running = this.isThreadRunning(this.plugin.getCurrentThread().id)),
        (this.canceling = this.getCurrentThreadRun()?.canceling === true),
        (this.streamingAssistantContent = ""),
        (this.activityStickyUntil = 0),
        (this.pendingActivity = void 0),
        this.clearPendingActivityTimer(),
        this.activeToolCalls.clear(),
        (this.activityText = ""),
        (this.activityDetail = ""),
        (this.currentRunContextUsage = void 0),
        this.activeEditorScrollSnapshot &&
          this.scheduleEditorScrollRestore(this.activeEditorScrollSnapshot.path),
        (this.activeEditorScrollSnapshot = void 0),
        this.renderPromptQueue(),
        (this.runningThreadId = void 0),
        this.setRunningState(this.running),
        this.isCurrentThread(t) && (this.renderMessages(), this.renderToolBadges()),
        this.renderThreadListIfVisible(),
        this.runNextQueuedPrompt());
    }
  }
  getActiveEditorScrollSnapshot() {
    var s;
    let e = this.plugin.app.workspace.activeEditor,
      t = e == null ? void 0 : e.file,
      n = e == null ? void 0 : e.editor;
    if (!t || !n) return void 0;
    try {
      return { path: t.path, ...n.getScrollInfo(), createdAt: Date.now() };
    } catch {
      return (s = this.activeEditorScrollSnapshot) != null ? s : void 0;
    }
  }
  handleVaultFileModify(e) {
    this.syncCurrentRunFlags();
    if (!(e instanceof f5.TFile) || !this.running || e.extension !== "md") return;
    this.scheduleEditorScrollRestore(e.path);
  }
  scheduleEditorScrollRestore(e) {
    let t = this.activeEditorScrollSnapshot;
    if (!t || t.path !== e) return;
    for (let n of [0, 50, 150])
      window.setTimeout(() => {
        this.restoreEditorScroll(t);
      }, n);
  }
  restoreEditorScroll(e) {
    let t = this.plugin.app.workspace.activeEditor,
      n = t == null ? void 0 : t.file,
      s = t == null ? void 0 : t.editor;
    if (!n || !s || n.path !== e.path) return;
    try {
      s.scrollTo(e.left, e.top);
    } catch (a) {
      console.warn("Pi Agent: failed to restore editor scroll after external file change", a);
    }
  }
  appendStreamingDelta(e) {
    if (e) {
      if (
        ((this.activityText = ""),
        (this.activityDetail = ""),
        (this.activityStickyUntil = 0),
        (this.pendingActivity = void 0),
        this.clearPendingActivityTimer(),
        (this.streamingAssistantContent += e),
        !this.streamingTextEl)
      ) {
        this.renderMessages();
        return;
      }
      (this.streamingTextEl.appendText(e),
        this.messagesEl &&
          this.stickToBottom &&
          (this.messagesEl.scrollTop = this.messagesEl.scrollHeight));
    }
  }
  setRunningState(e) {
    var n;
    let s = !!((n = this.inputEl) != null && n.value.trim()),
      a = e && !this.canceling && s,
      o = e ? (this.canceling ? "loader" : a ? "send" : "x") : "send",
      l = e ? (this.canceling ? "Canceling" : a ? "Queue" : "Cancel") : "Send",
      d = e
        ? this.canceling
          ? "Canceling agent run"
          : a
            ? "Queue message"
            : "Cancel agent run"
        : "Send message";
    this.sendButtonEl &&
      (this.sendButtonEl.empty(),
      (0, f5.setIcon)(this.sendButtonEl, o),
      this.sendButtonEl.createSpan({
        cls: "pi-agent-control-label",
        text: l
      }),
      this.sendButtonEl.toggleAttribute("disabled", e && this.canceling),
      this.sendButtonEl.setAttr("aria-label", d),
      this.sendButtonEl.setAttr(
        "title",
        this.promptQueue.length > 0 && !this.canceling
          ? `${d}. ${this.promptQueue.length} queued.`
          : d
      ));
  }
  renderPiIcon(e) {
    (0, f5.setIcon)(e, PI_AGENT_ICON_ID);
  }
};
Object.assign(
  PiAgentView.prototype,
  prompt_queue_exports,
  thread_list_view_exports,
  vault_link_actions_exports,
  message_renderer_exports,
  run_activity_state_exports
);

// src/shared/thread-history.mjs
function sanitizeThreadHistory(history, limit = 40) {
  return {
    currentThreadId: history.currentThreadId,
    threads: [...(history.threads || [])]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, limit)
  };
}

// src/threads/thread-store.mjs
var DEFAULT_THREAD_TITLE = "New chat";
var ThreadStore = class {
  constructor(history, legacyMessages, legacyPiSessionId) {
    this.history = normalizeThreadHistory(history, legacyMessages, legacyPiSessionId);
  }
  get currentThreadId() {
    return this.history.currentThreadId;
  }
  getCurrentThread() {
    return cloneThread(this.getMutableCurrentThread());
  }
  getCurrentMessages() {
    return this.getMutableCurrentThread().messages.map(cloneMessage);
  }
  listThreads(options = {}) {
    const includeArchived = options.includeArchived ?? false;
    return this.history.threads
      .filter((thread) => includeArchived || !thread.archived)
      .sort(compareThreadsForList)
      .map(cloneThread);
  }
  startNewThread(title) {
    const now = Date.now();
    const thread = createThread({ title, now });
    this.history = {
      currentThreadId: thread.id,
      threads: [thread, ...this.history.threads]
    };
    return cloneThread(thread);
  }
  forkCurrentThread(piSessionId) {
    const current = this.getMutableCurrentThread();
    if (current.messages.length === 0) return void 0;
    const now = Date.now();
    const thread = createThread({
      title: `${current.title} (fork)`,
      now,
      messages: current.messages,
      piSessionId
    });
    this.history = {
      currentThreadId: thread.id,
      threads: [thread, ...this.history.threads]
    };
    return cloneThread(thread);
  }
  switchThread(threadId) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    if (!thread) return false;
    this.history.currentThreadId = thread.id;
    return true;
  }
  archiveThread(threadId = this.history.currentThreadId) {
    return this.updateThread(threadId, (thread, now) => {
      thread.archived = true;
      thread.updatedAt = now;
    });
  }
  unarchiveThread(threadId) {
    return this.updateThread(threadId, (thread, now) => {
      thread.archived = false;
      thread.updatedAt = now;
    });
  }
  deleteThread(threadId) {
    const threads = this.history.threads.filter((thread) => thread.id !== threadId);
    if (threads.length === this.history.threads.length) return false;
    this.history.threads = threads;
    if (this.history.currentThreadId === threadId) {
      const nextThread =
        this.getMostRecentThread(threads.filter((thread) => !thread.archived)) ??
        this.getMostRecentThread(threads);
      this.history.currentThreadId = nextThread?.id ?? this.startNewThread().id;
    }
    return true;
  }
  clearArchivedThreads() {
    const previousCount = this.history.threads.length;
    this.history.threads = this.history.threads.filter(
      (thread) => !thread.archived || thread.id === this.history.currentThreadId
    );
    return previousCount - this.history.threads.length;
  }
  renameThread(threadId, title) {
    const nextTitle = normalizeTitle(title);
    return this.updateThread(threadId, (thread, now) => {
      thread.title = nextTitle;
      thread.updatedAt = now;
    });
  }
  setThreadFavorite(threadId, favorite) {
    return this.updateThread(threadId, (thread, now) => {
      thread.favorite = favorite === true;
      thread.updatedAt = now;
    });
  }
  toggleThreadFavorite(threadId) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    if (!thread) return false;
    return this.setThreadFavorite(threadId, !thread.favorite);
  }
  addMessage(message) {
    return this.addMessageToThread(this.history.currentThreadId, message);
  }
  addMessageToThread(threadId, message) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    if (!thread) return void 0;
    const normalizedMessage = cloneMessage(message);
    if (message.role === "user" && thread.archived) thread.archived = false;
    thread.messages = [...thread.messages, normalizedMessage];
    thread.updatedAt = Math.max(thread.updatedAt, normalizedMessage.createdAt, Date.now());
    if (thread.title === DEFAULT_THREAD_TITLE && normalizedMessage.role === "user") {
      thread.title = titleFromPrompt(normalizedMessage.content);
    }
    return cloneThread(thread);
  }
  getThread(threadId) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    return thread ? cloneThread(thread) : void 0;
  }
  setCurrentPiSessionId(piSessionId) {
    return this.setThreadPiSessionId(this.history.currentThreadId, piSessionId);
  }
  setThreadPiSessionId(threadId, piSessionId) {
    return this.updateThread(threadId, (thread, now) => {
      thread.piSessionId = piSessionId;
      thread.updatedAt = now;
    });
  }
  toJSON() {
    return {
      currentThreadId: this.history.currentThreadId,
      threads: this.history.threads.map(cloneThread)
    };
  }
  updateThread(threadId, update) {
    const thread = this.history.threads.find((item) => item.id === threadId);
    if (!thread) return false;
    update(thread, Date.now());
    return true;
  }
  getMutableCurrentThread() {
    const currentThread = this.history.threads.find(
      (thread2) => thread2.id === this.history.currentThreadId
    );
    if (currentThread) return currentThread;
    const thread = createThread({ now: Date.now() });
    this.history.currentThreadId = thread.id;
    this.history.threads = [thread, ...this.history.threads];
    return thread;
  }
  getMostRecentThread(threads) {
    return [...threads].sort((left, right) => right.updatedAt - left.updatedAt)[0];
  }
};
function normalizeThreadHistory(history, legacyMessages, legacyPiSessionId) {
  const source = isPlainObject(history) ? history : {};
  const sourceThreads = Array.isArray(source.threads) ? source.threads : [];
  const seenIds = /* @__PURE__ */ new Set();
  const threads = sourceThreads.map((thread) => normalizeThread(thread, seenIds)).filter(Boolean);
  if (threads.length === 0) threads.push(createLegacyThread(legacyMessages, legacyPiSessionId));
  return {
    currentThreadId:
      typeof source.currentThreadId === "string" &&
      threads.some((thread) => thread.id === source.currentThreadId)
        ? source.currentThreadId
        : (getMostRecentThread(threads.filter((thread) => !thread.archived))?.id ??
          getMostRecentThread(threads)?.id ??
          threads[0].id),
    threads
  };
}
function normalizeThread(thread, seenIds) {
  if (!isPlainObject(thread)) return void 0;
  const messages = normalizeMessages(thread.messages);
  const now = Date.now();
  const createdAt = normalizeTimestamp(thread.createdAt) ?? messages[0]?.createdAt ?? now;
  const updatedAt =
    normalizeTimestamp(thread.updatedAt) ?? messages[messages.length - 1]?.createdAt ?? createdAt;
  const sourceId = typeof thread.id === "string" && thread.id.trim() ? thread.id : "";
  const id = sourceId && !seenIds.has(sourceId) ? sourceId : createThreadId(now);
  seenIds.add(id);
  return {
    id,
    title: normalizeTitle(
      typeof thread.title === "string" && thread.title.trim()
        ? thread.title
        : inferThreadTitle(messages)
    ),
    messages,
    createdAt,
    updatedAt,
    archived: thread.archived === true,
    favorite: thread.favorite === true,
    piSessionId: normalizeOptionalString(thread.piSessionId ?? thread.piThreadId)
  };
}
function createLegacyThread(legacyMessages, legacyPiSessionId) {
  const messages = normalizeMessages(legacyMessages);
  const now = Date.now();
  return createThread({
    title: inferThreadTitle(messages),
    now,
    messages,
    piSessionId: normalizeOptionalString(legacyPiSessionId)
  });
}
function createThread(options) {
  const messages = (options.messages ?? []).map(cloneMessage);
  const createdAt = messages[0]?.createdAt ?? options.now;
  const updatedAt = messages[messages.length - 1]?.createdAt ?? options.now;
  return {
    id: createThreadId(options.now),
    title: normalizeTitle(options.title ?? inferThreadTitle(messages)),
    messages,
    createdAt,
    updatedAt,
    archived: false,
    favorite: options.favorite === true,
    piSessionId: options.piSessionId
  };
}
function normalizeMessages(messages) {
  return Array.isArray(messages) ? messages.filter(isValidMessage).map(cloneMessage) : [];
}
function isValidMessage(message) {
  return isPlainObject(message)
    ? (message.role === "user" || message.role === "assistant" || message.role === "system") &&
        typeof message.content === "string" &&
        typeof message.createdAt === "number" &&
        Number.isFinite(message.createdAt)
    : false;
}
function cloneMessage(message) {
  return {
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    contextUsage: message.contextUsage ? { ...message.contextUsage } : void 0,
    tokenUsage: message.tokenUsage ? { ...message.tokenUsage } : void 0,
    runMetadata: message.runMetadata ? { ...message.runMetadata } : void 0
  };
}
function cloneThread(thread) {
  return {
    id: thread.id,
    title: thread.title,
    messages: thread.messages.map(cloneMessage),
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    archived: thread.archived,
    favorite: thread.favorite === true,
    piSessionId: thread.piSessionId
  };
}
function normalizeTimestamp(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function normalizeTitle(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 80) || DEFAULT_THREAD_TITLE;
}
function inferThreadTitle(messages) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  return firstUserMessage ? titleFromPrompt(firstUserMessage.content) : DEFAULT_THREAD_TITLE;
}
function titleFromPrompt(prompt) {
  return normalizeTitle(prompt.replace(/^#+\s*/g, "").replace(/[`*_#[\]()>]/g, ""));
}
function createThreadId(now) {
  return `thread-${now}-${Math.random().toString(36).slice(2, 10)}`;
}
function getMostRecentThread(threads) {
  return [...threads].sort((left, right) => right.updatedAt - left.updatedAt)[0];
}
function compareThreadsForList(left, right) {
  if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
  return right.updatedAt - left.updatedAt;
}
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// src/plugin/PiAgentPlugin.mjs
var be = `# Pi Agent

You are Pi, an agentic AI coding assistant from https://pi.dev, running inside Pi Agent.

The user is working in an Obsidian vault made of Markdown notes, scripts, configs, and sometimes plugin/source-code projects. Treat vault paths, wikilinks, frontmatter, headings, tags, backlinks, outgoing links, and code files as first-class context. The plugin may provide the current note, selected text, backlinks, outgoing links, explicit search results, and explicit @note, #tag, or /command attachments.

Your primary role is agentic coding and technical knowledge work inside the vault: inspect files, reason about systems, propose implementation plans, edit code or Markdown when edit tools are enabled, run commands when shell tools are enabled, and summarize concrete changes.

## Operation modes

- Chat: no Pi CLI tools are enabled. Use only the Obsidian context attached by the plugin and ask for more context when needed.
- Review: read/search/list tools are enabled. Inspect files and explain, review, summarize, or propose changes, but do not modify files.
- Edit: read/search/list plus edit/write tools are enabled. Make focused file changes when the user asks. Shell commands are not available, so ask the user to run tests/builds manually when needed.
- Full agent: read/search/list/edit/write/bash tools are enabled. You may run appropriate shell commands for coding tasks, tests, builds, repo inspection, and diagnostics.

Pi CLI tools are controlled by the selected tool mode. They are not an OS-level sandbox. Use tools intentionally, keep edits small, and avoid destructive commands unless explicitly requested and clearly safe.

## Coding behavior

- Before editing code, inspect the relevant files and existing patterns.
- Prefer minimal, reviewable changes over broad rewrites.
- Run targeted tests or build commands when shell tools are enabled and practical; otherwise tell the user what to run.
- Preserve project conventions, formatting, imports, and file organization.
- If a task touches generated files or dependencies, explain why.
- If you cannot safely determine the right implementation, ask a concise clarification or propose a plan first.
- After code edits, summarize changed files, behavior changes, tests/builds run, and any follow-up checks.

## Vault behavior

- Treat every markdown file as user-owned knowledge.
- When the user says "this", "here", "this note", or "this idea", start from the current note and selected text before using broader search context.
- Preserve existing headings, links, aliases, tags, and frontmatter unless the user asks to change them.
- Cite vault references as wikilinks when possible, for example [[Project Alpha]].
- Do not infer facts that are not present in notes. Say when references are weak or missing.
- If a referenced note, heading, block, or file is not present in the provided context, say it was not found instead of inventing content.
- Preserve Obsidian callouts, embeds, block IDs, footnotes, comments, and dataview/base-related sections unless the user explicitly asks to change them.
- Prefer Obsidian wikilinks for vault notes. Use [[Note Name]] or [[path/to/note|label]] instead of raw Markdown links for internal vault references.
- Use Obsidian-friendly Markdown: clear headings, compact bullets, tables only when useful, and callouts only when they improve the note.

## Chat responses

- Be concise and action-oriented.
- Avoid Markdown formatting in chat responses unless the user asks for it or a structured/note-ready response clearly needs it.
- When mentioning vault notes in chat, wikilinks or vault paths are useful because the plugin makes them clickable.

## Frontmatter

- Keep YAML frontmatter compact and stable.
- Common fields: type, status, tags, aliases, created, updated, project, area, source.
- Prefer arrays for tags and aliases.
- Do not delete unknown fields.
- Do not rewrite the entire YAML block unless asked. Add or update only the specific fields needed.
- Preserve existing field names, ordering, quoting style, and unknown system-managed fields as much as possible.

## Backlinks and references

- Use backlinks to understand who depends on the current note.
- Use outgoing links to understand what the current note depends on.
- Use unresolved links as possible missing notes, typos, or future note ideas.
- When researching a topic, start with exact title and alias matches, then tags, then full-text mentions.
- Before renaming, moving, deleting, or substantially changing the meaning of a note, consider backlinks and outgoing links and mention likely affected references.
- When adding new links, prefer existing note titles or aliases discovered from context instead of creating duplicate concepts.

## Obsidian Bases

- Bases are useful when notes share predictable frontmatter.
- A good Base starts from the fields already used in a folder.
- Suggested fields: type, status, tags, project, area, created, updated.
- Propose a Base config before creating it unless the user explicitly asks you to create it immediately.`;
function previewSuggestedFrontmatter(markdown, patch) {
  return previewFrontmatterPatch(markdown, patch);
}
var PiAgentPlugin = class extends P.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.messages = [];
    this.threadHistory = new ThreadStore();
    this.dataSaveChain = Promise.resolve();
  }
  async onload() {
    await this.loadSettings();
    if (!P.Platform.isDesktopApp) {
      new P.Notice("Pi Agent is desktop-only.");
      return;
    }
    (0, P.addIcon)(PI_AGENT_ICON_ID, PI_AGENT_ICON_SVG);
    this.rebuildServices();
    if (!this.settings.dryRun) {
      warmupPiCli(this.settings.piExecutablePath, this.getPluginDirectory());
    }
    this.refreshModelCatalog(false);
    this.refreshCurrentContextFile();
    this.registerEvent(
      this.app.workspace.on("file-open", (e) => {
        this.setCurrentContextFile(e);
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.refreshCurrentContextFile();
      })
    );
    this.registerView(PI_AGENT_VIEW_TYPE, (e) => new PiAgentView(e, this));
    this.addRibbonIcon(PI_AGENT_ICON_ID, "Open Pi Agent", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-pi",
      name: "Open agent chat",
      callback: () => {
        this.activateView();
      }
    });
    this.addCommand({
      id: "check-pi-installation",
      name: "Check Pi installation",
      callback: () => {
        this.checkPiInstallation(true);
      }
    });
    this.addCommand({
      id: "ask-about-current-note",
      name: "Ask about current note",
      checkCallback: (e) =>
        this.runWithActiveMarkdownNote(e, () => {
          this.runCommandPrompt(
            "Use the active note as context. Summarize the key facts, assumptions, and useful follow-up questions."
          );
        })
    });
    this.addCommand({
      id: "research-around-current-note",
      name: "Research around current note",
      checkCallback: (e) =>
        this.runWithActiveMarkdownNote(e, () => {
          this.runCommandPrompt(
            "Research around the active note using backlinks, outgoing links, unresolved links, tags, and search results. Return concise findings with vault references."
          );
        })
    });
    this.addCommand({
      id: "suggest-frontmatter",
      name: "Suggest frontmatter for current note",
      checkCallback: (e) =>
        this.runWithActiveMarkdownNote(e, () => {
          this.suggestFrontmatterForCurrentNote();
        })
    });
    this.addCommand({
      id: "draft-base-from-current-note",
      name: "Draft base from current note context",
      checkCallback: (e) =>
        this.runWithActiveMarkdownNote(e, () => {
          this.runCommandPrompt(
            "Draft an Obsidian Base for notes related to the active note. Infer useful fields from frontmatter, tags, backlinks, and linked notes."
          );
        })
    });
    this.addSettingTab(new PiAgentSettingTab(this.app, this));
  }
  onunload() {
    this.cancelPiRun();
  }
  async loadSettings() {
    let e = await this.loadData(),
      { chatHistory: t, messages: n, threadId: s, sessionId: a, ...o } = e != null ? e : {};
    ((this.settings = normalizeSettings(o)),
      (this.settings.additionalSkillFolders = normalizeSkillFolderList(
        this.settings.additionalSkillFolders
      )),
      (this.threadHistory = new ThreadStore(t, n, a != null ? a : s)));
    let l = getEffectiveConfig(this.getVaultBasePath());
    ((this.settings.effectiveModel = l.effectiveModel || ""),
      (this.settings.effectiveReasoning = l.effectiveReasoning || ""),
      this.syncCurrentThreadState(),
      this.settings.model &&
        isLegacyBareModelId(this.settings.model) &&
        ((this.settings.customModel = `openai/${this.settings.model}`),
        (this.settings.model = "__custom")));
  }
  async saveSettings() {
    (await this.savePluginData(), this.rebuildServices());
  }
  showPiSetupIfNeeded() {
    if (this.settings.dismissedPiSetup) return;
    window.setTimeout(() => {
      if (!this.settings.dismissedPiSetup) this.checkPiInstallation(false);
    }, 800);
  }
  checkPiInstallation(showSuccess) {
    let e = checkPiInstallation(this.settings.piExecutablePath);
    if (e.ok) {
      showSuccess && new P.Notice(`Pi CLI is available: ${e.version || e.message}`);
      return e;
    }
    showSuccess ? new P.Notice(e.message) : new PiSetupModal(this, e).open();
    return e;
  }
  async refreshModelCatalog(e) {
    var t;
    this.catalog || this.rebuildServices();
    try {
      let n = await ((t = this.catalog) == null ? void 0 : t.getAvailableModels()),
        s = this.catalog ? this.catalog.getEffectiveConfig(this.getVaultBasePath()) : {};
      if (!n || n.length === 0) {
        e && new P.Notice("Pi returned no models.");
        return;
      }
      ((this.settings.availableModels = n),
        (this.settings.effectiveModel = s.effectiveModel || ""),
        (this.settings.effectiveReasoning = s.effectiveReasoning || ""),
        await this.saveSettings(),
        e &&
          new P.Notice(
            `Loaded ${n.length} Pi models${this.settings.effectiveModel ? `; default ${this.settings.effectiveModel}` : ""}.`
          ));
    } catch (n) {
      let s = n instanceof Error ? n.message : String(n);
      (e && new P.Notice(s), console.warn("Pi Agent: failed to refresh model catalog", n));
    }
  }
  addMessage(e) {
    return this.addMessageToThread(this.threadHistory.currentThreadId, e);
  }
  addMessageToThread(e, t) {
    let n = this.threadHistory.addMessageToThread(e, t);
    return n ? (this.syncCurrentThreadState(), this.saveThreadHistory(), true) : false;
  }
  startNewThread(e) {
    let t = this.threadHistory.startNewThread(e);
    return (this.syncCurrentThreadState(), this.saveThreadHistory(), t);
  }
  forkCurrentThread() {
    var t;
    let e = this.getCurrentThread(),
      n = e.piSessionId
        ? (t = this.pi) == null
          ? void 0
          : t.createForkSessionFile(e.piSessionId)
        : void 0,
      s = this.threadHistory.forkCurrentThread(n);
    return s ? (this.syncCurrentThreadState(), this.saveThreadHistory(), s) : void 0;
  }
  getCurrentThread() {
    return this.threadHistory.getCurrentThread();
  }
  listThreads(e) {
    return this.threadHistory.listThreads(e);
  }
  getThreadDisplayMessageCount(e) {
    let t = Array.isArray(e == null ? void 0 : e.messages) ? e.messages.length : 0,
      n = this.countPiSessionChatMessages(e == null ? void 0 : e.piSessionId);
    return Math.max(t, n);
  }
  countPiSessionChatMessages(e) {
    let t = this.pi?.resolveSessionPath(e);
    if (!t || !import_node_fs6.default.existsSync(t)) return 0;
    try {
      return import_node_fs6.default
        .readFileSync(t, "utf8")
        .split(/\r?\n/)
        .reduce((t2, n) => {
          if (!n.trim()) return t2;
          try {
            let s = JSON.parse(n),
              a = s == null ? void 0 : s.message;
            return s.type === "message" && (a?.role === "user" || a?.role === "assistant")
              ? t2 + 1
              : t2;
          } catch {
            return t2;
          }
        }, 0);
    } catch {
      return 0;
    }
  }
  switchThread(e) {
    return this.threadHistory.switchThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), true)
      : false;
  }
  archiveThread(e = this.threadHistory.currentThreadId) {
    return this.threadHistory.archiveThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), true)
      : false;
  }
  unarchiveThread(e) {
    return this.threadHistory.unarchiveThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), true)
      : false;
  }
  deleteThread(e) {
    return this.threadHistory.deleteThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), true)
      : false;
  }
  clearArchivedThreads() {
    let e = this.threadHistory.clearArchivedThreads();
    return e === 0 ? 0 : (this.syncCurrentThreadState(), this.saveThreadHistory(), e);
  }
  renameThread(e, t) {
    return this.threadHistory.renameThread(e, t)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), true)
      : false;
  }
  toggleThreadFavorite(e) {
    return this.threadHistory.toggleThreadFavorite(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), true)
      : false;
  }
  async activateView() {
    var n;
    let t = (n = this.app.workspace.getLeavesOfType(PI_AGENT_VIEW_TYPE)[0]) != null ? n : null;
    if (!t) {
      if (((t = this.app.workspace.getRightLeaf(false)), !t)) {
        new P.Notice("Could not open Pi view.");
        return;
      }
      await t.setViewState({ type: PI_AGENT_VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(t);
  }
  async runPiPrompt(e, t, n, i = this.pi) {
    var p;
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    if (
      ((!this.graph || !this.contextBuilder || !this.pi) && this.rebuildServices(),
      !this.graph || !this.contextBuilder || !this.pi)
    )
      throw new Error("Pi services are not available.");
    let s = this.getEditorSelection(),
      a = getCompactInstructions(e) === void 0 ? await this.contextBuilder.build(e, s) : void 0;
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    if (isContextShowPrompt(e)) {
      return {
        finalResponse: formatContextShowResponse(a?.inspection),
        sessionId: n,
        threadId: n,
        events: [],
        contextUsage: void 0,
        contextCompacted: false,
        tokenUsage: void 0
      };
    }
    let o = n ? this.threadHistory.getThread(n) : this.threadHistory.getCurrentThread();
    if (!o) throw new Error("Chat thread no longer exists.");
    if (!i) throw new Error("Pi runner is not available.");
    let l = getPriorThreadHistory(o.messages, e);
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    await this.ensureModelCatalogLoaded();
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    a &&
      ((p = t == null ? void 0 : t.onEvent) == null ||
        p.call(t, {
          type: "context_ready",
          raw: {
            searchResults: a.searchResults.length,
            linkedNeighborhood: a.linkedNeighborhood.length
          }
        }));
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    let h = await i.run(e, a, o.piSessionId, l, t);
    return (
      h.sessionId &&
        (this.threadHistory.setThreadPiSessionId(o.id, h.sessionId),
        this.syncCurrentThreadState(),
        this.saveThreadHistory()),
      h
    );
  }
  async ensureModelCatalogLoaded() {
    this.settings.availableModels.length === 0 && (await this.refreshModelCatalog(false));
  }
  getModelInfoForTokenUsage(e) {
    if (!e) return;
    let t = e.modelId || (e.provider && e.model ? `${e.provider}/${e.model}` : "");
    if (t) {
      let n = this.settings.availableModels.find((s) => s.slug === t);
      if (n) return n;
    }
    return e.model
      ? this.settings.availableModels.find((n) => n.slug.endsWith(`/${e.model}`))
      : void 0;
  }
  getSelectedModelInfo(e) {
    let t = this.getModelInfoForTokenUsage(e);
    if (t) return t;
    let n =
      this.settings.model === CUSTOM_MODEL_VALUE ? this.settings.customModel : this.settings.model;
    n || (n = this.settings.effectiveModel);
    return n ? this.settings.availableModels.find((s) => s.slug === n) : void 0;
  }
  async inspectPiContext(e) {
    if (((!this.graph || !this.contextBuilder) && this.rebuildServices(), !this.contextBuilder))
      throw new Error("Pi context builder is not available.");
    return this.contextBuilder.inspectContext(e, this.getEditorSelection());
  }
  getCurrentContextFile() {
    return (this.refreshCurrentContextFile(), this.currentContextFile);
  }
  cancelPiRun(e) {
    var t;
    (e != null ? e : (t = this.pi) != null ? t : void 0)?.cancelCurrentRun();
  }
  createPiRunner() {
    (!this.graph || !this.contextBuilder) && this.rebuildServices();
    if (!this.contextBuilder) throw new Error("Pi context builder is not available.");
    return new PiRunner(
      this.settings,
      this.contextBuilder,
      this.getVaultBasePath(),
      this.getPluginDirectory()
    );
  }
  rebuildServices() {
    ((this.graph = new VaultGraph(this.app, this.settings, () => this.getCurrentContextFile())),
      (this.contextBuilder = new ContextBuilder(
        this.graph,
        this.settings,
        be,
        this.getVaultBasePath()
      )),
      (this.catalog = new PiModelCatalog(this.getPluginDirectory(), this.settings)),
      (this.pi = new PiRunner(
        this.settings,
        this.contextBuilder,
        this.getVaultBasePath(),
        this.getPluginDirectory()
      )));
  }
  syncCurrentThreadState() {
    this.messages = this.threadHistory.getCurrentMessages();
  }
  saveThreadHistory() {
    this.savePluginData().catch((e) => {
      console.warn("Pi Agent: failed to save thread history", e);
    });
  }
  savePluginData() {
    let e = {
      ...this.settings,
      availableModels: [],
      chatHistory: sanitizeThreadHistory(this.threadHistory.toJSON())
    };
    return (
      (this.dataSaveChain = this.dataSaveChain.catch(() => {}).then(() => this.saveData(e))),
      this.dataSaveChain
    );
  }
  refreshCurrentContextFile() {
    this.setCurrentContextFile(this.app.workspace.getActiveFile());
  }
  setCurrentContextFile(e) {
    this.currentContextFile = e && e.extension === "md" ? e : void 0;
  }
  runWithActiveMarkdownNote(e, t) {
    let n = this.app.workspace.getActiveFile(),
      s = !!n && n.extension === "md";
    if (e) return s;
    if (!s) {
      new P.Notice("Open a markdown note first.");
      return false;
    }
    t();
    return true;
  }
  async runCommandPrompt(e) {
    await this.activateView();
    let t = this.app.workspace.getLeavesOfType(PI_AGENT_VIEW_TYPE)[0],
      n = t == null ? void 0 : t.view;
    if (n instanceof PiAgentView) {
      n.runPrompt(e);
      return;
    }
    new P.Notice("Could not open Pi view.");
  }
  async suggestFrontmatterForCurrentNote() {
    var o;
    this.graph || this.rebuildServices();
    let e = (o = this.graph) == null ? void 0 : o.getActiveFile();
    if (!e) {
      new P.Notice("Open a markdown note first.");
      return;
    }
    let t = await this.app.vault.cachedRead(e),
      n = /* @__PURE__ */ new Date().toISOString().slice(0, 10),
      s = previewSuggestedFrontmatter(t, {
        type: "note",
        status: "draft",
        updated: n,
        tags: this.inferTags(e, t)
      }),
      a = {
        id: `${Date.now()}-${e.path}`,
        path: e.path,
        before: t,
        after: s,
        reason: "Add baseline Pi-suggested frontmatter",
        frontmatterPatch: {
          type: "note",
          status: "draft",
          updated: n,
          tags: this.inferTags(e, t)
        }
      };
    new ApprovalModal(this, a, () => {}).open();
  }
  inferTags(e, t) {
    var a, o, l;
    let n = /* @__PURE__ */ new Set(),
      s = (a = e.parent) == null ? void 0 : a.path;
    s &&
      s !== "/" &&
      n.add(
        (l = (o = s.split("/").pop()) == null ? void 0 : o.toLowerCase().replace(/\s+/g, "-")) !=
          null
          ? l
          : ""
      );
    for (let d of t.matchAll(/#([A-Za-z0-9/_-]+)/g)) n.add(d[1]);
    return [...n].filter(Boolean).slice(0, 6);
  }
  getEditorSelection() {
    var n;
    let e = this.app.workspace.activeEditor,
      t = e == null ? void 0 : e.editor;
    return (n = t == null ? void 0 : t.getSelection()) != null ? n : "";
  }
  getVaultBasePath() {
    var t;
    let e = this.app.vault.adapter;
    return (t = e.getBasePath) == null ? void 0 : t.call(e);
  }
  getPluginDirectory() {
    var a;
    let e = this.getVaultBasePath();
    if (!e) return;
    let t = (a = this.manifest.dir) != null ? a : `plugins/${this.manifest.id}`,
      n = e.replace(/\/+$/, ""),
      s = t.replace(/^\/+/, "");
    return s.startsWith(".obsidian/")
      ? `${n}/${s}`
      : n.endsWith("/.obsidian")
        ? `${n}/${s}`
        : `${n}/.obsidian/${s}`;
  }
};
function isLegacyBareModelId(model) {
  return !model.includes("/") && model !== "__custom";
}
function getPriorThreadHistory(r, i) {
  let e = r[r.length - 1];
  return (e == null ? void 0 : e.role) === "user" && e.content === i ? r.slice(0, -1) : r;
}

// src/main.js
var main_default = PiAgentPlugin;
