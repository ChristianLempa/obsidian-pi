import * as f from "obsidian";

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
    (this.liveThinkingDetailsEl = void 0),
    (this.liveThinkingTextEl = void 0),
    (this.liveThinkingSetExpanded = void 0),
    this.unloadMessageRenderComponents(),
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
  if (e.role === "assistant") {
    this.renderToolErrors(n, e.toolErrors);
    if (e.thinking) {
      const key = `${this.getCurrentThreadId()}:${e.createdAt}`;
      this.renderThinkingDisclosure(
        n,
        e.thinking,
        this.completedThinkingExpansion.get(key) === true,
        (expanded) => this.completedThinkingExpansion.set(key, expanded),
        false
      );
    }
  }
  let s = n.createDiv({ cls: "pi-agent-message-content" });
  this.renderPlainMessageContent(s, e.content);
}

export function renderToolErrors(container, errors) {
  for (const error of Array.isArray(errors) ? errors : [])
    container.createDiv({ cls: "pi-agent-tool-error", text: error });
}

export function renderThinkingDisclosure(container, thinking, expanded, onToggle, live = false) {
  const details = container.createEl("details", {
    cls: `pi-agent-thinking-disclosure${live ? " is-live" : ""}`
  });
  let knownExpanded = expanded;
  details.toggleAttribute("open", expanded);
  const summary = details.createEl("summary");
  const chevron = summary.createSpan({ cls: "pi-agent-thinking-chevron" });
  (0, f.setIcon)(chevron, "chevron-right");
  summary.createSpan({
    cls: "pi-agent-thinking-label",
    text: "Thinking",
    attr: live ? { role: "status", "aria-label": "Thinking in progress" } : undefined
  });
  const text = details.createDiv({ cls: "pi-agent-thinking-content", text: thinking });
  details.addEventListener("toggle", () => {
    if (details.open === knownExpanded) return;
    knownExpanded = details.open;
    onToggle?.(details.open);
  });
  return {
    details,
    text,
    setExpanded(nextExpanded) {
      knownExpanded = nextExpanded;
      details.toggleAttribute("open", nextExpanded);
    }
  };
}

export function renderPlainMessageContent(container, content) {
  container.empty();
  container.addClass("markdown-rendered");

  const component = new f.Component();
  component.load();
  this.messageRenderComponents.push(component);

  f.MarkdownRenderer.render(
    this.plugin.app,
    content || "",
    container,
    this.getLinkSourcePath(),
    component
  ).catch((err) => {
    console.error("Pi Agent: Markdown render error", err);
    container.setText(content || "");
  });
}

export function unloadMessageRenderComponents() {
  for (const component of this.messageRenderComponents.splice(0)) component.unload();
}

export function renderStreamingAssistantMessage() {
  if (!this.messagesEl) return;
  let e = this.messagesEl.createDiv({
    cls: "pi-agent-message pi-agent-message-assistant pi-agent-message-streaming"
  });
  ((this.streamingItemEl = e), this.renderRoleLabel(e, "pi"));
  if (this.streamingThinkingContent) {
    const rendered = this.renderThinkingDisclosure(
      e,
      this.streamingThinkingContent,
      this.thinkingDisclosureExpanded,
      (expanded) => this.setLiveThinkingExpanded(expanded),
      true
    );
    this.liveThinkingDetailsEl = rendered.details;
    this.liveThinkingTextEl = rendered.text;
    this.liveThinkingSetExpanded = rendered.setExpanded;
  }
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
  if (this.streamingThinkingContent) {
    const rendered = this.renderThinkingDisclosure(
      e,
      this.streamingThinkingContent,
      this.thinkingDisclosureExpanded,
      (expanded) => this.setLiveThinkingExpanded(expanded),
      true
    );
    this.liveThinkingDetailsEl = rendered.details;
    this.liveThinkingTextEl = rendered.text;
    this.liveThinkingSetExpanded = rendered.setExpanded;
  }
}

export function renderRoleLabel(e, t, n, s) {
  let a = e.createDiv({ cls: "pi-agent-message-role" }),
    o = a.createSpan({ cls: "pi-agent-message-role-title" }),
    l = o.createSpan({
      cls: `pi-agent-role-icon pi-agent-role-icon-${t}`
    });
  if (t === "user") ((0, f.setIcon)(l, "user"), o.createSpan({ text: "You" }));
  else if (
    (this.renderPiIcon(l),
    o.createSpan({ text: "Agent" }),
    !n &&
      this.running &&
      this.activityText &&
      !(this.streamingThinkingContent && this.activityKind === "thinking"))
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
