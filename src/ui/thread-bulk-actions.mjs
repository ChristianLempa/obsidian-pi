export function planBulkThreadDeletion(threads, runningThreadIds = []) {
  const running = new Set(runningThreadIds);
  const createScope = (candidates) => {
    const deleteIds = candidates
      .filter((thread) => !running.has(thread.id))
      .map((thread) => thread.id);
    const skippedIds = candidates
      .filter((thread) => running.has(thread.id))
      .map((thread) => thread.id);

    return {
      deleteIds,
      skippedIds,
      deleteCount: deleteIds.length,
      skippedCount: skippedIds.length
    };
  };

  return {
    all: createScope(threads),
    exceptFavorites: createScope(threads.filter((thread) => thread.favorite !== true)),
    favoriteCount: threads.filter((thread) => thread.favorite === true).length
  };
}

export function formatBulkDeleteResult({ deletedCount, skippedCount, createdEmptyChat }) {
  const deleted = `${deletedCount} chat${deletedCount === 1 ? "" : "s"} deleted`;
  const skipped =
    skippedCount > 0
      ? `; ${skippedCount} active chat${skippedCount === 1 ? " was" : "s were"} skipped`
      : "";
  const replacement = createdEmptyChat ? "; a new empty chat was created" : "";
  return `${deleted}${skipped}${replacement}. Local Pi sessions were kept.`;
}
