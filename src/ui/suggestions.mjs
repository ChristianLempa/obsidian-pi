import { getSlashCommands } from "../context/slash-commands.mjs";

export class ComposerSuggestions {
  constructor(inputEl, plugin, onApply) {
    this.inputEl = inputEl;
    this.plugin = plugin;
    this.onApply = onApply;
    this.suggestions = [];
    this.selectedSuggestionIndex = 0;
  }

  update() {
    const match = this.getActiveSuggestMatch();
    if (!match) {
      this.close();
      return;
    }

    this.activeSuggestRange = { start: match.start, end: match.end };
    this.suggestions = this.getSuggestions(match.trigger, match.query).slice(0, 16);
    this.selectedSuggestionIndex = 0;

    if (this.suggestions.length === 0) {
      this.close();
      return;
    }

    this.render();
  }

  handleKeydown(event) {
    if (!this.suggestEl || this.suggestions.length === 0) return false;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % this.suggestions.length;
      this.render();
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.selectedSuggestionIndex =
        (this.selectedSuggestionIndex - 1 + this.suggestions.length) % this.suggestions.length;
      this.render();
      return true;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      this.apply(this.selectedSuggestionIndex);
      return true;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return true;
    }

    return false;
  }

  close() {
    this.suggestEl?.remove();
    this.suggestEl = undefined;
    this.suggestions = [];
    this.activeSuggestRange = undefined;
    this.selectedSuggestionIndex = 0;
  }

  getActiveSuggestMatch() {
    const cursor = this.inputEl.selectionStart;
    const prefix = this.inputEl.value.slice(0, cursor);
    const match = prefix.match(/(^|\s)([@#/])([^\s]*)$/);
    if (!match || match.index === undefined) return undefined;

    const start = match.index + match[1].length;
    if (
      match[2] === "/" &&
      prefix.slice(prefix.lastIndexOf("\n", start - 1) + 1, start).trim().length > 0
    ) {
      return undefined;
    }

    return { trigger: match[2], query: match[3].toLowerCase(), start, end: cursor };
  }

  getSuggestions(trigger, query) {
    return trigger === "@"
      ? this.getNoteAndFolderSuggestions(query)
      : trigger === "#"
        ? this.getTagSuggestions(query)
        : this.getCommandSuggestions(query);
  }

  formatAttachmentInsert(value) {
    return /\s/.test(value) ? `@"${value.replace(/"/g, '\\"')}" ` : `@${value} `;
  }

  getNoteAndFolderSuggestions(query) {
    const files = this.plugin.app.vault.getMarkdownFiles();
    const folders = new Set();

    for (const file of files) {
      const parts = file.path.split("/");
      for (let index = 1; index < parts.length; index++)
        folders.add(parts.slice(0, index).join("/"));
    }

    const folderSuggestions = [...folders].map((folder) => ({
      label: `${folder}/`,
      detail: "Folder",
      insertText: this.formatAttachmentInsert(`${folder}/`)
    }));
    const noteSuggestions = files.map((file) => {
      const label = file.path.replace(/\.md$/i, "");
      return {
        label,
        detail: "Note",
        insertText: this.formatAttachmentInsert(label)
      };
    });

    return [...folderSuggestions, ...noteSuggestions]
      .filter((suggestion) => suggestion.label.toLowerCase().includes(query))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  getTagSuggestions(query) {
    const tags = new Set();

    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      for (const tag of cache?.tags ?? []) tags.add(tag.tag);

      const frontmatterTags = cache?.frontmatter?.tags;
      if (Array.isArray(frontmatterTags)) {
        for (const tag of frontmatterTags)
          tags.add(String(tag).startsWith("#") ? String(tag) : `#${tag}`);
      } else if (typeof frontmatterTags === "string") {
        tags.add(frontmatterTags.startsWith("#") ? frontmatterTags : `#${frontmatterTags}`);
      }
    }

    return [...tags]
      .filter((tag) => tag.toLowerCase().includes(query))
      .sort()
      .map((tag) => ({ label: tag, detail: "Tag", insertText: `${tag} ` }));
  }

  getCommandSuggestions(query) {
    return getSlashCommands(this.plugin.settings, this.plugin.getVaultBasePath())
      .map((command) => ({
        label: command.command,
        detail: command.command.startsWith("/skill:")
          ? `Skill — ${command.detail}`
          : command.detail,
        insertText: command.insertText
      }))
      .filter((suggestion) =>
        `${suggestion.label} ${suggestion.detail} ${suggestion.insertText}`
          .toLowerCase()
          .includes(query)
      );
  }

  render() {
    this.suggestEl?.remove();
    const parentEl = this.inputEl.parentElement;
    if (!parentEl) return;

    this.suggestEl = parentEl.createDiv({
      cls: "pi-agent-suggest",
      attr: { role: "listbox" }
    });

    for (let index = 0; index < this.suggestions.length; index++) {
      const suggestion = this.suggestions[index];
      const itemEl = this.suggestEl.createDiv({
        cls: `pi-agent-suggest-item${index === this.selectedSuggestionIndex ? " is-selected" : ""}`,
        attr: {
          role: "option",
          "aria-selected": index === this.selectedSuggestionIndex ? "true" : "false"
        }
      });

      itemEl.createSpan({ cls: "pi-agent-suggest-label", text: suggestion.label });
      itemEl.createSpan({ cls: "pi-agent-suggest-detail", text: suggestion.detail });
      itemEl.addEventListener("mousedown", (event) => {
        event.preventDefault();
        this.apply(index);
      });
    }
  }

  apply(index) {
    if (!this.activeSuggestRange) return;

    const suggestion = this.suggestions[index];
    if (!suggestion) return;

    const value = this.inputEl.value;
    this.inputEl.value =
      value.slice(0, this.activeSuggestRange.start) +
      suggestion.insertText +
      value.slice(this.activeSuggestRange.end);
    const cursor = this.activeSuggestRange.start + suggestion.insertText.length;
    this.inputEl.setSelectionRange(cursor, cursor);
    this.close();
    this.onApply();
    this.inputEl.focus();
  }
}
