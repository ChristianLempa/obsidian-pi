import { PluginSettingTab, Setting } from "obsidian";
import {
  CUSTOM_MODEL_VALUE,
  getModelOptions,
  getReasoningOptions,
  getToolModeOptions
} from "./settings.mjs";
import { normalizeSkillFolderList } from "../context/skills.mjs";
import { confirmWithModal } from "../ui/modals/confirm-modal.mjs";

export class PiAgentSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Model")
      .setDesc(
        "Provider/model from Pi's built-in and custom model registry. Use default to follow ~/.pi/agent/settings.json or .pi/settings.json."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(getModelOptions(this.plugin.settings))
          .setValue(this.getModelDropdownValue())
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            this.plugin.settings.reasoningEffort = "";
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Refresh")
          .setTooltip("Refresh models from Pi")
          .onClick(async () => {
            button.setButtonText("Refreshing...");
            button.setDisabled(true);
            await this.plugin.refreshModelCatalog(true);
            this.display();
          })
      );

    if (this.plugin.settings.model === CUSTOM_MODEL_VALUE) {
      new Setting(containerEl)
        .setName("Custom model ID")
        .setDesc("Provider/model ID, for example anthropic/claude-sonnet-4-5.")
        .addText((text) =>
          text
            .setPlaceholder("e.g. anthropic/claude-sonnet-4-5")
            .setValue(this.plugin.settings.customModel)
            .onChange(async (value) => {
              this.plugin.settings.customModel = value.trim();
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Thinking level")
      .setDesc(
        "Controls reasoning effort only. Values come from the selected model returned by Pi."
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(this.getReasoningOptions())
          .setValue(this.getReasoningDropdownValue())
          .onChange(async (value) => {
            this.plugin.settings.reasoningEffort = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Tool mode")
      .setDesc("Controls which Pi CLI tools are enabled. Tool modes are not an OS-level sandbox.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(getToolModeOptions())
          .setValue(this.plugin.settings.sandboxMode)
          .onChange(async (value) => {
            if (
              (value === "edit" || value === "full-agent" || value === "workspace-write") &&
              !this.plugin.settings.acknowledgedToolRisk &&
              !(await confirmWithModal(this.app, {
                title: "Enable write tools?",
                message:
                  "Pi tool modes are not an OS-level sandbox. Edit and Full agent can modify vault/project files, and Full agent can run shell commands.",
                confirmText: "Enable tools",
                warning: true
              }))
            ) {
              this.display();
              return;
            }

            this.plugin.settings.sandboxMode = value;
            if (value === "edit" || value === "full-agent" || value === "workspace-write") {
              this.plugin.settings.acknowledgedToolRisk = true;
            }
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Custom instructions")
      .setDesc("Vault-specific instructions added to every Pi run.")
      .addTextArea((text) =>
        text
          .setPlaceholder("Prefer PARA folders. Keep project notes concise.")
          .setValue(this.plugin.settings.customInstructions)
          .onChange(async (value) => {
            this.plugin.settings.customInstructions = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Pi CLI").setHeading();
    new Setting(containerEl)
      .setName("Pi executable path")
      .setDesc(
        "Optional path to the Pi CLI. Leave empty to auto-detect common install locations. Supports ~ and environment variables like ${USER}."
      )
      .addText((text) =>
        text
          .setPlaceholder("/etc/profiles/per-user/${USER}/bin/pi")
          .setValue(this.plugin.settings.piExecutablePath)
          .onChange(async (value) => {
            this.plugin.settings.piExecutablePath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Check Pi installation")
      .setDesc("Verify that Obsidian can run the Pi CLI from its current environment.")
      .addButton((button) =>
        button.setButtonText("Check").onClick(() => {
          this.plugin.checkPiInstallation(true);
        })
      );

    new Setting(containerEl).setName("Skills").setHeading();
    new Setting(containerEl)
      .setName("Include default Pi skills")
      .setDesc(
        "Load skills discovered by Pi from global and vault/project skill locations. Turn this off to use only the additional skill folders below."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeDefaultSkills !== false)
          .onChange(async (value) => {
            this.plugin.settings.includeDefaultSkills = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Additional skill folders")
      .setDesc(
        "One trusted skill file or folder per line. Supports absolute and vault-relative paths."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder(".pi/skills\n/path/to/my-skills")
          .setValue(
            normalizeSkillFolderList(this.plugin.settings.additionalSkillFolders).join("\n")
          )
          .onChange(async (value) => {
            this.plugin.settings.additionalSkillFolders = value
              .split(/\r?\n/)
              .map((item) => item.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl).setName("Context and file access").setHeading();
    new Setting(containerEl)
      .setName("Ignored folders/directories")
      .setDesc(
        "Comma-separated folder prefixes that Pi pre-attached context, retrieval, and change review should ignore."
      )
      .addTextArea((text) =>
        text
          .setPlaceholder(".obsidian, .git, node_modules")
          .setValue(this.plugin.settings.ignoredFolders.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.ignoredFolders = value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          })
      );
  }

  getModelDropdownValue() {
    const { model } = this.plugin.settings;
    return Object.prototype.hasOwnProperty.call(getModelOptions(this.plugin.settings), model)
      ? model
      : CUSTOM_MODEL_VALUE;
  }

  getReasoningOptions() {
    return getReasoningOptions(this.plugin.settings);
  }

  getReasoningDropdownValue() {
    const options = this.getReasoningOptions();
    const value = this.plugin.settings.reasoningEffort;
    return Object.prototype.hasOwnProperty.call(options, value) ? value : "";
  }
}
