export async function requestDesktopNotificationPermission(
  NotificationApi = globalThis.Notification
) {
  if (typeof NotificationApi !== "function") return false;
  if (NotificationApi.permission === "granted") return true;
  if (
    NotificationApi.permission !== "default" ||
    typeof NotificationApi.requestPermission !== "function"
  )
    return false;

  try {
    return (await NotificationApi.requestPermission()) === "granted";
  } catch (error) {
    console.warn("Pi Agent: desktop notification permission request failed", error);
    return false;
  }
}

export async function openNotificationThread(plugin, threadId, viewType) {
  if (!plugin?.switchThread?.(threadId)) return false;
  await plugin.activateView?.();
  const leaf = plugin.app?.workspace?.getLeavesOfType?.(viewType)?.[0];
  leaf?.view?.renderChatView?.();
  return true;
}

export function showDesktopRunNotification({
  runId,
  sentRunIds,
  body,
  onClick,
  NotificationApi = globalThis.Notification,
  documentRef = globalThis.document,
  windowRef = globalThis.window
}) {
  if (!runId || !(sentRunIds instanceof Set) || sentRunIds.has(runId)) return false;
  if (!isDocumentUnfocused(documentRef)) return false;
  if (typeof NotificationApi !== "function" || NotificationApi.permission !== "granted")
    return false;

  try {
    const notification = new NotificationApi("Pi Agent", {
      body: String(body || "Agent response completed."),
      silent: false
    });
    sentRunIds.add(runId);
    if (sentRunIds.size > 200) sentRunIds.delete(sentRunIds.values().next().value);
    notification.onclick = () => {
      try {
        windowRef?.focus?.();
        notification.close?.();
        const clickResult = onClick?.();
        clickResult?.catch?.((error) =>
          console.warn("Pi Agent: notification click action failed", error)
        );
      } catch (error) {
        console.warn("Pi Agent: notification click action failed", error);
      }
    };
    return true;
  } catch (error) {
    console.warn("Pi Agent: desktop notification failed", error);
    return false;
  }
}

function isDocumentUnfocused(documentRef) {
  try {
    return typeof documentRef?.hasFocus === "function" && !documentRef.hasFocus();
  } catch {
    return false;
  }
}
