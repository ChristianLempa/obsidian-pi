import { Modal, Setting } from "obsidian";

export function confirmWithModal(app, options) {
  return new Promise((resolve) => {
    new ConfirmModal(app, options, resolve).open();
  });
}

class ConfirmModal extends Modal {
  constructor(app, options, resolve) {
    super(app);
    this.options = options;
    this.resolve = resolve;
    this.settled = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new Setting(contentEl).setName(this.options.title).setHeading();
    contentEl.createEl("p", { text: this.options.message });

    const actionsEl = contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    actionsEl
      .createEl("button", { text: this.options.cancelText ?? "Cancel" })
      .addEventListener("click", () => {
        this.finish(false);
        this.close();
      });
    actionsEl
      .createEl("button", {
        text: this.options.confirmText ?? "Continue",
        cls: this.options.warning ? "mod-warning" : "mod-cta"
      })
      .addEventListener("click", () => {
        this.finish(true);
        this.close();
      });
  }

  onClose() {
    this.finish(false);
    this.contentEl.empty();
  }

  finish(value) {
    if (this.settled) return;

    this.settled = true;
    this.resolve(value);
  }
}
