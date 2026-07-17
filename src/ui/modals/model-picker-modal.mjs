import { Modal, setIcon } from "obsidian";
import {
  getEffectiveModelInfo,
  getReasoningOptions,
  getResolvedReasoning
} from "../../plugin/settings.mjs";
import {
  filterModels,
  getRecentModels,
  groupModelsByProvider,
  rememberRecentModel
} from "../model-picker.mjs";

let pickerId = 0;

export class ModelPickerModal extends Modal {
  constructor(app, settings, onChoose) {
    super(app);
    this.settings = settings;
    this.onChoose = onChoose;
    this.activeIndex = 0;
    this.listId = `pi-agent-model-picker-${++pickerId}`;
  }

  onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("pi-agent-picker-modal");
    this.titleEl.setText("Choose model");

    const label = this.contentEl.createEl("label", {
      cls: "pi-agent-picker-search-label",
      text: "Search models"
    });
    this.searchEl = label.createEl("input", {
      cls: "pi-agent-picker-search",
      attr: {
        type: "search",
        placeholder: "Search by model, provider, or slug",
        autocomplete: "off",
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-controls": this.listId,
        "aria-expanded": "true"
      }
    });
    this.statusEl = this.contentEl.createDiv({
      cls: "pi-agent-picker-status",
      attr: { "aria-live": "polite", "aria-atomic": "true" }
    });
    this.listEl = this.contentEl.createDiv({
      cls: "pi-agent-picker-list",
      attr: { id: this.listId, role: "listbox", "aria-label": "Available models" }
    });

