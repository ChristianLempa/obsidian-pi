import { Notice, normalizePath } from "obsidian";
import { normalizeVaultFolder } from "../shared/paths.mjs";

export class NoteActions {
  constructor(plugin, callbacks) {
    this.plugin = plugin;
    this.callbacks = callbacks;
  }

  async copyText(text) {
    await navigator.clipboard.writeText(text);
    new Notice("Copied to clipboard.");
  }

  insertIntoCurrentNote(text) {
    const editor = this.plugin.app.workspace.activeEditor?.editor;
    if (!editor) {
      new Notice("Open a note first.");
      return;
    }

    editor.replaceSelection(text);
  }

  async createNoteFromResponse(response) {
    const title = this.getResponseTitle(response);
    const path = await this.getAvailableNotePath(`${title}.md`);
    await this.ensureFolder("Pi");
    const file = await this.plugin.app.vault.create(path, response);
    await this.plugin.app.workspace.getLeaf(false).openFile(file);
  }

  async openCitedNotes(text) {
    const links = this.extractVaultLinks(text);
    if (links.length === 0) {
      new Notice("No vault links found.");
      return;
    }

    for (const link of links.slice(0, 5)) await this.callbacks.openVaultLink(link);
  }

  getPreviousUserPrompt(messageIndex) {
    for (let index = messageIndex - 1; index >= 0; index--) {
      const message = this.plugin.messages[index];
      if (message?.role === "user") return message.content;
    }

    return undefined;
  }

  extractVaultLinks(text) {
    const links = new Set();

    for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
      links.add(match[1]);
    }

    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+\.md)(?:#[^)]+)?\)/g)) {
      links.add(
        this.callbacks.formatVaultLinkTarget(
          this.callbacks.parseVaultLinkTarget(match[1]) ?? { path: match[1] }
        )
      );
    }

    for (const match of text.matchAll(
      /(^|\s)((?:\/?[A-Za-z0-9 _.-]+\/)+[A-Za-z0-9 _.-]+\.md(?::\d+)?)/g
    )) {
      const rawTarget = match[2];
      const target = this.callbacks.parseVaultLinkTarget(rawTarget);
      links.add(target ? this.callbacks.formatVaultLinkTarget(target) : rawTarget);
    }

    return [...links];
  }

  getResponseTitle(response) {
    const heading = response.match(/^#\s+(.+)$/m)?.[1];
    return (
      (heading ?? response.split(/\r?\n/).find((line) => line.trim()) ?? "Agent response")
        .replace(/[\\/:*?"<>|#[\]]/g, "")
        .trim()
        .slice(0, 80) || "Agent response"
    );
  }

  async ensureFolder(folder) {
    const parts = normalizeArchiveFolder(folder).split("/");
    let current = "";

    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.plugin.app.vault.getAbstractFileByPath(current)) {
        await this.plugin.app.vault.createFolder(current);
      }
    }
  }

  async getAvailableNotePath(name, folder = "Pi") {
    const normalizedFolder = normalizeArchiveFolder(folder);
    const path = `${normalizedFolder}/${name}`;
    if (!this.plugin.app.vault.getAbstractFileByPath(path)) return path;

    const basename = name.replace(/\.md$/i, "");
    for (let index = 2; index < 100; index++) {
      const candidate = `${normalizedFolder}/${basename} ${index}.md`;
      if (!this.plugin.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }

    return `${normalizedFolder}/${basename} ${Date.now()}.md`;
  }
}

export function normalizeArchiveFolder(folder) {
  return normalizePath(normalizeVaultFolder(folder, "Pi"));
}
