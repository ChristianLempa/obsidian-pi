import { describe, expect, it, vi } from "vitest";
import {
  extractAssistantText,
  extractEventTokenUsage,
  extractToolCallFromAssistantEvent,
  getAssistantRunState,
  handlePiJsonEventLine
} from "../src/pi/events.mjs";

describe("Pi event helpers", () => {
  it("extracts assistant text from string and structured content", () => {
    expect(extractAssistantText({ role: "assistant", content: "hello" })).toBe("hello");
    expect(
      extractAssistantText({
        role: "assistant",
        content: [
          { type: "text", text: "hello" },
          { type: "toolCall", name: "read" },
          { type: "text", text: " world" }
        ]
      })
    ).toBe("hello world");
  });

  it("normalizes run state and token usage", () => {
    expect(
      getAssistantRunState({
        role: "assistant",
        content: "done",
        usage: { input: 10, output: 2, cacheRead: 3 },
        provider: "openai-codex",
        model: "gpt-5.5"
      })
    ).toMatchObject({
      fallbackText: "done",
      tokenUsage: {
        input: 10,
        output: 2,
        cacheRead: 3,
        cacheWrite: 0,
        totalTokens: 0,
        provider: "openai-codex",
        model: "gpt-5.5",
        modelId: "openai-codex/gpt-5.5"
      }
    });
    expect(
      extractEventTokenUsage({ message: { role: "assistant", usage: { input: 1 } } })
    ).toMatchObject({
      input: 1
    });
  });

  it("emits text deltas", () => {
    const events = [];
    const appendText = vi.fn();
    const onTextDelta = vi.fn();

    handlePiJsonEventLine(
      JSON.stringify({
        type: "message_update",
        assistantMessageEvent: { type: "text_delta", delta: "hi" }
      }),
      { onTextDelta },
      events,
      appendText,
      vi.fn()
    );

    expect(appendText).toHaveBeenCalledWith("hi");
    expect(onTextDelta).toHaveBeenCalledWith("hi", expect.objectContaining({ type: "text_delta" }));
    expect(events[0]).toMatchObject({ type: "text_delta", textDelta: "hi" });
  });

  it("emits thinking deltas without treating them as answer text", () => {
    const events = [];
    const appendText = vi.fn();

    handlePiJsonEventLine(
      JSON.stringify({
        type: "message_update",
        assistantMessageEvent: { type: "thinking_delta", delta: "reasoning" }
      }),
      undefined,
      events,
      appendText,
      vi.fn()
    );

    expect(appendText).not.toHaveBeenCalled();
    expect(events[0]).toMatchObject({ type: "thinking_delta", thinkingDelta: "reasoning" });
  });

  it("emits tool execution events", () => {
    const events = [];

    handlePiJsonEventLine(
      JSON.stringify({
        type: "tool_execution_start",
        toolName: "read",
        toolCallId: "1",
        args: { path: "a.md" }
      }),
      undefined,
      events,
      vi.fn(),
      vi.fn()
    );

    expect(events[0]).toMatchObject({
      type: "tool_start",
      toolName: "read",
      toolCallId: "1",
      toolArgs: { path: "a.md" }
    });
  });

  it("extracts tool calls from assistant events", () => {
    expect(
      extractToolCallFromAssistantEvent({
        partial: {
          content: [{ type: "toolCall", id: "call", name: "read", arguments: { path: "a.md" } }]
        },
        contentIndex: 0
      })
    ).toEqual({ id: "call", name: "read", arguments: { path: "a.md" } });
  });
});
