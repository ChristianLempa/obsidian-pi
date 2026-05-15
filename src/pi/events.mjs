import { normalizeTokenUsage } from "./token-usage.mjs";

export function handlePiJsonEventLine(line, callbacks, events, appendText, updateRunState) {
  if (!line.trim()) return;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }

  const type = String(event.type ?? "event");
  const emit = (normalizedEvent) => {
    events.push(normalizedEvent);
    callbacks?.onEvent?.(normalizedEvent);
  };
  const captureRunState = (messageOrMessages) => {
    const runState = getAssistantRunState(messageOrMessages);
    if (runState) updateRunState(runState);
  };

  if (event.message) captureRunState(event.message);
  if (Array.isArray(event.messages)) captureRunState(event.messages);

  if (type === "tool_execution_start" || type === "tool_execution_update") {
    emit({
      type: type === "tool_execution_start" ? "tool_start" : "tool_update",
      raw: event,
      message: String(event.toolName ?? "tool"),
      toolName: String(event.toolName ?? "tool"),
      toolCallId: String(event.toolCallId ?? ""),
      toolArgs: event.args ?? {}
    });
    return;
  }

  if (type === "tool_execution_end") {
    emit({
      type: "tool_end",
      raw: event,
      message: String(event.toolName ?? "tool"),
      toolName: String(event.toolName ?? "tool"),
      toolCallId: String(event.toolCallId ?? ""),
      toolArgs: event.args ?? {},
      isError: event.isError === true
    });
    return;
  }

  const assistantEvent = event.assistantMessageEvent;
  if (type === "message_update" && assistantEvent) {
    if (assistantEvent.type === "text_delta") {
      const delta = assistantEvent.delta ?? "";
      appendText(delta);
      const textEvent = { type: "text_delta", raw: event, textDelta: delta, assistantEvent };
      emit(textEvent);
      callbacks?.onTextDelta?.(delta, textEvent);
      return;
    }

    const toolCall = extractToolCallFromAssistantEvent(assistantEvent);
    emit({
      type: assistantEvent.type,
      raw: event,
      assistantEvent,
      toolName: toolCall?.name ?? undefined,
      toolArgs: toolCall?.arguments ?? undefined,
      toolCallId: toolCall?.id ?? undefined
    });
    return;
  }

  if (type === "message_end") {
    emit({ type: "message_end", raw: event, fallbackText: extractAssistantText(event.message) });
    return;
  }

  if (type === "turn_end") {
    emit({ type: "turn_end", raw: event, fallbackText: extractAssistantText(event.message) });
    return;
  }

  if (type === "agent_end") {
    const agentEndEvent = {
      type: "agent_end",
      raw: event,
      fallbackText: extractLatestAssistantText(event.messages)
    };
    emit(agentEndEvent);
    updateRunState({ fallbackText: agentEndEvent.fallbackText?.trim() ?? "" });
    return;
  }

  emit({ type, raw: event });
}

export function extractAssistantText(message) {
  if (!message || message.role !== "assistant") return "";

  const content = message.content ?? [];
  return typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .filter((part) => part && part.type === "text")
          .map((part) => String(part.text || ""))
          .join("")
      : "";
}

export function extractLatestAssistantText(messages) {
  if (!Array.isArray(messages)) return "";

  for (let index = messages.length - 1; index >= 0; index--) {
    const text = extractAssistantText(messages[index]);
    if (text.trim()) return text;
  }

  return "";
}

export function getAssistantRunState(messageOrMessages) {
  const message = Array.isArray(messageOrMessages)
    ? findLatestAssistantMessage(messageOrMessages)
    : messageOrMessages;
  if (!message || message.role !== "assistant") return undefined;

  return {
    fallbackText: extractAssistantText(message).trim(),
    errorMessage:
      message.stopReason === "error" || message.stopReason === "aborted"
        ? message.errorMessage || `Request ${message.stopReason}`
        : undefined,
    tokenUsage: normalizeTokenUsage(message.usage)
  };
}

export function extractEventTokenUsage(event) {
  if (!event) return undefined;

  const runState = getAssistantRunState(
    event.message ?? (Array.isArray(event.messages) ? event.messages : undefined)
  );
  return runState?.tokenUsage;
}

export function extractToolCallFromAssistantEvent(event) {
  const toolCall = event?.toolCall;
  if (toolCall) return toolCall;

  const content = event?.partial?.content?.[event.contentIndex];
  return content && content.type === "toolCall"
    ? {
        id: content.id ?? content.toolCallId,
        name: content.name,
        arguments: content.arguments ?? content.args
      }
    : undefined;
}

function findLatestAssistantMessage(messages) {
  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index]?.role === "assistant") return messages[index];
  }

  return undefined;
}
