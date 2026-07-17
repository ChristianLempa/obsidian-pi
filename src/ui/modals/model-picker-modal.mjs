import { FuzzySuggestModal, Notice, SuggestModal } from "obsidian";
import { getReasoningOptions, getResolvedReasoning } from "../../plugin/settings.mjs";
import {
  buildModelPickerItems,
  getModelPickerPrimary,
  getModelPickerSecondary
} from "../model-picker.mjs";

export class ModelPickerModal extends FuzzySuggestModal {
  constructor(app, settings, onChoose) {
    super(app);
    this.settings = settings;
    this.onChoose = onChoose;
    this.limit = 1000;
    this.emptyStateText = "No Pi models match this search.";
    this.setPlaceholder("Search models by name, provider, slug, or capability…");
    this.setInstructions([
      { command: "↑↓", purpose: "navigate" },
      { command: "↵", purpose: "select" },
      { command: "esc", purpose: "close" }
    ]);
  }

  getItems() {
    return buildModelPickerItems(this.settings);
  }

  getItemText(item) {
    return `${getModelPickerPrimary(item)} ${getModelPickerSecondary(item)}`;
  }

  renderSuggestion(match, el) {
    const item = match.item;
    el.createDiv({ cls: "pi-agent-suggestion-title", text: getModelPickerPrimary(item) });
    el.createDiv({ cls: "pi-agent-suggestion-detail", text: getModelPickerSecondary(item) });
    el.setAttribute(
      "aria-label",
      `${getModelPickerPrimary(item)}, ${getModelPickerSecondary(item)}${
        this.settings.model === item.value ? ", selected" : ""
      }`
    );
  }

  onChooseItem(item) {
    Promise.resolve(this.onChoose(item.value)).catch((error) => {
      new Notice(error instanceof Error ? error.message : String(error));
    });
  }
}

export class ThinkingPickerModal extends SuggestModal {
  constructor(app, settings, onChoose) {
    super(app);
    this.settings = settings;
    this.onChoose = onChoose;
    this.emptyStateText = "Pi did not resolve thinking levels for this model.";
    this.setPlaceholder("Choose thinking level…");
    this.setInstructions([
      { command: "↑↓", purpose: "navigate" },
      { command: "↵", purpose: "select" },
      { command: "esc", purpose: "close" }
    ]);
  }

  getSuggestions(query) {
    const normalized = query.trim().toLowerCase();
    return this.getItems().filter((item) =>
      `${item.primary} ${item.secondary}`.toLowerCase().includes(normalized)
    );
  }

  getItems() {
    const options = getReasoningOptions(this.settings);
    return Object.entries(options).flatMap(([value, label]) => {
      const resolved = value === "" ? getResolvedReasoning(this.settings) : "";
      if (value === "" && (resolved === "pi-default" || resolved === "cli-default")) return [];
      return [
        {
          value,
          primary: value === "" ? `Pi default — ${formatReasoningLabel(resolved)}` : label,
          secondary: value === "" ? `Effective for ${formatEffectiveModel(this.settings)}` : ""
        }
      ];
    });
  }

  renderSuggestion(item, el) {
    el.createDiv({ cls: "pi-agent-suggestion-title", text: item.primary });
    if (item.secondary) {
      el.createDiv({ cls: "pi-agent-suggestion-detail", text: item.secondary });
    }
    el.setAttribute(
      "aria-label",
      `${item.primary}${item.secondary ? `, ${item.secondary}` : ""}${
        this.settings.reasoningEffort === item.value ? ", selected" : ""
      }`
    );
  }

  onChooseSuggestion(item) {
    Promise.resolve(this.onChoose(item.value)).catch((error) => {
      new Notice(error instanceof Error ? error.message : String(error));
    });
  }
}

function formatEffectiveModel(settings) {
  const slug = settings.model || settings.effectiveModel;
  const model = settings.availableModels.find((candidate) => candidate.slug === slug);
  return model?.displayName || slug;
}

function formatReasoningLabel(value) {
  if (value === "xhigh") return "XHigh";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
