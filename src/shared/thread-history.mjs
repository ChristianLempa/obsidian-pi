export function sanitizeThreadHistory(history) {
  const threads = [...(history.threads || [])].sort(
    (left, right) => right.updatedAt - left.updatedAt
  );
  const currentThreadId = threads.some((thread) => thread.id === history.currentThreadId)
    ? history.currentThreadId
    : threads[0]?.id;
  return { currentThreadId, threads };
}
