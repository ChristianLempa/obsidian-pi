import { describe, expect, it, vi } from "vitest";
import {
  createExtensionUiHandler,
  renderExtensionStatuses,
  sanitizeExtensionText
} from "../src/pi/extension-ui.mjs";

class FakeElement {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.textContent = "";
    this.setTextCalls = 0;
  }

  createSpan() {
    const child = new FakeElement();
    child.parent = this;
    this.children.push(child);
    return child;
  }

  setText(text) {
    this.textContent = text;
    this.setTextCalls += 1;
  }

  setAttr(name, value) {
    this.attributes[name] = value;
  }

  remove() {
    this.parent.children = this.parent.children.filter((child) => child !== this);
  }
}

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

  it("strips real Pi theme ANSI output and residual C0/C1 controls", () => {
    const escape = String.fromCharCode(27);
    const controls = [0, 7, 11, 31, 127, 133, 159].map(String.fromCharCode).join("");
    const piMcpThemeOutput = `${escape}[38;2;124;58;237mMCP: 8/8${escape}[39m`;
    const piLensThemeOutput = `${escape}[32mLSP Active: typescript${escape}[39m`;

    expect(sanitizeExtensionText(`${controls}${piMcpThemeOutput}${controls}`)).toBe("MCP: 8/8");
    expect(sanitizeExtensionText(piLensThemeOutput)).toBe("LSP Active: typescript");
  });

  it("removes complete ESC and C1 terminal string controls with their payloads", () => {
    const escape = String.fromCharCode(27);
    const bell = String.fromCharCode(7);
    const c1 = (code) => String.fromCharCode(code);
    const st = `${escape}\\`;
    const fixtures = [
      `before${escape}P1;2|dcs payload${st}after`,
      `before${escape}_apc payload${st}after`,
      `before${escape}^pm payload${st}after`,
      `before${escape}Xsos payload${st}after`,
      `before${escape}]0;osc payload${bell}after`,
      `before${escape}]0;osc payload${st}after`,
      `before${c1(144)}dcs payload${c1(156)}after`,
      `before${c1(152)}sos payload${c1(156)}after`,
      `before${c1(157)}0;c1 osc payload${c1(156)}after`,
      `before${c1(157)}0;c1 osc payload${bell}after`,
      `before${c1(158)}pm payload${c1(156)}after`,
      `before${c1(159)}apc payload${c1(156)}after`
    ];

    expect(fixtures.map(sanitizeExtensionText)).toEqual(fixtures.map(() => "beforeafter"));
    expect(sanitizeExtensionText("beforeλ🙂after")).toBe("beforeλ🙂after");
  });

  it("keeps independently updated status children stable with sanitized display keys", () => {
    const container = new FakeElement();
    const elements = new Map();
    const escape = String.fromCharCode(27);
    const rawKey = `${escape}[31mmcp${escape}[39m`;
    const statuses = new Map([
      [rawKey, "one"],
      ["lens", "two"],
      ["vision", "three"],
      ["subagents", "four"]
    ]);

    renderExtensionStatuses(container, elements, statuses, true);
    expect(container.hidden).toBe(false);
    expect(container.children).toHaveLength(4);
    expect(elements.has(rawKey)).toBe(true);
    expect(elements.get(rawKey).textContent).toBe("mcp: one");
    expect(elements.get(rawKey).attributes).toEqual({
      title: "mcp: one",
      "aria-label": "mcp: one"
    });

    const stableSibling = elements.get("lens");
    statuses.set(rawKey, "updated");
    renderExtensionStatuses(container, elements, statuses, true);
    expect(elements.get("lens")).toBe(stableSibling);
    expect(stableSibling.setTextCalls).toBe(1);
    expect(elements.get(rawKey).textContent).toBe("mcp: updated");

    renderExtensionStatuses(container, elements, statuses, false);
    expect(container.hidden).toBe(true);
    statuses.set("lens", "updated while hidden");
    renderExtensionStatuses(container, elements, statuses, false);
    expect(stableSibling.textContent).toBe("lens: updated while hidden");
  });
});
