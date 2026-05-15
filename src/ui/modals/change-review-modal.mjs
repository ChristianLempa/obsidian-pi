import { Modal, Notice, Setting, TFile } from "obsidian";

export class ChangeReviewModal extends Modal {
  constructor(plugin, message) {
    super(plugin.app);
    this.message = message;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("pi-agent-change-review-modal");
    contentEl.addClass("pi-agent-change-review");
    new Setting(contentEl).setName("Agent changes").setHeading();

    const stats = this.getStats();
    const summaryEl = contentEl.createEl("p", { cls: "pi-agent-change-summary" });
    summaryEl.createSpan({ text: `${stats.filesChanged} files changed, ` });
    summaryEl.createSpan({ cls: "pi-agent-diff-additions", text: `+${stats.additions}` });
    summaryEl.createSpan({ text: " " });
    summaryEl.createSpan({ cls: "pi-agent-diff-deletions", text: `-${stats.deletions}` });

    const changedFiles = this.getChangedFiles();
    if (changedFiles.length > 0) {
      const filesEl = contentEl.createEl("ul", { cls: "pi-agent-change-files" });
      for (const file of changedFiles) {
        filesEl.createEl("li", {
          text: `${file.status} ${file.path} (+${file.additions} -${file.deletions})`
        });
      }
    }

    const unifiedDiffs = this.getUnifiedDiffs();
    if (unifiedDiffs.length > 0) {
      for (const diff of unifiedDiffs) this.renderDiff(contentEl, diff);
    } else {
      contentEl.createEl("p", {
        cls: "pi-agent-empty",
        text: "Agent reported changed files, but did not emit a unified diff for this response."
      });
    }

    const actionsEl = contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    const fileSnapshots = this.getFileSnapshots();
    actionsEl.createEl("button", { text: "Copy diff" }).addEventListener("click", () => {
      this.copyDiff();
    });
    const revertButton = actionsEl.createEl("button", { text: "Revert", cls: "mod-warning" });
    revertButton.disabled = fileSnapshots.length === 0;
    revertButton.addEventListener("click", () => {
      this.revertDiff();
    });
    actionsEl
      .createEl("button", { text: "Close", cls: "mod-cta" })
      .addEventListener("click", () => this.close());
  }

  onClose() {
    this.modalEl.removeClass("pi-agent-change-review-modal");
    this.contentEl.empty();
  }

  getStats() {
    if (this.message.changeStats) return this.message.changeStats;

    const changedFiles = this.getChangedFiles();
    return {
      filesChanged: changedFiles.length,
      additions: changedFiles.reduce((sum, file) => sum + file.additions, 0),
      deletions: changedFiles.reduce((sum, file) => sum + file.deletions, 0)
    };
  }

  getChangedFiles() {
    if (this.message.changedFiles?.length) return this.message.changedFiles;

    const changedFiles = new Map();
    for (const summary of this.message.changeSummaries ?? []) {
      for (const file of summary.files) changedFiles.set(file.path, file);
    }

    return [...changedFiles.values()];
  }

  getUnifiedDiffs() {
    return (this.message.changeSummaries ?? [])
      .map((summary) => summary.unifiedDiff?.trim() ?? "")
      .filter(Boolean);
  }

  renderDiff(containerEl, diff) {
    const diffEl = containerEl.createDiv({ cls: "pi-agent-change-diff" });
    const lines = diff.split(/\r?\n/);

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const lineEl = diffEl.createDiv({ cls: this.getDiffLineClass(line) });
      lineEl.createSpan({ cls: "pi-agent-diff-line-number", text: String(index + 1) });
      lineEl.createSpan({ cls: "pi-agent-diff-line-text", text: line || " " });
    }
  }

  getDiffLineClass(line) {
    return line.startsWith("+++") || line.startsWith("---")
      ? "pi-agent-diff-line pi-agent-diff-line-meta"
      : line.startsWith("+")
        ? "pi-agent-diff-line pi-agent-diff-line-add"
        : line.startsWith("-")
          ? "pi-agent-diff-line pi-agent-diff-line-delete"
          : line.startsWith("@@")
            ? "pi-agent-diff-line pi-agent-diff-line-hunk"
            : "pi-agent-diff-line";
  }

  async copyDiff() {
    const diff = this.getUnifiedDiffs().join("\n\n");
    if (!diff) {
      new Notice("No unified diff available for this response.");
      return;
    }

    await navigator.clipboard.writeText(diff);
    new Notice("Copied agent diff.");
  }

  async revertDiff() {
    const fileSnapshots = this.getFileSnapshots();
    if (fileSnapshots.length === 0) {
      new Notice("No reversible file snapshot is available for this response.");
      return;
    }

    try {
      const revertedFiles = await revertFileSnapshots(this.plugin, fileSnapshots);
      if (revertedFiles.length === 0) {
        new Notice("No reversible changes found in this diff.");
        return;
      }

      new Notice(`Reverted ${revertedFiles.length} file${revertedFiles.length === 1 ? "" : "s"}.`);
      this.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Could not revert diff: ${message}`);
    }
  }

  getFileSnapshots() {
    return (this.message.changeSummaries ?? []).flatMap((summary) => summary.fileSnapshots ?? []);
  }
}

export async function revertFileSnapshots(plugin, fileSnapshots) {
  const revertedFiles = [];

  for (const snapshot of fileSnapshots) {
    if (snapshot.status === "added") {
      await deleteCreatedFile(plugin, snapshot.path, snapshot.after);
      revertedFiles.push(snapshot.path);
      continue;
    }

    if (snapshot.before !== undefined) {
      await restoreFile(plugin, snapshot.path, snapshot.before, snapshot.after, snapshot.status);
      revertedFiles.push(snapshot.path);
    }
  }

  return revertedFiles;
}

async function restoreFile(plugin, filePath, before, after, status) {
  const file = plugin.app.vault.getAbstractFileByPath(filePath);

  if (file instanceof TFile) {
    await plugin.app.vault.process(file, (content) => {
      if (after !== undefined && content !== after) throw new Error(`File changed since Pi edited it: ${filePath}`);
      if (after === undefined && status === "deleted") {
        throw new Error(`File was recreated after Pi deleted it: ${filePath}`);
      }

      return before;
    });
  } else {
    await plugin.app.vault.create(filePath, before);
  }
}

async function deleteCreatedFile(plugin, filePath, after) {
  const file = plugin.app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) return;

  if (after !== undefined) {
    const content = await plugin.app.vault.cachedRead(file);
    if (content !== after) throw new Error(`File changed since Pi created it: ${filePath}`);
  }

  await plugin.app.vault.delete(file);
}
