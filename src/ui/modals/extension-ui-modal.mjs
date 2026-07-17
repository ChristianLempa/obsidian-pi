import { Modal, Setting } from "obsidian";

export function showExtensionUiDialog(app, request) {
  return new Promise((resolve) => new ExtensionUiModal(app, request, resolve).open());
}

class ExtensionUiModal extends Modal {
  constructor(app, request, resolve) {
    super(app);
    this.request = request;
    this.resolve = resolve;
  }

  onOpen() {
    this.contentEl.empty();
    this.abortHandler = () => this.finish();
    if (this.request.signal?.aborted) {
      this.finish();
      return;
    }
    this.request.signal?.addEventListener("abort", this.abortHandler, { once: true });
    new Setting(this.contentEl).setName(this.request.title || "Pi extension").setHeading();

    if (this.request.method === "confirm") {
      if (this.request.message) this.contentEl.createEl("p", { text: this.request.message });
      this.renderActions(() => this.finish(true), "Confirm");
      return;
    }

    if (this.request.method === "select") {
      const select = this.contentEl.createEl("select", { cls: "dropdown" });
      for (const option of this.request.options ?? [])
        select.createEl("option", { text: String(option), attr: { value: String(option) } });
      this.renderActions(() => this.finish(select.value), "Select");
      select.focus();
      return;
    }

    const field = this.contentEl.createEl(this.request.method === "editor" ? "textarea" : "input");
    field.addClass("pi-agent-extension-input");
    if (this.request.method === "editor") field.value = String(this.request.prefill ?? "");
    else field.setAttr("placeholder", String(this.request.placeholder ?? ""));
    field.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        (this.request.method !== "editor" || event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        this.finish(field.value);
      }
    });
    this.renderActions(
      () => this.finish(field.value),
      this.request.method === "editor" ? "Apply" : "Submit"
    );
    field.focus();
  }

  renderActions(onSubmit, submitText) {
    const actions = this.contentEl.createDiv({ cls: "pi-agent-modal-actions" });
    actions.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.finish());
    actions
      .createEl("button", { text: submitText, cls: "mod-cta" })
      .addEventListener("click", onSubmit);
  }

  finish(value) {
    if (this.settled) return;
    this.settled = true;
    this.resolve(value);
    this.close();
  }

  onClose() {
    if (this.abortHandler) this.request.signal?.removeEventListener("abort", this.abortHandler);
    if (!this.settled) {
      this.settled = true;
      this.resolve(undefined);
    }
    this.contentEl.empty();
  }
}
