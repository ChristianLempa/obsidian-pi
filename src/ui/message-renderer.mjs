import * as f from "obsidian";
import { segmentMessageLinks } from "./links.mjs";
import { ChangeReviewModal } from "./modals/change-review-modal.mjs";
import { formatToolStatus } from "./activity.mjs";

export function renderMessages() {
  this.syncCurrentRunFlags();
  if (!this.messagesEl) return;
  let e = this.messagesEl,
    t = this.stickToBottom,
    n = e.scrollTop;
  ((this.isRenderingMessages = !0),
    (this.activityItemEl = void 0),
    (this.activityInlineEl = void 0),
    (this.activityInlineTextEl = void 0),
    (this.activityDetailsEl = void 0),
    (this.activityDetailsSignature = ""),
    e.empty());
  let s = this.plugin.messages;
  if (s.length === 0) {
    (this.renderEmptyState(), this.restoreMessagesScroll(e, t, n), (this.isRenderingMessages = !1));
    return;
  }
  for (let a = 0; a < s.length; a++) this.renderMessage(s[a], a);
  (this.running && this.streamingAssistantContent
    ? this.renderStreamingAssistantMessage()
    : this.running && this.activityText && this.renderActivityMessage(),
    this.restoreMessagesScroll(e, t, n),
    (this.isRenderingMessages = !1));
}

export function restoreMessagesScroll(e, t, n) {
  t ? (e.scrollTop = e.scrollHeight) : (e.scrollTop = Math.min(n, e.scrollHeight));
}

export function renderEmptyState() {
  if (!this.messagesEl) return;
  let t = this.messagesEl
    .createDiv({ cls: "pi-agent-empty-state" })
    .createSpan({ cls: "pi-agent-empty-icon" });
  (0, f.setIcon)(t, "messages-square");
}

export function renderMessage(e, t) {
  if (!this.messagesEl) return;
  let n = this.messagesEl.createDiv({
    cls: `pi-agent-message pi-agent-message-${e.role}`
  });
  this.renderRoleLabel(n, e.role === "user" ? "user" : "pi", e, t);
  let s = n.createDiv({ cls: "pi-agent-message-content" });
  this.renderPlainMessageContent(s, e.content);
}

export function renderPlainMessageContent(e, t) {
  let n = document.createDocumentFragment();
  for (let s of segmentMessageLinks(t, {
    parseVaultLinkTarget: (a) => this.parseVaultLinkTarget(a),
    getLinkLabel: (a) => this.getLinkLabel(a)
  }))
    s.target
      ? n.appendChild(this.createChatLink(s.text, s.target))
      : n.appendChild(document.createTextNode(s.text));
  e.appendChild(n);
}

export function renderStreamingAssistantMessage() {
  if (!this.messagesEl) return;
  let e = this.messagesEl.createDiv({
    cls: "pi-agent-message pi-agent-message-assistant pi-agent-message-streaming"
  });
  ((this.streamingItemEl = e), this.renderRoleLabel(e, "pi"));
  let t = e.createDiv({
    cls: "pi-agent-message-content pi-agent-message-content-streaming"
  });
  ((this.streamingTextEl = t.createSpan({
    cls: "pi-agent-streaming-text"
  })),
    this.streamingTextEl.setText(this.streamingAssistantContent),
    t.createSpan({ cls: "pi-agent-typing-cursor", text: "\u258C" }));
}

export function renderActivityMessage() {
  if (!this.messagesEl) return;
  let e = this.messagesEl.createDiv({
    cls: "pi-agent-message pi-agent-message-assistant pi-agent-message-activity"
  });
  this.activityItemEl = e;
  this.renderRoleLabel(e, "pi");
  let t = this.getVisibleActivityDetails();
  t.length > 0 && this.renderActivityDetails(e, t);
}

export function getVisibleActivityDetails() {
  if (this.activeToolCalls.size < 2) return [];
  return [...this.activeToolCalls.values()].map(
    (e) => formatToolStatus(e.name, e.args, "running").label
  );
}

export function renderActivityDetails(e, t) {
  let n = e.createDiv({ cls: "pi-agent-activity-details" });
  ((this.activityDetailsEl = n), (this.activityDetailsSignature = t.join("\n")));
  for (let s of t.slice(0, 5)) n.createDiv({ cls: "pi-agent-activity-detail", text: s });
}

export function renderRoleLabel(e, t, n, s) {
  var d;
  let a = e.createDiv({ cls: "pi-agent-message-role" }),
    o = a.createSpan({ cls: "pi-agent-message-role-title" }),
    l = o.createSpan({
      cls: `pi-agent-role-icon pi-agent-role-icon-${t}`
    });
  if (t === "user") ((0, f.setIcon)(l, "user"), o.createSpan({ text: "You" }));
  else if (
    (this.renderPiIcon(l), o.createSpan({ text: "Agent" }), !n && this.running && this.activityText)
  ) {
    let h = o.createSpan({
      cls: `pi-agent-inline-activity pi-agent-activity-${this.activityKind}`,
      attr: { title: this.activityDetail || this.activityText }
    });
    ((this.activityInlineEl = h),
      (this.activityInlineTextEl = h.createSpan({
        cls: "pi-agent-inline-activity-text",
        text: this.activityText
      })));
  }
  if (n && s !== void 0) {
    let h =
      n.role === "assistant"
        ? (d = this.messageActions) == null
          ? void 0
          : d.getMessageChangeStats(n)
        : void 0;
    if (h) {
      let g = a.createSpan({
          cls: "pi-agent-message-diff-stat",
          attr: {
            role: "button",
            tabindex: "0",
            title: "Review changed files and diff lines",
            "aria-label": "Review changed files and diff lines"
          }
        }),
        m = (p) => {
          (p.preventDefault(), p.stopPropagation(), new ChangeReviewModal(this.plugin, n).open());
        };
      (h.filesChanged &&
        g.createSpan({
          cls: "pi-agent-diff-files",
          text: `${h.filesChanged} files`
        }),
        g.createSpan({
          cls: "pi-agent-diff-additions",
          text: `+${h.additions}`
        }),
        g.createSpan({
          cls: "pi-agent-diff-deletions",
          text: `-${h.deletions}`
        }),
        g.addEventListener("click", m),
        g.addEventListener("keydown", (p) => {
          (p.key === "Enter" || p.key === " ") && m(p);
        }));
    }
    let u = a.createEl("button", {
      cls: "clickable-icon pi-agent-message-actions",
      attr: { "aria-label": "Message actions" }
    });
    ((0, f.setIcon)(u, "ellipsis"),
      u.addEventListener("click", (g) => {
        var m;
        (g.preventDefault(),
          g.stopPropagation(),
          (m = this.messageActions) == null || m.showMessageMenu(g, n, s));
      }));
  }
}
