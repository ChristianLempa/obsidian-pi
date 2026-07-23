import * as f from "obsidian";

export function renderMessages() {
  this.syncCurrentRunFlags();
  if (!this.messagesEl) return;
  let e = this.messagesEl,
    t = this.stickToBottom,
    n = e.scrollTop;
  this.isRenderingMessages = !0;
  this.activityItemEl = void 0;
  this.activityDetailsEl = void 0;
  this.activityLabelEl = void 0;
  this.liveThinkingDetailsEl = void 0;
  this.liveThinkingTextEl = void 0;
  this.liveThinkingSetExpanded = void 0;
  this.unloadMessageRenderComponents();
  e.empty();
  let s = this.plugin.messages;
  if (s.length === 0) {
    this.renderEmptyState();
    this.restoreMessagesScroll(e, t, n);
    this.isRenderingMessages = !1;
    return;
  }
  for (let a = 0; a < s.length; a++) this.renderMessage(s[a], a);
  if (this.running && this.streamingAssistantContent) this.renderStreamingAssistantMessage();
  else if (this.running && this.activityText) this.renderActivityMessage();
  this.restoreMessagesScroll(e, t, n);
  this.isRenderingMessages = !1;
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
  if (e.role === "assistant") this.renderToolErrors(n, e.toolErrors);
  const response = n.createDiv({ cls: "pi-agent-message-content" });
  let answer = response;
  if (e.role === "assistant" && e.thinking) {
    const key = `${this.getCurrentThreadId()}:${e.createdAt}`;
    this.renderThinkingDisclosure(
      response,
      e.thinking,
      this.completedThinkingExpansion.get(key) === true,
      (expanded) => this.completedThinkingExpansion.set(key, expanded),
      false,
      "Thinking",
      (container, content) => this.renderPlainMessageContent(container, content)
    );
    answer = response.createDiv({ cls: "pi-agent-message-answer" });
  }
  this.renderPlainMessageContent(answer, e.content);
}

export function renderToolErrors(container, errors) {
  for (const error of Array.isArray(errors) ? errors : [])
    container.createDiv({ cls: "pi-agent-tool-error", text: error });
}

export function renderThinkingDisclosure(
  container,
  thinking,
  expanded,
  onToggle,
  live = false,
  activityLabel = "Thinking",
  renderMarkdown
) {
  const details = container.createEl("details", {
    cls: `pi-agent-thinking-disclosure${live ? " is-live" : ""}`,
    attr: { title: activityLabel }
  });
  let knownExpanded = expanded;
  details.toggleAttribute("open", expanded);
  const summary = details.createEl("summary");
  const chevron = summary.createSpan({ cls: "pi-agent-thinking-chevron" });
  (0, f.setIcon)(chevron, "chevron-right");
  const label = summary.createSpan({
    cls: "pi-agent-thinking-label",
    text: String(activityLabel || "Thinking").toUpperCase(),
    attr: live
      ? { role: "status", "aria-label": `${activityLabel || "Thinking"} in progress` }
      : undefined
  });
  const canRenderMarkdown = Boolean(thinking && renderMarkdown);
  const text = details.createDiv({
    cls: "pi-agent-thinking-content",
    text: canRenderMarkdown ? undefined : thinking
  });
  if (canRenderMarkdown) renderMarkdown(text, thinking);
  details.addEventListener("toggle", () => {
    if (details.open === knownExpanded) return;
    knownExpanded = details.open;
    onToggle?.(details.open);
  });
  return {
    details,
    label,
    text,
    setExpanded(nextExpanded) {
      knownExpanded = nextExpanded;
      details.toggleAttribute("open", nextExpanded);
    }
  };
}

export function handleMessageLinkClick(event) {
  const link = event?.target?.closest?.("a.internal-link");
  if (!link) return false;
  const href = link.getAttribute("data-href") || link.getAttribute("href");
  if (!href) return false;
  event.preventDefault?.();
  event.stopPropagation?.();
  this.openVaultLink(href, event.metaKey === true || event.ctrlKey === true);
  return true;
}

