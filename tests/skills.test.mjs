import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getConfiguredSkillPaths,
  normalizeSkillFolderList,
  resolveSkillPath
} from "../src/context/skills.mjs";

describe("configured skill paths", () => {
  it("normalizes explicitly configured paths", () => {
    expect(normalizeSkillFolderList(".pi/skills\n/opt/trusted-skills, ./more")).toEqual([
      ".pi/skills",
      "/opt/trusted-skills",
      "./more"
    ]);
    expect(
      getConfiguredSkillPaths(
        { additionalSkillFolders: [".pi/skills", "/opt/trusted-skills"] },
        "/vault"
      )
    ).toEqual([path.join("/vault", ".pi/skills"), path.normalize("/opt/trusted-skills")]);
  });

  it("rejects home expansion and vault-relative traversal", () => {
    expect(resolveSkillPath("~/skills", "/vault")).toBe("");
    expect(resolveSkillPath("../outside", "/vault")).toBe("");
    expect(resolveSkillPath("relative/skill", "/vault")).toBe(
      path.join("/vault", "relative/skill")
    );
  });
});
