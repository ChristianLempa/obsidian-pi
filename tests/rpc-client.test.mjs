import { describe, expect, it, vi } from "vitest";
import { PiRpcClient } from "../src/pi/rpc-client.mjs";

describe("PiRpcClient protocol framing", () => {
  it("splits records only on LF and preserves Unicode line separators in JSON strings", () => {
    const client = new PiRpcClient();
    const events = [];
    client.subscribe((event) => events.push(event));

    const payload = `${JSON.stringify({ type: "notice", text: "a\u2028b\u2029c" })}\n${JSON.stringify({ type: "agent_settled" })}\n`;
    const bytes = Buffer.from(payload, "utf8");
    client.handleStdoutChunk(bytes.subarray(0, 17));
    client.handleStdoutChunk(bytes.subarray(17, 31));
    client.handleStdoutChunk(bytes.subarray(31));

    expect(events).toEqual([
      { type: "notice", text: "a b c" },
      { type: "agent_settled" }
    ]);
  });

  it("correlates responses without emitting them as events", () => {
    const client = new PiRpcClient();
    const resolve = vi.fn();
    const events = [];
    client.subscribe((event) => events.push(event));
    client.pending.set("request-1", { resolve, reject: vi.fn() });

    client.handleLine(
      JSON.stringify({
        id: "request-1",
        type: "response",
        command: "get_state",
        success: true,
        data: { isStreaming: false }
      })
    );

    expect(resolve).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { isStreaming: false } })
    );
    expect(client.pending.size).toBe(0);
    expect(events).toEqual([]);
  });

  it("emits parse errors without crashing the process", () => {
    const client = new PiRpcClient();
    const events = [];
    client.subscribe((event) => events.push(event));
    client.handleLine("not json");
    expect(events).toEqual([{ type: "rpc_parse_error", raw: "not json" }]);
  });
});
