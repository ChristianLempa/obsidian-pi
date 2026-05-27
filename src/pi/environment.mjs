import fs from "node:fs";
import path from "node:path";

const POSIX_PI_CANDIDATES = ["/opt/homebrew/bin/pi", "/usr/local/bin/pi", "/usr/bin/pi"];
const WINDOWS_PI_CANDIDATES = ["pi.cmd", "pi.exe", "pi"];
const POSIX_PATH_CANDIDATES = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin"
];

export function findPiExecutable(configuredPath = "") {
  const configuredExecutable = normalizePiExecutablePath(configuredPath);
  if (configuredExecutable) return configuredExecutable;
  if (process.platform === "win32") return WINDOWS_PI_CANDIDATES[0];

  for (const candidate of POSIX_PI_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const piNode = findPiNodeExecutable();
  if (piNode) return piNode;

  return "pi";
}

export function normalizePiExecutablePath(executablePath) {
  const normalizedPath = typeof executablePath === "string" ? executablePath.trim() : "";
  if (!normalizedPath) return "";

  return expandEnvironmentVariables(expandHomeDirectory(normalizedPath));
}

function expandHomeDirectory(executablePath) {
  const home = process.env.HOME;
  if (!home) return executablePath;
  if (executablePath === "~") return home;
  return executablePath.startsWith(`~${path.sep}`)
    ? path.join(home, executablePath.slice(2))
    : executablePath;
}

function expandEnvironmentVariables(executablePath) {
  return executablePath.replace(/\$(\w+)|\$\{([^}]+)\}/g, (match, name, bracedName) => {
    const value = process.env[name || bracedName];
    return value === undefined ? match : value;
  });
}

function findPiNodeExecutable() {
  const home = process.env.HOME;
  if (!home) return null;

  const root = path.join(home, ".local", "share", "pi-node");

  try {
    const versions = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(root, d.name));

    for (const v of versions) {
      const candidate = path.join(v, "bin", "pi");
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildPiProcessInvocation(piExecutable, args = [], options = {}) {
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

export function buildPiProcessOptions(piExecutable = findPiExecutable(), options = {}) {
  return {
    ...options,
    env: buildPiProcessEnv(piExecutable)
  };
}

export function buildPiProcessEnv(piExecutable = findPiExecutable()) {
  if (process.platform === "win32") return process.env;

  return {
    ...process.env,
    PATH: buildPosixPath(piExecutable)
  };
}

function shouldUseWindowsCommandShell(piExecutable) {
  return process.platform === "win32" && /\.(?:cmd|bat)$/i.test(piExecutable);
}

function quoteWindowsCommand(parts) {
  return parts.map((part) => `"${String(part).replace(/"/g, '\\"')}"`).join(" ");
}

function buildPosixPath(piExecutable) {
  return uniqueExistingDirectories([
    ...getExecutableDirectory(piExecutable),
    ...POSIX_PATH_CANDIDATES,
    ...getPiNodePaths(),
    ...getNodeVersionManagerDirectories(),
    ...getExistingPathEntries()
  ]).join(path.delimiter);
}

function getPiNodePaths() {
  const home = process.env.HOME;
  if (!home) return [];

  const root = path.join(home, ".local", "share", "pi-node");

  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(root, d.name, "bin"));
  } catch {
    return [];
  }
}

function getExistingPathEntries() {
  return (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
}

function getExecutableDirectory(executable) {
  return path.isAbsolute(executable) ? [path.dirname(executable)] : [];
}

function getNodeVersionManagerDirectories() {
  const home = process.env.HOME;
  if (!home) return [];

  return [
    ...getNvmNodeBinDirectories(path.join(home, ".nvm", "versions", "node")),
    ...getFnmNodeBinDirectories(path.join(home, ".fnm", "node-versions")),
    path.join(home, ".asdf", "shims"),
    path.join(home, ".volta", "bin")
  ];
}

function getNvmNodeBinDirectories(root) {
  return getChildDirectories(root).map((directory) => path.join(directory, "bin"));
}

function getFnmNodeBinDirectories(root) {
  return getChildDirectories(root).map((directory) => path.join(directory, "installation", "bin"));
}

function getChildDirectories(root) {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name));
  } catch {
    return [];
  }
}

function uniqueExistingDirectories(directories) {
  const seen = new Set();
  return directories.filter((directory) => {
    if (!directory || seen.has(directory) || !fs.existsSync(directory)) return false;
    seen.add(directory);
    return true;
  });
}
