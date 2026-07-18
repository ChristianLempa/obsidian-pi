export async function requestDesktopNotificationPermission(NotificationApi) {
  const activeNotificationApi =
    NotificationApi === undefined ? resolveActiveWindow()?.Notification : NotificationApi;
  if (typeof activeNotificationApi !== "function") return false;
  if (activeNotificationApi.permission === "granted") return true;
  if (
    activeNotificationApi.permission !== "default" ||
    typeof activeNotificationApi.requestPermission !== "function"
  )
    return false;

  try {
    return (await activeNotificationApi.requestPermission()) === "granted";
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
  NotificationApi,
  documentRef,
  windowRef
}) {
  const activeWindow = resolveActiveWindow();
  const activeNotificationApi =
    NotificationApi === undefined ? activeWindow?.Notification : NotificationApi;
  const activeDocument = documentRef === undefined ? activeWindow?.document : documentRef;
  const notificationWindow = windowRef === undefined ? activeWindow : windowRef;
  if (!runId || !(sentRunIds instanceof Set) || sentRunIds.has(runId)) return false;
  if (!isDocumentUnfocused(activeDocument)) return false;
  if (typeof activeNotificationApi !== "function" || activeNotificationApi.permission !== "granted")
    return false;

  try {
    const notification = new activeNotificationApi("Pi Agent", {
      body: String(body || "Agent response completed."),
      silent: false
    });
    sentRunIds.add(runId);
    if (sentRunIds.size > 200) sentRunIds.delete(sentRunIds.values().next().value);
    notification.onclick = () => {
      try {
        notificationWindow?.focus?.();
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

function resolveActiveWindow() {
  return typeof window === "undefined" ? undefined : (window.activeWindow ?? window);
}

function isDocumentUnfocused(documentRef) {
  try {
    return typeof documentRef?.hasFocus === "function" && !documentRef.hasFocus();
  } catch {
    return false;
  }
}
