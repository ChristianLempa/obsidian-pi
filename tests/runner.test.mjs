import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/plugin/settings.mjs";
import { PiRunner } from "../src/pi/runner.mjs";

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
      sessionId: "session-id"
    });
    expect(result).not.toHaveProperty("changeStats");
  });

  it("uses Pi-returned provider and model to resolve the matching context window", () => {
    expect(
      createRunner({
        availableModels: [
          { slug: "cloudflare-ai-gateway/gpt-5.5", contextWindow: 1_100_000 },
          { slug: "openai-codex/gpt-5.5", contextWindow: 272_000 }
        ]
      }).getRunContextUsage({
        input: 3000,
        output: 50,
        provider: "openai-codex",
        model: "gpt-5.5",
        modelId: "openai-codex/gpt-5.5"
      })
    ).toEqual({
      tokens: 3000,
      contextWindow: 272_000,
      percent: (3000 / 272_000) * 100
    });
  });

  it("returns Pi token usage as context usage even when model metadata is unavailable", () => {
    expect(createRunner().getRunContextUsage({ input: 3000, output: 50 })).toEqual({
      tokens: 3000,
      contextWindow: 0,
      percent: undefined
    });
  });

  it("creates forked session files with portable session references", () => {
    const tempDir = createTempDir();
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/new",
      tempDir
    );
    const sessionPath = path.join(runner.getSessionDirectory(), "session.jsonl");
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    fs.writeFileSync(
      sessionPath,
      `${JSON.stringify({ type: "session", id: "old", cwd: "/old" })}\n${JSON.stringify({ type: "message", text: "hi" })}\n`,
      "utf8"
    );

    const forkReference = runner.createForkSessionFile(sessionPath);
    const forkPath = runner.resolveSessionPath(forkReference);

    expect(forkReference).toMatch(/\.jsonl$/);
    expect(path.isAbsolute(forkReference)).toBe(false);
    const forkedEvents = fs
      .readFileSync(forkPath, "utf8")
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));

    expect(forkedEvents[0]).toMatchObject({
      type: "session",
      cwd: "/new",
      parentSession: "session.jsonl"
    });
    expect(forkedEvents[1]).toEqual({ type: "message", text: "hi" });
  });

  it("resolves only local Pi session references", () => {
    const tempDir = createTempDir();
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/new",
      tempDir
    );
    const localSessionPath = path.join(runner.getSessionDirectory(), "local.jsonl");
    const foreignSessionPath = path.join(createTempDir(), "foreign.jsonl");

    expect(runner.createSessionReference(localSessionPath)).toBe("local.jsonl");
    expect(runner.resolveSessionPath("local.jsonl")).toBe(localSessionPath);
    expect(runner.resolveSessionPath(localSessionPath)).toBe(localSessionPath);
    expect(runner.resolveSessionPath(foreignSessionPath)).toBeUndefined();
    expect(runner.resolveSessionPath("../foreign.jsonl")).toBeUndefined();
  });
});
