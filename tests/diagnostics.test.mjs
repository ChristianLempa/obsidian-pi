import { describe, expect, it } from "vitest";
import {
  diagnosePiCliFailure,
  formatPiCliFailure,
  NODE_RUNTIME_MISSING_MESSAGE,
  PI_CLI_MISSING_MESSAGE
} from "../src/pi/diagnostics.mjs";

describe("Pi CLI diagnostics", () => {
  it("returns an install message when the Pi executable is missing", () => {
    const error = Object.assign(new Error("spawn pi ENOENT"), { code: "ENOENT" });

    const diagnostic = diagnosePiCliFailure({ error });

    expect(diagnostic).toEqual({ kind: "pi-missing", message: PI_CLI_MISSING_MESSAGE });
  });

  it("returns a Node/PATH message when env cannot find node", () => {
    const diagnostic = diagnosePiCliFailure({
      stderr: "/usr/bin/env: node: No such file or directory",
      exitCode: 127
    });

    expect(diagnostic).toEqual({ kind: "node-missing", message: NODE_RUNTIME_MISSING_MESSAGE });
  });

  it("keeps context for generic Pi failures", () => {
    expect(
      formatPiCliFailure({
        context: "Could not query Pi model registry",
        stderr: "provider auth failed",
        exitCode: 1
      })
    ).toBe("Could not query Pi model registry: provider auth failed");
  });
});
