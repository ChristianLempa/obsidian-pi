import { Modal, Notice, Setting } from "obsidian";

export class ChatHistoryMigrationModal extends Modal {
  constructor(plugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.folder = plugin.settings.chatHistoryFolder;
    this.resolved = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new Setting(contentEl).setName("Migrate existing chats?").setHeading();
    contentEl.createEl("p", {
      text: "The plugin can move existing chat transcripts out of plugin data and store every chat as a separate Markdown file with frontmatter in your vault."
    });
    contentEl.createEl("p", {
      text: "The migration keeps a recovery backup and does not modify or delete Pi's runtime session files."
    });

    new Setting(contentEl)
      .setName("History folder")
      .setDesc("Vault-relative folder. You can move it later in agent settings.")
      .addText((text) =>
        text.setValue(this.folder).onChange((value) => {
          this.folder = value;
        })
      );

    const actions = contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    const laterButton = actions.createEl("button", { text: "Not now" });
    const migrateButton = actions.createEl("button", {
      text: "Migrate existing chats",
      cls: "mod-cta"
    });

    laterButton.addEventListener("click", async () => {
      this.resolved = true;
      await this.plugin.deferChatHistoryMigration();
      this.close();
    });
    migrateButton.addEventListener("click", async () => {
      laterButton.disabled = true;
      migrateButton.disabled = true;
      migrateButton.setText("Migrating…");
      try {
        await this.plugin.migrateChatHistory(this.folder);
        this.resolved = true;
        new Notice("Existing chats were migrated.");
        this.close();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
        laterButton.disabled = false;
        migrateButton.disabled = false;
        migrateButton.setText("Migrate existing chats");
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
