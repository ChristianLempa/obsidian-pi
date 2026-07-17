const DIALOG_METHODS = new Set(["select", "confirm", "input", "editor"]);
const FIRE_AND_FORGET_METHODS = new Set([
  "notify",
  "setStatus",
  "setWidget",
  "setTitle",
  "set_editor_text"
]);

/**
 * Converts Pi's extension UI protocol into calls supplied by the host UI.
 * Dialog failures always resolve as cancellations so an extension cannot leave RPC blocked.
 */
export function createExtensionUiHandler(handlers = {}) {
  return async (request) => {
    const method = String(request?.method ?? "");
    if (!DIALOG_METHODS.has(method) && !FIRE_AND_FORGET_METHODS.has(method)) {
      throw new Error(`Unsupported Pi extension UI method: ${method || "unknown"}`);
    }

    const handler = handlers[method];
    if (typeof handler !== "function") {
      if (DIALOG_METHODS.has(method)) return { cancelled: true };
      return undefined;
    }

    if (!DIALOG_METHODS.has(method)) {
      await handler(request);
      return undefined;
    }

    const timeout = normalizeTimeout(request?.timeout);
    const controller = timeout ? new globalThis.AbortController() : undefined;
    const handlerPromise = Promise.resolve(
      handler(controller ? { ...request, signal: controller.signal } : request)
    );
    const value = timeout
      ? await Promise.race([
          handlerPromise,
          new Promise((resolve) => {
            const timer = setTimeout(() => {
              controller.abort();
              resolve(undefined);
            }, timeout);
            handlerPromise.finally(() => clearTimeout(timer)).catch(() => {});
          })
        ])
      : await handlerPromise;
    if (value === undefined || value === null) return { cancelled: true };
    if (method === "confirm") return { confirmed: value === true };
    return { value: String(value) };
  };
}

function normalizeTimeout(timeout) {
  const value = Number(timeout);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function isExtensionUiDialog(method) {
  return DIALOG_METHODS.has(method);
}

export function isExtensionUiMethod(method) {
  return DIALOG_METHODS.has(method) || FIRE_AND_FORGET_METHODS.has(method);
}
