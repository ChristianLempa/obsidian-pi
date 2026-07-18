import { describe, expect, it, vi } from "vitest";
import { createExtensionUiHandler } from "../src/pi/extension-ui.mjs";

describe("Pi extension UI bridge", () => {
  it("maps dialog values and cancellations to RPC responses", async () => {
    const handler = createExtensionUiHandler({
      select: async () => "Allow",
      confirm: async () => true,
      input: async () => undefined,
      editor: async () => "edited"
    });

    await expect(handler({ method: "select" })).resolves.toEqual({ value: "Allow" });
    await expect(handler({ method: "confirm" })).resolves.toEqual({ confirmed: true });
    await expect(handler({ method: "input" })).resolves.toEqual({ cancelled: true });
    await expect(handler({ method: "editor" })).resolves.toEqual({ value: "edited" });
  });

  it("cancels timed dialogs and aborts the host UI", async () => {
    let signal;
    const handler = createExtensionUiHandler(
      {
        input: (request) => {
          signal = request.signal;
          return new Promise(() => {});
        }
      },
      globalThis
    );

    await expect(handler({ method: "input", timeout: 5 })).resolves.toEqual({
      cancelled: true
    });
    expect(signal.aborted).toBe(true);
  });

  it("handles every fire-and-forget method and rejects unsupported methods", async () => {
    const methods = ["notify", "setStatus", "setWidget", "setTitle", "set_editor_text"];
    const handlers = Object.fromEntries(methods.map((method) => [method, vi.fn()]));
    const handler = createExtensionUiHandler(handlers);

    for (const method of methods) {
      await expect(handler({ method, message: "done" })).resolves.toBeUndefined();
      expect(handlers[method]).toHaveBeenCalledWith({ method, message: "done" });
    }
    await expect(handler({ method: "custom" })).rejects.toThrow("Unsupported");
  });
});