export function renderPlainMessageContent(container, content) {
  container.empty();
  container.addClass("markdown-rendered");

  this.messageRenderComponentByElement ??= new WeakMap();
  const previousComponent = this.messageRenderComponentByElement.get(container);
  if (previousComponent) {
    previousComponent.unload();
    const previousIndex = this.messageRenderComponents.indexOf(previousComponent);
    if (previousIndex !== -1) this.messageRenderComponents.splice(previousIndex, 1);
  }

  const component = new f.Component();
  component.load();
  this.messageRenderComponents.push(component);
  this.messageRenderComponentByElement.set(container, component);

  return f.MarkdownRenderer.render(
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
  this.messageRenderComponentByElement = new WeakMap();
}

export function renderStreamingAssistantMessage() {
  if (!this.messagesEl) return;
  const item = this.messagesEl.createDiv({
    cls: "pi-agent-message pi-agent-message-assistant pi-agent-message-streaming"
  });
  this.streamingItemEl = item;
  this.activityItemEl = item;
  this.renderRoleLabel(item, "pi");
  const response = item.createDiv({
    cls: "pi-agent-message-content pi-agent-message-content-streaming"
  });
  const rendered = this.renderThinkingDisclosure(
    response,
    this.streamingThinkingContent,
    this.thinkingDisclosureExpanded,
    (expanded) => this.setLiveThinkingExpanded(expanded),
    true,
    this.activityText || "Responding",
    (container, content) => this.renderPlainMessageContent(container, content)
  );
  this.activityDetailsEl = rendered.details;
  this.activityLabelEl = rendered.label;
  this.liveThinkingDetailsEl = rendered.details;
  this.liveThinkingTextEl = rendered.text;
  this.liveThinkingSetExpanded = rendered.setExpanded;
  this.streamingTextEl = response.createDiv({ cls: "pi-agent-message-answer" });
  this.renderStreamingAnswer();
}

export function renderStreamingAnswer() {
  if (!this.streamingTextEl?.isConnected && this.streamingTextEl?.isConnected !== undefined) return;
  this.renderPlainMessageContent(this.streamingTextEl, this.streamingAssistantContent);
  this.streamingTextEl.createSpan({ cls: "pi-agent-typing-cursor", text: "\u258C" });
}

export function renderActivityMessage() {
  if (!this.messagesEl) return;
  const item = this.messagesEl.createDiv({
    cls: "pi-agent-message pi-agent-message-assistant pi-agent-message-activity"
  });
  this.activityItemEl = item;
  this.renderRoleLabel(item, "pi");
  const response = item.createDiv({ cls: "pi-agent-message-content" });
  const rendered = this.renderThinkingDisclosure(
    response,
    this.streamingThinkingContent,
    this.streamingThinkingContent ? this.thinkingDisclosureExpanded : false,
    (expanded) => this.setLiveThinkingExpanded(expanded),
    true,
    this.activityText || "Thinking",
    (container, content) => this.renderPlainMessageContent(container, content)
  );
  this.activityDetailsEl = rendered.details;
  this.activityLabelEl = rendered.label;
  this.liveThinkingDetailsEl = rendered.details;
  this.liveThinkingTextEl = rendered.text;
  this.liveThinkingSetExpanded = rendered.setExpanded;
}

export function renderRoleLabel(e, t, n, s) {
  let a = e.createDiv({ cls: "pi-agent-message-role" }),
    o = a.createSpan({ cls: "pi-agent-message-role-title" }),
    l = o.createSpan({
      cls: `pi-agent-role-icon pi-agent-role-icon-${t}`
    });
  if (t === "user") {
    (0, f.setIcon)(l, "user");
    o.createSpan({ text: "You" });
  } else {
    this.renderPiIcon(l);
    o.createSpan({ text: "Agent" });
  }
  if (n && s !== void 0) {
    let u = a.createEl("button", {
      cls: "clickable-icon pi-agent-message-actions",
      attr: { "aria-label": "Message actions" }
    });
    (0, f.setIcon)(u, "ellipsis");
    u.addEventListener("click", (g) => {
      var m;
      g.preventDefault();
      g.stopPropagation();
      if ((m = this.messageActions) != null) m.showMessageMenu(g, n, s);
    });
  }
}
