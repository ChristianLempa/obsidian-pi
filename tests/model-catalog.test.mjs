import { describe, expect, it } from "vitest";
import {
  getSupportedReasoningLevels,
  normalizeReasoningLevels,
  normalizeRpcModel,
  parseModelCatalog,
  parseTokenAmount
} from "../src/pi/model-catalog.mjs";

describe("Pi model catalog helpers", () => {
  it("parses compact token amounts", () => {
    expect(parseTokenAmount("128K")).toBe(128_000);
    expect(parseTokenAmount("1.5M")).toBe(1_500_000);
    expect(parseTokenAmount("bad")).toBe(0);
  });

  it("normalizes reasoning levels", () => {
    expect(normalizeReasoningLevels("no")).toEqual(["off"]);
    expect(normalizeReasoningLevels("yes")).toEqual([
      "off",
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
      "max"
    ]);
    expect(normalizeReasoningLevels("low/high/custom")).toEqual(["low", "high"]);
  });

  it("normalizes full RPC model metadata and sparse thinking maps", () => {
    const model = {
      provider: "openai-codex",
      id: "gpt-5.6-sol",
      name: "GPT-5.6 Sol",
      reasoning: true,
      thinkingLevelMap: { off: null, minimal: "low", xhigh: "xhigh", max: "max" },
      input: ["text", "image"],
      contextWindow: 372000,
      maxTokens: 128000
    };

    expect(getSupportedReasoningLevels(model)).toEqual([
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
      "max"
    ]);
    expect(normalizeRpcModel(model)).toMatchObject({
      slug: "openai-codex/gpt-5.6-sol",
      provider: "openai-codex",
      id: "gpt-5.6-sol",
      displayName: "GPT-5.6 Sol",
      contextWindow: 372000,
      maxOutputTokens: 128000,
      supportsImages: true,
      reasoning: true,
      supportedReasoningLevels: ["minimal", "low", "medium", "high", "xhigh", "max"],
      thinkingLevelMap: { off: null, minimal: "low", xhigh: "xhigh", max: "max" }
    });
  });

  it("keeps the table parser as a compatibility fallback", () => {
    const output = `provider  model  context  output  thinking\nopenai  gpt-5  128K  16K  low/medium/high`;

    expect(parseModelCatalog(output)).toEqual([
      {
        slug: "openai/gpt-5",
        displayName: "openai: gpt-5",
        contextWindow: 128_000,
        maxOutputTokens: 16_000,
        defaultReasoningLevel: "medium",
        supportedReasoningLevels: ["low", "medium", "high"]
      }
    ]);
  });
});
