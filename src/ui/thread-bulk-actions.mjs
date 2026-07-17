export function planArchiveAllThreads(threads, runningThreadIds = []) {
  const running = new Set(runningThreadIds);
  const candidates = threads.filter((thread) => !thread.archived);
  const skippedIds = candidates
    .filter((thread) => running.has(thread.id))
    .map((thread) => thread.id);
  const archiveIds = candidates
    .filter((thread) => !running.has(thread.id))
    .map((thread) => thread.id);

  return {
    archiveIds,
    skippedIds,
    archiveCount: archiveIds.length,
    skippedCount: skippedIds.length
  };
}

export function formatArchiveAllResult({ archivedCount, skippedCount }) {
  const archived = `${archivedCount} chat${archivedCount === 1 ? "" : "s"} archived`;
  return skippedCount > 0
    ? `${archived}; ${skippedCount} active chat${skippedCount === 1 ? " was" : "s were"} skipped.`
    : `${archived}.`;
}
