import * as f from "obsidian";

export function enqueuePrompt(e, t = this.plugin.getCurrentThread().id) {
  let n = e.trim();
  if (!n) return;
  (this.promptQueue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    prompt: n,
    threadId: t
  }),
    this.renderPromptQueue(),
    this.syncCurrentRunFlags(),
    this.setRunningState(this.running),
    new f.Notice(
      this.promptQueue.length === 1
        ? "Message queued. It will send after the current run finishes."
        : `${this.promptQueue.length} messages queued.`
    ));
}

export function runNextQueuedPrompt() {
  if (this.canceling || this.promptQueue.length === 0) return;
  let t = this.promptQueue.findIndex((n) => !this.isThreadRunning(n.threadId));
  if (t < 0) return;
  let [e] = this.promptQueue.splice(t, 1);
  (this.renderPromptQueue(),
    this.syncCurrentRunFlags(),
    this.setRunningState(this.running),
    e && this.runPrompt(e.prompt, e.threadId));
}

export function removeQueuedPrompt(e) {
  let t = this.promptQueue.length;
  ((this.promptQueue = this.promptQueue.filter((n) => n.id !== e)),
    this.promptQueue.length !== t &&
      (this.renderPromptQueue(), this.syncCurrentRunFlags(), this.setRunningState(this.running)));
}

export function prioritizeQueuedPrompt(e) {
  let t = this.promptQueue.findIndex((n) => n.id === e);
  if (t <= 0) return;
  let [n] = this.promptQueue.splice(t, 1);
  (this.promptQueue.unshift(n),
    this.renderPromptQueue(),
    this.syncCurrentRunFlags(),
    this.setRunningState(this.running));
}

export function renderPromptQueue() {
  if (!this.promptQueueEl) return;
  let e = this.promptQueueEl;
  if (
    (e.empty(),
    e.toggleClass("is-empty", this.promptQueue.length === 0),
    this.promptQueue.length === 0)
  )
    return;
  let t = e.createDiv({ cls: "pi-agent-prompt-queue-heading" });
  (t.createSpan({
    text: `${this.promptQueue.length} queued message${this.promptQueue.length === 1 ? "" : "s"}`
  }),
    t.createSpan({
      cls: "pi-agent-prompt-queue-hint",
      text: "Runs after the current response."
    }));
  for (let [n, s] of this.promptQueue.entries()) {
    let a = e.createDiv({ cls: "pi-agent-prompt-queue-item" });
    a.createDiv({ cls: "pi-agent-prompt-queue-text", text: s.prompt });
    let o = a.createDiv({ cls: "pi-agent-prompt-queue-actions" });
    if (n > 0) {
      let l = o.createEl("button", {
        cls: "clickable-icon pi-agent-prompt-queue-action",
        attr: { "aria-label": "Run this queued message next", title: "Run next" }
      });
      ((0, f.setIcon)(l, "corner-up-left"),
        l.addEventListener("click", () => this.prioritizeQueuedPrompt(s.id)));
    }
    let d = o.createEl("button", {
      cls: "clickable-icon pi-agent-prompt-queue-action",
      attr: { "aria-label": "Remove queued message", title: "Remove" }
    });
    ((0, f.setIcon)(d, "x"), d.addEventListener("click", () => this.removeQueuedPrompt(s.id)));
  }
}
