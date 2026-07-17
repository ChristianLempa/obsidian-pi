import { execFileSync, spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { buildPiProcessInvocation, findPiExecutable } from "./environment.mjs";
import { createPiCliError, formatPiCliFailure } from "./diagnostics.mjs";

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Persistent client for Pi's LF-delimited RPC protocol.
 * One client owns one Pi process/session and processes one agent run at a time.
 */
export class PiRpcClient {
  constructor(options = {}) {
    this.options = options;
    this.nextRequestId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.stderr = "";
    this.stdoutBuffer = "";
    this.decoder = new StringDecoder("utf8");
    this.disposed = false;
  }

  get running() {
    return !!this.child && this.child.exitCode === null && !this.child.killed;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start() {
    if (this.disposed) throw new Error("Pi RPC client is disposed.");
    if (this.running) return;
    if (this.startPromise) return this.startPromise;

    this.startPromise = new Promise((resolve, reject) => {
      const piExecutable = findPiExecutable(this.options.piExecutablePath);
      const invocation = buildPiProcessInvocation(
        piExecutable,
        this.options.args ?? ["--mode", "rpc"],
        {
          cwd: this.options.cwd,
          detached: process.platform !== "win32"
        }
      );
      const child = spawn(invocation.command, invocation.args, invocation.options);
      this.child = child;
      this.stderr = "";
      this.stdoutBuffer = "";
      this.decoder = new StringDecoder("utf8");

      let started = false;
      const failStart = (error) => {
        if (started) return;
        started = true;
        this.startPromise = undefined;
        reject(error);
      };

      child.once("spawn", () => {
        if (started) return;
        started = true;
        this.startPromise = undefined;
        resolve();
      });
      child.stdout.on("data", (chunk) => this.handleStdoutChunk(chunk));
      child.stdout.on("end", () => this.flushDecoder());
      child.stderr.on("data", (chunk) => {
        this.stderr += chunk.toString("utf8");
      });
      child.once("error", (error) => {
        const normalized = createPiCliError({ error });
        failStart(normalized);
        this.handleExit(normalized);
      });
      child.once("close", (exitCode) => {
        if (this.child === child) this.child = undefined;
        const error = new Error(
          formatPiCliFailure({ context: "Pi RPC process stopped", stderr: this.stderr, exitCode })
        );
        failStart(error);
        this.handleExit(error);
      });
    });

    return this.startPromise;
  }

  async request(type, payload = {}, options = {}) {
    if (!this.running) await this.start();
    if (!this.child?.stdin?.writable) throw new Error("Pi RPC stdin is not writable.");

    const id = `obsidian-pi-${this.nextRequestId++}`;
    const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    const command = { id, type, ...payload };

    return new Promise((resolve, reject) => {
      const timeout =
        timeoutMs > 0
          ? setTimeout(() => {
              this.pending.delete(id);
              reject(new Error(`Pi RPC ${type} timed out after ${timeoutMs}ms.`));
            }, timeoutMs)
          : undefined;

      this.pending.set(id, {
        type,
        resolve: (response) => {
          if (timeout) clearTimeout(timeout);
          response.success
            ? resolve(response.data)
            : reject(new Error(response.error || `Pi RPC ${type} failed.`));
        },
        reject: (error) => {
          if (timeout) clearTimeout(timeout);
          reject(error);
        }
      });

      this.child.stdin.write(`${JSON.stringify(command)}\n`, (error) => {
        if (!error) return;
        const pending = this.pending.get(id);
        this.pending.delete(id);
        pending?.reject(error);
      });
    });
  }

  notify(type, payload = {}) {
    if (!this.child?.stdin?.writable) return false;
    this.child.stdin.write(`${JSON.stringify({ type, ...payload })}\n`);
    return true;
  }

  handleStdoutChunk(chunk) {
    this.stdoutBuffer += this.decoder.write(chunk);
    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf("\n");
      if (newlineIndex < 0) break;
      let line = this.stdoutBuffer.slice(0, newlineIndex);
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      this.handleLine(line);
    }
  }

  flushDecoder() {
    this.stdoutBuffer += this.decoder.end();
    if (!this.stdoutBuffer) return;
    const line = this.stdoutBuffer.endsWith("\r")
      ? this.stdoutBuffer.slice(0, -1)
      : this.stdoutBuffer;
    this.stdoutBuffer = "";
    this.handleLine(line);
  }

  handleLine(line) {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.emit({ type: "rpc_parse_error", raw: line });
      return;
    }

    if (message.type === "response" && message.id) {
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        pending.resolve(message);
      }
      return;
    }

    this.emit(message);
  }

  emit(message) {
    for (const listener of [...this.listeners]) {
      try {
        listener(message);
      } catch (error) {
        console.error("Pi Agent: RPC event listener failed", error);
      }
    }
  }

  handleExit(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    this.emit({ type: "rpc_exit", error: error.message });
  }

  async abort() {
    if (!this.running) return;
    try {
      await this.request("abort", {}, { timeoutMs: 5_000 });
    } catch {
      this.terminate();
    }
  }

  terminate(signal = "SIGTERM") {
    const child = this.child;
    if (!child) return;
    try {
      if (process.platform === "win32" && child.pid) {
        execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          timeout: 2_000,
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
        // Process already exited.
      }
    }
  }

  dispose() {
    this.disposed = true;
    this.terminate();
    this.listeners.clear();
    const error = new Error("Pi RPC client disposed.");
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}
