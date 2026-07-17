import path from "node:path";
import { normalizeList } from "../shared/paths.mjs";

export function normalizeSkillFolderList(value) {
  return normalizeList(value);
}

/**
 * Resolve only user-configured skill paths. Project/default skill discovery is
 * intentionally delegated to Pi so its trust and resource precedence rules apply.
 */
export function getConfiguredSkillPaths(settings, basePath) {
  return normalizeSkillFolderList(settings?.additionalSkillFolders)
    .map((skillPath) => resolveSkillPath(skillPath, basePath))
    .filter(Boolean);
}

export function resolveSkillPath(skillPath, basePath) {
  const configured = String(skillPath || "").trim();
  if (!configured || configured.startsWith("~")) return "";
  if (path.isAbsolute(configured)) return path.normalize(configured);
  if (!basePath) return "";

  const base = path.resolve(basePath);
  const resolved = path.resolve(base, configured);
  const relative = path.relative(base, resolved);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
    ? ""
    : resolved;
}
