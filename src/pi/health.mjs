import { spawnSync } from "node:child_process";
import { diagnosePiCliFailure } from "./diagnostics.mjs";
import { buildPiProcessEnv, findPiExecutable } from "./environment.mjs";

export function checkPiInstallation() {
  const piExecutable = findPiExecutable();
  const result = spawnSync(piExecutable, ["--version"], {
    encoding: "utf8",
    env: buildPiProcessEnv(piExecutable),
    timeout: 5000
  });

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
