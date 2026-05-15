import { Menu, Notice } from "obsidian";
import { ChangeReviewModal } from "./modals/change-review-modal.mjs";

export class MessageActions {
  constructor(plugin, callbacks) {
    this.plugin = plugin;
    this.callbacks = callbacks;
  }

  showMessageMenu(event, message, messageIndex) {
    const menu = new Menu();

    if (message.role === "user") {
      menu.addItem((item) =>
        item
          .setTitle("Edit and resend")
          .setIcon("pencil")
          .onClick(() => {
            const input = this.callbacks.getInput();
            if (input) {
              input.value = message.content;
              input.focus();
            }
          })
      );
      menu.addItem((item) =>
        item
          .setTitle("Search vault for this")
          .setIcon("search")
          .onClick(() =>
            this.callbacks.runPrompt(`Search the vault for notes related to:\n\n${message.content}`)
          )
      );
    } else {
      if (this.messageHasChanges(message)) {
        menu.addItem((item) =>
          item
            .setTitle("Review changes")
            .setIcon("git-compare")
            .onClick(() => new ChangeReviewModal(this.plugin, message).open())
        );
      }

      if (message.changedFiles?.length) {
        menu.addItem((item) =>
          item
            .setTitle("Open changed files")
            .setIcon("folder-open")
            .onClick(() => {
              this.callbacks.openChangedFiles(message.changedFiles ?? []);
            })
        );
        menu.addSeparator();
      }

      menu.addItem((item) =>
        item
          .setTitle("Copy response")
          .setIcon("copy")
          .onClick(() => this.copyResponse(message.content))
      );
      menu.addItem((item) =>
        item
          .setTitle("Insert into current note")
          .setIcon("file-plus")
          .onClick(() => this.callbacks.insertIntoCurrentNote(message.content))
      );
      menu.addItem((item) =>
        item
          .setTitle("Create note from response")
          .setIcon("file-text")
          .onClick(() => this.callbacks.createNoteFromResponse(message.content))
      );
      menu.addItem((item) =>
        item
          .setTitle("Open cited notes")
          .setIcon("links-coming-in")
          .setDisabled(this.callbacks.extractVaultLinks(message.content).length === 0)
          .onClick(() => this.callbacks.openCitedNotes(message.content))
      );
      menu.addSeparator();
      menu.addItem((item) =>
        item
          .setTitle("Regenerate")
          .setIcon("refresh-cw")
          .setDisabled(!this.callbacks.getPreviousUserPrompt(messageIndex))
          .onClick(() => {
            const prompt = this.callbacks.getPreviousUserPrompt(messageIndex);
            if (prompt) this.callbacks.runPrompt(prompt);
          })
      );
    }

    menu.showAtMouseEvent(event);
  }

  async copyResponse(content) {
    await navigator.clipboard.writeText(content);
    new Notice("Copied response.");
  }

  getMessageChangeStats(message) {
    if (message.changeStats) {
      const { filesChanged, additions, deletions } = message.changeStats;
      if (filesChanged > 0 || additions > 0 || deletions > 0) return message.changeStats;
    }

    const diffStats = getDiffStats(message.content);
    return diffStats
      ? { filesChanged: 0, additions: diffStats.additions, deletions: diffStats.deletions }
      : undefined;
  }

  messageHasChanges(message) {
    return !!(
      message.changeSummaries?.length ||
      message.changedFiles?.length ||
      (message.changeStats &&
        (message.changeStats.filesChanged > 0 ||
          message.changeStats.additions > 0 ||
          message.changeStats.deletions > 0))
    );
  }
}

export function getDiffStats(content) {
  let additions = 0;
  let deletions = 0;

  for (const match of content.matchAll(/```(?:diff|patch)?\s*\n([\s\S]*?)```/g)) {
    for (const line of match[1].split(/\r?\n/)) {
      if (!line.startsWith("+++") && !line.startsWith("---")) {
        if (line.startsWith("+")) additions++;
        if (line.startsWith("-")) deletions++;
      }
    }
  }

  return additions > 0 || deletions > 0 ? { additions, deletions } : undefined;
}
