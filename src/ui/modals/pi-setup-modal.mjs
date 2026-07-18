import { Modal, Notice, Setting } from "obsidian";

const INSTALL_COMMAND = "npm install -g @earendil-works/pi-coding-agent";

export class PiSetupModal extends Modal {
  constructor(plugin, health) {
    super(plugin.app);
    this.plugin = plugin;
    this.health = health;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    new Setting(contentEl).setName("Set up Pi CLI").setHeading();
    contentEl.createEl("p", {
      text: this.health?.message ?? "Pi Agent needs the Pi CLI before it can run prompts."
    });
    const needsNode = this.health?.kind === "node-missing";
    contentEl.createEl("p", {
      text: needsNode
        ? "Install Node.js or make your Node version manager available to GUI apps, then fully restart Obsidian. After that, run pi --version in a terminal to confirm Pi still works."
        : "Install Pi in a terminal, authenticate it if needed, then restart Obsidian so it can pick up your updated PATH."
    });
    const commandText = needsNode
      ? "node --version\npi --version"
      : `${INSTALL_COMMAND}\npi --version`;
    contentEl.createEl("pre", { text: commandText });
    contentEl.createEl("p", {
      text: "Start in chat or review mode. Only enable edit or full agent in vaults you are comfortable letting Pi modify."
    });

    const actionsEl = contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    actionsEl
      .createEl("button", { text: needsNode ? "Copy diagnostic commands" : "Copy install command" })
      .addEventListener("click", async () => {
        await navigator.clipboard.writeText(needsNode ? commandText : INSTALL_COMMAND);
        new Notice(needsNode ? "Copied diagnostic commands." : "Copied Pi install command.");
      });
    actionsEl
      .createEl("button", { text: "Do not show again" })
      .addEventListener("click", async () => {
        this.plugin.settings.dismissedPiSetup = true;
        await this.plugin.saveSettings();
        this.close();
      });
    actionsEl
      .createEl("button", { text: "Close", cls: "mod-cta" })
      .addEventListener("click", () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}
