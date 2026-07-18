import { Notice } from "obsidian";

export class ThreadActions {
  constructor(plugin, callbacks) {
    this.plugin = plugin;
    this.callbacks = callbacks;
  }

  startNewChat() {
    this.plugin.startNewThread();
    this.callbacks.resetThreadUiState?.();
    this.callbacks.renderThreadTitle();
    this.callbacks.renderMessages();
    this.callbacks.renderToolBadges?.();
  }

  async forkChat() {
    try {
      const fork = await this.plugin.forkCurrentThread();
      if (fork) {
        this.callbacks.resetThreadUiState?.();
        this.callbacks.renderThreadTitle();
        this.callbacks.renderMessages();
        this.callbacks.renderToolBadges?.();
      } else {
        new Notice("Nothing to fork yet.");
      }
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }
}
