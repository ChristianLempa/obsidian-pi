import * as f from "obsidian";
import {
  claimLocalPrompt,
  nextDeliverablePrompt,
  removeLocalPrompt,
  restoreLocalPrompt,
  takeLocalPrompt
} from "./local-prompt-queue.mjs";
import {
  appendTextAttachmentContext,
  imagePreviewUrl,
  modelSupportsImages
} from "./prompt-payload.mjs";

export function enqueuePrompt(
  prompt,
  threadId = this.plugin.getCurrentThread().id,
  images = [],
  attachments = []
) {
  const item = this.plugin.enqueueLocalPrompt({ prompt, images, attachments, threadId });
  if (!item) return;
  this.promptQueue = this.plugin.getLocalPromptQueue();
  this.renderPromptQueue();
  this.syncCurrentRunFlags();
  this.setRunningState(this.running);
  new f.Notice(
    this.promptQueue.length === 1
      ? "Message queued. It will send after the current run finishes."
      : `${this.promptQueue.length} messages queued.`
  );
}

export function runNextQueuedPrompt() {
  if (this.canceling || this.plugin.isLocalPromptQueuePaused() || this.steeringPromptIds.size > 0)
    return;
  const item = nextDeliverablePrompt(this.promptQueue, (threadId) =>
    this.isThreadRunning(threadId)
  );
  if (!item) return;
  const claimed = claimLocalPrompt(this.promptQueue, item.id, "delivering");
  this.promptQueue = claimed.queue;
  this.plugin.replaceLocalPromptQueue(this.promptQueue);
  this.renderPromptQueue();
  this.runPrompt(item.prompt, item.threadId, item.images, item.id, item.attachments);
}

export function removeQueuedPrompt(id) {
  const item = this.promptQueue.find((candidate) => candidate.id === id);
  if (!item || item.state !== "pending") return;
  this.promptQueue = removeLocalPrompt(this.promptQueue, id);
  this.plugin.replaceLocalPromptQueue(this.promptQueue);
  this.renderPromptQueue();
  this.setRunningState(this.running);
}

export function retrieveQueuedPrompt(id) {
  const item = this.promptQueue.find((candidate) => candidate.id === id);
  if (!item || item.state !== "pending" || !this.isCurrentThread(item.threadId)) return;
  if (this.inputEl) this.inputEl.value = item.prompt;
  this.composerImages = item.images.map((image) => ({ ...image }));
  this.composerAttachments = item.attachments.map((attachment) => ({ ...attachment }));
  this.removeQueuedPrompt(id);
  this.renderComposerImages();
  this.resizeInput();
  this.inputEl?.focus();
}

export async function steerQueuedPrompt(id) {
  const taken = takeLocalPrompt(this.promptQueue, id);
  if (!taken.item) return;
  this.promptQueue = taken.queue;
  this.steeringPromptIds.add(id);
  this.plugin.beginLocalPromptSteering(taken.item);
  this.plugin.replaceLocalPromptQueue(this.promptQueue);
  this.renderPromptQueue();
  try {
    const run = this.activeRuns.get(taken.item.threadId);
    if (!run) throw new Error("This run already settled; the message will run normally.");
    const delivery = await this.plugin.enrichPromptDelivery(taken.item, {
      mode: "steer",
      threadId: taken.item.threadId
    });
    if (delivery.images?.length > 0) await this.plugin.ensureModelCatalogLoaded();
    if (delivery.images?.length > 0 && !modelSupportsImages(this.plugin.getSelectedModelInfo()))
      throw new Error("The selected Pi model does not support image input.");
    const formattedPrompt = delivery.promptContext
      ? this.plugin.contextBuilder.formatPrompt(delivery.prompt, delivery.promptContext)
      : delivery.prompt;
    const steerPrompt = appendTextAttachmentContext(formattedPrompt, delivery.attachments);
    await run.runner.steer(steerPrompt, delivery.images);
    new f.Notice("Steering message sent to Pi.");
  } catch (error) {
    this.promptQueue = restoreLocalPrompt(this.promptQueue, taken.item, taken.index);
    this.plugin.replaceLocalPromptQueue(this.promptQueue);
    new f.Notice(error instanceof Error ? error.message : String(error));
  } finally {
    this.steeringPromptIds.delete(id);
    this.plugin.finishLocalPromptSteering(id);
  }
  this.renderPromptQueue();
  this.runNextQueuedPrompt();
}

