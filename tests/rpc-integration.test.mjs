import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PiRpcClient } from "../src/pi/rpc-client.mjs";

const clients = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.dispose();
});

function createClient() {
  const client = new PiRpcClient({
    piExecutablePath: process.execPath,
    cwd: process.cwd(),
    args: [path.resolve("tests/fixtures/fake-pi-rpc.mjs")]
  });
  clients.push(client);
  return client;
}

describe("PiRpcClient subprocess integration", () => {
  it("reuses one process for correlated commands and streams events", async () => {
    const client = createClient();
    const events = [];
    client.subscribe((event) => events.push(event));

    const firstState = await client.request("get_state");
    const secondState = await client.request("get_state");
    await client.request("prompt", { message: "hello" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(firstState.pid).toBe(secondState.pid);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "agent_start" }),
        expect.objectContaining({
          type: "message_update",
          assistantMessageEvent: expect.objectContaining({ delta: "echo:hello" })
        }),
        expect.objectContaining({ type: "agent_settled" })
      ])
    );
  });

  it("rejects pending commands when the RPC process exits", async () => {
    const client = createClient();
    const pending = client.request("hang", {}, { timeoutMs: 0 });
    await client.request("exit");
    await expect(pending).rejects.toThrow("Pi RPC process stopped");
  });
});
