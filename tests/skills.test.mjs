import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  discoverSkills,
  findSkillFiles,
  getConfiguredSkillPaths,
  normalizeSkillFolderList,
  parseSkillFile,
  resolveSkillPath
} from "../src/context/skills.mjs";
import { getSlashCommands } from "../src/context/slash-commands.mjs";

let tempDirs = [];

afterEach(() => {
  for (const tempDir of tempDirs) fs.rmSync(tempDir, { recursive: true, force: true });
  tempDirs = [];
});

function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-agent-skills-"));
  tempDirs.push(tempDir);
  return tempDir;
}

describe("skill helpers", () => {
  it("normalizes skill folder settings and resolves paths", () => {
    expect(normalizeSkillFolderList(".pi/skills\n~/skills, ./more")).toEqual([
      ".pi/skills",
      "~/skills",
      "./more"
    ]);
    expect(resolveSkillPath("relative/skill", "/vault")).toBe(
      path.join("/vault", "relative/skill")
    );
    expect(getConfiguredSkillPaths({ additionalSkillFolders: [".pi/skills"] }, "/vault")).toEqual([
      path.join("/vault", ".pi/skills")
    ]);
  });

  it("finds and parses skill files", () => {
    const root = createTempDir();
    const skillDir = path.join(root, "review-patterns");
    fs.mkdirSync(skillDir);
    const skillPath = path.join(skillDir, "SKILL.md");
    fs.writeFileSync(
      skillPath,
      `---\nname: Review Patterns\ndescription: >\n  Use team review patterns.\n---\n# Review patterns\nBody`,
      "utf8"
    );

    expect(findSkillFiles(root)).toEqual([skillPath]);
    expect(parseSkillFile(skillPath)).toMatchObject({
      name: "review-patterns",
      description: "Use team review patterns.",
      path: skillPath,
      sourceRank: 1
    });
  });

  it("discovers custom skills and exposes slash commands", () => {
    const root = createTempDir();
    fs.writeFileSync(
      path.join(root, "SKILL.md"),
      "---\nname: docs-helper\ndescription: Help docs\n---\nBody",
      "utf8"
    );

    const settings = { includeDefaultSkills: false, additionalSkillFolders: [root] };

    expect(discoverSkills(settings, "")).toMatchObject([
      { name: "docs-helper", description: "Help docs", path: path.join(root, "SKILL.md") }
    ]);
    expect(getSlashCommands(settings, "").map((command) => command.command)).toContain(
      "/skill:docs-helper"
    );
  });
});
