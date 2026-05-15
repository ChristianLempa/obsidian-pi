import { spawnSync } from "node:child_process";
import { createPiEnvironment } from "./environment.mjs";

export function checkPiInstallation() {
  const result = spawnSync("pi", ["--version"], {
    encoding: "utf8",
    env: createPiEnvironment(),
    timeout: 5000
  });

  if (result.error) {
    return {
      ok: false,
      message:
        result.error.code === "ENOENT"
          ? "Pi CLI was not found on PATH."
          : `Could not run Pi CLI: ${result.error.message}`
    };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      message: (result.stderr || result.stdout || `Pi exited with code ${result.status}.`).trim()
    };
  }

  return {
    ok: true,
    version: (result.stdout || result.stderr || "Pi CLI found.").trim(),
    message: (result.stdout || result.stderr || "Pi CLI found.").trim()
  };
}
