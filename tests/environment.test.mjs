import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPiProcessEnv,
  buildPiProcessInvocation,
  buildPiProcessOptions,
  findPiExecutable
} from "../src/pi/environment.mjs";

const originalEnv = {
  HOME: process.env.HOME,
  PATH: process.env.PATH,
  USER: process.env.USER
};
const originalPlatform = process.platform;

afterEach(() => {
  setPlatform(originalPlatform);
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function setPlatform(platform) {
  Object.defineProperty(process, "platform", { configurable: true, value: platform });
}

describe("Pi process environment", () => {
  it("prepends the Pi executable directory so env can find node for GUI launches", () => {
    if (process.platform === "win32") return;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-env-"));
    const piExecutable = path.join(tempDir, "pi");
    fs.writeFileSync(piExecutable, "");
    process.env.PATH = "/usr/bin";

    const env = buildPiProcessEnv(piExecutable);

    expect(env.PATH.split(path.delimiter)[0]).toBe(tempDir);
  });

  it("uses a configured Pi executable path before auto-detection", () => {
    if (process.platform === "win32") return;

    const piExecutable = path.join(os.tmpdir(), "custom-pi");

    expect(findPiExecutable(piExecutable)).toBe(piExecutable);
  });

  it("expands home and environment variables in configured Pi executable paths", () => {
    if (process.platform === "win32") return;

    process.env.HOME = "/Users/tester";
    process.env.USER = "tester";

    expect(findPiExecutable("~/bin/pi")).toBe(path.join("/Users/tester", "bin", "pi"));
    expect(findPiExecutable("/etc/profiles/per-user/${USER}/bin/pi")).toBe(
      "/etc/profiles/per-user/tester/bin/pi"
    );
  });

  it("runs Pi .cmd launchers through cmd.exe on Windows so they work on Node 24+", () => {
    setPlatform("win32");

    expect(buildPiProcessInvocation("pi.cmd", ["--version"], { timeout: 1000 })).toMatchObject({
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", '"pi.cmd" "--version"'],
      options: {
        env: process.env,
        timeout: 1000,
        windowsVerbatimArguments: true
      }
    });
  });

  it("does not use a shell for Pi processes on POSIX", () => {
    setPlatform("darwin");

    expect(buildPiProcessOptions("pi", { timeout: 1000 })).not.toHaveProperty("shell");
  });
});
