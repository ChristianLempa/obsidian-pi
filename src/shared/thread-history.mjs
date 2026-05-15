export function sanitizeThreadHistory(history, limit = 40) {
  return {
    currentThreadId: history.currentThreadId,
    threads: [...(history.threads || [])]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, limit)
      .map((thread) => ({
        ...thread,
        messages: (thread.messages || []).map(compactPersistedMessage)
      }))
  };
}

function compactPersistedMessage(message) {
  return {
    ...message,
    changeSummaries: message.changeSummaries?.map((summary) => ({
      files: summary.files,
      stats: summary.stats,
      sourceEventType: summary.sourceEventType,
      unifiedDiff: summary.unifiedDiff
    }))
  };
}
