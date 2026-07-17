export function getSendActionState({ running, canceling, hasInput, queuedCount = 0 }) {
  if (canceling) {
    return {
      state: "canceling",
      icon: "loader",
      label: "Canceling",
      ariaLabel: "Canceling agent run",
      disabled: true
    };
  }

  if (running && hasInput) {
    return {
      state: "queue",
      icon: "list-plus",
      label: "Queue",
      ariaLabel: "Queue message",
      disabled: false
    };
  }

  if (running) {
    return {
      state: "cancel",
      icon: "square",
      label: "Cancel",
      ariaLabel: "Cancel agent run",
      disabled: false
    };
  }

  return {
    state: "send",
    icon: "send",
    label: "Send",
    ariaLabel: "Send message",
    disabled: false,
    titleSuffix: queuedCount > 0 ? `${queuedCount} queued.` : ""
  };
}
