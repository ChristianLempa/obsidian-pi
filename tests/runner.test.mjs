import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  it("builds Pi CLI args for tool modes and skills", () => {
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
      "rpc",
      "--session",
      "session.jsonl",
      "--no-skills",
      "--skill",
      path.join("/vault", ".pi/skills")
    ]);

    expect(createRunner({ sandboxMode: "chat" }).buildPiArgs("session.jsonl")).toContain(
      "--no-tools"
    );
    expect(createRunner({ sandboxMode: "review" }).buildPiArgs("session.jsonl")).toContain(
      "read,grep,find,ls"
    );
  });

  it("loads durable instructions through the persistent Pi runtime arguments", () => {
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { getSystemInstructions: () => "Bundled\n\nCustom", formatPrompt: (prompt) => prompt },
      "/vault",
      "/vault/.obsidian/plugins/pi-agent"
    );
    const args = runner.buildPiArgs("session.jsonl");

    expect(args).toContain("--append-system-prompt");
    expect(args[args.indexOf("--append-system-prompt") + 1]).toBe("Bundled\n\nCustom");
  });

  it("wraps unknown slash prompts as normal user prompts", async () => {
    const formatPrompt = vi.fn((prompt) => `formatted:${prompt}`);
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt },
      "/vault",
      "/vault/.obsidian/plugins/pi-agent"
    );
    runner.runPiRpc = vi.fn(async (prompt) => ({ finalResponse: prompt }));

    await expect(runner.run("/missing test", { userPrompt: "/missing test" })).resolves.toMatchObject(
      { finalResponse: "formatted:/missing test" }
    );
    expect(formatPrompt).toHaveBeenCalledOnce();
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

  it("reuses an injected RPC client and streams run events", async () => {
    const tempDir = createTempDir();
    const listeners = new Set();
    const requests = [];
    const rpcClient = {
      start: vi.fn(async () => {}),
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async request(type, payload) {
        requests.push({ type, payload });
        for (const listener of listeners) {
          listener({
            type: "message_update",
            message: { role: "assistant", content: [] },
            assistantMessageEvent: { type: "text_delta", delta: `echo:${payload.message}` }
          });
          listener({ type: "agent_settled" });
        }
      }
    };
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/vault",
      tempDir,
      rpcClient
    );

    const first = await runner.runPiRpc("one", undefined);
    const second = await runner.runPiRpc("two", first.sessionId);

    expect(first.finalResponse).toBe("echo:one");
    expect(second.finalResponse).toBe("echo:two");
    expect(requests).toEqual([
      { type: "prompt", payload: { message: "one" } },
      { type: "prompt", payload: { message: "two" } }
    ]);
    expect(rpcClient.start).toHaveBeenCalledTimes(2);
  });

  it("sends image content and one-shot steering through RPC", async () => {
    const requests = [];
    const listeners = new Set();
    const rpcClient = {
      start: vi.fn(async () => {}),
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async request(type, payload) {
        requests.push({ type, payload });
        if (type === "steer") {
          for (const listener of listeners) listener({ type: "agent_settled" });
        }
      }
    };
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/vault",
      createTempDir(),
      rpcClient
    );

    const run = runner.runPiRpc("inspect", undefined, undefined, [
      { id: "one", fileName: "one.png", mimeType: "image/png", data: "cG5n" }
    ]);
    await vi.waitFor(() =>
      expect(requests.some((request) => request.type === "prompt")).toBe(true)
    );
    await runner.steer("look again", [
      { id: "two", fileName: "two.webp", mimeType: "image/webp", data: "d2VicA==" }
    ]);
    await run;

    expect(requests).toContainEqual({
      type: "prompt",
      payload: {
        message: "inspect",
        images: [{ type: "image", data: "cG5n", mimeType: "image/png" }]
      }
    });
    expect(requests).toContainEqual({
      type: "steer",
      payload: {
        message: "look again",
        images: [{ type: "image", data: "d2VicA==", mimeType: "image/webp" }]
      }
    });
  });

  it("configures model and thinking through RPC before the first prompt", async () => {
    const requests = [];
    const listeners = new Set();
    const rpcClient = {
      start: vi.fn(async () => {}),
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async request(type, payload) {
        requests.push({ type, payload });
        if (type === "prompt") {
          for (const listener of listeners) listener({ type: "agent_settled" });
        }
      }
    };
    const runner = new PiRunner(
      { ...DEFAULT_SETTINGS, model: "provider/model/name", reasoningEffort: "max" },
      { formatPrompt: (prompt) => prompt },
      "/vault",
      createTempDir(),
      rpcClient
    );

    await runner.runPiRpc("one", undefined);
    await runner.runPiRpc("two", runner.rpcSession.reference);

    expect(requests).toEqual([
      { type: "set_model", payload: { provider: "provider", modelId: "model/name" } },
      { type: "set_thinking_level", payload: { level: "max" } },
      { type: "prompt", payload: { message: "one" } },
      { type: "prompt", payload: { message: "two" } }
    ]);
  });

  it("reapplies RPC overrides after the Pi process restarts", async () => {
    const requests = [];
    const listeners = new Set();
    const rpcClient = {
      child: { pid: 1 },
      start: vi.fn(async () => {}),
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async request(type, payload) {
        requests.push({ type, payload });
        if (type === "prompt") {
          for (const listener of listeners) listener({ type: "agent_settled" });
        }
      }
    };
    const runner = new PiRunner(
      { ...DEFAULT_SETTINGS, model: "provider/model", reasoningEffort: "high" },
      { formatPrompt: (prompt) => prompt },
      "/vault",
      createTempDir(),
      rpcClient
    );

    await runner.runPiRpc("one", undefined);
    rpcClient.child = { pid: 2 };
    await runner.runPiRpc("two", runner.rpcSession.reference);

    expect(requests.map(({ type }) => type)).toEqual([
      "set_model",
      "set_thinking_level",
      "prompt",
      "set_model",
      "set_thinking_level",
      "prompt"
    ]);
  });

  it("cancels persistent runs through RPC abort", () => {
    const abort = vi.fn();
    const runner = createRunner();
    runner.rpcClient = { abort };

    runner.cancelCurrentRun();

    expect(abort).toHaveBeenCalledOnce();
  });

  it("does not send a prompt when cancellation happens during RPC startup", async () => {
    let finishStart;
    const rpcClient = {
      start: () => new Promise((resolve) => (finishStart = resolve)),
      abort: vi.fn(),
      request: vi.fn(),
      subscribe: vi.fn()
    };
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/vault",
      createTempDir(),
      rpcClient
    );

    const run = runner.runPiRpc("hello", undefined);
    await vi.waitFor(() => expect(runner.isRunning).toBe(true));
    runner.cancelCurrentRun();
    finishStart();

    await expect(run).rejects.toThrow("Pi run canceled.");
    expect(rpcClient.request).not.toHaveBeenCalled();
    expect(runner.isRunning).toBe(false);
  });

  it("tracks native compaction as an active RPC run", async () => {
    let finishCompact;
    const rpcClient = {
      start: vi.fn(async () => {}),
      subscribe: () => () => {},
      request: () => new Promise((resolve) => (finishCompact = resolve))
    };
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/vault",
      createTempDir(),
      rpcClient
    );

    const compact = runner.runPiRpcCompact(undefined);
    await vi.waitFor(() => expect(finishCompact).toBeTypeOf("function"));
    expect(runner.isRunning).toBe(true);
    finishCompact({ summary: "short" });

    await expect(compact).resolves.toMatchObject({ contextCompacted: true });
    expect(runner.isRunning).toBe(false);
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

  it("uses Pi RPC clone and returns a portable session reference", async () => {
    const tempDir = createTempDir();
    const sessionPath = path.join(tempDir, "pi-sessions", "session.jsonl");
    const clonedPath = path.join(tempDir, "pi-sessions", "clone.jsonl");
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    fs.writeFileSync(sessionPath, "{}\n", "utf8");
    fs.writeFileSync(clonedPath, "{}\n", "utf8");
    const requests = [];
    const rpcClient = {
      start: vi.fn(async () => {}),
      request: vi.fn(async (type) => {
        requests.push(type);
        return type === "get_state" ? { sessionFile: clonedPath } : { cancelled: false };
      })
    };
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/new",
      tempDir,
      rpcClient
    );

    await expect(runner.cloneSession("session.jsonl")).resolves.toBe("clone.jsonl");
    expect(requests).toEqual(["clone", "get_state"]);
    expect(path.isAbsolute("clone.jsonl")).toBe(false);
  });

  it("rejects native operations for missing sessions instead of creating replacement files", async () => {
    const tempDir = createTempDir();
    const rpcClient = {
      start: vi.fn(async () => {}),
      request: vi.fn()
    };
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/vault",
      tempDir,
      rpcClient
    );

    await expect(runner.getSessionStats("missing.jsonl")).rejects.toThrow(
      "local Pi session file is not available"
    );
    expect(rpcClient.start).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(tempDir, "pi-sessions"))).toBe(false);
  });

  it("delegates session metadata, naming, entry, tree, and export operations to RPC", async () => {
    const tempDir = createTempDir();
    const sessionPath = path.join(tempDir, "pi-sessions", "session.jsonl");
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    fs.writeFileSync(sessionPath, "{}\n", "utf8");
    const rpcClient = {
      start: vi.fn(async () => {}),
      request: vi.fn(async (type) => ({ type }))
    };
    const runner = new PiRunner(
      DEFAULT_SETTINGS,
      { formatPrompt: (prompt) => prompt },
      "/vault",
      tempDir,
      rpcClient
    );

    await runner.getSessionStats("session.jsonl");
    await runner.setSessionName("session.jsonl", "Named chat");
    await runner.getSessionEntries("session.jsonl", "entry-1");
    await runner.getSessionTree("session.jsonl");
    await runner.exportSession("session.jsonl", "/tmp/session.html");

    expect(rpcClient.request.mock.calls).toEqual([
      ["get_session_stats"],
      ["set_session_name", { name: "Named chat" }],
      ["get_entries", { since: "entry-1" }],
      ["get_tree"],
      ["export_html", { outputPath: "/tmp/session.html" }]
    ]);
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
