import { Modal, Notice, Setting, TFile } from "obsidian";
import { previewFrontmatterPatch } from "../../shared/frontmatter.mjs";

export class ApprovalModal extends Modal {
  constructor(plugin, change, onDone) {
    super(plugin.app);
    this.change = change;
    this.onDone = onDone;
    this.settled = false;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("pi-agent-approval");
    new Setting(contentEl).setName("Approve vault change").setHeading();
    contentEl.createEl("p", { text: `${this.change.path} - ${this.change.reason}` });

    const diffEl = contentEl.createEl("div", { cls: "pi-agent-diff" });
    diffEl.createEl("h3", { text: "Before" });
    diffEl.createEl("pre", { text: this.change.before || "(new file)" });
    diffEl.createEl("h3", { text: "After" });
    diffEl.createEl("pre", { text: this.change.after });

    const actionsEl = contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    actionsEl.createEl("button", { text: "Reject" }).addEventListener("click", () => {
      this.finish();
      this.close();
    });
    actionsEl
      .createEl("button", { text: "Apply change", cls: "mod-cta" })
      .addEventListener("click", async () => {
        await this.applyChange();
        this.finish();
        this.close();
      });
  }

  onClose() {
    this.finish();
    this.contentEl.empty();
  }

  async applyChange() {
    const file = this.app.vault.getAbstractFileByPath(this.change.path);

    if (file instanceof TFile) {
      await this.app.vault.process(file, (content) => {
        if (this.change.before !== undefined && content !== this.change.before) {
          throw new Error("File changed since Pi prepared this change.");
        }

        return this.change.frontmatterPatch
          ? previewFrontmatterPatch(content, this.change.frontmatterPatch)
          : this.change.after;
      });
    } else {
      await this.app.vault.create(this.change.path, this.change.after);
    }

    new Notice(`Applied Pi change to ${this.change.path}`);
  }

  finish() {
    if (this.settled) return;

    this.settled = true;
    this.onDone();
  }
}
