import { Menu, setIcon } from "obsidian";
import {
  CUSTOM_MODEL_VALUE,
  getResolvedReasoning,
  getSelectedModelInfo,
  getToolModeOptions
} from "../plugin/settings.mjs";
import { confirmWithModal } from "./modals/confirm-modal.mjs";
import { ModelPickerModal, ThinkingPickerModal } from "./modals/model-picker-modal.mjs";

export class RunSettingsControls {
  constructor(plugin) {
    this.plugin = plugin;
  }

  render(containerEl) {
    this.row = containerEl.createDiv({ cls: "pi-agent-run-settings" });
    this.populate(this.row);
  }

  refresh() {
    if (!this.row) return;

    this.row.empty();
    this.populate(this.row);
  }

  populate(containerEl) {
    this.addPickerSetting(containerEl, "Model", "sparkles", this.getModelLabel(), () =>
      new ModelPickerModal(this.plugin.app, this.plugin.settings, async (value) => {
        this.plugin.settings.model = value;
        this.plugin.settings.reasoningEffort = "";
        await this.plugin.saveSettings();
        this.refresh();
      }).open()
    );

    this.addPickerSetting(containerEl, "Think", "brain", this.formatDefaultReasoningLabel(), () =>
      new ThinkingPickerModal(this.plugin.app, this.plugin.settings, async (value) => {
        this.plugin.settings.reasoningEffort = value;
        await this.plugin.saveSettings();
        this.refresh();
      }).open()
    );

    this.addRunSetting(
      containerEl,
      "Tools",
      this.getRunSettingIcon("Tools", this.plugin.settings.sandboxMode),
      getToolModeOptions(),
      this.plugin.settings.sandboxMode,
      async (value) => {
        if (
          (value === "edit" || value === "full-agent" || value === "workspace-write") &&
          !this.plugin.settings.acknowledgedToolRisk &&
          !(await confirmWithModal(this.plugin.app, {
            title: "Enable write tools?",
            message:
              "Pi tool modes are not an OS-level sandbox. Edit and Full agent can modify vault/project files, and Full agent can run shell commands.",
            confirmText: "Enable tools",
            warning: true
          }))
        ) {
          this.refresh();
          return;
        }

        this.plugin.settings.sandboxMode = value;
        if (value === "edit" || value === "full-agent" || value === "workspace-write") {
          this.plugin.settings.acknowledgedToolRisk = true;
        }
        await this.plugin.saveSettings();
      }
    );
  }

  addPickerSetting(containerEl, name, icon, label, onClick) {
    const buttonEl = containerEl.createEl("button", {
      cls: "clickable-icon pi-agent-run-setting",
      attr: { "aria-label": `${name}: ${label}`, title: `${name}: ${label}` }
    });
    setIcon(buttonEl, icon);
    buttonEl.createSpan({ cls: "pi-agent-control-label", text: label });
    buttonEl.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();
    });
  }

  addRunSetting(containerEl, name, icon, options, value, onChange) {
    const selectedValue =
      Object.prototype.hasOwnProperty.call(options, value) || value ? value : "";
    const selectedLabel = options[selectedValue] ?? value ?? "Default";
    const displayLabel = this.formatRunSettingDisplayLabel(name, selectedValue, selectedLabel);
    const buttonEl = containerEl.createEl("button", {
      cls: `clickable-icon pi-agent-run-setting ${this.getRunSettingClass(name, selectedValue)}`,
      attr: { "aria-label": `${name}: ${selectedLabel}`, title: `${name}: ${selectedLabel}` }
    });

    setIcon(buttonEl, icon);
    buttonEl.createSpan({ cls: "pi-agent-control-label", text: displayLabel });
    buttonEl.addEventListener("click", async (event) => {
      event.preventDefault();
      const menu = new Menu();

      for (const [optionValue, optionLabel] of Object.entries(options)) {
        menu.addItem((item) => {
          item.setTitle(optionLabel).onClick(async () => {
            await onChange(optionValue);
            this.refresh();
          });
          if (optionValue === selectedValue) item.setIcon("check");
        });
      }

      menu.showAtMouseEvent(event);
    });
  }

  formatRunSettingDisplayLabel(name, value, label) {
    return name === "Model"
      ? value === CUSTOM_MODEL_VALUE
        ? this.plugin.settings.customModel.trim() || "Custom"
        : value
          ? label.split(" - ")[0].replace(/^GPT-/i, "GPT-")
          : this.formatDefaultModelLabel()
      : name === "Think"
        ? value
          ? label.split(" - ")[0].replace(/^XHigh$/i, "XHigh")
          : this.formatDefaultReasoningLabel()
        : name === "Tools"
          ? value === "chat"
            ? "Chat"
            : value === "read-only"
              ? "Review"
              : value === "full-agent"
                ? "Full"
                : value === "edit" || value === "workspace-write"
                  ? "Edit"
                  : label
          : label;
  }

  getModelLabel() {
    if (this.plugin.settings.model === CUSTOM_MODEL_VALUE) {
      return this.plugin.settings.customModel.trim() || "Custom";
    }
    const model = getSelectedModelInfo(this.plugin.settings);
    if (model) return model.displayName;
    const effective = this.plugin.settings.availableModels.find(
      (candidate) => candidate.slug === this.plugin.settings.effectiveModel
    );
    return effective?.displayName || this.formatDefaultModelLabel();
  }

  formatDefaultModelLabel() {
    const model = this.plugin.settings.effectiveModel;
    return model ? model.split("/").pop() || model : "Default";
  }

  formatDefaultReasoningLabel() {
    return this.formatReasoningLabel(getResolvedReasoning(this.plugin.settings));
  }

  formatReasoningLabel(reasoning) {
    return reasoning === "pi-default" || reasoning === "cli-default"
      ? "Pi default"
      : reasoning === "xhigh"
        ? "XHigh"
        : reasoning.charAt(0).toUpperCase() + reasoning.slice(1);
  }

  getRunSettingIcon(name, value) {
    return name === "Tools"
      ? value === "chat"
        ? "message-square"
        : value === "full-agent"
          ? "terminal"
          : value === "edit" || value === "workspace-write"
            ? "pencil-line"
            : "eye"
      : "";
  }

  getRunSettingClass(name, value) {
    return name === "Tools"
      ? value === "full-agent"
        ? "pi-agent-run-setting-mode-full"
        : value === "edit" || value === "workspace-write"
          ? "pi-agent-run-setting-mode-write"
          : "pi-agent-run-setting-mode-read"
      : "";
  }
}
