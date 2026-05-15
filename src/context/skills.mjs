import fs from "node:fs";
import path from "node:path";
import { normalizeList } from "../shared/paths.mjs";

const DEFAULT_SKILL_SEARCH_LIMIT = 100;
const DEFAULT_SKILL_SEARCH_DEPTH = 5;

let skillCommandCache = { key: "", at: 0, commands: [] };

export function normalizeSkillFolderList(value) {
  return normalizeList(value);
}

export function getConfiguredSkillPaths(settings, basePath) {
  return normalizeSkillFolderList(settings?.additionalSkillFolders)
    .map((skillPath) => resolveSkillPath(skillPath, basePath))
    .filter(Boolean);
}

export function getSkillSlashCommands(settings, basePath) {
  const cacheKey = JSON.stringify({
    defaults: !settings || settings.includeDefaultSkills !== false,
    additional: normalizeSkillFolderList(settings?.additionalSkillFolders),
    base: basePath || ""
  });
  const now = Date.now();

  if (skillCommandCache.key === cacheKey && now - skillCommandCache.at < 5_000) {
    return skillCommandCache.commands;
  }

  skillCommandCache = {
    key: cacheKey,
    at: now,
    commands: discoverSkillCommands(settings, basePath)
  };

  return skillCommandCache.commands;
}

export function discoverSkillCommands(settings, basePath) {
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

export function discoverSkills(settings, basePath) {
  const roots = [];
  const addRoot = (skillPath, rank) => {
    if (skillPath && !roots.some((root) => root.path === skillPath))
      roots.push({ path: skillPath, rank });
  };

  for (const skillPath of normalizeSkillFolderList(settings?.additionalSkillFolders)) {
    addRoot(resolveSkillPath(skillPath, basePath), 0);
  }

  if (!settings || settings.includeDefaultSkills !== false) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const piAgentDir = process.env.PI_CODING_AGENT_DIR;

    addRoot(
      piAgentDir
        ? joinHomePath(piAgentDir, "skills")
        : home
          ? path.join(home, ".pi", "agent", "skills")
          : "",
      1
    );
    addRoot(home ? path.join(home, ".agents", "skills") : "", 1);

    if (basePath) {
      addRoot(path.join(basePath, ".pi", "skills"), 1);
      addRoot(path.join(basePath, ".agents", "skills"), 1);
    }

    for (const skillPath of getSettingsSkillPaths(basePath)) addRoot(skillPath, 1);
  }

  const skills = new Map();
  for (const root of roots) {
    for (const skillFile of findSkillFiles(root.path)) {
      try {
        const skill = parseSkillFile(skillFile, root.rank);
        if (skill?.name && !skills.has(skill.name)) skills.set(skill.name, skill);
      } catch {
        // Ignore unreadable or malformed skill files during discovery.
      }
    }
  }

  return [...skills.values()];
}

export function findSkillByName(settings, basePath, name) {
  return discoverSkills(settings, basePath).find((skill) => skill.name === name);
}

export function readSkillContent(skillPath) {
  return fs.readFileSync(skillPath, "utf8");
}

export function resolveSkillPath(skillPath, basePath) {
  let resolved = String(skillPath || "").trim();
  if (!resolved) return "";

  if (resolved.startsWith("~")) {
    resolved = (process.env.HOME || process.env.USERPROFILE || "") + resolved.slice(1);
  }

  return path.isAbsolute(resolved) ? resolved : path.join(basePath || "", resolved);
}

export function findSkillFiles(
  skillPath,
  depth = DEFAULT_SKILL_SEARCH_DEPTH,
  includeSiblingMarkdown = true,
  results = []
) {
  if (!skillPath || results.length >= DEFAULT_SKILL_SEARCH_LIMIT) return results;

  let stats;
  try {
    stats = fs.statSync(skillPath);
  } catch {
    return results;
  }

  if (stats.isFile()) {
    if (/(^|\/)SKILL\.md$/i.test(skillPath) || /\.md$/i.test(skillPath)) results.push(skillPath);
    return results;
  }

  if (!stats.isDirectory() || depth < 0) return results;

  const directSkillFile = path.join(skillPath, "SKILL.md");
  try {
    if (fs.existsSync(directSkillFile)) results.push(directSkillFile);
  } catch {
    // Ignore races where a direct SKILL.md disappears during discovery.
  }

  let entries;
  try {
    entries = fs.readdirSync(skillPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (results.length >= DEFAULT_SKILL_SEARCH_LIMIT) break;

    const childPath = path.join(skillPath, entry.name);
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

export function parseSkillFile(skillPath, sourceRank = 1) {
  const content = fs.readFileSync(skillPath, "utf8").slice(0, 8192);
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
    : undefined;
}

export function parseSkillFrontmatter(raw) {
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

export function normalizeSkillName(value) {
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

  const globalSettingsPath = getGlobalSettingsPath();
  if (globalSettingsPath)
    collect(readJsonFile(globalSettingsPath), path.dirname(globalSettingsPath));
  if (basePath) collect(readJsonFile(path.join(basePath, ".pi", "settings.json")), basePath);

  return skillPaths.filter(Boolean);
}

function getGlobalSettingsPath() {
  const piAgentDir = process.env.PI_CODING_AGENT_DIR;
  if (piAgentDir) return joinHomePath(piAgentDir, "settings.json");

  const home = process.env.HOME || process.env.USERPROFILE || "";
  return home ? path.join(home, ".pi", "agent", "settings.json") : "";
}

function readJsonFile(filePath) {
  try {
    return filePath && fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : {};
  } catch {
    return {};
  }
}

function joinHomePath(root, ...parts) {
  let resolved = root;
  if (resolved.startsWith("~")) resolved = (process.env.HOME || "") + resolved.slice(1);
  return path.join(resolved, ...parts);
}

function cleanSkillYamlValue(value) {
  return String(value || "")
    .trim()
    .replace(/^[']|[']$/g, "")
    .replace(/^["]|["]$/g, "");
}

function inferSkillNameFromPath(skillPath) {
  return path.basename(skillPath).toLowerCase() === "skill.md"
    ? path.basename(path.dirname(skillPath))
    : path.basename(skillPath, path.extname(skillPath));
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
