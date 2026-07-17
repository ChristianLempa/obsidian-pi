import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getConfiguredSkillPaths } from "../context/skills.mjs";
import { CUSTOM_MODEL_VALUE } from "../plugin/settings.mjs";
import { createContextUsage } from "./token-usage.mjs";
import { createPiCliError, formatPiCliFailure } from "./diagnostics.mjs";
import { buildPiProcessInvocation, findPiExecutable } from "./environment.mjs";
import { handlePiJsonEventLine } from "./events.mjs";
import { PiRpcClient } from "./rpc-client.mjs";

export function isPiCliCommandPrompt(prompt) {
  return /^\/(compact)(?:\s|$)/i.test(prompt.trim());
}

export function getCompactInstructions(prompt) {
  const match = prompt.trim().match(/^\/compact(?:\s+([\s\S]+))?$/i);
  return match ? (match[1] ?? "").trim() : undefined;
}

export class PiRunner {
  constructor(settings, contextBuilder, workingDirectory, pluginDirectory, rpcClient) {
    this.settings = settings;
    this.contextBuilder = contextBuilder;
    this.workingDirectory = workingDirectory;
    this.pluginDirectory = pluginDirectory;
    this.rpcClient = rpcClient;
    this.cancelRequested = false;
  }

  async run(prompt, context, sessionId, threadHistory = [], callbacks) {
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");
    const compactInstructions = getCompactInstructions(prompt);
    if (compactInstructions !== undefined)
      return this.settings.dryRun
        ? this.formatDryRunCompactResponse(sessionId)
        : this.runPiRpcCompact(sessionId, compactInstructions, callbacks);

    const effectivePrompt = context?.userPrompt ?? prompt;
    const formattedPrompt = this.contextBuilder.formatPrompt(
      effectivePrompt,
      context,
      threadHistory
    );
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");

    return this.settings.dryRun
      ? {
          finalResponse: this.formatDryRunResponse(prompt, context),
          sessionId,
          threadId: sessionId,
          events: []
        }
      : this.runPiRpc(formattedPrompt, sessionId, callbacks);
  }

  cancelCurrentRun() {
    this.cancelRequested = true;
    if (this.rpcClient) {
      this.rpcClient.abort();
      return;
    }
    if (!this.activeChild) return;

    this.terminateActiveChild("SIGTERM");
    window.setTimeout(() => {
      if (this.activeChild) this.terminateActiveChild("SIGKILL");
    }, 1500);
  }

