import { describe, expect, it, vi } from "vitest";
import {
  buildModelPickerItems,
  createRuntimeCatalogSnapshot,
  getModelPickerPrimary,
  getModelPickerSecondary,
  hasSafeRuntimeCatalog,
  needsRuntimeCatalogRefresh,
  RuntimeCatalogRefreshGate
} from "../src/ui/model-picker.mjs";

const model = {
  slug: "openai/gpt-5",
  provider: "openai",
  id: "gpt-5",
  displayName: "GPT-5",
  reasoning: true,
  supportsImages: true,
  contextWindow: 200_000,
  supportedReasoningLevels: ["low", "medium", "high"]
};

const resolvedSettings = {
  availableModels: [model],
  effectiveModel: model.slug,
  effectiveReasoning: "medium"
};

describe("native model picker state", () => {
  it("pins a resolved, friendly Pi default before catalog models", () => {
    const items = buildModelPickerItems(resolvedSettings);

    expect(items.map((item) => item.value)).toEqual(["", model.slug]);
    expect(getModelPickerPrimary(items[0])).toBe("Pi default — GPT-5");
    expect(getModelPickerSecondary(items[0])).toBe(
      "openai/gpt-5 · thinking · images · 200K context"
    );
  });

  it("never creates a selectable ambiguous default", () => {
    expect(buildModelPickerItems({ ...resolvedSettings, effectiveModel: "" })).toEqual([]);
    expect(buildModelPickerItems({ ...resolvedSettings, effectiveModel: "missing/model" })).toEqual(
      []
    );
  });

  it("requires refresh for startup gaps and stale runtime state", () => {
    expect(needsRuntimeCatalogRefresh(resolvedSettings, 1_000, 1_100, 1_000)).toBe(false);
    expect(needsRuntimeCatalogRefresh(resolvedSettings, 1_000, 2_000, 1_000)).toBe(true);
    expect(
      needsRuntimeCatalogRefresh({ ...resolvedSettings, effectiveReasoning: "" }, 1_000, 1_100)
    ).toBe(true);
    expect(needsRuntimeCatalogRefresh({ ...resolvedSettings, availableModels: [] }, 1_000, 1_100)).toBe(
      true
    );
  });

  it("validates get_state against the runtime catalog before atomic application", () => {
    expect(
      createRuntimeCatalogSnapshot([model], {
        effectiveModel: model.slug,
        effectiveReasoning: "high"
      })
    ).toEqual({
      availableModels: [model],
      effectiveModel: model.slug,
      effectiveReasoning: "high"
    });
    expect(() =>
      createRuntimeCatalogSnapshot([model], {
        effectiveModel: "other/model",
        effectiveReasoning: "high"
      })
    ).toThrow("missing from its model catalog");
    expect(() =>
      createRuntimeCatalogSnapshot([model], {
        effectiveModel: model.slug,
        effectiveReasoning: "max"
      })
    ).toThrow("effective thinking level (max) is not supported");
  });

  it("coalesces concurrent startup/open refreshes and permits a later refresh", async () => {
    const gate = new RuntimeCatalogRefreshGate();
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    const refresh = vi.fn(() => pending);

    const startup = gate.run(refresh);
    const pickerOpen = gate.run(refresh);
    expect(startup).toBe(pickerOpen);
    expect(refresh).toHaveBeenCalledTimes(0);

    release("ready");
    await expect(startup).resolves.toBe("ready");
    await gate.run(refresh);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("only treats a fully matched last-known runtime value as safe on transient failure", () => {
    expect(hasSafeRuntimeCatalog(resolvedSettings)).toBe(true);
    expect(hasSafeRuntimeCatalog({ ...resolvedSettings, effectiveReasoning: "" })).toBe(false);
    expect(hasSafeRuntimeCatalog({ ...resolvedSettings, availableModels: [] })).toBe(false);
  });
});
