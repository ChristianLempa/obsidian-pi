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
  it("marks Pi's effective model as the default without duplicating it", () => {
    const items = buildModelPickerItems(resolvedSettings);

    expect(items.map((item) => item.value)).toEqual([""]);
    expect(getModelPickerPrimary(items[0])).toBe("GPT-5");
    expect(getModelPickerSecondary(items[0])).toBe(
      "openai/gpt-5 · Pi default · thinking · images · 200K context"
    );
    expect(
      buildModelPickerItems({ ...resolvedSettings, effectiveModel: "missing/model" })[0].value
    ).toBe(model.slug);
  });

  it("requires refresh for startup gaps and stale runtime state", () => {
    expect(needsRuntimeCatalogRefresh(resolvedSettings, 1_000, 1_100, 1_000)).toBe(false);
    expect(needsRuntimeCatalogRefresh(resolvedSettings, 1_000, 2_000, 1_000)).toBe(true);
    expect(
      needsRuntimeCatalogRefresh({ ...resolvedSettings, effectiveReasoning: "" }, 1_000, 1_100)
    ).toBe(false);
    expect(
      needsRuntimeCatalogRefresh({ ...resolvedSettings, availableModels: [] }, 1_000, 1_100)
    ).toBe(true);
  });

  it("keeps get_state as optional display metadata", () => {
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
    expect(
      createRuntimeCatalogSnapshot([model], {
        effectiveModel: "other/model",
        effectiveReasoning: "high"
      })
    ).toEqual({ availableModels: [model], effectiveModel: "", effectiveReasoning: "" });
    expect(
      createRuntimeCatalogSnapshot([model], {
        effectiveModel: model.slug,
        effectiveReasoning: "max"
      })
    ).toEqual({ availableModels: [model], effectiveModel: model.slug, effectiveReasoning: "" });
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

  it("treats a cached non-empty catalog as safe independently of runtime display state", () => {
    expect(hasSafeRuntimeCatalog(resolvedSettings)).toBe(true);
    expect(hasSafeRuntimeCatalog({ ...resolvedSettings, effectiveReasoning: "" })).toBe(true);
    expect(hasSafeRuntimeCatalog({ ...resolvedSettings, availableModels: [] })).toBe(false);
  });
});
