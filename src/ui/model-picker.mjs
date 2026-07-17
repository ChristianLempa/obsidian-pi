const RECENT_MODEL_LIMIT = 5;
const recentModelSlugs = [];

export function filterModels(models, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...models];
  return models.filter((model) =>
    [model.displayName, model.provider, model.id, model.slug]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalized))
  );
}

export function groupModelsByProvider(models) {
  const groups = new Map();
  for (const model of models) {
    const provider = model.provider || model.slug.split("/")[0] || "Other";
    if (!groups.has(provider)) groups.set(provider, []);
    groups.get(provider).push(model);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([provider, providerModels]) => ({
      provider,
      models: [...providerModels].sort((left, right) =>
        (left.displayName || left.id).localeCompare(right.displayName || right.id)
      )
    }));
}

export function rememberRecentModel(slug) {
  if (!slug) return;
  const existing = recentModelSlugs.indexOf(slug);
  if (existing >= 0) recentModelSlugs.splice(existing, 1);
  recentModelSlugs.unshift(slug);
  recentModelSlugs.splice(RECENT_MODEL_LIMIT);
}

export function getRecentModels(models) {
  const modelsBySlug = new Map(models.map((model) => [model.slug, model]));
  return recentModelSlugs.map((slug) => modelsBySlug.get(slug)).filter(Boolean);
}
