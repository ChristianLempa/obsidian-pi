import { PiRpcClient } from "./rpc-client.mjs";

export const REASONING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
const ESCAPE_CHARACTER = String.fromCharCode(27);
const ANSI_ESCAPE_PATTERN = new RegExp(`${ESCAPE_CHARACTER}\\[[0-9;?]*[ -/]*[@-~]`, "g");

export class PiModelCatalog {
  constructor(pluginDirectory, settings = {}) {
    this.pluginDirectory = pluginDirectory;
    this.settings = settings;
  }

  async getAvailableModels(vaultBasePath) {
    const client = new PiRpcClient({
      piExecutablePath: this.settings.piExecutablePath,
      cwd: vaultBasePath ?? this.pluginDirectory,
      args: ["--mode", "rpc", "--no-session", "--no-tools"]
    });

    try {
      const catalog = await client.request("get_available_models");
      const state = await client.request("get_state").catch(() => undefined);
      this.effectiveConfig = {
        effectiveModel: state?.model ? `${state.model.provider}/${state.model.id}` : "",
        effectiveReasoning: state?.thinkingLevel ?? ""
      };
      return (catalog?.models ?? []).map(normalizeRpcModel);
    } finally {
      client.dispose();
    }
  }

  getEffectiveConfig() {
    return this.effectiveConfig ?? { effectiveModel: "", effectiveReasoning: "" };
  }
}

// Retained for compatibility with callers and older cached catalog data.
export function parseModelCatalog(output) {
  return output
    .replace(ANSI_ESCAPE_PATTERN, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("provider"))
    .map((line) => line.split(/\s{2,}/))
    .filter((parts) => parts.length >= 5)
    .map((parts) => {
      const provider = parts[0];
      const model = parts[1];
      const supportedReasoningLevels = normalizeReasoningLevels(parts[4]);

      return {
        slug: `${provider}/${model}`,
        displayName: `${provider}: ${model}`,
        contextWindow: parseTokenAmount(parts[2]),
        maxOutputTokens: parseTokenAmount(parts[3]),
        defaultReasoningLevel: supportedReasoningLevels.includes("medium")
          ? "medium"
          : supportedReasoningLevels[0] || "off",
        supportedReasoningLevels
      };
    });
}

export function normalizeRpcModel(model) {
  const supportedReasoningLevels = getSupportedReasoningLevels(model);
  return {
    slug: `${model.provider}/${model.id}`,
    provider: model.provider,
    id: model.id,
    displayName: model.name || model.id,
    contextWindow: Number(model.contextWindow) || 0,
    maxOutputTokens: Number(model.maxTokens) || 0,
    defaultReasoningLevel: supportedReasoningLevels.includes("medium")
      ? "medium"
      : supportedReasoningLevels[0] || "off",
    supportedReasoningLevels,
    supportsImages: Array.isArray(model.input) && model.input.includes("image"),
    reasoning: model.reasoning === true,
    thinkingLevelMap: model.thinkingLevelMap ?? undefined
  };
}

export function getSupportedReasoningLevels(model) {
  if (!model?.reasoning) return ["off"];
  const map = model.thinkingLevelMap ?? {};
  return REASONING_LEVELS.filter((level) => {
    if (map[level] === null) return false;
    if (level === "xhigh" || level === "max") return map[level] !== undefined;
    return true;
  });
}

export function parseTokenAmount(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!match) return 0;

  const amount = Number.parseFloat(match[1]);
  const multiplier =
    match[2] === "B" ? 1_000_000_000 : match[2] === "M" ? 1_000_000 : match[2] === "K" ? 1_000 : 1;

  return Math.round(amount * multiplier);
}

export function normalizeReasoningLevels(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return !normalized || normalized === "no" || normalized === "false"
    ? ["off"]
    : normalized === "yes" || normalized === "true"
      ? [...REASONING_LEVELS]
      : normalized
          .split(/[/,|]+/)
          .map((level) => level.trim())
          .filter(Boolean)
          .filter((level) => REASONING_LEVELS.includes(level));
}
