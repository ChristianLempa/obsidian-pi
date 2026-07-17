import { Modal } from "obsidian";

export function chooseThreadDeletion(app, thread) {
  return new Promise((resolve) => new DeleteThreadModal(app, thread, resolve).open());
}

export function getThreadDeletionChoices(thread) {
  return thread?.piSessionId
    ? ["cancel", "chat", "both"]
    : ["cancel", "chat"];
}

export class DeleteThreadModal extends Modal {
  constructor(app, thread, resolve) {
    super(app);
    this.thread = thread;
    this.resolve = resolve;
    this.choice = "cancel";
  }

  onOpen() {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "Delete chat?" });
    this.contentEl.createEl("p", {
      text: this.thread.piSessionId
        ? `Choose whether to keep or delete the local Pi session for “${this.thread.title}”.`
        : `Delete “${this.thread.title}” from plugin history?`
    });

    const actions = this.contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    const labels = {
      cancel: "Cancel",
      chat: "Delete chat only",
      both: "Delete chat and local Pi session"
    };
    for (const choice of getThreadDeletionChoices(this.thread))
      this.addButton(actions, labels[choice], choice);
  }

  addButton(container, label, choice) {
    const button = container.createEl("button", { text: label });
    if (choice === "both") button.addClass("mod-warning");
    button.addEventListener("click", () => {
      this.choice = choice;
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
    this.resolve(this.choice);
  }
}
