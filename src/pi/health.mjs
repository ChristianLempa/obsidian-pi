import { spawn, spawnSync } from "node:child_process";
import { diagnosePiCliFailure } from "./diagnostics.mjs";
import { buildPiProcessInvocation, findPiExecutable } from "./environment.mjs";

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

  return {
    ok: true,
    version: (result.stdout || result.stderr || "Pi CLI found.").trim(),
    message: (result.stdout || result.stderr || "Pi CLI found.").trim()
  };
}