export function renderPromptQueue() {
  if (!this.promptQueueEl) return;
  const root = this.promptQueueEl;
  root.empty();
  root.toggleClass("is-empty", this.promptQueue.length === 0 && !this.nativePiQueue);
  if (this.promptQueue.length > 0) {
    const heading = root.createDiv({ cls: "pi-agent-prompt-queue-heading" });
    heading.createSpan({
      text: `${this.promptQueue.length} local follow-up${this.promptQueue.length === 1 ? "" : "s"}`
    });
    heading.createSpan({
      cls: "pi-agent-prompt-queue-hint",
      text: this.plugin.isLocalPromptQueuePaused()
        ? "Saved from the previous plugin session. Review before sending."
        : "Runs in order after settlement."
    });
    if (this.plugin.isLocalPromptQueuePaused()) {
      const controls = root.createDiv({ cls: "pi-agent-prompt-queue-actions" });
      addTextAction(controls, "Resume saved follow-ups", "Resume", () => {
        this.plugin.resumeLocalPromptQueue();
        this.renderPromptQueue();
        this.runNextQueuedPrompt();
      });
      addTextAction(controls, "Discard all saved follow-ups", "Discard", () => {
        this.promptQueue = [];
        this.plugin.resumeLocalPromptQueue();
        this.plugin.replaceLocalPromptQueue([]);
        this.renderPromptQueue();
        this.setRunningState(this.running);
      });
    }
  }

  for (const item of this.promptQueue) {
    const row = root.createDiv({ cls: "pi-agent-prompt-queue-item" });
    row.setAttr("aria-label", `Queued follow-up: ${item.prompt || attachmentSummary(item)}`);
    const content = row.createDiv({ cls: "pi-agent-prompt-queue-content" });
    content.createDiv({
      cls: "pi-agent-prompt-queue-text",
      text: item.prompt || attachmentSummary(item)
    });
    renderQueueAttachments(content, item.images, item.attachments);
    const actions = row.createDiv({ cls: "pi-agent-prompt-queue-actions" });
    addAction(
      actions,
      "corner-up-right",
      "Steer now",
      () => this.steerQueuedPrompt(item.id),
      item.state !== "pending"
    );
    if (this.isCurrentThread(item.threadId))
      addAction(
        actions,
        "pencil",
        "Edit queued message",
        () => this.retrieveQueuedPrompt(item.id),
        item.state !== "pending"
      );
    addAction(
      actions,
      "x",
      "Remove queued message",
      () => this.removeQueuedPrompt(item.id),
      item.state !== "pending"
    );
  }

  if (this.nativePiQueue?.steering?.length || this.nativePiQueue?.followUp?.length) {
    const native = root.createDiv({ cls: "pi-agent-native-queue", attr: { role: "status" } });
    native.createDiv({ cls: "pi-agent-prompt-queue-heading", text: "Already handed to Pi" });
    const handedToPi = [
      ...(this.nativePiQueue.steering || []),
      ...(this.nativePiQueue.followUp || [])
    ];
    for (const text of handedToPi)
      native.createDiv({ cls: "pi-agent-prompt-queue-text", text: String(text) });
  }
}

function addTextAction(parent, label, text, callback) {
  const button = parent.createEl("button", {
    cls: "pi-agent-prompt-queue-action is-text",
    text,
    attr: { "aria-label": label, title: label }
  });
  button.addEventListener("click", callback);
}

function addAction(parent, icon, label, callback, disabled) {
  const button = parent.createEl("button", {
    cls: "clickable-icon pi-agent-prompt-queue-action",
    attr: { "aria-label": label, title: label }
  });
  f.setIcon(button, icon);
  button.toggleAttribute("disabled", disabled);
  button.addEventListener("click", callback);
}

function renderQueueAttachments(parent, images = [], attachments = []) {
  if (!images.length && !attachments.length) return;
  const previews = parent.createDiv({ cls: "pi-agent-queue-image-previews" });
  for (const image of images) {
    const item = previews.createDiv({ cls: "pi-agent-queue-attachment" });
    item.createEl("img", {
      cls: "pi-agent-queue-image-preview",
      attr: { src: imagePreviewUrl(image), alt: image.fileName || "Queued image" }
    });
    item.createSpan({ text: `${image.fileName} · ${formatBytes(image.size)} · image` });
  }
  for (const attachment of attachments) {
    const item = previews.createDiv({ cls: "pi-agent-queue-attachment" });
    const icon = item.createSpan({ cls: "pi-agent-attachment-icon" });
    f.setIcon(icon, "file-text");
    item.createSpan({
      text: `${attachment.fileName} · ${attachment.mimeType} · ${formatBytes(attachment.originalSize)}${attachment.truncated ? " · truncated" : ""}`
    });
  }
}

function attachmentSummary(item) {
  const count = (item.images?.length || 0) + (item.attachments?.length || 0);
  return `${count} attached file${count === 1 ? "" : "s"}`;
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "unknown size";
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`;
}
