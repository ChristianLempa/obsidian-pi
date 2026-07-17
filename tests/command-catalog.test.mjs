import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCommandDiscoveryArgs, normalizeRpcCommands } from "../src/pi/command-catalog.mjs";

describe("Pi RPC command catalog", () => {
  it("normalizes extension, prompt, and skill commands in Pi order", () => {
    expect(
      normalizeRpcCommands([
        {
          name: "hello",
          source: "extension",
          description: "Say hello",
          sourceInfo: {
            path: "/home/user/extension.ts",
            source: "auto",
            scope: "user",
            origin: "top-level"
          }
        },
        { name: "review", source: "prompt", location: "project" },
        { name: "skill:docs", source: "skill", description: "Read docs" }
      ])
    ).toMatchObject([
      {
        command: "/hello",
        source: "extension",
        detail: "Say hello",
        path: "/home/user/extension.ts",
        sourceInfo: { scope: "user", origin: "top-level" }
      },
      { command: "/review", source: "prompt", location: "project" },
      { command: "/skill:docs", source: "skill", label: "docs" }
    ]);
  });

  it("passes only explicit additional skill paths alongside Pi discovery", () => {
    expect(
      buildCommandDiscoveryArgs(
        { includeDefaultSkills: false, additionalSkillFolders: ["skills"] },
        "/vault"
      )
    ).toEqual([
      "--mode",
      "rpc",
      "--no-session",
      "--no-tools",
      "--no-skills",
      "--skill",
      path.join("/vault", "skills")
    ]);
  });
});
