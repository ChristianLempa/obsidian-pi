import { describe, expect, it, vi } from "vitest";
import {
  checkPiInstallation,
  compareVersions,
  extractVersion,
  MINIMUM_PI_VERSION,
  TESTED_PI_VERSION
} from "../src/pi/health.mjs";

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, spawnSync: vi.fn() };
});

import { spawnSync } from "node:child_process";

describe("Pi compatibility helpers", () => {
  it("extracts and compares semantic Pi versions", () => {
    expect(extractVersion("pi 0.80.6")).toBe(TESTED_PI_VERSION);
    expect(extractVersion("pi 0.80.0-beta.2+build.4")).toBe("0.80.0-beta.2+build.4");
    expect(compareVersions(TESTED_PI_VERSION, MINIMUM_PI_VERSION)).toBe(1);
    expect(compareVersions("0.80.0+build.4", MINIMUM_PI_VERSION)).toBe(0);
    expect(compareVersions("0.80.0-beta.2", MINIMUM_PI_VERSION)).toBe(-1);
    expect(compareVersions("0.80.0-beta.10", "0.80.0-beta.2")).toBe(1);
    expect(compareVersions("0.80.0-beta", "0.80.0-2")).toBe(1);
    expect(compareVersions("0.79.9", MINIMUM_PI_VERSION)).toBe(-1);
  });

  it("returns actionable diagnostics for unsupported Pi versions", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "pi 0.79.9\n", stderr: "" });

    expect(checkPiInstallation()).toMatchObject({
      ok: false,
      kind: "pi-unsupported",
      version: "0.79.9",
      supported: false,
      message: expect.stringContaining(`requires Pi ${MINIMUM_PI_VERSION} or newer`)
    });
  });

  it("accepts the minimum version and preserves unparseable successful output", () => {
    spawnSync.mockReturnValueOnce({ status: 0, stdout: `pi ${MINIMUM_PI_VERSION}\n`, stderr: "" });
    expect(checkPiInstallation()).toMatchObject({
      ok: true,
      version: MINIMUM_PI_VERSION,
      supported: true
    });

    spawnSync.mockReturnValueOnce({
      status: 0,
      stdout: `pi ${MINIMUM_PI_VERSION}-beta.1\n`,
      stderr: ""
    });
    expect(checkPiInstallation()).toMatchObject({
      ok: false,
      kind: "pi-unsupported",
      version: `${MINIMUM_PI_VERSION}-beta.1`
    });

    spawnSync.mockReturnValueOnce({ status: 0, stdout: "Pi development build\n", stderr: "" });
    expect(checkPiInstallation()).toMatchObject({
      ok: true,
      version: "Pi development build",
      supported: true
    });
  });
});
