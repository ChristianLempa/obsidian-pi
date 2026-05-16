export const CUSTOM_MODEL_VALUE = "__custom";

const EMPTY_MODEL_OPTIONS = {
  "": "Use Pi default",
  [CUSTOM_MODEL_VALUE]: "Custom model ID"
};

const REASONING_LABELS = {
  "": "Pi default",
  off: "Off",
  minimal: "Minimal - may be unavailable with tools",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh - deepest"
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
  settings.includeDefaultSkills = settings.includeDefaultSkills !== false;
  settings.additionalSkillFolders = normalizeStringList(settings.additionalSkillFolders, []);
  settings.effectiveModel = normalizeString(settings.effectiveModel);
  settings.effectiveReasoning = normalizeString(settings.effectiveReasoning);
  settings.dismissedPiSetup = settings.dismissedPiSetup === true;

  return settings;
}

export function getModelOptions(settings) {
  const models = settings.availableModels;
  const options = { "": "Use Pi default" };

  if (models.length === 0)
    return { ...EMPTY_MODEL_OPTIONS, ...options, [CUSTOM_MODEL_VALUE]: "Custom model ID" };

  for (const model of models) options[model.slug] = formatModelOptionLabel(model);
  options[CUSTOM_MODEL_VALUE] = "Custom model ID";

  return options;
}

export function getReasoningOptions(settings) {
  const model = getSelectedModelInfo(settings) ?? getEffectiveModelInfo(settings);
  const supportedReasoningLevels = model?.supportedReasoningLevels ?? [];

  if (supportedReasoningLevels.length === 0) return { "": "Use Pi/model default" };

  const options = { "": "Use Pi/model default" };
  for (const reasoningLevel of supportedReasoningLevels) {
    options[reasoningLevel] = REASONING_LABELS[reasoningLevel] ?? reasoningLevel;
  }

  return options;
}

export function getResolvedReasoning(settings) {
  if (settings.reasoningEffort) return settings.reasoningEffort;

  const model = getSelectedModelInfo(settings) ?? getEffectiveModelInfo(settings);
  return model?.defaultReasoningLevel ?? settings.effectiveReasoning ?? "pi-default";
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
    model.supportedReasoningLevels.length > 0
      ? `thinking ${model.supportedReasoningLevels.join("/")}`
      : ""
  ].filter(Boolean);

  return details.length > 0 ? `${model.displayName} - ${details.join(", ")}` : model.displayName;
}
