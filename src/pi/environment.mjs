import fs from "node:fs";
import path from "node:path";

const NODE_CANDIDATES = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"];
const POSIX_PATH_FALLBACKS = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin"
];

export function findNodeExecutable() {
  for (const candidate of NODE_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return path.basename(process.execPath).startsWith("node") ? process.execPath : "node";
}

export function createPiEnvironment() {
  const pathKey = getPathEnvironmentKey();
  const delimiter = path.delimiter;
  const pathEntries = (process.env[pathKey] ?? "").split(delimiter).filter(Boolean);

  if (process.platform !== "win32") {
    for (const fallbackPath of POSIX_PATH_FALLBACKS) {
      if (!pathEntries.includes(fallbackPath)) pathEntries.push(fallbackPath);
    }
  }

  return { ...process.env, [pathKey]: pathEntries.join(delimiter) };
}

function getPathEnvironmentKey() {
  return Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
}
