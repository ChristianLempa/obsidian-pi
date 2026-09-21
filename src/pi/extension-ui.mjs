import { stripVTControlCharacters } from "node:util";

const DIALOG_METHODS = new Set(["select", "confirm", "input", "editor"]);
// stripVTControlCharacters handles terminal escape sequences; this removes the
// remaining C0/C1 controls before extension-owned text reaches a GUI surface.
// eslint-disable-next-line no-control-regex -- Remove non-printing C0/C1 characters.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
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
export function createExtensionUiHandler(handlers = {}, hostWindow) {
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
    const window = hostWindow ?? resolveActiveWindow();
    const controller = timeout ? new window.AbortController() : undefined;
    const handlerPromise = Promise.resolve(
      handler(controller ? { ...request, signal: controller.signal } : request)
    );
    const value = timeout
      ? await Promise.race([
          handlerPromise,
          new Promise((resolve) => {
            const timer = window.setTimeout(() => {
              controller.abort();
              resolve(undefined);
            }, timeout);
            handlerPromise.finally(() => window.clearTimeout(timer)).catch(() => {});
          })
        ])
      : await handlerPromise;
    if (value === undefined || value === null) return { cancelled: true };
    if (method === "confirm") return { confirmed: value === true };
    return { value: String(value) };
  };
}

function resolveActiveWindow() {
  return typeof window === "undefined" ? undefined : (window.activeWindow ?? window);
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

export function sanitizeExtensionText(value) {
  return stripVTControlCharacters(String(value ?? "")).replace(CONTROL_CHARACTERS, "");
}

export function renderExtensionStatuses(container, elements, statuses, visible) {
  if (!container) return;
  container.hidden = !visible || statuses.size === 0;

  for (const [key, element] of elements) {
    if (statuses.has(key)) continue;
    element.remove();
    elements.delete(key);
  }

  for (const [key, text] of statuses) {
    let element = elements.get(key);
    if (!element) {
      element = container.createSpan({ cls: "pi-agent-extension-status" });
      elements.set(key, element);
    }
    const label = `${sanitizeExtensionText(key) || "extension"}: ${sanitizeExtensionText(text)}`;
    if (element.textContent !== label) element.setText(label);
    element.setAttr("title", label);
    element.setAttr("aria-label", label);
  }
}
