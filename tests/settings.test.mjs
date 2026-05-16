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
    supportedReasoningLevels: ["low", "medium", "high"]
  };

  it("builds model options", () => {
    expect(getModelOptions({ ...DEFAULT_SETTINGS, availableModels: [] })).toMatchObject({
      "": "Use Pi default",
      [CUSTOM_MODEL_VALUE]: "Custom model ID"
    });
    expect(getModelOptions({ ...DEFAULT_SETTINGS, availableModels: [model] })).toMatchObject({
      "": "Use Pi default",
      "provider/model": "provider: model - thinking low/medium/high",
      [CUSTOM_MODEL_VALUE]: "Custom model ID"
    });
  });

  it("builds reasoning options from the selected model", () => {
    expect(
      getReasoningOptions({
        ...DEFAULT_SETTINGS,
        model: "provider/model",
        availableModels: [model]
      })
    ).toMatchObject({
      "": "Use Pi/model default",
      low: "Low",
      medium: "Medium",
      high: "High"
    });
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
  });

  it("normalizes loaded settings", () => {
    const settings = normalizeSettings({
      sandboxMode: "danger-full-access",
      maxSearchResults: "999",
      maxSearchFiles: "bad",
      maxFileChars: 10,
      maxChangeSnapshotFiles: 0,
      ignoredFolders: ["", ".git"],
      includeDefaultSkills: undefined,
      dismissedPiSetup: true
    });

    expect(settings).toMatchObject({
      sandboxMode: "edit",
      ignoredFolders: [".git"],
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
