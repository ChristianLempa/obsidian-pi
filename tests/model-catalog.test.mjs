import { describe, expect, it } from "vitest";
import {
  normalizeReasoningLevels,
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
      "xhigh"
    ]);
    expect(normalizeReasoningLevels("low/high/custom")).toEqual(["low", "high"]);
  });

  it("parses Pi --list-models table output", () => {
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
