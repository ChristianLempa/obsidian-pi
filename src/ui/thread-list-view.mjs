import * as f from "obsidian";
import { chooseThreadDeletion } from "./modals/delete-thread-modal.mjs";
import { chooseBulkThreadDeletion } from "./modals/delete-threads-modal.mjs";
import { formatBulkDeleteResult, planBulkThreadDeletion } from "./thread-bulk-actions.mjs";

const PI_BRAND_NAME = "Pi";

export function showThreadList() {
  this.showingThreadList = !0;
  this.renderThreadList();
}

export function renderThreadList() {
  var a;
  let e = this.containerEl.children[1],
    t = this.plugin.listThreads({ includeArchived: !0 }),
    n = this.plugin.getCurrentThread();
  if ((a = this.suggestions) != null) a.close();
  this.cleanupComposerBarObserver();
  this.messagesEl = void 0;
  this.inputEl = void 0;
  this.sendButtonEl = void 0;
  this.composerBarEl = void 0;
  this.composerBarExpandEl = void 0;
  this.runSettings = void 0;
  this.toolBadgesEl = void 0;
  this.threadTitleEl = void 0;
  this.threadFavoriteEl = void 0;
  e.empty();
  e.addClass("pi-agent-view");
  let s = e.createDiv({ cls: "pi-agent-thread-list-header" }),
    o = s.createEl("button", {
      cls: "clickable-icon pi-agent-header-action",
      attr: { "aria-label": "Back to chat", title: "Back to chat" }
    });
  (0, f.setIcon)(o, "arrow-left");
  o.addEventListener("click", () => this.renderChatView());
  let l = s.createDiv({ cls: "pi-agent-thread-list-heading" });
  l.createDiv({ cls: "pi-agent-thread-list-title-heading", text: "Threads" });
  l.createDiv({
    cls: "pi-agent-thread-list-subtitle",
    text: `${t.length} chat${t.length === 1 ? "" : "s"}`
  });
  let deleteChatsButton = s.createEl("button", {
    cls: "clickable-icon pi-agent-header-action",
    attr: { "aria-label": "Delete chats", title: "Delete chats" }
  });
  (0, f.setIcon)(deleteChatsButton, "trash-2");
  deleteChatsButton.addEventListener("click", () => this.deleteChats());
  let d = s.createEl("button", {
    cls: "clickable-icon pi-agent-header-action",
    attr: { "aria-label": "New chat", title: "New chat" }
  });
  (0, f.setIcon)(d, "plus");
  d.addEventListener("click", () => {
    this.plugin.startNewThread();
    this.renderChatView();
  });
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
  s.addEventListener("click", () => {
    this.plugin.switchThread(t.id);
    this.renderChatView();
  });
  a.createDiv({ cls: "pi-agent-thread-list-meta", text: this.formatThreadMeta(t, n) });
  let l = s.createDiv({ cls: "pi-agent-thread-list-actions" }),
    d = l.createEl("button", {
      cls: `clickable-icon pi-agent-thread-list-action pi-agent-thread-favorite${t.favorite ? " is-favorite" : ""}`,
      attr: {
        "aria-label": t.favorite ? "Remove favorite" : "Mark as favorite",
        title: t.favorite ? "Remove favorite" : "Mark as favorite",
        "aria-pressed": String(t.favorite === true)
      }
    }),
    deleteButton = l.createEl("button", {
      cls: "clickable-icon pi-agent-thread-list-action pi-agent-thread-delete",
      attr: { "aria-label": "Delete chat", title: "Delete chat" }
    }),
    h = l.createEl("button", {
      cls: "clickable-icon pi-agent-thread-list-action",
      attr: { "aria-label": "Thread actions", title: "Thread actions" }
    });
  (0, f.setIcon)(d, "star");
  d.addEventListener("click", (u) => {
    u.preventDefault();
    u.stopPropagation();
    this.toggleThreadFavorite(t);
  });
  (0, f.setIcon)(deleteButton, "trash-2");
  deleteButton.addEventListener("click", (u) => {
    u.preventDefault();
    u.stopPropagation();
    this.deleteThreadFromList(t);
  });
  (0, f.setIcon)(h, "more-horizontal");
  h.addEventListener("click", (u) => {
    u.preventDefault();
    u.stopPropagation();
    this.showThreadRowMenu(u, t, n, o);
  });
}

export async function deleteChats() {
  const threads = this.plugin.listThreads({ includeArchived: true });
  const plan = planBulkThreadDeletion(threads, [...this.activeRuns.keys()]);
  if (plan.all.deleteCount === 0) {
    new f.Notice(
      plan.all.skippedCount > 0
        ? "Wait for active agent runs to finish before deleting chats."
        : "There are no chats to delete."
    );
    return;
  }

  const choice = await chooseBulkThreadDeletion(this.plugin.app, plan);
  if (choice === "cancel") return;
  const scope = choice === "except-favorites" ? plan.exceptFavorites : plan.all;
  if (scope.deleteCount === 0) return;

  const newlyRunningIds = scope.deleteIds.filter((threadId) => this.isThreadRunning(threadId));
  const safeDeleteIds = scope.deleteIds.filter((threadId) => !this.isThreadRunning(threadId));
  const result = this.plugin.deleteThreads(safeDeleteIds);
  new f.Notice(
    formatBulkDeleteResult({
      deletedCount: result.deletedCount,
      skippedCount: scope.skippedCount + newlyRunningIds.length + result.skippedCount,
      createdEmptyChat: Boolean(result.createdThreadId)
    })
  );
  this.renderThreadList();
}

