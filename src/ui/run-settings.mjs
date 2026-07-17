import { setIcon } from "obsidian";
import {
  CUSTOM_MODEL_VALUE,
  getResolvedReasoning,
  getSelectedModelInfo
} from "../plugin/settings.mjs";
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
}
