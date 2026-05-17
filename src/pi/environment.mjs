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

export function findPiExecutable() {
  if (process.platform === "win32") return WINDOWS_PI_CANDIDATES[0];

  for (const candidate of POSIX_PI_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return "pi";
}

export function buildPiProcessEnv(piExecutable = findPiExecutable()) {
  if (process.platform === "win32") return process.env;

  return {
    ...process.env,
    PATH: buildPosixPath(piExecutable)
  };
}

function buildPosixPath(piExecutable) {
  return uniqueExistingDirectories([
    ...getExecutableDirectory(piExecutable),
    ...POSIX_PATH_CANDIDATES,
    ...getNodeVersionManagerDirectories(),
    ...getExistingPathEntries()
  ]).join(path.delimiter);
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
