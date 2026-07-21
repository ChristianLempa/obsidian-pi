import { Notice, PluginSettingTab, Setting } from "obsidian";
import {
  CUSTOM_MODEL_VALUE,
  getReasoningOptions,
  getResolvedReasoning,
  getSelectedModelInfo,
  getToolModeOptions
} from "./settings.mjs";
import { normalizeSkillFolderList } from "../context/skills.mjs";
import { confirmWithModal } from "../ui/modals/confirm-modal.mjs";
import { ModelPickerModal, ThinkingPickerModal } from "../ui/modals/model-picker-modal.mjs";
import { ChatHistoryMigrationModal } from "../ui/modals/chat-history-migration-modal.mjs";
import { requestDesktopNotificationPermission } from "../ui/desktop-notifications.mjs";

export class PiAgentSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;

    const configDir = app.vault.configDir;
    if (configDir && !plugin.settings.ignoredFolders.includes(configDir)) {
      plugin.settings.ignoredFolders.unshift(configDir);
    }
  }

  // Obsidian 1.13.0+ uses these definitions for rendering and settings search.
  // Keeping display() below is the documented dual-support pattern for Obsidian 1.12.3.
  getSettingDefinitions() {
    return [
      this.getModelDefinition(),
      this.getThinkingDefinition(),
      this.getToolModeDefinition(),
      this.getDesktopNotificationsDefinition(),
      this.getCustomInstructionsDefinition(),
      {
        type: "group",
        heading: "Chat history",
        items: [this.getChatHistoryFolderDefinition(), this.getChatHistoryMigrationDefinition()]
      },
      {
        type: "group",
        heading: "Advanced",
        items: [this.getCustomModelDefinition()]
      },
      {
        type: "group",
        heading: "Pi CLI",
        items: [this.getPiExecutableDefinition(), this.getPiInstallationDefinition()]
      },
      {
        type: "group",
        heading: "Skills",
        items: [this.getDefaultSkillsDefinition(), this.getAdditionalSkillsDefinition()]
      },
      {
        type: "group",
        heading: "Context and file access",
        items: [this.getIgnoredFoldersDefinition()]
      }
    ];
  }

  // Obsidian 1.12.3 and earlier render settings imperatively. On newer versions,
  // callers in the plugin may still request a refresh through display(), so route
  // those calls to the declarative update API instead of replacing its DOM.
  display() {
    if (typeof this.update === "function") {
      this.update();
      return;
    }

    const { containerEl } = this;
    containerEl.empty();
    for (const definition of this.getSettingDefinitions()) {
      if (definition.type === "group") {
        new Setting(containerEl).setName(definition.heading).setHeading();
        for (const item of definition.items ?? []) this.renderLegacyDefinition(containerEl, item);
      } else {
        this.renderLegacyDefinition(containerEl, definition);
      }
    }
  }

  renderLegacyDefinition(containerEl, definition) {
    const setting = new Setting(containerEl).setName(definition.name);
    if (definition.desc) setting.setDesc(definition.desc);
    definition.render?.(setting);
  }

  getModelDefinition() {
    return {
      name: "Model",
      desc: "Provider/model from Pi's built-in and custom model registry. Use default to follow ~/.pi/agent/settings.json or .pi/settings.json.",
      render: (setting) =>
        setting
          .addButton((button) =>
            button
              .setButtonText(this.getModelButtonLabel())
              .setTooltip("Choose model")
              .onClick(async () => {
                const label = this.getModelButtonLabel();
                button.setButtonText("Loading…");
                button.setDisabled(true);
                try {
                  await this.plugin.ensureRuntimeModelState();
                  new ModelPickerModal(this.app, this.plugin.settings, async (value) => {
                    this.plugin.settings.model = value;
                    this.plugin.settings.reasoningEffort = "";
                    await this.plugin.saveSettings();
                    this.plugin.refreshOpenModelControls();
                  }).open();
                } catch (error) {
                  new Notice(error instanceof Error ? error.message : String(error));
                } finally {
                  button.setButtonText(label);
                  button.setDisabled(false);
                }
              })
          )
          .addButton((button) =>
            button
              .setButtonText("Refresh")
              .setTooltip("Refresh models from Pi")
              .onClick(async () => {
                button.setButtonText("Refreshing...");
                button.setDisabled(true);
                try {
                  await this.plugin.refreshModelCatalog(true);
                } catch (error) {
                  new Notice(error instanceof Error ? error.message : String(error));
                }
                this.display();
              })
          )
    };
  }

  getThinkingDefinition() {
    return {
      name: "Thinking level",
      desc: "Controls reasoning effort only. Values come from the selected model returned by Pi.",
      render: (setting) =>
        setting.addButton((button) =>
          button
            .setButtonText(this.getReasoningButtonLabel())
            .setTooltip("Choose thinking level")
            .onClick(async () => {
              const label = this.getReasoningButtonLabel();
              button.setButtonText("Loading…");
              button.setDisabled(true);
              try {
                await this.plugin.ensureRuntimeModelState();
                new ThinkingPickerModal(this.app, this.plugin.settings, async (value) => {
                  this.plugin.settings.reasoningEffort = value;
                  await this.plugin.saveSettings();
                  this.plugin.refreshOpenModelControls();
                }).open();
              } catch (error) {
                new Notice(error instanceof Error ? error.message : String(error));
              } finally {
                button.setButtonText(label);
                button.setDisabled(false);
              }
            })
        )
    };
  }

  getToolModeDefinition() {
    return {
      name: "Tool mode",
      desc: "Controls which Pi CLI tools are enabled. Tool modes are not an operating-system sandbox.",
      render: (setting) =>
        setting.addDropdown((dropdown) =>
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
                    "Pi tool modes are not an operating-system sandbox. Edit and full agent can modify vault/project files, and full agent can run shell commands.",
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
        )
    };
  }

  getDesktopNotificationsDefinition() {
    return {
      name: "Desktop completion notifications",
      desc: "Notify when an agent run finishes while Obsidian is unfocused.",
      render: (setting) =>
        setting.addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.desktopNotifications).onChange(async (value) => {
            if (value && !(await requestDesktopNotificationPermission())) {
              new Notice(
                "Desktop notifications are unavailable or not permitted. You can enable them in your operating-system notification settings."
              );
            }
            this.plugin.settings.desktopNotifications = value;
            await this.plugin.saveSettings();
          })
        )
    };
  }

  getCustomInstructionsDefinition() {
    return {
      name: "Custom instructions",
      desc: "Vault-specific instructions added to every Pi run.",
      render: (setting) =>
        setting.addTextArea((text) =>
          text
            .setPlaceholder("Prefer PARA folders. Keep project notes concise.")
            .setValue(this.plugin.settings.customInstructions)
            .onChange(async (value) => {
              this.plugin.settings.customInstructions = value;
              await this.plugin.saveSettings();
            })
        )
    };
  }

  getChatHistoryFolderDefinition() {
    return {
      name: "Chat history folder",
      desc: "Vault-relative folder containing one Markdown file with frontmatter per chat. Changing it moves the managed chat files after verification.",
      render: (setting) => {
        let pendingFolder = this.plugin.settings.chatHistoryFolder;
        setting
          .addText((text) =>
            text
              .setPlaceholder("Chat history")
              .setValue(pendingFolder)
              .onChange((value) => {
                pendingFolder = value;
              })
          )
          .addButton((button) =>
            button
              .setButtonText(this.plugin.useExternalChatHistory ? "Move chats" : "Use folder")
              .onClick(async () => {
                button.setDisabled(true);
                try {
                  await this.plugin.changeChatHistoryFolder(pendingFolder);
                  new Notice("Chat history folder updated.");
                } catch (error) {
                  new Notice(error instanceof Error ? error.message : String(error));
                } finally {
                  button.setDisabled(false);
                }
              })
          );
      }
    };
  }

  getChatHistoryMigrationDefinition() {
    const migrationNeeded = this.plugin.needsChatHistoryMigration === true;
    return {
      name: "Existing chat migration",
      desc: migrationNeeded
        ? "Existing chats are still in plugin data. Migrate them into individual Markdown files when ready."
        : "Chat history uses individual Markdown files with frontmatter.",
      render: (setting) =>
        setting.addButton((button) =>
          button
            .setButtonText(migrationNeeded ? "Migrate existing chats" : "Migrated")
            .setDisabled(!migrationNeeded)
            .onClick(() => new ChatHistoryMigrationModal(this.plugin).open())
        )
    };
  }

  getCustomModelDefinition() {
    return {
      name: "Custom model slug",
      desc: "Fallback for a provider/model slug that Pi does not expose in its catalog. Custom slugs are only selectable here.",
      render: (setting) => {
        let useCustomButton;
        setting
          .addText((text) =>
            text
              .setPlaceholder("Provider/model")
              .setValue(this.plugin.settings.customModel)
              .onChange(async (value) => {
                this.plugin.settings.customModel = value.trim();
                useCustomButton?.setDisabled(!this.plugin.settings.customModel);
                await this.plugin.saveSettings();
              })
          )
          .addButton((button) => {
            useCustomButton = button;
            button
              .setButtonText(
                this.plugin.settings.model === CUSTOM_MODEL_VALUE ? "Using custom" : "Use custom"
              )
              .setDisabled(!this.plugin.settings.customModel)
              .onClick(async () => {
                this.plugin.settings.model = CUSTOM_MODEL_VALUE;
                this.plugin.settings.reasoningEffort = "";
                await this.plugin.saveSettings();
                this.plugin.refreshOpenModelControls();
              });
          });
      }
    };
  }

  getPiExecutableDefinition() {
    return {
      name: "Pi executable path",
      desc: "Optional path to the Pi CLI. Leave empty to auto-detect common install locations. Supports ~ and environment variables like ${USER}.",
      render: (setting) =>
        setting.addText((text) =>
          text
            .setPlaceholder("/etc/profiles/per-user/${USER}/bin/pi")
            .setValue(this.plugin.settings.piExecutablePath)
            .onChange(async (value) => {
              this.plugin.settings.piExecutablePath = value.trim();
              await this.plugin.saveSettings();
            })
        )
    };
  }

  getPiInstallationDefinition() {
    return {
      name: "Check Pi installation",
      desc: "Verify that Obsidian can run the Pi CLI from its current environment.",
      render: (setting) =>
        setting.addButton((button) =>
          button.setButtonText("Check").onClick(() => {
            this.plugin.checkPiInstallation(true);
          })
        )
    };
  }

  getDefaultSkillsDefinition() {
    return {
      name: "Include default Pi skills",
      desc: "Load skills discovered by Pi from global and vault/project skill locations. Turn this off to use only the additional skill folders below.",
      render: (setting) =>
        setting.addToggle((toggle) =>
          toggle
            .setValue(this.plugin.settings.includeDefaultSkills !== false)
            .onChange(async (value) => {
              this.plugin.settings.includeDefaultSkills = value;
              await this.plugin.saveSettings();
            })
        )
    };
  }

  getAdditionalSkillsDefinition() {
    return {
      name: "Additional skill folders",
      desc: "One trusted skill file or folder per line. Supports absolute and vault-relative paths.",
      render: (setting) =>
        setting.addTextArea((text) =>
          text
            .setPlaceholder([".pi/skills", "/path/to/my-skills"].join("\n"))
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
        )
    };
  }

  getIgnoredFoldersDefinition() {
    return {
      name: "Ignored folders/directories",
      desc: "Comma-separated folder prefixes that Pi pre-attached context and retrieval should ignore.",
      render: (setting) =>
        setting.addTextArea((text) =>
          text
            .setPlaceholder([this.app.vault.configDir, ".git", "node_modules"].join(", "))
            .setValue(this.plugin.settings.ignoredFolders.join(", "))
            .onChange(async (value) => {
              this.plugin.settings.ignoredFolders = value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              await this.plugin.saveSettings();
            })
        )
    };
  }

  getModelButtonLabel() {
    if (this.plugin.settings.model === CUSTOM_MODEL_VALUE) {
      return this.plugin.settings.customModel || "Custom model";
    }
    const selected = getSelectedModelInfo(this.plugin.settings);
    if (selected) return selected.displayName;
    const effective = this.plugin.settings.availableModels.find(
      (model) => model.slug === this.plugin.settings.effectiveModel
    );
    return effective?.displayName || this.plugin.settings.effectiveModel || "Loading model…";
  }

  getReasoningButtonLabel() {
    const value = this.getReasoningDropdownValue();
    if (value) return this.getReasoningOptions()[value] || value;
    const resolved = getResolvedReasoning(this.plugin.settings);
    return resolved === "pi-default"
      ? "Loading thinking…"
      : resolved === "xhigh"
        ? "XHigh"
        : resolved.charAt(0).toUpperCase() + resolved.slice(1);
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
