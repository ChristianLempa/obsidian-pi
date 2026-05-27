import { spawnSync } from "node:child_process";
import { diagnosePiCliFailure } from "./diagnostics.mjs";
import { buildPiProcessOptions, findPiExecutable } from "./environment.mjs";

export function checkPiInstallation(piExecutablePath = "") {
  const piExecutable = findPiExecutable(piExecutablePath);
  const result = spawnSync(
    piExecutable,
    ["--version"],
    buildPiProcessOptions(piExecutable, {
      encoding: "utf8",
      timeout: 5000
    })
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
