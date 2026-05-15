import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/plugin/settings.mjs";
import { PiRunner, emptyChangeStats } from "../src/pi/runner.mjs";

let tempDirs = [];

afterEach(() => {
  for (const tempDir of tempDirs) fs.rmSync(tempDir, { recursive: true, force: true });
  tempDirs = [];
});

function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-agent-runner-"));
  tempDirs.push(tempDir);
  return tempDir;
}

function createRunner(settings = {}) {
  return new PiRunner(
    { ...DEFAULT_SETTINGS, ...settings },
    { formatPrompt: (prompt) => `formatted:${prompt}` },
    "/vault",
    "/vault/.obsidian/plugins/pi-agent"
  );
}

describe("PiRunner", () => {
  it("builds Pi CLI args for tool modes, models, thinking, and skills", () => {
    expect(
      createRunner({
        model: "provider/model",
        reasoningEffort: "high",
        sandboxMode: "full-agent",
        includeDefaultSkills: false,
        additionalSkillFolders: [".pi/skills"]
      }).buildPiArgs("session.jsonl")
    ).toEqual([
      "--mode",
      "json",
      "--session",
      "session.jsonl",
      "--model",
      "provider/model",
      "--thinking",
      "high",
      "--no-skills",
      "--skill",
      path.join("/vault", ".pi/skills"),
      "--tools",
      "read,grep,find,ls,edit,write,bash"
    ]);

    expect(createRunner({ sandboxMode: "chat" }).buildPiArgs("session.jsonl")).toContain(
      "--no-tools"
    );
  });

  it("honors cancellation before spawning Pi", async () => {
    await expect(
      createRunner({ dryRun: true }).run(
        "hello",
        {
          activeNote: undefined,
          searchResults: [],
          linkedNeighborhood: []
        },
        "session-id",
        [],
        { isCanceled: () => true }
      )
    ).rejects.toThrow("Pi run canceled.");
  });

  it("returns dry run responses without spawning Pi", async () => {
    const result = await createRunner({ dryRun: true }).run(
      "hello",
      {
        activeNote: undefined,
        searchResults: [],
        linkedNeighborhood: []
      },
      "session-id"
    );

    expect(result).toMatchObject({
      finalResponse: expect.stringContaining("Dry run: Pi CLI was not called."),
      sessionId: "session-id",
      changeStats: emptyChangeStats()
    });
  });

  it("creates forked session files", () => {
    const tempDir = createTempDir();
    const sessionPath = path.join(tempDir, "session.jsonl");
    fs.writeFileSync(
      sessionPath,
      `${JSON.stringify({ type: "session", id: "old", cwd: "/old" })}\n${JSON.stringify({ type: "message", text: "hi" })}\n`,
      "utf8"
    );
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/new",
      tempDir
    );
    const forkPath = runner.createForkSessionFile(sessionPath);

    expect(forkPath).toBeTruthy();
    const forkedEvents = fs
      .readFileSync(forkPath, "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));

    expect(forkedEvents[0]).toMatchObject({
      type: "session",
      cwd: "/new",
      parentSession: sessionPath
    });
    expect(forkedEvents[1]).toEqual({ type: "message", text: "hi" });
  });
});
