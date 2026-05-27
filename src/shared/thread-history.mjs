export function sanitizeThreadHistory(history, limit = 40) {
  return {
    currentThreadId: history.currentThreadId,
    threads: [...(history.threads || [])]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, limit)
  };
}