  terminateActiveChild(signal) {
    const child = this.activeChild;
    if (!child) return;

    try {
      if (process.platform === "win32" && child.pid) {
        execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          timeout: 2000,
          windowsHide: true
        });
      } else if (child.pid) {
        process.kill(-child.pid, signal);
      } else {
        child.kill(signal);
      }
    } catch {
      try {
        child.kill(signal);
      } catch {
        // Ignore process termination races.
      }
    }
  }

  async getOrCreateRpcClient(sessionReference) {
    if (this.rpcClient) {
      this.rpcSession ??= this.resolveOrCreateSession(sessionReference);
      await this.rpcClient.start();
      await this.configureRpcState(this.rpcClient);
      return { client: this.rpcClient, session: this.rpcSession };
    }

    const session = this.resolveOrCreateSession(sessionReference);
    const client = new PiRpcClient({
      piExecutablePath: this.settings.piExecutablePath,
      cwd: this.workingDirectory ?? this.pluginDirectory,
      args: this.buildPiArgs(session.path, "rpc")
    });
    this.rpcClient = client;
    this.rpcSession = session;
    await client.start();
    await this.configureRpcState(client);
    return { client, session };
  }

  async configureRpcState(client) {
    if (this.rpcConfigured && this.rpcConfiguredProcess === client.child) return;

    const model =
      this.settings.model === CUSTOM_MODEL_VALUE ? this.settings.customModel : this.settings.model;
    if (model) {
      const separator = model.indexOf("/");
      if (separator <= 0 || separator === model.length - 1) {
        throw new Error(`Invalid Pi model ID: ${model}. Expected provider/model.`);
      }
      await client.request("set_model", {
        provider: model.slice(0, separator),
        modelId: model.slice(separator + 1)
      });
    }
    if (this.settings.reasoningEffort) {
      await client.request("set_thinking_level", { level: this.settings.reasoningEffort });
    }
    this.rpcConfigured = true;
    this.rpcConfiguredProcess = client.child;
  }

  async runPiRpc(prompt, sessionId, callbacks) {
    if (!this.pluginDirectory) throw new Error("Plugin directory is not available.");
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");

    this.cancelRequested = false;
    this.isRunning = true;
    let unsubscribe = () => {};
    try {
      const { client, session } = await this.getOrCreateRpcClient(sessionId);
      if (this.cancelRequested || callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");

      const events = [];
      let finalResponse = "";
      let runState;
      let settled = false;
      let settleRun;
      let rejectRun;
      const completion = new Promise((resolve, reject) => {
        settleRun = resolve;
        rejectRun = reject;
      });
      const updateRunState = (nextRunState) => {
        if (nextRunState) runState = { ...runState, ...nextRunState };
      };
      unsubscribe = client.subscribe((event) => {
        if (event.type === "rpc_exit") {
          if (!settled) rejectRun(new Error(event.error || "Pi RPC process stopped."));
          return;
        }
        handlePiJsonEventLine(
          JSON.stringify(event),
          callbacks,
          events,
          (delta) => {
            finalResponse += delta;
          },
          updateRunState
        );
        if (event.type === "agent_settled" && !settled) {
          settled = true;
          settleRun();
        }
      });

      callbacks?.onEvent?.({
        type: "pi_start",
        raw: { mode: "rpc", cwd: this.workingDirectory ?? this.pluginDirectory }
      });

      await Promise.all([client.request("prompt", { message: prompt }), completion]);
      if (this.cancelRequested || callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");
      if (runState?.errorMessage) throw new Error(runState.errorMessage);
      return {
        finalResponse: this.getFinalResponse(finalResponse, runState?.fallbackText, events),
        sessionId: session.reference,
        threadId: session.reference,
        events,
        contextUsage: this.getRunContextUsage(runState?.tokenUsage, events),
        contextCompacted: this.didCompactContext(events),
        tokenUsage: runState?.tokenUsage ?? undefined
      };
    } catch (error) {
      if (this.cancelRequested || callbacks?.isCanceled?.())
        throw new Error("Pi run canceled.", { cause: error });
      throw error;
    } finally {
      this.cancelRequested = false;
      this.isRunning = false;
      unsubscribe();
    }
  }

  runPiCli(prompt, sessionId, callbacks) {
    if (!this.pluginDirectory) throw new Error("Plugin directory is not available.");
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");

    const session = this.resolveOrCreateSession(sessionId);
    const args = this.buildPiArgs(session.path, "json");

    return new Promise((resolve, reject) => {
      this.cancelRequested = false;
      const piExecutable = findPiExecutable(this.settings.piExecutablePath);
      const invocation = buildPiProcessInvocation(piExecutable, args, {
        cwd: this.workingDirectory ?? this.pluginDirectory,
        detached: process.platform !== "win32"
      });
      const child = spawn(invocation.command, invocation.args, invocation.options);
      this.activeChild = child;
      callbacks?.onEvent?.({
        type: "pi_start",
        raw: {
          args: args.slice(1),
          cwd: this.workingDirectory ?? this.pluginDirectory
        }
      });

      let stdoutBuffer = "";
      let stderr = "";
      let finalResponse = "";
      let settled = false;
      const events = [];
      let runState;
      const updateRunState = (nextRunState) => {
        if (nextRunState) runState = { ...runState, ...nextRunState };
      };
      const failOnce = (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      const flushStdoutBuffer = () => {
        if (!stdoutBuffer.trim()) return;

        handlePiJsonEventLine(
          stdoutBuffer.trim(),
          callbacks,
          events,
          (delta) => {
            finalResponse += delta;
          },
          updateRunState
        );
        stdoutBuffer = "";
      };
      const getErrorText = () =>
        runState?.errorMessage ?? stderr.trim() ?? runState?.fallbackText?.trim();

      child.stdout.on("data", (chunk) => {
        stdoutBuffer += chunk.toString("utf8");
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? "";

        for (const line of lines) {
          handlePiJsonEventLine(
            line,
            callbacks,
            events,
            (delta) => {
              finalResponse += delta;
            },
            updateRunState
          );
        }
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      child.once("error", (error) => {
        failOnce(createPiCliError({ error }));
      });
      child.once("close", (exitCode) => {
        if (this.activeChild === child) this.activeChild = undefined;
        if (settled) return;

        if (this.cancelRequested) {
          this.cancelRequested = false;
          failOnce(new Error("Pi run canceled."));
          return;
        }

        flushStdoutBuffer();
        const errorText = getErrorText();
        if (exitCode && exitCode !== 0) {
          failOnce(
            new Error(formatPiCliFailure({ context: "Pi run failed", stderr: errorText, exitCode }))
          );
          return;
        }
        if (runState?.errorMessage) {
          failOnce(new Error(runState.errorMessage));
          return;
        }

        settled = true;
        resolve({
          finalResponse: this.getFinalResponse(
            finalResponse,
            runState?.fallbackText,
            events,
            isPiCliCommandPrompt(prompt)
          ),
          sessionId: session.reference,
          threadId: session.reference,
          events,
          contextUsage: this.getRunContextUsage(runState?.tokenUsage, events),
          contextCompacted: this.didCompactContext(events),
          tokenUsage: runState?.tokenUsage ?? undefined
        });
      });

      child.stdin.write(prompt);
      child.stdin.end();
    });
  }

  async runPiRpcCompact(sessionId, customInstructions = "", callbacks) {
    if (!this.pluginDirectory) throw new Error("Plugin directory is not available.");
    if (callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");

    this.cancelRequested = false;
    this.isRunning = true;
    let unsubscribe = () => {};
    try {
      const { client, session } = await this.getOrCreateRpcClient(sessionId);
      if (this.cancelRequested || callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");

      const events = [];
      unsubscribe = client.subscribe((event) => {
        handlePiJsonEventLine(
          JSON.stringify(event),
          callbacks,
          events,
          () => {},
          () => {}
        );
      });
      const result = await client.request(
        "compact",
        {
          ...(customInstructions ? { customInstructions } : {})
        },
        { timeoutMs: 0 }
      );
      if (this.cancelRequested || callbacks?.isCanceled?.()) throw new Error("Pi run canceled.");
      return {
        finalResponse: "Context compacted.",
        sessionId: session.reference,
        threadId: session.reference,
        events,
        contextUsage: undefined,
        contextCompacted: true,
        tokenUsage: undefined,
        compactionResult: result
      };
    } catch (error) {
      if (this.cancelRequested || callbacks?.isCanceled?.())
        throw new Error("Pi run canceled.", { cause: error });
      throw error;
    } finally {
      this.cancelRequested = false;
      this.isRunning = false;
      unsubscribe();
    }
  }

  getFinalResponse(finalResponse, fallbackText, events, isCommandPrompt = false) {
    const response = (finalResponse.trim() || (fallbackText || "").trim()).trim();
    if (response) return response;

    const compactionEnd = [...events]
      .reverse()
      .find((event) => this.normalizeCompactionEventType(event.type) === "compaction_end");
    if (!compactionEnd || !isCommandPrompt) return response;
    if (compactionEnd.raw?.errorMessage)
      return `Context compaction failed: ${String(compactionEnd.raw.errorMessage)}`;
    if (compactionEnd.raw?.aborted) return "Context compaction skipped.";
    return "Context compacted.";
  }

  getRunContextUsage(tokenUsage, events = []) {
    if (this.didCompactContext(events)) return undefined;

    const model = this.getModelInfoForTokenUsage(tokenUsage) ?? this.getSelectedModelInfo();
    const contextWindow = model?.contextWindow ?? tokenUsage?.contextWindow ?? 0;
    return createContextUsage(tokenUsage, contextWindow);
  }

  didCompactContext(events = []) {
    return events.some((event) => {
      if (this.normalizeCompactionEventType(event.type) !== "compaction_end") return false;
      return !event.raw?.errorMessage && !event.raw?.aborted;
    });
  }

  normalizeCompactionEventType(type) {
    return type === "auto_compaction_start" || type === "session_before_compact"
      ? "compaction_start"
      : type === "auto_compaction_end" || type === "session_compact"
        ? "compaction_end"
        : type;
  }

  getModelInfoForTokenUsage(tokenUsage) {
    if (!tokenUsage) return undefined;

    const modelId =
      tokenUsage.modelId ||
      (tokenUsage.provider && tokenUsage.model ? `${tokenUsage.provider}/${tokenUsage.model}` : "");
    if (modelId) {
      const exactMatch = this.settings.availableModels.find((model) => model.slug === modelId);
      if (exactMatch) return exactMatch;
    }

    return tokenUsage.model
      ? this.settings.availableModels.find((model) => model.slug.endsWith(`/${tokenUsage.model}`))
      : undefined;
  }

  getSelectedModelInfo() {
    let modelId =
      this.settings.model === CUSTOM_MODEL_VALUE ? this.settings.customModel : this.settings.model;
    if (!modelId) modelId = this.settings.effectiveModel;

    return modelId
      ? this.settings.availableModels.find((model) => model.slug === modelId)
      : undefined;
  }

  buildPiArgs(sessionId, mode = "rpc") {
    const args = ["--mode", mode, "--session", sessionId];
    if (this.settings.includeDefaultSkills === false) args.push("--no-skills");

    for (const skillPath of getConfiguredSkillPaths(this.settings, this.workingDirectory)) {
      args.push("--skill", skillPath);
    }

    const toolMode =
      this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    if (toolMode === "chat") {
      args.push("--no-tools");
    } else {
      args.push(
        "--tools",
        toolMode === "full-agent"
          ? "read,grep,find,ls,edit,write,bash"
          : toolMode === "edit"
            ? "read,grep,find,ls,edit,write"
            : "read,grep,find,ls"
      );
    }

    return args;
  }

  getSessionDirectory() {
    return path.resolve(this.pluginDirectory ?? ".", "pi-sessions");
  }

  createSessionFilePath() {
    const sessionDir = this.getSessionDirectory();
    fs.mkdirSync(sessionDir, { recursive: true });

    return path.join(sessionDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  }

  createSessionReference(sessionPath) {
    const sessionDir = this.getSessionDirectory();
    const relativePath = path.relative(sessionDir, path.resolve(sessionPath));

    return relativePath && isSafeRelativePath(relativePath) ? relativePath : undefined;
  }

  resolveSessionPath(sessionReference) {
    if (!sessionReference) return undefined;

    const sessionDir = this.getSessionDirectory();
    const resolvedPath = path.isAbsolute(sessionReference)
      ? path.resolve(sessionReference)
      : path.resolve(sessionDir, sessionReference);
    const relativePath = path.relative(sessionDir, resolvedPath);

    if (!relativePath || !isSafeRelativePath(relativePath)) return undefined;

    return resolvedPath;
  }

  resolveOrCreateSession(sessionReference) {
    const existingPath = this.resolveSessionPath(sessionReference);
    const sessionPath =
      existingPath && fs.existsSync(existingPath) ? existingPath : this.createSessionFilePath();

    return {
      path: sessionPath,
      reference: this.createSessionReference(sessionPath) ?? sessionPath
    };
  }

  createForkSessionFile(sessionReference) {
    const sessionPath = this.resolveSessionPath(sessionReference);
    if (!sessionPath || !fs.existsSync(sessionPath)) return undefined;

    const events = fs
      .readFileSync(sessionPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const sessionEvent = events.find((event) => event.type === "session");
    if (!sessionEvent) return undefined;

    const forkSessionPath = this.createSessionFilePath();
    const forkSessionEvent = {
      ...sessionEvent,
      id: createSessionId(),
      timestamp: new Date().toISOString(),
      cwd: this.workingDirectory || sessionEvent.cwd,
      parentSession: this.createSessionReference(sessionPath) ?? sessionPath
    };

    fs.writeFileSync(
      forkSessionPath,
      `${JSON.stringify(forkSessionEvent)}\n${events
        .filter((event) => event.type !== "session")
        .map((event) => JSON.stringify(event))
        .join("\n")}\n`,
      "utf8"
    );

    return this.createSessionReference(forkSessionPath) ?? forkSessionPath;
  }

  formatDryRunCompactResponse(sessionId) {
    return {
      finalResponse: "Dry run: context would be compacted.",
      sessionId,
      threadId: sessionId,
      events: [],
      contextCompacted: true
    };
  }

  formatDryRunResponse(prompt, context) {
    const lines = [
      "Dry run: Pi CLI was not called.",
      "",
      `Prompt: ${prompt}`,
      "",
      context.activeNote
        ? `Active note: [[${context.activeNote.path.replace(/\.md$/i, "")}]]`
        : "Active note: none",
      `Automatic search results: ${context.searchResults.length}`,
      `Linked notes: ${context.linkedNeighborhood.length}`
    ];

    if (context.activeNote) {
      lines.push(
        "",
        "Backlinks:",
        ...context.activeNote.backlinks
          .slice(0, 8)
          .map((backlink) => `- [[${backlink.path.replace(/\.md$/i, "")}]] (${backlink.count})`),
        "",
        "Outgoing links:",
        ...context.activeNote.outgoingLinks
          .slice(0, 8)
          .map(
            (outgoingLink) =>
              `- [[${outgoingLink.path.replace(/\.md$/i, "")}]] (${outgoingLink.count})`
          ),
        "",
        "Unresolved links:",
        ...context.activeNote.unresolvedLinks
          .slice(0, 8)
          .map((unresolvedLink) => `- [[${unresolvedLink.display}]] (${unresolvedLink.count})`)
      );
    }

    if (context.searchResults.length > 0) {
      lines.push(
        "",
        "Automatic note matches:",
        ...context.searchResults.map(
          (result) => `- [[${result.path.replace(/\.md$/i, "")}]] score=${result.score}`
        )
      );
    }

    return lines.join("\n");
  }
}

function isSafeRelativePath(relativePath) {
  return (
    relativePath !== ".." &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

function createSessionId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  return randomUUID
    ? randomUUID.call(globalThis.crypto)
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
