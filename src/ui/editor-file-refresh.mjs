export function getSuccessfulMarkdownMutationPath(event, vaultBasePath = "") {
  if (
    event?.type !== "tool_end" ||
    event.isError === true ||
    !["edit", "write"].includes(String(event.toolName || "").toLowerCase())
  )
    return undefined;
  let path = typeof event.toolArgs?.path === "string" ? event.toolArgs.path.trim() : "";
  if (!path) return undefined;
  path = path.replaceAll("\\", "/");
  const base = String(vaultBasePath || "")
    .replaceAll("\\", "/")
    .replace(/\/$/, "");
  if (path.startsWith("/") || /^[A-Za-z]:\//.test(path)) {
    const caseInsensitive = /^[A-Za-z]:\//.test(path);
    const comparablePath = caseInsensitive ? path.toLowerCase() : path;
    const comparableBase = caseInsensitive ? base.toLowerCase() : base;
    if (!comparableBase || !comparablePath.startsWith(`${comparableBase}/`)) return undefined;
    path = path.slice(base.length + 1);
  }
  const parts = path.replace(/^\.\//, "").split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return undefined;
  path = parts.join("/");
  return path.toLowerCase().endsWith(".md") ? path : undefined;
}

export async function refreshOpenMarkdownViews(app, file) {
  if (!app?.vault?.read || !file?.path || file.extension !== "md") return 0;

  const content = await app.vault.read(file);
  let refreshed = 0;
  for (const leaf of app.workspace?.getLeavesOfType?.("markdown") ?? []) {
    const view = leaf.view;
    if (view?.file?.path !== file.path || typeof view.setViewData !== "function") continue;

    const current = view.editor?.getValue?.() ?? view.getViewData?.();
    if (current === content && view.data === content) continue;
    const scroll = getEditorScroll(view.editor);
    view.data = content;
    view.setViewData(content, false);
    if (scroll) restoreEditorScroll(view.editor, scroll);
    refreshed += 1;
  }
  return refreshed;
}

function getEditorScroll(editor) {
  try {
    return typeof editor?.getScrollInfo === "function" ? editor.getScrollInfo() : undefined;
  } catch {
    return undefined;
  }
}

function restoreEditorScroll(editor, scroll) {
  try {
    editor?.scrollTo?.(scroll.left, scroll.top);
  } catch {
    // A targeted refresh remains authoritative when an editor is closing.
  }
}