    this.searchEl.addEventListener("input", () => {
      this.activeIndex = 0;
      this.renderResults();
    });
    this.searchEl.addEventListener("keydown", (event) => this.onKeyDown(event));
    this.renderResults();
    this.searchEl.focus();
  }

  renderResults() {
    this.listEl.empty();
    this.optionEls = [];
    const models = filterModels(this.settings.availableModels, this.searchEl.value);
    const showRecent = !this.searchEl.value.trim();
    const recent = showRecent ? getRecentModels(models) : [];

    this.addDefaultOption();
    if (recent.length > 0) this.addGroup("Recent", recent);
    const recentSlugs = new Set(recent.map((model) => model.slug));
    const providerModels = models.filter((model) => !recentSlugs.has(model.slug));
    for (const group of groupModelsByProvider(providerModels)) {
      this.addGroup(group.provider, group.models);
    }
    if (models.length === 0) {
      this.listEl.createDiv({
        cls: "pi-agent-picker-empty",
        text: this.searchEl.value.trim()
          ? "No catalog models match this search."
          : "No catalog models are available from Pi.",
        attr: { role: "presentation" }
      });
    }

    this.activeIndex = Math.min(this.activeIndex, Math.max(0, this.optionEls.length - 1));
    this.updateActiveOption(false);
    this.statusEl.setText(`${models.length} model${models.length === 1 ? "" : "s"} found`);
  }

  addDefaultOption() {
    const effective = getEffectiveModelInfo(this.settings);
    this.addOption({
      value: "",
      primary: "Pi configured default",
      secondary: effective
        ? `${effective.displayName} — ${effective.slug}`
        : this.settings.effectiveModel || "Resolved by Pi at runtime",
      selected: this.settings.model === ""
    });
  }

  addGroup(provider, models) {
    const groupEl = this.listEl.createDiv({
      cls: "pi-agent-picker-group",
      attr: { role: "group", "aria-label": provider }
    });
    groupEl.createDiv({ cls: "pi-agent-picker-group-label", text: provider });
    for (const model of models) {
      this.addOption(
        {
          value: model.slug,
          primary: model.displayName || model.id,
          secondary: model.slug,
          selected: this.settings.model === model.slug,
          model
        },
        groupEl
      );
    }
  }

  addOption(option, parent = this.listEl) {
    const optionEl = parent.createEl("button", {
      cls: "pi-agent-picker-option",
      attr: {
        type: "button",
        role: "option",
        tabindex: "-1",
        "aria-selected": String(option.selected),
        "aria-label": `${option.primary}, ${option.secondary}${
          option.model ? `, ${formatCapabilities(option.model).join(", ")}` : ""
        }${option.selected ? ", selected" : ""}`
      }
    });
    const textEl = optionEl.createDiv({ cls: "pi-agent-picker-option-text" });
    textEl.createDiv({ cls: "pi-agent-picker-primary", text: option.primary });
    textEl.createDiv({ cls: "pi-agent-picker-secondary", text: option.secondary });
    if (option.model) this.addCapabilities(optionEl, option.model);
    if (option.selected) {
      const checkEl = optionEl.createSpan({
        cls: "pi-agent-picker-check",
        attr: { "aria-hidden": "true" }
      });
      setIcon(checkEl, "check");
    }
    optionEl.addEventListener("click", () => this.choose(option.value));
    optionEl.addEventListener("mousemove", () => {
      this.activeIndex = this.optionEls.indexOf(optionEl);
      this.updateActiveOption(false);
    });
    optionEl.dataset.value = option.value;
    this.optionEls.push(optionEl);
  }

  addCapabilities(optionEl, model) {
    const capabilities = optionEl.createDiv({
      cls: "pi-agent-picker-capabilities",
      attr: { "aria-hidden": "true" }
    });
    for (const capability of formatCapabilities(model)) {
      capabilities.createSpan({ text: capability });
    }
  }

  onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      this.activeIndex =
        (this.activeIndex + direction + this.optionEls.length) % this.optionEls.length;
      this.updateActiveOption(true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      this.activeIndex = event.key === "Home" ? 0 : this.optionEls.length - 1;
      this.updateActiveOption(true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.optionEls[this.activeIndex]?.click();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.close();
    }
  }

  updateActiveOption(scroll) {
    for (const [index, optionEl] of this.optionEls.entries()) {
      optionEl.toggleClass("is-active", index === this.activeIndex);
    }
    const active = this.optionEls[this.activeIndex];
    if (active) {
      if (!active.id) active.id = `pi-agent-model-option-${this.activeIndex}`;
      this.searchEl.setAttribute("aria-activedescendant", active.id);
      if (scroll) active.scrollIntoView({ block: "nearest" });
    }
  }

  async choose(value) {
    if (value) rememberRecentModel(value);
    await this.onChoose(value);
    this.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class ThinkingPickerModal extends Modal {
  constructor(app, settings, onChoose) {
    super(app);
    this.settings = settings;
    this.onChoose = onChoose;
  }

  onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("pi-agent-picker-modal");
    this.contentEl.addClass("pi-agent-thinking-picker");
    this.titleEl.setText("Choose thinking level");
    const options = getReasoningOptions(this.settings);
    const listEl = this.contentEl.createDiv({
      cls: "pi-agent-picker-list",
      attr: { role: "listbox", "aria-label": "Thinking levels" }
    });
    this.optionEls = [];

    for (const [value, label] of Object.entries(options)) {
      const resolved =
        value === ""
          ? formatReasoningLabel(getResolvedReasoning({ ...this.settings, reasoningEffort: "" }))
          : "";
      const selected = value === this.settings.reasoningEffort;
      const optionEl = listEl.createEl("button", {
        cls: "pi-agent-picker-option",
        attr: {
          type: "button",
          role: "option",
          tabindex: "-1",
          "aria-selected": String(selected),
          "aria-label": `${label}${resolved ? `, resolved as ${resolved}` : ""}${
            selected ? ", selected" : ""
          }`
        }
      });
      const textEl = optionEl.createDiv({ cls: "pi-agent-picker-option-text" });
      textEl.createDiv({ cls: "pi-agent-picker-primary", text: label.split(" — ")[0] });
      if (resolved) {
        textEl.createDiv({
          cls: "pi-agent-picker-secondary",
          text: `Resolved default: ${resolved}`
        });
      }
      if (selected) {
        const checkEl = optionEl.createSpan({
          cls: "pi-agent-picker-check",
          attr: { "aria-hidden": "true" }
        });
        setIcon(checkEl, "check");
      }
      optionEl.addEventListener("click", async () => {
        await this.onChoose(value);
        this.close();
      });
      optionEl.addEventListener("keydown", (event) => this.onOptionKeyDown(event));
      this.optionEls.push(optionEl);
    }
    const initial =
      this.optionEls.find((option) => option.getAttribute("aria-selected") === "true") ||
      this.optionEls[0];
    this.focusOption(initial);
  }

  onOptionKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = this.optionEls.indexOf(event.currentTarget);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? this.optionEls.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + this.optionEls.length) %
            this.optionEls.length;
    this.focusOption(this.optionEls[next]);
  }

  focusOption(option) {
    if (!option) return;
    for (const candidate of this.optionEls) {
      candidate.setAttribute("tabindex", candidate === option ? "0" : "-1");
    }
    option.focus();
  }

  onClose() {
    this.contentEl.empty();
  }
}

function formatReasoningLabel(value) {
  if (!value || value === "pi-default" || value === "cli-default") return "Pi runtime default";
  return value === "xhigh" ? "XHigh" : value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCapabilities(model) {
  return [
    model.reasoning ? "Thinking" : "",
    model.supportsImages ? "Images" : "",
    model.contextWindow ? `${formatTokenAmount(model.contextWindow)} context` : "",
    model.maxOutputTokens ? `${formatTokenAmount(model.maxOutputTokens)} output` : ""
  ].filter(Boolean);
}

function formatTokenAmount(value) {
  return value >= 1_000_000
    ? `${Number((value / 1_000_000).toFixed(1))}M`
    : value >= 1_000
      ? `${Number((value / 1_000).toFixed(1))}K`
      : String(value);
}
