import { describe, expect, it } from "vitest";
import {
  formatRetryDetail,
  formatToolError,
  formatToolStatus,
  getThinkingDelta,
  getToolEventKey,
  getToolKind,
  isStickyActivityKind,
  shouldBypassActivityStickiness
} from "../src/ui/activity.mjs";

describe("activity helpers", () => {
  it("classifies tool kinds", () => {
    expect(getToolKind("bash")).toBe("shell");
    expect(getToolKind("edit")).toBe("edit");
    expect(getToolKind("grep")).toBe("search");
    expect(getToolKind("read")).toBe("read");
  });

  it("formats readable tool statuses", () => {
    expect(formatToolStatus("grep", { pattern: "TODO", path: "src/main.js" })).toEqual({
      label: 'Searching "TODO" in main.js',
      kind: "search",
      detail: ""
    });
    expect(formatToolStatus("bash", { command: "npm test" })).toEqual({
      label: "Running command",
      kind: "shell",
      detail: ""
    });
  });

  it("handles sticky and bypass activity kinds", () => {
    expect(isStickyActivityKind("edit")).toBe(true);
    expect(isStickyActivityKind("thinking")).toBe(false);
    expect(shouldBypassActivityStickiness("answer")).toBe(true);
  });

  it("creates stable tool event and retry labels", () => {
    expect(getToolEventKey({ toolCallId: "call-1" })).toBe("call-1");
    expect(formatRetryDetail({ attempt: 2, maxAttempts: 3, errorMessage: "temporary" })).toBe(
      "attempt 2/3 — temporary"
    );
  });

  it("extracts thinking deltas and concise visible tool errors", () => {
    expect(
      getThinkingDelta({ type: "thinking_delta", assistantEvent: { delta: "considering" } })
    ).toBe("considering");
    expect(getThinkingDelta({ type: "text_delta", assistantEvent: { delta: "answer" } })).toBe("");
    expect(
      formatToolError({
        type: "tool_end",
        toolName: "read",
        isError: true,
        errorMessage: "File not found"
      })
    ).toBe("read: File not found");
  });
});
