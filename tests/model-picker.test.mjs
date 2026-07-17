import { describe, expect, it } from "vitest";
import {
  filterModels,
  getRecentModels,
  groupModelsByProvider,
  rememberRecentModel
} from "../src/ui/model-picker.mjs";

const models = [
  {
    slug: "openai/gpt-5",
    provider: "openai",
    id: "gpt-5",
    displayName: "GPT-5"
  },
  {
    slug: "anthropic/claude-sonnet-4-5",
    provider: "anthropic",
    id: "claude-sonnet-4-5",
    displayName: "Claude Sonnet 4.5"
  },
  {
    slug: "openai/o3",
    provider: "openai",
    id: "o3",
    displayName: "o3"
  }
];

describe("model picker helpers", () => {
  it("searches friendly names, providers, and complete slugs", () => {
    expect(filterModels(models, "sonnet").map((model) => model.slug)).toEqual([
      "anthropic/claude-sonnet-4-5"
    ]);
    expect(filterModels(models, "openai/")).toHaveLength(2);
  });

  it("groups and sorts models by provider without changing the catalog", () => {
    expect(groupModelsByProvider(models)).toEqual([
      { provider: "anthropic", models: [models[1]] },
      { provider: "openai", models: [models[0], models[2]] }
    ]);
    expect(models.map((model) => model.slug)).toEqual([
      "openai/gpt-5",
      "anthropic/claude-sonnet-4-5",
      "openai/o3"
    ]);
  });

  it("keeps bounded session-only recent selections in most-recent order", () => {
    rememberRecentModel("openai/gpt-5");
    rememberRecentModel("anthropic/claude-sonnet-4-5");
    rememberRecentModel("openai/gpt-5");

    expect(getRecentModels(models).map((model) => model.slug)).toEqual([
      "openai/gpt-5",
      "anthropic/claude-sonnet-4-5"
    ]);
  });
});
