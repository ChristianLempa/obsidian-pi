import { CUSTOM_MODEL_VALUE } from "../../plugin/settings.mjs";

export function getCurrentRunMetadata(settings, runtimeState) {
  return {
    model: getDisplayedModel(settings, runtimeState),
    reasoning:
      runtimeState?.thinkingLevel || settings.reasoningEffort || settings.effectiveReasoning || "Pi default",
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

function getDisplayedModel(settings, runtimeState) {
  const runtimeSlug = runtimeState?.model
    ? `${runtimeState.model.provider}/${runtimeState.model.id}`
    : "";
  if (runtimeSlug) {
    const runtimeModel = settings.availableModels?.find(
      (candidate) => candidate.slug === runtimeSlug
    );
    return runtimeModel?.displayName || runtimeState.model.name || runtimeSlug;
  }
  if (settings.model === CUSTOM_MODEL_VALUE) return settings.customModel || "Custom";

  const model = settings.availableModels?.find((candidate) => candidate.slug === settings.model);
  return model?.displayName || settings.model || "Pi default";
}
