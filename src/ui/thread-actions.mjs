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

  forkChat() {
    this.plugin.forkCurrentThread()
      ? (this.callbacks.resetThreadUiState?.(),
        this.callbacks.renderThreadTitle(),
        this.callbacks.renderMessages(),
        this.callbacks.renderToolBadges?.())
      : new Notice("Nothing to fork yet.");
  }
}
