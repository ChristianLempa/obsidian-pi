import { describe, expect, it } from "vitest";
import {
  CUSTOM_MODEL_VALUE,
  DEFAULT_SETTINGS,
  getModelOptions,
  getReasoningOptions,
  getResolvedReasoning,
  getSelectedModelInfo,
  getToolModeOptions,
  normalizeSettings
} from "../src/plugin/settings.mjs";

describe("plugin settings helpers", () => {
  const model = {
    slug: "provider/model",
    displayName: "provider: model",
    defaultReasoningLevel: "medium",
    supportedReasoningLevels: ["low", "medium", "high", "max"],
    reasoning: true,
    supportsImages: true,
    contextWindow: 200000
  };

  it("builds model options", () => {
    expect(getModelOptions({ ...DEFAULT_SETTINGS, availableModels: [] })).toEqual({
      "": "Use Pi configured default"
    });
    expect(
      getModelOptions({
        ...DEFAULT_SETTINGS,
        availableModels: [model],
        effectiveModel: "provider/model"
      })
    ).toEqual({
      "": "Use Pi configured default — provider/model",
      "provider/model": "provider: model — provider/model · thinking · images · 200K context"
    });
  });

  it("builds reasoning options from the selected model", () => {
    expect(
      getReasoningOptions({
        ...DEFAULT_SETTINGS,
        model: "provider/model",
        availableModels: [model]
      })
    ).toEqual({
      "": "Use Pi/model default — Medium",
      low: "Low",
      medium: "Medium",
      high: "High",
      max: "Max - deepest"
    });
    expect(
      getReasoningOptions({
        ...DEFAULT_SETTINGS,
        effectiveReasoning: "high"
      })
    ).toEqual({ "": "Use Pi/model default — High" });
  });

  it("does not offer another model's thinking levels for an unknown custom slug", () => {
    expect(
      getReasoningOptions({
        ...DEFAULT_SETTINGS,
        model: CUSTOM_MODEL_VALUE,
        customModel: "unknown/model",
        effectiveModel: "provider/model",
        effectiveReasoning: "high",
        availableModels: [model]
      })
    ).toEqual({ "": "Use Pi/model default" });
  });

  it("resolves reasoning defaults", () => {
    expect(getResolvedReasoning({ ...DEFAULT_SETTINGS, reasoningEffort: "high" })).toBe("high");
    expect(
      getResolvedReasoning({
        ...DEFAULT_SETTINGS,
        model: "provider/model",
        availableModels: [model]
      })
    ).toBe("medium");
    expect(getResolvedReasoning({ ...DEFAULT_SETTINGS, effectiveReasoning: "low" })).toBe("low");
    expect(
      getResolvedReasoning({
        ...DEFAULT_SETTINGS,
        effectiveModel: "provider/model",
        effectiveReasoning: "high",
        availableModels: [model]
      })
    ).toBe("high");
  });

  it("normalizes loaded settings", () => {
    const settings = normalizeSettings({
      sandboxMode: "danger-full-access",
      maxSearchResults: "999",
      maxSearchFiles: "bad",
      maxFileChars: 10,
      maxChangeSnapshotFiles: 0,
      ignoredFolders: ["", ".git"],
      piExecutablePath: " /custom/bin/pi ",
      includeDefaultSkills: undefined,
      dismissedPiSetup: true
    });

    expect(settings).toMatchObject({
      sandboxMode: "edit",
      ignoredFolders: [".git"],
      piExecutablePath: "/custom/bin/pi",
      includeDefaultSkills: true,
      dismissedPiSetup: true
    });
    expect(settings).not.toHaveProperty("maxSearchResults");
    expect(settings).not.toHaveProperty("maxSearchFiles");
    expect(settings).not.toHaveProperty("maxFileChars");
    expect(settings).not.toHaveProperty("maxChangeSnapshotFiles");
  });

  it("finds custom selected model info and exposes tool modes", () => {
    expect(
      getSelectedModelInfo({
        ...DEFAULT_SETTINGS,
        model: CUSTOM_MODEL_VALUE,
        customModel: "provider/model",
        availableModels: [model]
      })
    ).toBe(model);
    expect(getToolModeOptions()).toHaveProperty("full-agent", "Full agent — edit/write and shell");
  });
});
