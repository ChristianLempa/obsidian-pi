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

  it("responds to extension dialogs and reports handler failures", async () => {
    const writes = [];
    const client = new PiRpcClient({
      extensionUiHandler: async (request) => {
        if (request.method === "select") return { value: "Allow" };
        throw new Error("unsupported UI");
      }
    });
    client.child = { stdin: { writable: true, write: (line) => writes.push(JSON.parse(line)) } };
    const events = [];
    client.subscribe((event) => events.push(event));

    client.handleLine(
      JSON.stringify({ type: "extension_ui_request", id: "ui-1", method: "select" })
    );
    client.handleLine(
      JSON.stringify({ type: "extension_ui_request", id: "ui-2", method: "input" })
    );
    await vi.waitFor(() => expect(writes).toHaveLength(2));

    expect(writes).toEqual([
      { type: "extension_ui_response", id: "ui-1", value: "Allow" },
      { type: "extension_ui_response", id: "ui-2", cancelled: true }
    ]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "extension_ui_error", method: "input" })
    );
  });

  it("emits parse errors without crashing the process", () => {
    const client = new PiRpcClient();
    const events = [];
    client.subscribe((event) => events.push(event));
    client.handleLine("not json");
    expect(events).toEqual([{ type: "rpc_parse_error", raw: "not json" }]);
  });
});