export function showThreadRowMenu(e, t, n, s) {
  let a = new f.Menu();
  a.addItem((o) =>
    o
      .setTitle(n ? "Current chat" : "Open")
      .setIcon(n ? "check" : "arrow-right")
      .setDisabled(n)
      .onClick(() => {
        this.plugin.switchThread(t.id);
        this.renderChatView();
      })
  );
  a.addItem((o) =>
    o
      .setTitle(t.favorite ? "Remove favorite" : "Mark as favorite")
      .setIcon("star")
      .onClick(() => this.toggleThreadFavorite(t))
  );
  a.addItem((o) =>
    o
      .setTitle("Rename")
      .setIcon("pencil")
      .onClick(() => this.startThreadListRename(t, s))
  );
  if (t.piSessionId) {
    a.addItem((o) =>
      o
        .setTitle(`${PI_BRAND_NAME} session info`)
        .setIcon("info")
        .onClick(async () => {
          try {
            const [stats, tree] = await Promise.all([
              this.plugin.getThreadSessionStats(t.id),
              this.plugin.getThreadSessionTree(t.id)
            ]);
            const entryCount = countSessionEntries(tree?.tree ?? []);
            new f.Notice(
              stats
                ? `${stats.sessionFile}\n${stats.totalMessages} messages · ${entryCount} tree entries · ${stats.tokens?.total ?? 0} tokens · $${Number(stats.cost ?? 0).toFixed(4)}`
                : "No Pi session information is available."
            );
          } catch (error) {
            new f.Notice(error instanceof Error ? error.message : String(error));
          }
        })
    );
    a.addItem((o) =>
      o
        .setTitle(`Export ${PI_BRAND_NAME} session to HTML`)
        .setIcon("download")
        .onClick(async () => {
          try {
            const result = await this.plugin.exportThreadSession(t.id);
            new f.Notice(result?.path ? `Exported to ${result.path}` : "Session export failed.");
          } catch (error) {
            new f.Notice(error instanceof Error ? error.message : String(error));
          }
        })
    );
  }
  a.addSeparator();
  a.addItem((o) =>
    o
      .setTitle("Delete")
      .setIcon("trash-2")
      .onClick(() => this.deleteThreadFromList(t))
  );
  a.showAtMouseEvent(e);
}

export function startThreadListRename(e, t) {
  let n = document.createElement("input");
  n.addClass("pi-agent-thread-list-title-input");
  n.setAttr("type", "text");
  n.setAttr("aria-label", "Chat title");
  n.value = e.title;
  t.replaceWith(n);
  let s = (a) => {
    let o = n.value.trim();
    if (a && o && o !== e.title) this.plugin.renameThread(e.id, o);
    this.renderThreadList();
  };
  n.addEventListener("click", (a) => a.stopPropagation());
  n.addEventListener("keydown", (a) => {
    if (a.key === "Enter") {
      a.preventDefault();
      s(!0);
    } else if (a.key === "Escape") {
      a.preventDefault();
      s(!1);
    }
  });
  n.addEventListener("blur", () => s(!0));
  n.focus();
  n.select();
}

export function toggleThreadFavorite(e) {
  this.plugin.toggleThreadFavorite(e.id)
    ? this.renderThreadList()
    : new f.Notice("Chat thread was not found.");
}

export async function deleteThreadFromList(e) {
  if (this.isThreadRunning(e.id)) {
    new f.Notice("Wait for the agent run to finish before deleting this chat.");
    return;
  }
  const choice = await chooseThreadDeletion(this.plugin.app, e);
  if (choice === "cancel") return;
  if (this.plugin.deleteThread(e.id, { deletePiSession: choice === "both" })) {
    new f.Notice(choice === "both" ? "Chat and local Pi session deleted." : "Chat deleted.");
    this.renderThreadList();
  } else {
    new f.Notice("Chat or local Pi session could not be deleted.");
  }
}

export function formatThreadMeta(e, t) {
  let n = this.plugin.getThreadDisplayMessageCount
      ? this.plugin.getThreadDisplayMessageCount(e)
      : e.messages.length,
    s = `${n} message${n === 1 ? "" : "s"} • Updated ${this.formatThreadDate(e.updatedAt)}`;
  return t ? `Current • ${s}` : s;
}

export function countSessionEntries(nodes) {
  return nodes.reduce(
    (count, node) =>
      count + 1 + countSessionEntries(Array.isArray(node.children) ? node.children : []),
    0
  );
}

export function formatThreadDate(e) {
  try {
    return new Date(e).toLocaleString();
  } catch {
    return "unknown date";
  }
}
