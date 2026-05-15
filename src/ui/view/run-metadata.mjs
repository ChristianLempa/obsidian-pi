import { CUSTOM_MODEL_VALUE } from "../../plugin/settings.mjs";

export function getCurrentRunMetadata(settings) {
  return {
    model: getDisplayedModel(settings),
    reasoning: settings.reasoningEffort || settings.effectiveReasoning || "Pi default",
    toolMode: settings.sandboxMode,
    toolModeLabel: formatToolModeLabel(settings.sandboxMode)
  };
}

export function formatToolModeLabel(toolMode) {
  return toolMode === "chat"
    ? "Chat"
    : toolMode === "edit" || toolMode === "workspace-write"
      ? "Edit"
      : toolMode === "full-agent"
        ? "Full agent"
        : "Review";
}

function getDisplayedModel(settings) {
  if (settings.model === CUSTOM_MODEL_VALUE) return settings.customModel || "Custom";

  return settings.model || settings.effectiveModel || "Pi default";
}
