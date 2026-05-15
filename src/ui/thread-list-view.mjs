import * as f from "obsidian";
import { confirmWithModal } from "./modals/confirm-modal.mjs";

export function showThreadList() {
  ((this.showingThreadList = !0), this.renderThreadList());
}

export function renderThreadList() {
  var a;
  let e = this.containerEl.children[1],
    t = this.plugin.listThreads({ includeArchived: !0 }),
    n = this.plugin.getCurrentThread();
  ((a = this.suggestions) == null || a.close(),
    this.cleanupComposerBarObserver(),
    (this.messagesEl = void 0),
    (this.inputEl = void 0),
    (this.sendButtonEl = void 0),
    (this.composerBarEl = void 0),
    (this.composerBarExpandEl = void 0),
    (this.runSettings = void 0),
    (this.toolBadgesEl = void 0),
    (this.threadTitleEl = void 0),
    e.empty(),
    e.addClass("pi-agent-view"));
  let s = e.createDiv({ cls: "pi-agent-thread-list-header" }),
    o = s.createEl("button", {
      cls: "clickable-icon pi-agent-header-action",
      attr: { "aria-label": "Back to chat", title: "Back to chat" }
    });
  ((0, f.setIcon)(o, "arrow-left"), o.addEventListener("click", () => this.renderChatView()));
  let l = s.createDiv({ cls: "pi-agent-thread-list-heading" });
  (l.createDiv({ cls: "pi-agent-thread-list-title-heading", text: "Threads" }),
    l.createDiv({
      cls: "pi-agent-thread-list-subtitle",
      text: `${t.length} chat${t.length === 1 ? "" : "s"}`
    }));
  let d = s.createEl("button", {
    cls: "clickable-icon pi-agent-header-action",
    attr: { "aria-label": "New chat", title: "New chat" }
  });
  ((0, f.setIcon)(d, "plus"),
    d.addEventListener("click", () => {
      (this.plugin.startNewThread(), this.renderChatView());
    }));
  let h = e.createDiv({ cls: "pi-agent-thread-list" });
  t.length === 0
    ? h.createDiv({ cls: "pi-agent-empty", text: "No chat threads." })
    : t.forEach((m) => this.renderThreadListRow(h, m, m.id === n.id));
}

export function renderThreadListRow(e, t, n) {
  let s = e.createDiv({
      cls: `pi-agent-thread-list-row${n ? " is-current" : ""}`
    }),
    a = s.createDiv({ cls: "pi-agent-thread-list-info" }),
    o = a.createDiv({
      cls: "pi-agent-thread-list-title",
      attr: { title: "Open chat" }
    });
  if (this.isThreadRunning(t.id)) {
    let h = o.createSpan({
      cls: "pi-agent-thread-list-running",
      attr: { title: "Agent is running in this chat" }
    });
    (0, f.setIcon)(h, "loader");
  }
  o.createSpan({ text: t.title });
  (s.addEventListener("click", () => {
    (this.plugin.switchThread(t.id), this.renderChatView());
  }),
    a.createDiv({ cls: "pi-agent-thread-list-meta", text: this.formatThreadMeta(t, n) }));
  let l = s.createDiv({ cls: "pi-agent-thread-list-actions" }),
    d = l.createEl("button", {
      cls: "clickable-icon pi-agent-thread-list-action",
      attr: { "aria-label": "Thread actions", title: "Thread actions" }
    });
  ((0, f.setIcon)(d, "more-horizontal"),
    d.addEventListener("click", (h) => {
      (h.preventDefault(), h.stopPropagation(), this.showThreadRowMenu(h, t, n, o));
    }));
}

export function showThreadRowMenu(e, t, n, s) {
  let a = new f.Menu();
  (a.addItem((o) =>
    o
      .setTitle(n ? "Current chat" : "Open")
      .setIcon(n ? "check" : "arrow-right")
      .setDisabled(n)
      .onClick(() => {
        (this.plugin.switchThread(t.id), this.renderChatView());
      })
  ),
    a.addItem((o) =>
      o
        .setTitle("Rename")
        .setIcon("pencil")
        .onClick(() => this.startThreadListRename(t, s))
    ),
    a.addSeparator(),
    a.addItem((o) =>
      o
        .setTitle("Delete")
        .setIcon("trash-2")
        .onClick(() => this.deleteThreadFromList(t))
    ),
    a.showAtMouseEvent(e));
}

export function startThreadListRename(e, t) {
  let n = document.createElement("input");
  (n.addClass("pi-agent-thread-list-title-input"),
    n.setAttr("type", "text"),
    n.setAttr("aria-label", "Chat title"),
    (n.value = e.title),
    t.replaceWith(n));
  let s = (a) => {
    let o = n.value.trim();
    (a && o && o !== e.title && this.plugin.renameThread(e.id, o), this.renderThreadList());
  };
  (n.addEventListener("click", (a) => a.stopPropagation()),
    n.addEventListener("keydown", (a) => {
      a.key === "Enter"
        ? (a.preventDefault(), s(!0))
        : a.key === "Escape" && (a.preventDefault(), s(!1));
    }),
    n.addEventListener("blur", () => s(!0)),
    n.focus(),
    n.select());
}

export async function deleteThreadFromList(e) {
  if (this.isThreadRunning(e.id)) {
    new f.Notice("Wait for the agent run to finish before deleting this chat.");
    return;
  }
  let t = await confirmWithModal(this.plugin.app, {
    title: "Delete chat?",
    message: `Delete chat "${e.title}" from plugin history?`,
    confirmText: "Delete",
    warning: true
  });
  if (!t) return;
  this.plugin.deleteThread(e.id)
    ? (new f.Notice("Chat deleted."), this.renderThreadList())
    : new f.Notice("Chat thread was not found.");
}

export function formatThreadMeta(e, t) {
  let n = this.plugin.getThreadDisplayMessageCount
      ? this.plugin.getThreadDisplayMessageCount(e)
      : e.messages.length,
    s = `${n} message${n === 1 ? "" : "s"} • Updated ${this.formatThreadDate(e.updatedAt)}`;
  return t ? `Current • ${s}` : s;
}

export function formatThreadDate(e) {
  try {
    return new Date(e).toLocaleString();
  } catch {
    return "unknown date";
  }
}
