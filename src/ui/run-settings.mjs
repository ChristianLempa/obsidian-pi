import { Notice, setIcon } from "obsidian";
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
    this.addPickerSetting(containerEl, "Model", "sparkles", this.getModelLabel(), async () => {
      await this.openPicker(ModelPickerModal, async (value) => {
        this.plugin.settings.model = value;
        this.plugin.settings.reasoningEffort = "";
        await this.plugin.saveSettings();
        this.plugin.refreshOpenModelControls();
      });
    });

    this.addPickerSetting(
      containerEl,
      "Think",
      "brain",
      this.formatDefaultReasoningLabel(),
      async () => {
        await this.openPicker(ThinkingPickerModal, async (value) => {
          this.plugin.settings.reasoningEffort = value;
          await this.plugin.saveSettings();
          this.plugin.refreshOpenModelControls();
        });
      }
    );
  }

  addPickerSetting(containerEl, name, icon, label, onClick) {
    const buttonEl = containerEl.createEl("button", {
      cls: "clickable-icon pi-agent-run-setting",
      attr: { "aria-label": `${name}: ${label}`, title: `${name}: ${label}` }
    });
    setIcon(buttonEl, icon);
    const labelEl = buttonEl.createSpan({ cls: "pi-agent-control-label", text: label });
    buttonEl.addEventListener("click", async (event) => {
      event.preventDefault();
      buttonEl.disabled = true;
      labelEl.setText("Loading…");
      try {
        await onClick();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
      } finally {
        if (buttonEl.isConnected) {
          buttonEl.disabled = false;
          labelEl.setText(label);
        }
      }
    });
  }

  async openPicker(Picker, onChoose) {
    await this.plugin.ensureRuntimeModelState();
    new Picker(this.plugin.app, this.plugin.settings, onChoose).open();
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
    return effective
      ? `Pi default — ${effective.displayName}`
      : this.plugin.settings.effectiveModel
        ? `Pi default — ${this.plugin.settings.effectiveModel}`
        : "Loading Pi default…";
  }

  formatDefaultReasoningLabel() {
    const reasoning = getResolvedReasoning(this.plugin.settings);
    return this.plugin.settings.reasoningEffort
      ? this.formatReasoningLabel(reasoning)
      : this.plugin.settings.model === CUSTOM_MODEL_VALUE
        ? "Pi/model default"
        : reasoning === "pi-default"
          ? "Loading Pi default…"
          : `Pi default — ${this.formatReasoningLabel(reasoning)}`;
  }

  formatReasoningLabel(reasoning) {
    return reasoning === "xhigh" ? "XHigh" : reasoning.charAt(0).toUpperCase() + reasoning.slice(1);
  }
}
