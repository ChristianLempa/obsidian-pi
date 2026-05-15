import { describe, expect, it } from "vitest";
import {
  calculateContextTokens,
  createContextUsage,
  formatContextUsageBadge,
  formatTokenCount,
  normalizeTokenUsage
} from "../src/pi/token-usage.mjs";

describe("token usage helpers", () => {
  it("normalizes provider usage and calculates context tokens", () => {
    const usage = normalizeTokenUsage({
      input: "1000",
      output: 25,
      cacheRead: 200,
      cacheWrite: 50
    });

    expect(usage).toEqual({
      input: 1000,
      output: 25,
      cacheRead: 200,
      cacheWrite: 50,
      totalTokens: 0
    });
    expect(calculateContextTokens(usage)).toBe(1250);
  });

  it("creates formatted context usage badges", () => {
    const contextUsage = createContextUsage({ input: 1000, cacheRead: 500 }, 10_000);

    expect(contextUsage).toEqual({ tokens: 1500, contextWindow: 10_000, percent: 15 });
    expect(
      formatContextUsageBadge(contextUsage, { input: 1000, output: 250, cacheRead: 500 })
    ).toMatchObject({
      label: "ctx 15% · 1.5K/10K · ↑1.5K ↓250"
    });
  });

  it("formats compact token counts", () => {
    expect(formatTokenCount(999)).toBe("999");
    expect(formatTokenCount(1500)).toBe("1.5K");
    expect(formatTokenCount(1_500_000)).toBe("1.5M");
  });
});
