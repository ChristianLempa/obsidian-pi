export class RuntimeCatalogRefreshGate {
  run(task) {
    if (this.inFlight) return this.inFlight;
    this.inFlight = Promise.resolve()
      .then(task)
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  }
}

export function needsRuntimeCatalogRefresh(
  settings,
  refreshedAt,
  now = Date.now(),
  maxAge = 30_000
) {
  return (
    !Array.isArray(settings.availableModels) ||
    settings.availableModels.length === 0 ||
    !settings.effectiveModel ||
    !settings.effectiveReasoning ||
    !refreshedAt ||
    now - refreshedAt >= maxAge
  );
}

export function createRuntimeCatalogSnapshot(models, effectiveConfig) {
  if (!Array.isArray(models) || models.length === 0) {
    throw new Error("Pi returned no models.");
  }

  const effectiveModel = String(effectiveConfig?.effectiveModel || "").trim();
  const effectiveReasoning = String(effectiveConfig?.effectiveReasoning || "").trim();
  if (!effectiveModel || !effectiveReasoning) {
    throw new Error("Pi did not return its effective model and thinking level.");
  }
  const effectiveModelInfo = models.find((model) => model.slug === effectiveModel);
  if (!effectiveModelInfo) {
    throw new Error(`Pi's effective model (${effectiveModel}) is missing from its model catalog.`);
  }
  if (!effectiveModelInfo.supportedReasoningLevels?.includes(effectiveReasoning)) {
    throw new Error(
      `Pi's effective thinking level (${effectiveReasoning}) is not supported by ${effectiveModel}.`
    );
  }

  return { availableModels: models, effectiveModel, effectiveReasoning };
}

export function hasSafeRuntimeCatalog(settings) {
  return Boolean(
    settings.effectiveModel &&
    settings.effectiveReasoning &&
    settings.availableModels?.some((model) => model.slug === settings.effectiveModel)
  );
}

export function buildModelPickerItems(settings) {
  const effective = settings.availableModels.find(
    (model) => model.slug === settings.effectiveModel
  );
  if (!effective) return [];

  return [
    { value: "", model: effective, isDefault: true },
    ...settings.availableModels.map((model) => ({ value: model.slug, model, isDefault: false }))
  ];
}

export function getModelPickerPrimary(item) {
  return item.model.displayName || item.model.id || item.model.slug;
}

export function getModelPickerSecondary(item) {
  const capabilities = [
    item.model.reasoning ? "thinking" : "",
    item.model.supportsImages ? "images" : "",
    item.model.contextWindow ? `${formatTokenAmount(item.model.contextWindow)} context` : ""
  ].filter(Boolean);
  return [item.model.slug, ...capabilities].join(" · ");
}

function formatTokenAmount(value) {
  return value >= 1_000_000
    ? `${Number((value / 1_000_000).toFixed(1))}M`
    : value >= 1_000
      ? `${Number((value / 1_000).toFixed(1))}K`
      : String(value);
}
