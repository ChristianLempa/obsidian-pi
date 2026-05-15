import fs from "node:fs";

const POSIX_PI_CANDIDATES = ["/opt/homebrew/bin/pi", "/usr/local/bin/pi", "/usr/bin/pi"];
const WINDOWS_PI_CANDIDATES = ["pi.cmd", "pi.exe", "pi"];

export function findPiExecutable() {
  if (process.platform === "win32") return WINDOWS_PI_CANDIDATES[0];

  for (const candidate of POSIX_PI_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return "pi";
}
