import { Modal } from "obsidian";

export function chooseBulkThreadDeletion(app, plan) {
  return new Promise((resolve) => new DeleteThreadsModal(app, plan, resolve).open());
}

export function getBulkThreadDeletionChoices(plan) {
  return [
    {
      id: "except-favorites",
      label: `Delete all except favorites (${plan.exceptFavorites.deleteCount})`,
      disabled: plan.exceptFavorites.deleteCount === 0
    },
    {
      id: "all",
      label: `Delete all chats (${plan.all.deleteCount})`,
      disabled: plan.all.deleteCount === 0
    }
  ];
}

export class DeleteThreadsModal extends Modal {
  constructor(app, plan, resolve) {
    super(app);
    this.plan = plan;
    this.resolve = resolve;
    this.choice = "cancel";
  }

  onOpen() {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "Delete chats?" });
    this.contentEl.createEl("p", {
      text: "Choose which chat history to delete. Local Pi session files will be kept."
    });

    if (this.plan.favoriteCount > 0) {
      this.contentEl.createEl("p", {
        text: `${this.plan.favoriteCount} favorite chat${this.plan.favoriteCount === 1 ? " is" : "s are"} protected by the first option.`
      });
    }
    if (this.plan.all.skippedCount > 0) {
      this.contentEl.createEl("p", {
        text: `${this.plan.all.skippedCount} active chat${this.plan.all.skippedCount === 1 ? " cannot" : "s cannot"} be deleted until the agent run finishes.`
      });
    }

    const actions = this.contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    this.addButton(actions, "Cancel", "cancel");
    for (const choice of getBulkThreadDeletionChoices(this.plan))
      this.addButton(actions, choice.label, choice.id, choice.disabled);
  }

  addButton(container, label, choice, disabled = false) {
    const button = container.createEl("button", {
      text: label,
      ...(disabled ? { attr: { disabled: "" } } : {})
    });
    if (choice !== "cancel") button.addClass("mod-warning");
    button.addEventListener("click", () => {
      if (disabled) return;
      this.choice = choice;
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
    this.resolve(this.choice);
  }
}
