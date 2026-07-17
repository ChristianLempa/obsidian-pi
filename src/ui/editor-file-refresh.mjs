export async function refreshOpenMarkdownViews(app, file) {
  if (!app?.vault?.read || !file?.path || file.extension !== "md") return 0;

  const content = await app.vault.read(file);
  let refreshed = 0;
  for (const leaf of app.workspace?.getLeavesOfType?.("markdown") ?? []) {
    const view = leaf.view;
    if (view?.file?.path !== file.path || typeof view.setViewData !== "function") continue;

    const current = view.editor?.getValue?.() ?? view.getViewData?.();
    if (current === content) continue;
    view.setViewData(content, false);
    refreshed += 1;
  }
  return refreshed;
}
