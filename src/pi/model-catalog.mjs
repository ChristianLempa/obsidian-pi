import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findPiExecutable } from "./environment.mjs";

const REASONING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"];
const ESCAPE_CHARACTER = String.fromCharCode(27);
const ANSI_ESCAPE_PATTERN = new RegExp(`${ESCAPE_CHARACTER}\\[[0-9;?]*[ -/]*[@-~]`, "g");

export class PiModelCatalog {
  constructor(pluginDirectory) {
    this.pluginDirectory = pluginDirectory;
  }

  async getAvailableModels() {
    const output = await this.execPi(findPiExecutable(), ["--list-models"]);
    return parseModelCatalog(output);
  }

  getEffectiveConfig(vaultBasePath) {
    return getEffectiveConfig(vaultBasePath);
  }

  execPi(command, args) {
    return new Promise((resolve, reject) => {
      execFile(command, args, { timeout: 20_000 }, (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `Could not query Pi model registry: ${error.message}${stderr ? `\n${stderr}` : ""}`
            )
          );
          return;
        }

        resolve(stdout || stderr);
      });
    });
  }
}

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

export function getEffectiveConfig(vaultBasePath) {
  const vaultSettingsPath = vaultBasePath ? path.join(vaultBasePath, ".pi", "settings.json") : "";
  const settings = readJsonFile(vaultSettingsPath);
  const defaultModel = settings.defaultModel ? String(settings.defaultModel) : "";
  const defaultProvider = settings.defaultProvider ? String(settings.defaultProvider) : "";
  const effectiveModel = defaultModel
    ? defaultModel.includes("/")
      ? defaultModel
      : defaultProvider
        ? `${defaultProvider}/${defaultModel}`
        : defaultModel
    : "";
  const effectiveReasoning = settings.defaultThinkingLevel
    ? String(settings.defaultThinkingLevel)
    : "";

  return { effectiveModel, effectiveReasoning };
}

function readJsonFile(filePath) {
  try {
    return filePath && fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : {};
  } catch {
    return {};
  }
}
