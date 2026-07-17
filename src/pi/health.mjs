import { spawn, spawnSync } from "node:child_process";
import { diagnosePiCliFailure } from "./diagnostics.mjs";
import { buildPiProcessInvocation, findPiExecutable } from "./environment.mjs";

// Keep these explicit: compatibility changes require a deliberate test pass and changelog entry.
export const MINIMUM_PI_VERSION = "0.80.0";
export const TESTED_PI_VERSION = "0.80.7";

export function warmupPiCli(piExecutablePath = "", cwd) {
  try {
    const piExecutable = findPiExecutable(piExecutablePath);
    const invocation = buildPiProcessInvocation(piExecutable, ["--version"], {
      ...(cwd ? { cwd } : {}),
      detached: process.platform !== "win32",
      stdio: "ignore",
      windowsHide: true
    });
    const child = spawn(invocation.command, invocation.args, invocation.options);
    child.on("error", () => {
      // Best-effort startup warmup only.
    });
    child.unref?.();
  } catch {
    // Best-effort startup warmup only.
  }
}

export function checkPiInstallation(piExecutablePath = "") {
  const piExecutable = findPiExecutable(piExecutablePath);
  const invocation = buildPiProcessInvocation(piExecutable, ["--version"], {
    encoding: "utf8",
    timeout: 5000
  });
  const result = spawnSync(invocation.command, invocation.args, invocation.options);

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

  const versionText = (result.stdout || result.stderr || "Pi CLI found.").trim();
  const version = extractVersion(versionText);
  if (version && compareVersions(version, MINIMUM_PI_VERSION) < 0) {
    return {
      ok: false,
      kind: "pi-unsupported",
      version,
      supported: false,
      message: `Pi ${version} is installed, but Pi Agent requires Pi ${MINIMUM_PI_VERSION} or newer. Upgrade Pi, fully restart Obsidian, and check the installation again.`
    };
  }

  return {
    ok: true,
    version: version || versionText,
    supported: true,
    message: versionText
  };
}

export function extractVersion(value) {
  return (
    String(value || "").match(
      /\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?/
    )?.[0] ?? ""
  );
}

export function compareVersions(left, right) {
  const parse = (value) => {
    const [withoutBuild] = String(value).split("+", 1);
    const prereleaseIndex = withoutBuild.indexOf("-");
    const core = prereleaseIndex < 0 ? withoutBuild : withoutBuild.slice(0, prereleaseIndex);
    const prerelease = prereleaseIndex < 0 ? "" : withoutBuild.slice(prereleaseIndex + 1);
    return { core: core.split(".").map(Number), prerelease: prerelease.split(".").filter(Boolean) };
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index++) {
    const difference = (a.core[index] || 0) - (b.core[index] || 0);
    if (difference) return Math.sign(difference);
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length ? -1 : 1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index++) {
    const leftPart = a.prerelease[index];
    const rightPart = b.prerelease[index];
    if (leftPart === undefined || rightPart === undefined) return leftPart === undefined ? -1 : 1;
    if (leftPart === rightPart) continue;
    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) return Math.sign(Number(leftPart) - Number(rightPart));
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}
