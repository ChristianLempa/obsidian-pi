import { Notice } from "obsidian";

const EXTERNAL_LINK_PATTERN = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;
const LEGACY_LINE_PATTERN = /^(.*):(\d+)$/;

/**
 * Classify a link without normalizing its path. Obsidian remains responsible
 * for aliases, relative paths, case matching, spaces, and subpaths.
 */
export function classifyVaultLinkTarget(value) {
  if (typeof value !== "string") return { kind: "invalid" };

  if (!value.trim()) return { kind: "invalid" };
  if (EXTERNAL_LINK_PATTERN.test(value.trim())) return { kind: "external", linkText: value };

  const linkText = value;
  const lineMatch = linkText.match(LEGACY_LINE_PATTERN);
  if (lineMatch && Number(lineMatch[2]) > 0) {
    return {
      kind: "internal",
      linkText: lineMatch[1],
      line: Number(lineMatch[2])
    };
  }

  return { kind: "internal", linkText };
}

export async function openVaultLink(value, newLeaf = false) {
  const target =
    typeof value === "string"
      ? classifyVaultLinkTarget(value)
      : value?.path
        ? { kind: "internal", linkText: value.path, line: value.line }
        : { kind: "invalid" };

  if (target.kind !== "internal") {
    if (target.kind === "invalid") new Notice(`Note not found: ${String(value)}`);
    return false;
  }

  try {
    await this.plugin.app.workspace.openLinkText(
      target.linkText,
      this.getLinkSourcePath(),
      Boolean(newLeaf)
    );
    if (target.line) this.revealLine(this.plugin.app.workspace.activeLeaf, target.line);
    return true;
  } catch (error) {
    console.error("Pi Agent: failed to open vault link", error);
    new Notice(`Note not found: ${this.formatVaultLinkTarget(target)}`);
    return false;
  }
}

export function parseVaultLinkTarget(value) {
  const target = classifyVaultLinkTarget(value);
  if (target.kind !== "internal") return undefined;
  return { path: target.linkText, line: target.line };
}

export function formatVaultLinkTarget(target) {
  const linkText = target?.linkText ?? target?.path ?? "";
  return target?.line ? `${linkText}:${target.line}` : linkText;
}

export function getLinkLabel(value) {
  const target = classifyVaultLinkTarget(value);
  const linkText = target.kind === "internal" ? target.linkText : String(value);
  return linkText.split("/").pop() ?? linkText;
}

export function getLinkSourcePath() {
  return (
    this.plugin.getCurrentContextFile()?.path ??
    this.plugin.app.workspace.getActiveFile()?.path ??
    ""
  );
}

export function revealLine(leaf, line) {
  if (!leaf || !Number.isInteger(line) || line < 1) return;
  globalThis.setTimeout(() => {
    const editor = leaf.view?.editor;
    if (!editor) return;
    const position = { line: line - 1, ch: 0 };
    editor.setCursor?.(position);
    editor.scrollIntoView?.({ from: position, to: position }, true);
    editor.focus?.();
  }, 50);
}

export async function openVaultPath(value, newLeaf = "tab") {
  return this.openVaultLink(value, newLeaf === true || newLeaf === "tab");
}
