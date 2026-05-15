export function calculateContextTokens(usage) {
  return usage
    ? Number(usage.input || 0) + Number(usage.cacheRead || 0) + Number(usage.cacheWrite || 0)
    : 0;
}

export function normalizeTokenUsage(usage) {
  if (!usage) return undefined;

  return {
    input: Number(usage.input || 0),
    output: Number(usage.output || 0),
    cacheRead: Number(usage.cacheRead || 0),
    cacheWrite: Number(usage.cacheWrite || 0),
    totalTokens: Number(usage.totalTokens || 0)
  };
}

export function createContextUsage(usage, contextWindow) {
  const tokens = calculateContextTokens(usage);
  const windowSize = Number(contextWindow || 0);

  return windowSize > 0 && tokens > 0
    ? {
        tokens,
        contextWindow: windowSize,
        percent: (tokens / windowSize) * 100
      }
    : undefined;
}

export function formatContextUsageBadge(contextUsage, tokenUsage) {
  if (!contextUsage) return undefined;

  const base = `ctx ${formatPercent(contextUsage.percent)} · ${formatTokenCount(
    contextUsage.tokens
  )}/${formatTokenCount(contextUsage.contextWindow)}`;

  return {
    label: tokenUsage
      ? `${base} · ↑${formatTokenCount(calculateContextTokens(tokenUsage))} ↓${formatTokenCount(
          tokenUsage.output || 0
        )}`
      : base,
    title: formatContextUsageTitle(contextUsage, tokenUsage)
  };
}

export function formatContextUsageTitle(contextUsage, tokenUsage) {
  const lines = [
    `Context used: ${formatPercent(contextUsage.percent)} (${formatTokenCount(
      contextUsage.tokens
    )} of ${formatTokenCount(contextUsage.contextWindow)} tokens)`
  ];

  if (tokenUsage) {
    lines.push(
      `↑ Input context: ${formatTokenCount(calculateContextTokens(tokenUsage))} tokens`,
      `↓ Output: ${formatTokenCount(tokenUsage.output || 0)} tokens`
    );
  }

  return lines.join("\n");
}

export function formatPercent(value) {
  return Number.isFinite(value) ? `${Math.max(0, Math.round(value))}%` : "?%";
}

export function formatTokenCount(value) {
  const count = Number(value || 0);

  return count >= 1_000_000
    ? `${formatCompactNumber(count / 1_000_000)}M`
    : count >= 1_000
      ? `${formatCompactNumber(count / 1_000)}K`
      : String(Math.round(count));
}

function formatCompactNumber(value) {
  return value >= 100
    ? String(Math.round(value))
    : value >= 10
      ? value.toFixed(1).replace(/\.0$/, "")
      : value.toFixed(1).replace(/\.0$/, "");
}
