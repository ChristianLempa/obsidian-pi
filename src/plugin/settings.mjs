export const CUSTOM_MODEL_VALUE = "__custom";

const REASONING_LABELS = {
  off: "Off",
  minimal: "Minimal - may be unavailable with tools",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh",
  max: "Max - deepest"
};

export const DEFAULT_SETTINGS = {
  model: "",
  customModel: "",
  reasoningEffort: "",
  sandboxMode: "read-only",
  acknowledgedToolRisk: false,
  availableModels: [],
  dryRun: false,
  ignoredFolders: [".obsidian", ".git", "node_modules", "Templates"],
  customInstructions: "",
  piExecutablePath: "",
  includeDefaultSkills: true,
  additionalSkillFolders: [],
  effectiveModel: "",
  effectiveReasoning: "",
  dismissedPiSetup: false
};

export function normalizeSettings(rawSettings = {}) {
  const {
    maxSearchResults: _maxSearchResults,
    maxSearchFiles: _maxSearchFiles,
    maxFileChars: _maxFileChars,
    maxChangeSnapshotFiles: _maxChangeSnapshotFiles,
    ...supportedSettings
  } = rawSettings;
  const settings = { ...DEFAULT_SETTINGS, ...supportedSettings };

  settings.model = normalizeString(settings.model);
  settings.customModel = normalizeString(settings.customModel);
  settings.reasoningEffort = normalizeString(settings.reasoningEffort);
  settings.sandboxMode = normalizeToolMode(settings.sandboxMode);
  settings.acknowledgedToolRisk = settings.acknowledgedToolRisk === true;
  settings.availableModels = Array.isArray(settings.availableModels)
    ? settings.availableModels
    : [];
  settings.dryRun = false;
  settings.ignoredFolders = normalizeStringList(
    settings.ignoredFolders,
    DEFAULT_SETTINGS.ignoredFolders
  );
  settings.customInstructions = normalizeString(settings.customInstructions);
  settings.piExecutablePath = normalizeString(settings.piExecutablePath);
  settings.includeDefaultSkills = settings.includeDefaultSkills !== false;
  settings.additionalSkillFolders = normalizeStringList(settings.additionalSkillFolders, []);
  settings.effectiveModel = normalizeString(settings.effectiveModel);
  settings.effectiveReasoning = normalizeString(settings.effectiveReasoning);
  settings.dismissedPiSetup = settings.dismissedPiSetup === true;

  return settings;
}

export function getModelOptions(settings) {
  const models = settings.availableModels;
  const effectiveModel = getEffectiveModelInfo(settings);
  const effective = effectiveModel?.displayName || settings.effectiveModel;
  const options = effective ? { "": effective } : {};

  for (const model of models) options[model.slug] = formatModelOptionLabel(model);
  return options;
}

export function getReasoningOptions(settings) {
  const model = getReasoningModelInfo(settings);
  const supportedReasoningLevels = model?.supportedReasoningLevels ?? [];
  const resolvedDefault = settings.model
    ? model?.defaultReasoningLevel || settings.effectiveReasoning
    : settings.effectiveReasoning || model?.defaultReasoningLevel;
  const effective = resolvedDefault
    ? (REASONING_LABELS[resolvedDefault] ?? resolvedDefault)
    : "Automatic";

  if (supportedReasoningLevels.length === 0) return { "": effective };

  const options = { "": effective };
  for (const reasoningLevel of supportedReasoningLevels) {
    options[reasoningLevel] = REASONING_LABELS[reasoningLevel] ?? reasoningLevel;
  }

  return options;
}

export function getResolvedReasoning(settings) {
  if (settings.reasoningEffort) return settings.reasoningEffort;

  const model = getReasoningModelInfo(settings);
  return settings.model
    ? model?.defaultReasoningLevel || settings.effectiveReasoning || "pi-default"
    : settings.effectiveReasoning || model?.defaultReasoningLevel || "pi-default";
}

export function getEffectiveModelInfo(settings) {
  return settings.effectiveModel
    ? settings.availableModels.find((model) => model.slug === settings.effectiveModel)
    : undefined;
}

export function getSelectedModelInfo(settings) {
  const modelId = settings.model === CUSTOM_MODEL_VALUE ? settings.customModel : settings.model;
  return settings.availableModels.find((model) => model.slug === modelId);
}

function getReasoningModelInfo(settings) {
  return (
    getSelectedModelInfo(settings) ?? (settings.model ? undefined : getEffectiveModelInfo(settings))
  );
}

export function getToolModeOptions() {
  return {
    chat: "Chat — no Pi CLI tools",
    "read-only": "Review — read/search/list only",
    edit: "Edit — edit/write, no shell",
    "full-agent": "Full agent — edit/write and shell"
  };
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value, fallback) {
  const source = Array.isArray(value) ? value : fallback;
  return source.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeToolMode(value) {
  return value === "chat" || value === "read-only" || value === "edit" || value === "full-agent"
    ? value
    : value === "workspace-write" || value === "danger-full-access"
      ? "edit"
      : DEFAULT_SETTINGS.sandboxMode;
}

function formatModelOptionLabel(model) {
  const details = [
    model.slug,
    model.reasoning ? "thinking" : "",
    model.supportsImages ? "images" : "",
    model.contextWindow ? `${formatTokenAmount(model.contextWindow)} context` : ""
  ].filter(Boolean);

  return `${model.displayName} — ${details.join(" · ")}`;
}

function formatTokenAmount(value) {
  return value >= 1_000_000
    ? `${Number((value / 1_000_000).toFixed(1))}M`
    : value >= 1_000
      ? `${Number((value / 1_000).toFixed(1))}K`
      : String(value);
}
