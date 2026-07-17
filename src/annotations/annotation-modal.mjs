import { Modal } from "obsidian";
import { ANNOTATION_LIMITS } from "./annotation-model.mjs";

export class AnnotationDeleteModal extends Modal {
  constructor(app, onConfirm) {
    super(app);
    this.onConfirm = onConfirm;
  }

  onOpen() {
    this.titleEl.setText("Delete annotation?");
    this.contentEl.empty();
    this.contentEl.createEl("p", {
      text: "This removes this annotation only. The note text is not changed."
    });
    const actions = this.contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    const remove = actions.createEl("button", { text: "Delete", cls: "mod-warning" });
    remove.addEventListener("click", () => {
      this.onConfirm();
      this.close();
    });
    window.setTimeout(() => cancel.focus(), 0);
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class AnnotationModal extends Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
    this.intent = options.annotation?.intent ?? "change";
  }

  onOpen() {
    this.titleEl.setText("Annotations");
    this.contentEl.empty();
    this.modalEl.addClass("pi-agent-annotation-modal");

    const displayText = this.options.anchor.renderedText || this.options.anchor.quote;
    const quote = this.contentEl.createEl("blockquote", {
      cls: "pi-agent-annotation-modal-quote",
      text: truncate(displayText, 240)
    });
    quote.setAttr("aria-label", "Annotated text");
    if (this.options.anchor.anchorLabel) {
      this.contentEl.createDiv({
        cls: "pi-agent-annotation-anchor-label",
        text: this.options.anchor.anchorLabel
      });
    }

    const controlId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const contextId = `pi-agent-annotation-context-${controlId}`;
    this.contentEl.createEl("label", { text: "Context", attr: { for: contextId } });
    this.contextEl = this.contentEl.createEl("textarea", {
      cls: "pi-agent-annotation-context",
      attr: {
        id: contextId,
        rows: "5",
        maxlength: String(ANNOTATION_LIMITS.context),
        placeholder: "Describe the change or question"
      }
    });
    this.contextEl.value = this.options.annotation?.context ?? "";
    this.contextEl.addEventListener("input", () => {
      this.contextEl.removeAttribute("aria-invalid");
      this.errorEl?.empty();
    });

    const fieldset = this.contentEl.createEl("fieldset", {
      cls: "pi-agent-annotation-intents"
    });
    fieldset.createEl("legend", { text: "Intent" });
    for (const intent of ["change", "question"]) {
      const option = fieldset.createEl("label", { cls: "pi-agent-annotation-intent" });
      const input = option.createEl("input", {
        attr: { type: "radio", name: `pi-agent-annotation-intent-${controlId}`, value: intent }
      });
      input.checked = this.intent === intent;
      input.addEventListener("change", () => {
        if (input.checked) this.intent = intent;
      });
      option.createSpan({ text: intent === "change" ? "Change" : "Question" });
    }

    this.errorEl = this.contentEl.createDiv({
      cls: "pi-agent-annotation-error",
      attr: { role: "alert", "aria-live": "polite" }
    });
    const actions = this.contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    actions.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    this.saveButton = actions.createEl("button", {
      text: this.options.annotation ? "Save changes" : "Save annotation",
      cls: "mod-cta"
    });
    this.saveButton.addEventListener("click", () => this.submit());

    this.scope.register(["Mod"], "Enter", (event) => {
      event.preventDefault();
      this.submit();
      return false;
    });
    window.setTimeout(() => this.contextEl?.focus(), 0);
  }

  async submit() {
    if (this.submitting) return;
    const context = this.contextEl?.value.trim() ?? "";
    if (!context) {
      this.errorEl?.setText("Context is required.");
      this.contextEl?.setAttr("aria-invalid", "true");
      this.contextEl?.focus();
      return;
    }

    this.submitting = true;
    this.saveButton?.setAttr("disabled", "");
    try {
      await this.options.onSave({ context, intent: this.intent });
      this.close();
    } catch (error) {
      this.errorEl?.setText(error instanceof Error ? error.message : "Could not save annotation.");
      this.submitting = false;
      this.saveButton?.removeAttribute("disabled");
      this.contextEl?.focus();
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

function truncate(value, limit) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}
