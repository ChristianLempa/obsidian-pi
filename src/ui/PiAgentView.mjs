import * as f from "obsidian";
import { formatContextUsageBadge, formatTokenCount } from "../pi/token-usage.mjs";
import {
  PI_AGENT_DISPLAY_NAME as Ce,
  PI_AGENT_ICON_ID as I,
  PI_AGENT_VIEW_TYPE as T
} from "../plugin/constants.mjs";

import { MessageActions } from "./message-actions.mjs";
import { NoteActions } from "./note-actions.mjs";
import * as promptQueueMethods from "./prompt-queue.mjs";
import * as threadListMethods from "./thread-list-view.mjs";
import * as vaultLinkMethods from "./vault-link-actions.mjs";
import * as messageRendererMethods from "./message-renderer.mjs";
import * as runActivityMethods from "./run-activity-state.mjs";
import { RunSettingsControls } from "./run-settings.mjs";
import { ComposerSuggestions } from "./suggestions.mjs";
import { ThreadActions } from "./thread-actions.mjs";
import { getCurrentRunMetadata } from "./view/run-metadata.mjs";
import {
  fileToPromptImage,
  imagePreviewUrl,
  modelSupportsImages,
  SUPPORTED_IMAGE_MIME_TYPES
} from "./prompt-payload.mjs";
import { formatToolError, getThinkingDelta } from "./activity.mjs";
import { getSendActionState } from "./send-state.mjs";

export class PiAgentView extends f.ItemView {
  constructor(e, t) {
    super(e);
    this.plugin = t;
    this.running = !1;
    this.canceling = !1;
    this.composerBarExpanded = !1;
    this.activityText = "Thinking";
    this.activityKind = "thinking";
    this.activityDetail = "";
    this.activityStickyUntil = 0;
    this.pendingActivity = void 0;
    this.pendingActivityTimer = void 0;
    this.isRenderingMessages = !1;
    this.activeToolCalls = new Map();
    this.currentRunContextUsage = void 0;
    this.invalidatedContextThreadIds = new Set();
    this.streamingAssistantContent = "";
    this.promptQueue = this.plugin.getLocalPromptQueue();
    this.composerImages = [];
    this.nativePiQueue = undefined;
    this.steeringPromptIds = new Set();
    this.streamingThinkingContent = "";
    this.thinkingDisclosureExpanded = false;
    this.thinkingDisclosureUserSet = false;
    this.completedThinkingExpansion = new Map();
    this.messageRenderComponents = [];
    this.activeRuns = new Map();
    this.activeEditorScrollSnapshot = void 0;
    this.stickToBottom = !0;
  }
  getViewType() {
    return T;
  }
  getDisplayText() {
    return this.plugin.extensionTitle || Ce;
  }
  getIcon() {
    return I;
  }
  async onOpen() {
    this.registerDomEvent(document, "keydown", (e) => {
      (this.syncCurrentRunFlags(),
        e.key !== "Escape" || !this.running || (e.preventDefault(), this.cancelCurrentRun()));
    });
    this.registerEvent(
      this.plugin.app.workspace.on("file-open", () => {
        this.renderToolBadges();
      })
    );
    this.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => {
        this.renderToolBadges();
      })
    );
    this.registerEvent(
      this.plugin.app.vault.on("modify", (e) => {
        this.handleVaultFileModify(e);
      })
    );
    this.renderChatView();
    this.plugin.refreshCommandCatalog(false);
  }
  renderChatView() {
    this.showingThreadList = !1;
    let currentThreadId = this.getCurrentThreadId();
    if (this.renderedThreadId !== currentThreadId) this.resetTransientRunUiState();
    this.renderedThreadId = currentThreadId;
    this.syncCurrentRunFlags();
    this.cleanupComposerBarObserver();
    let e = this.containerEl.children[1];
    (e.empty(),
      e.addClass("pi-agent-view"),
      (this.noteActions = new NoteActions(this.plugin, {
        parseVaultLinkTarget: (c) => this.parseVaultLinkTarget(c),
        formatVaultLinkTarget: (c) => this.formatVaultLinkTarget(c),
        openVaultLink: (c) => this.openVaultLink(c)
      })),
      (this.messageActions = new MessageActions(this.plugin, {
        getInput: () => this.inputEl,
        runPrompt: (c) => {
          this.runPrompt(c);
        },
        insertIntoCurrentNote: (c) => {
          var p;
          return (p = this.noteActions) == null ? void 0 : p.insertIntoCurrentNote(c);
        },
        createNoteFromResponse: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.createNoteFromResponse(c)) != null
            ? v
            : Promise.resolve();
        },
        openCitedNotes: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.openCitedNotes(c)) != null
            ? v
            : Promise.resolve();
        },
        extractVaultLinks: (c) => {
          var p, v;
          return (v = (p = this.noteActions) == null ? void 0 : p.extractVaultLinks(c)) != null
            ? v
            : [];
        },
        getPreviousUserPrompt: (c) => {
          var p;
          return (p = this.noteActions) == null ? void 0 : p.getPreviousUserPrompt(c);
        }
      })),
      (this.threadMenu = new ThreadActions(this.plugin, {
        renderThreadTitle: () => this.renderThreadTitle(),
        renderMessages: () => this.renderMessages(),
        renderToolBadges: () => this.renderToolBadges(),
        resetThreadUiState: () => {
          this.renderedThreadId = this.getCurrentThreadId();
          this.resetTransientRunUiState();
          this.syncCurrentRunFlags();
          this.renderPromptQueue();
          this.setRunningState(this.running);
        }
      })));
    let t = e.createDiv({ cls: "pi-agent-header" }),
      n = t.createDiv({ cls: "pi-agent-brand" }),
      s = n.createSpan({
        cls: "pi-agent-brand-icon",
        attr: { title: "Pi Agent" }
      });
    (this.renderPiIcon(s),
      (this.threadTitleEl = n.createSpan({
        cls: "pi-agent-thread-title",
        attr: { role: "button", tabindex: "0", title: "Rename chat" }
      })),
      this.threadTitleEl.addEventListener("click", () => this.startThreadTitleRename()),
      this.threadTitleEl.addEventListener("keydown", (c) => {
        (c.key === "Enter" || c.key === " ") && (c.preventDefault(), this.startThreadTitleRename());
      }),
      this.renderThreadTitle());
    let a = t.createDiv({ cls: "pi-agent-header-actions" }),
      favoriteButton = a.createEl("button", {
        cls: "clickable-icon pi-agent-header-action pi-agent-header-favorite"
      }),
      o = a.createEl("button", {
        cls: "clickable-icon pi-agent-header-action",
        attr: { "aria-label": "New chat", title: "New chat" }
      });
    ((this.threadFavoriteEl = favoriteButton),
      (0, f.setIcon)(favoriteButton, "star"),
      this.renderThreadFavorite(),
      favoriteButton.addEventListener("click", () => this.toggleCurrentThreadFavorite()),
      (0, f.setIcon)(o, "plus"),
      o.addEventListener("click", (c) => {
        var p;
        (c.preventDefault(), (p = this.threadMenu) == null || p.startNewChat());
      }));
    let l = a.createEl("button", {
      cls: "clickable-icon pi-agent-header-action",
      attr: { "aria-label": "Fork chat", title: "Fork chat" }
    });
    ((0, f.setIcon)(l, "split"),
      l.addEventListener("click", (c) => {
        var p;
        if ((c.preventDefault(), this.isThreadRunning(this.plugin.getCurrentThread().id))) {
          new f.Notice("Wait for this chat's agent run to finish before forking it.");
          return;
        }
        ((p = this.threadMenu) == null || p.forkChat(), this.renderToolBadges());
      }));
    let u = a.createEl("button", {
      cls: "clickable-icon pi-agent-thread-menu",
      attr: {
        "aria-label": "Manage chat threads",
        title: "Manage chat threads"
      }
    });
    ((0, f.setIcon)(u, "list"),
      u.addEventListener("click", (c) => {
        (c.preventDefault(), this.showThreadList());
      }));
    ((this.messagesEl = e.createDiv({ cls: "pi-agent-messages" })),
      this.messagesEl.addEventListener("scroll", () => {
        if (!this.messagesEl || this.isRenderingMessages) return;
        let c =
          this.messagesEl.scrollHeight - this.messagesEl.scrollTop - this.messagesEl.clientHeight;
        this.stickToBottom = c < 40;
      }));
    let d = e.createDiv({ cls: "pi-agent-composer" });
    ((this.toolBadgesEl = d.createDiv({ cls: "pi-agent-tool-badges" })),
      this.renderToolBadges(),
      (this.promptQueue = this.plugin.getLocalPromptQueue()),
      (this.promptQueueEl = d.createDiv({ cls: "pi-agent-prompt-queue" })),
      this.renderPromptQueue(),
      (this.extensionWidgetsAboveEl = d.createDiv({ cls: "pi-agent-extension-widgets" })),
      (this.composerImagesEl = d.createDiv({ cls: "pi-agent-composer-images" })),
      this.renderComposerImages(),
      (this.inputEl = d.createEl("textarea", {
        placeholder: "Ask the agent about your vault... Enter sends, Shift+Enter adds a line."
      })),
      this.inputEl.addEventListener("keydown", (c) => {
        var p;
        ((p = this.suggestions) != null && p.handleKeydown(c)) ||
          (c.key === "Enter" &&
            !c.shiftKey &&
            !c.isComposing &&
            (c.preventDefault(), this.submitInput()),
          c.key === "Escape" &&
            (this.syncCurrentRunFlags(), this.running) &&
            (c.preventDefault(), this.cancelCurrentRun()));
      }),
      this.inputEl.addEventListener("paste", (event) => this.handleImagePaste(event)),
      this.inputEl.addEventListener("dragover", (event) => {
        if ((event.dataTransfer?.files?.length || 0) > 0) event.preventDefault();
      }),
      this.inputEl.addEventListener("drop", (event) => this.handleImageDrop(event)),
      this.inputEl.addEventListener("input", () => {
        var c;
        (this.syncCurrentRunFlags(),
          this.resizeInput(),
          (c = this.suggestions) == null || c.update(),
          this.setRunningState(this.running));
      }),
      this.inputEl.addEventListener("click", () => {
        var c;
        return (c = this.suggestions) == null ? void 0 : c.update();
      }),
      this.inputEl.addEventListener("blur", () => {
        window.setTimeout(() => {
          var c;
          return (c = this.suggestions) == null ? void 0 : c.close();
        }, 120);
      }),
      (this.suggestions = new ComposerSuggestions(this.inputEl, this.plugin, () =>
        this.resizeInput()
      )),
      (this.extensionWidgetsBelowEl = d.createDiv({ cls: "pi-agent-extension-widgets" })),
      this.renderExtensionWidgets(),
      this.resizeInput());
    this.imageInputEl = d.createEl("input", {
      cls: "pi-agent-image-input",
      attr: { type: "file", accept: SUPPORTED_IMAGE_MIME_TYPES.join(","), multiple: "" }
    });
    this.imageInputEl.addEventListener("change", () => {
      this.addImageFiles(this.imageInputEl?.files);
      if (this.imageInputEl) this.imageInputEl.value = "";
    });
    let h = d.createDiv({ cls: "pi-agent-composer-bar" });
    ((this.composerBarEl = h),
      (this.runSettings = new RunSettingsControls(this.plugin)),
      this.renderImagePicker(h),
      this.runSettings.render(h));
    let m = h.createEl("button", {
      cls: "clickable-icon pi-agent-send-button",
      attr: { "aria-label": "Send message", title: "Send message" }
    });
    ((0, f.setIcon)(m, "send"),
      m.createSpan({ cls: "pi-agent-control-label", text: "Send" }),
      (this.sendButtonEl = m),
      m.addEventListener("click", () => this.handleSendButtonClick()),
      this.observeComposerBar(h),
      this.renderMessages(),
      this.setRunningState(this.running));
  }
  async onClose() {
    var e;
    ((this.messagesEl = void 0),
      (this.inputEl = void 0),
      (this.promptQueueEl = void 0),
      (this.extensionWidgetsAboveEl = void 0),
      (this.extensionWidgetsBelowEl = void 0),
      (this.composerImagesEl = void 0),
      (this.imageInputEl = void 0),
      (this.sendButtonEl = void 0),
      (this.composerBarEl = void 0),
      (this.composerBarExpandEl = void 0),
      (this.runSettings = void 0),
      (this.toolBadgesEl = void 0),
      (this.threadTitleEl = void 0),
      (this.threadFavoriteEl = void 0),
      this.cleanupComposerBarObserver(),
      this.clearPendingActivityTimer(),
      this.unloadMessageRenderComponents(),
      (this.messageActions = void 0),
      (this.noteActions = void 0),
      (this.threadMenu = void 0),
      (e = this.suggestions) == null || e.close(),
      (this.suggestions = void 0));
  }
  renderExtensionWidgets() {
    this.extensionWidgetsAboveEl?.empty();
    this.extensionWidgetsBelowEl?.empty();
    for (const [key, widget] of this.plugin.extensionWidgets ?? []) {
      const target =
        widget.placement === "belowEditor"
          ? this.extensionWidgetsBelowEl
          : this.extensionWidgetsAboveEl;
      if (!target) continue;
      const widgetEl = target.createDiv({ cls: "pi-agent-extension-widget" });
      widgetEl.setAttr("data-widget-key", key);
      for (const line of widget.lines) widgetEl.createDiv({ text: line });
    }
  }
  setExtensionEditorText(text) {
    if (!this.inputEl) return;
    this.inputEl.value = text;
    this.resizeInput();
    this.suggestions?.update();
    this.inputEl.focus();
  }
  renderToolBadges() {
    let e = this.toolBadgesEl;
    if (!e) return;
    e.empty();
    let t = this.plugin.getCurrentContextFile(),
      n = t
        ? { label: `Current: ${t.basename}`, enabled: !0, title: t.path }
        : {
            label: "No current note",
            enabled: !1,
            title: "Open a markdown note to attach it automatically"
          };
    e.createSpan({
      cls: `pi-agent-tool-badge${n.enabled ? " is-enabled" : ""}`,
      text: n.label,
      attr: { title: n.title }
    });
    this.renderToolBadgesContextUsage(e);
  }
  renderToolBadgesContextUsage(e) {
    let t = this.getDisplayedContextUsage(),
      n = t?.compacted
        ? {
            label: `ctx compacted · ?/${formatTokenCount(t.contextWindow || 0)}`,
            title:
              "Pi compacted this session. Exact context usage is unknown until the next model response returns fresh token usage."
          }
        : t
          ? formatContextUsageBadge(t.contextUsage, t.tokenUsage)
          : void 0;
    e.createSpan({
      cls: `pi-agent-tool-badge pi-agent-tool-badge-context${n ? " is-enabled" : ""}`,
      text: n ? n.label : "ctx --",
      attr: {
        title: n
          ? n.title
          : "Context usage appears after Pi returns token usage for the selected model."
      }
    });
  }
  getDisplayedContextUsage() {
    var n;
    if (this.currentRunContextUsage) return this.currentRunContextUsage;
    let e = this.plugin.getCurrentThread();
    if (this.invalidatedContextThreadIds.has(e.id))
      return { compacted: true, contextWindow: this.plugin.getSelectedModelInfo()?.contextWindow };
    let t = (n = e.messages) != null ? n : [];
    for (let s = t.length - 1; s >= 0; s--) {
      let a = t[s];
      if (a.role === "assistant" && a.contextUsage)
        return { contextUsage: a.contextUsage, tokenUsage: a.tokenUsage };
    }
  }
  renderThreadTitle() {
    if (!this.threadTitleEl) return;
    let e = this.plugin.getCurrentThread();
    (this.threadTitleEl.empty(), this.threadTitleEl.createSpan({ text: e.title }));
    this.renderThreadFavorite();
  }
  renderThreadFavorite() {
    if (!this.threadFavoriteEl) return;
    const favorite = this.plugin.getCurrentThread().favorite === true;
    this.threadFavoriteEl.toggleClass("is-favorite", favorite);
    this.threadFavoriteEl.setAttr("aria-pressed", String(favorite));
    this.threadFavoriteEl.setAttr("aria-label", favorite ? "Remove favorite" : "Mark as favorite");
    this.threadFavoriteEl.setAttr("title", favorite ? "Remove favorite" : "Mark as favorite");
  }
  toggleCurrentThreadFavorite() {
    const thread = this.plugin.getCurrentThread();
    if (!this.plugin.toggleThreadFavorite(thread.id)) {
      new f.Notice("Chat thread was not found.");
      return;
    }
    this.renderThreadFavorite();
    this.renderThreadListIfVisible();
  }
  startThreadTitleRename() {
    var a;
    if (!((a = this.threadTitleEl) != null && a.isConnected)) return;
    let e = this.plugin.getCurrentThread();
    (this.threadTitleEl.empty(), this.threadTitleEl.addClass("is-editing"));
    let t = this.threadTitleEl.createEl("input", {
        cls: "pi-agent-thread-title-input",
        attr: { type: "text", value: e.title, "aria-label": "Chat title" }
      }),
      n = (o) => {
        var d;
        let l = t.value.trim();
        ((d = this.threadTitleEl) == null || d.removeClass("is-editing"),
          o && l && l !== e.title && this.plugin.renameThread(e.id, l),
          this.renderThreadTitle());
      },
      s = (o) => {
        o.stopPropagation();
      };
    (t.addEventListener(
      "keydown",
      (o) => {
        (s(o), o.key === "Enter" && n(!0), o.key === "Escape" && n(!1));
      },
      { capture: !0 }
    ),
      t.addEventListener("keypress", s, { capture: !0 }),
      t.addEventListener("keyup", s, { capture: !0 }),
      t.addEventListener("click", (o) => o.stopPropagation()),
      t.addEventListener("blur", () => n(!0)),
      t.focus(),
      t.select());
  }
  async submitInput() {
    var t, n;
    let e = (t = this.inputEl) == null ? void 0 : t.value.trim();
    let images = this.composerImages.map((image) => ({ ...image }));
    if (!e && images.length === 0) return;
    if (images.length > 0) await this.plugin.ensureModelCatalogLoaded();
    if (images.length > 0 && !modelSupportsImages(this.plugin.getSelectedModelInfo())) {
      new f.Notice("The selected Pi model does not support image input.");
      return;
    }
    (this.inputEl && (this.inputEl.value = ""),
      (this.composerImages = []),
      this.renderComposerImages(),
      (n = this.suggestions) == null || n.close(),
      this.resizeInput(),
      this.syncCurrentRunFlags(),
      this.running
        ? this.enqueuePrompt(e, this.plugin.getCurrentThread().id, images)
        : this.runPrompt(e, undefined, images),
      this.setRunningState(this.running));
  }
  handleSendButtonClick() {
    var t;
    this.syncCurrentRunFlags();
    if (
      this.running &&
      !((t = this.inputEl) != null && t.value.trim()) &&
      this.composerImages.length === 0
    ) {
      this.cancelCurrentRun();
      return;
    }
    this.submitInput();
  }
  cancelCurrentRun() {
    this.syncCurrentRunFlags();
    let e = this.getCurrentThreadRun();
    e &&
      !e.canceling &&
      ((e.canceling = !0),
      (this.canceling = !0),
      this.setActivity("Canceling", "finishing"),
      this.plugin.cancelPiRun(e.runner),
      this.setRunningState(!0),
      this.renderThreadListIfVisible());
  }
  finishCanceledRun() {
    ((this.running = !1),
      (this.canceling = !1),
      (this.streamingAssistantContent = ""),
      (this.streamingThinkingContent = ""),
      (this.thinkingDisclosureExpanded = false),
      (this.thinkingDisclosureUserSet = false),
      (this.streamingItemEl = void 0),
      (this.streamingTextEl = void 0),
      (this.activityText = ""),
      (this.activityDetail = ""),
      (this.activityStickyUntil = 0),
      (this.pendingActivity = void 0),
      this.clearPendingActivityTimer(),
      this.activeToolCalls.clear(),
      (this.currentRunContextUsage = void 0),
      (this.runningThreadId = void 0),
      (this.activeEditorScrollSnapshot = void 0),
      this.plugin.cancelPiRun(),
      this.renderPromptQueue(),
      this.setRunningState(!1),
      this.renderMessages(),
      this.renderToolBadges());
  }
  cleanupComposerBarObserver() {
    this.composerBarCleanup && (this.composerBarCleanup(), (this.composerBarCleanup = void 0));
  }
  observeComposerBar(e) {
    this.cleanupComposerBarObserver();
    let t = () => this.updateComposerBarMode(e.clientWidth);
    if ((t(), typeof ResizeObserver == "undefined")) {
      window.addEventListener("resize", t);
      let n = !1,
        s = () => {
          n || ((n = !0), window.removeEventListener("resize", t));
        };
      ((this.composerBarCleanup = s), this.register(s));
      return;
    }
    let n = new ResizeObserver((a) => {
        var l, d;
        let o = (d = (l = a[0]) == null ? void 0 : l.contentRect.width) != null ? d : e.clientWidth;
        this.updateComposerBarMode(o);
      }),
      s = !1,
      a = () => {
        s || ((s = !0), n.disconnect());
      };
    (n.observe(e), (this.composerBarCleanup = a), this.register(a));
  }
  updateComposerBarMode(e) {
    let t = this.composerBarEl;
    if (!t) return;
    let n = e < 560,
      s = e < 390;
    (!n && this.composerBarExpanded && (this.composerBarExpanded = !1),
      t.toggleClass("is-compact", n),
      t.toggleClass("is-narrow", s),
      this.updateComposerBarExpansion());
  }
  updateComposerBarExpansion() {
    let e = this.composerBarEl,
      t = this.composerBarExpandEl;
    if (!e || !t) return;
    let n = this.composerBarExpanded && e.hasClass("is-compact");
    (e.toggleClass("is-expanded", n),
      t.setAttr("aria-label", n ? "Collapse run options" : "Expand run options"),
      t.setAttr("title", n ? "Collapse run options" : "Expand run options"),
      (0, f.setIcon)(t, n ? "chevrons-right" : "chevrons-left"));
  }
  renderImagePicker(parent) {
    const button = parent.createEl("button", {
      cls: "clickable-icon pi-agent-image-button",
      attr: { "aria-label": "Attach images", title: "Attach PNG, JPEG, or WebP images" }
    });
    f.setIcon(button, "image-plus");
    button.addEventListener("click", () => this.imageInputEl?.click());
  }
  getImageFiles(files) {
    return [...(files || [])].filter((file) => SUPPORTED_IMAGE_MIME_TYPES.includes(file.type));
  }
  async addImageFiles(files) {
    const imageFiles = [...(files || [])];
    if (imageFiles.length === 0) return;
    await this.plugin.ensureModelCatalogLoaded();
    if (!modelSupportsImages(this.plugin.getSelectedModelInfo())) {
      new f.Notice("The selected Pi model does not support image input.");
      return;
    }
    try {
      const images = await Promise.all(imageFiles.map(fileToPromptImage));
      this.composerImages.push(...images);
      this.renderComposerImages();
      this.setRunningState(this.running);
    } catch (error) {
      new f.Notice(error instanceof Error ? error.message : String(error));
    }
  }
  handleImagePaste(event) {
    const files = this.getImageFiles(event.clipboardData?.files);
    if (files.length === 0) return;
    event.preventDefault();
    this.addImageFiles(files);
  }
  handleImageDrop(event) {
    const files = [...(event.dataTransfer?.files || [])];
    if (files.length === 0) return;
    event.preventDefault();
    this.addImageFiles(files);
  }
  renderComposerImages() {
    if (!this.composerImagesEl) return;
    this.composerImagesEl.empty();
    this.composerImagesEl.toggleClass("is-empty", this.composerImages.length === 0);
    for (const image of this.composerImages) {
      const preview = this.composerImagesEl.createDiv({ cls: "pi-agent-composer-image" });
      preview.createEl("img", {
        attr: { src: imagePreviewUrl(image), alt: image.fileName || "Attached image" }
      });
      const remove = preview.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": `Remove ${image.fileName || "image"}`, title: "Remove image" }
      });
      f.setIcon(remove, "x");
      remove.addEventListener("click", () => {
        this.composerImages = this.composerImages.filter((item) => item.id !== image.id);
        this.renderComposerImages();
      });
    }
  }
  resizeInput() {
    this.inputEl &&
      ((this.inputEl.style.height = "auto"),
      (this.inputEl.style.height = `${Math.min(this.inputEl.scrollHeight, 160)}px`));
  }
  getCurrentThreadId() {
    var e;
    return (e = this.plugin.getCurrentThread()) == null ? void 0 : e.id;
  }
  isCurrentThread(e) {
    return this.getCurrentThreadId() === e;
  }
  isThreadRunning(e) {
    return this.activeRuns.has(e);
  }
  getCurrentThreadRun() {
    let e = this.getCurrentThreadId();
    return e ? this.activeRuns.get(e) : void 0;
  }
  syncCurrentRunFlags() {
    let e = this.getCurrentThreadRun();
    ((this.running = !!e), (this.canceling = e?.canceling === !0));
  }
  resetTransientRunUiState() {
    ((this.activityText = ""),
      (this.activityKind = "thinking"),
      (this.activityDetail = ""),
      (this.activityStickyUntil = 0),
      (this.pendingActivity = void 0),
      this.clearPendingActivityTimer(),
      this.activeToolCalls.clear(),
      (this.currentRunContextUsage = void 0),
      (this.streamingAssistantContent = ""),
      (this.streamingThinkingContent = ""),
      (this.thinkingDisclosureExpanded = false),
      (this.thinkingDisclosureUserSet = false),
      (this.streamingItemEl = void 0),
      (this.streamingTextEl = void 0));
  }
  renderThreadListIfVisible() {
    this.showingThreadList && this.renderThreadList();
  }
  async runPrompt(e, t = this.plugin.getCurrentThread().id, images = [], queuedId) {
    if (this.isThreadRunning(t)) {
      if (queuedId) {
        this.promptQueue = this.promptQueue.map((item) =>
          item.id === queuedId ? { ...item, state: "pending" } : item
        );
        this.plugin.replaceLocalPromptQueue(this.promptQueue);
        this.renderPromptQueue();
      } else {
        this.enqueuePrompt(e, t, images);
      }
      return;
    }
    let delivery;
    try {
      delivery = await this.plugin.enrichPromptDelivery(
        { prompt: e, images },
        { mode: "prompt", threadId: t }
      );
    } catch (error) {
      if (queuedId) {
        this.promptQueue = this.promptQueue.map((item) =>
          item.id === queuedId ? { ...item, state: "pending" } : item
        );
        this.plugin.replaceLocalPromptQueue(this.promptQueue);
        this.renderPromptQueue();
      }
      new f.Notice(error instanceof Error ? error.message : String(error));
      return;
    }
    e = String(delivery.prompt || "").trim();
    images = delivery.images || [];
    if (!e && images.length === 0) {
      if (queuedId) {
        this.promptQueue = this.promptQueue.map((item) =>
          item.id === queuedId ? { ...item, state: "pending" } : item
        );
        this.plugin.replaceLocalPromptQueue(this.promptQueue);
        this.renderPromptQueue();
        new f.Notice("The queued message became empty and was not sent.");
      }
      return;
    }
    if (images.length > 0) await this.plugin.ensureModelCatalogLoaded();
    if (images.length > 0 && !modelSupportsImages(this.plugin.getSelectedModelInfo())) {
      if (queuedId) {
        this.promptQueue = this.promptQueue.map((item) =>
          item.id === queuedId ? { ...item, state: "pending" } : item
        );
        this.plugin.replaceLocalPromptQueue(this.promptQueue);
        this.renderPromptQueue();
      }
      new f.Notice("The selected Pi model does not support image input.");
      return;
    }
    if (this.isThreadRunning(t)) {
      if (queuedId) {
        this.promptQueue = this.promptQueue.map((item) =>
          item.id === queuedId ? { ...item, state: "pending" } : item
        );
        this.plugin.replaceLocalPromptQueue(this.promptQueue);
        this.renderPromptQueue();
      } else {
        this.enqueuePrompt(e, t, images);
      }
      return;
    }
    let n = {
      canceling: false,
      runner: this.plugin.createPiRunner(t),
      accepted: false,
      thinking: "",
      thinkingExpanded: false,
      thinkingUserSet: false,
      toolErrors: []
    };
    let skipQueueDrain = false;
    const addUserMessage = () => {
      if (n.userMessageAdded) return;
      n.userMessageAdded = true;
      this.plugin.addMessageToThread(t, {
        role: "user",
        content: e || `[${images.length} attached image${images.length === 1 ? "" : "s"}]`,
        createdAt: Date.now()
      });
      if (this.isCurrentThread(t)) {
        this.renderThreadTitle();
        this.renderMessages();
      }
    };
    const acknowledgeQueuedDelivery = () => {
      addUserMessage();
      if (!queuedId || n.accepted) return;
      n.accepted = true;
      this.promptQueue = this.promptQueue.filter((item) => item.id !== queuedId);
      this.plugin.replaceLocalPromptQueue(this.promptQueue);
      this.renderPromptQueue();
    };
    (this.activeRuns.set(t, n),
      this.syncCurrentRunFlags(),
      (this.runningThreadId = t),
      (this.running = this.isCurrentThread(t)),
      (this.canceling = !1),
      (this.activityText = "Preparing context"),
      (this.activityKind = "context"),
      (this.activityDetail =
        "Collecting current note, links, backlinks, and explicit attachments."),
      (this.activityStickyUntil = 0),
      (this.pendingActivity = void 0),
      this.clearPendingActivityTimer(),
      this.activeToolCalls.clear(),
      (this.currentRunContextUsage = void 0),
      (this.streamingAssistantContent = ""),
      (this.streamingThinkingContent = ""),
      (this.thinkingDisclosureExpanded = false),
      (this.thinkingDisclosureUserSet = false),
      (this.activeEditorScrollSnapshot = this.isCurrentThread(t)
        ? this.getActiveEditorScrollSnapshot()
        : this.activeEditorScrollSnapshot),
      (this.stickToBottom = !0),
      this.setRunningState(this.running),
      !queuedId && addUserMessage());
    this.renderThreadListIfVisible();
    let s = getCurrentRunMetadata(this.plugin.settings);
    try {
      let a = await this.plugin.runPiPrompt(
        e,
        {
          isCanceled: () => n.canceling,
          onEvent: (o) => {
            const thinkingDelta = getThinkingDelta(o);
            if (thinkingDelta) {
              n.thinking += thinkingDelta;
              if (!n.thinkingUserSet) n.thinkingExpanded = true;
            }
            const toolError = formatToolError(o);
            if (toolError && n.toolErrors[n.toolErrors.length - 1] !== toolError)
              n.toolErrors.push(toolError);
            if (!this.isCurrentThread(t)) return;
            this.streamingThinkingContent = n.thinking;
            this.thinkingDisclosureExpanded = n.thinkingExpanded;
            this.thinkingDisclosureUserSet = n.thinkingUserSet;
            this.handleRunEvent(o);
            if (thinkingDelta) this.appendStreamingThinkingDelta(thinkingDelta);
          },
          onTextDelta: (o) => {
            if (!n.thinkingUserSet) n.thinkingExpanded = false;
            if (!this.isCurrentThread(t)) return;
            this.thinkingDisclosureExpanded = n.thinkingExpanded;
            this.liveThinkingSetExpanded?.(n.thinkingExpanded);
            this.appendStreamingDelta(o);
          },
          onPromptAccepted: acknowledgeQueuedDelivery
        },
        t,
        n.runner,
        images
      );
      acknowledgeQueuedDelivery();
      const createdAt = Date.now();
      const thinkingKey = `${t}:${createdAt}`;
      this.completedThinkingExpansion.set(
        thinkingKey,
        n.thinkingUserSet ? n.thinkingExpanded : false
      );
      ((this.streamingAssistantContent = ""),
        (this.streamingThinkingContent = ""),
        (this.streamingItemEl = void 0),
        (this.streamingTextEl = void 0),
        this.plugin.addMessageToThread(t, {
          role: "assistant",
          content: a.finalResponse,
          createdAt,
          contextUsage: a.contextUsage,
          tokenUsage: a.tokenUsage,
          runMetadata: s,
          thinking: n.thinking || undefined,
          toolErrors: n.toolErrors.length > 0 ? n.toolErrors : undefined
        }),
        a.contextUsage && !a.contextCompacted && this.invalidatedContextThreadIds.delete(t),
        a.contextCompacted && this.invalidatedContextThreadIds.add(t),
        this.isCurrentThread(t) &&
          (this.renderThreadTitle(), this.renderMessages(), this.renderToolBadges()));
    } catch (a) {
      let o = a instanceof Error ? a.message : String(a);
      if (queuedId && !n.accepted) {
        this.promptQueue = this.promptQueue.map((item) =>
          item.id === queuedId ? { ...item, state: "pending" } : item
        );
        this.plugin.replaceLocalPromptQueue(this.promptQueue);
        skipQueueDrain = true;
      }
      if (o === "Pi run canceled.") {
        new f.Notice("Agent run canceled.");
        return;
      }
      (this.plugin.addMessageToThread(t, {
        role: "assistant",
        content: `Agent run failed: ${o}`,
        createdAt: Date.now(),
        thinking: n.thinking || undefined,
        toolErrors: n.toolErrors.length > 0 ? n.toolErrors : undefined
      }),
        this.isCurrentThread(t) &&
          (this.renderThreadTitle(), this.renderMessages(), this.renderToolBadges()),
        new f.Notice(o));
    } finally {
      (this.activeRuns.delete(t),
        this.syncCurrentRunFlags(),
        (this.running = this.isThreadRunning(this.plugin.getCurrentThread().id)),
        (this.canceling = this.getCurrentThreadRun()?.canceling === !0),
        (this.streamingAssistantContent = ""),
        (this.streamingThinkingContent = ""),
        (this.thinkingDisclosureExpanded = false),
        (this.thinkingDisclosureUserSet = false),
        (this.activityStickyUntil = 0),
        (this.pendingActivity = void 0),
        this.clearPendingActivityTimer(),
        this.activeToolCalls.clear(),
        (this.activityText = ""),
        (this.activityDetail = ""),
        (this.currentRunContextUsage = void 0),
        this.isCurrentThread(t) && (this.nativePiQueue = void 0),
        this.activeEditorScrollSnapshot &&
          this.scheduleEditorScrollRestore(this.activeEditorScrollSnapshot.path),
        (this.activeEditorScrollSnapshot = void 0),
        this.renderPromptQueue(),
        (this.runningThreadId = void 0),
        this.setRunningState(this.running),
        this.isCurrentThread(t) && (this.renderMessages(), this.renderToolBadges()),
        this.renderThreadListIfVisible(),
        this.plugin.rebuildServicesIfPending(),
        !skipQueueDrain && this.runNextQueuedPrompt());
    }
  }
  getActiveEditorScrollSnapshot() {
    var s;
    let e = this.plugin.app.workspace.activeEditor,
      t = e == null ? void 0 : e.file,
      n = e == null ? void 0 : e.editor;
    if (!t || !n) return void 0;
    try {
      return { path: t.path, ...n.getScrollInfo(), createdAt: Date.now() };
    } catch {
      return (s = this.activeEditorScrollSnapshot) != null ? s : void 0;
    }
  }
  handleVaultFileModify(e) {
    this.syncCurrentRunFlags();
    if (!(e instanceof f.TFile) || !this.running || e.extension !== "md") return;
    this.scheduleEditorScrollRestore(e.path);
  }
  scheduleEditorScrollRestore(e) {
    let t = this.activeEditorScrollSnapshot;
    if (!t || t.path !== e) return;
    for (let n of [0, 50, 150])
      window.setTimeout(() => {
        this.restoreEditorScroll(t);
      }, n);
  }
  restoreEditorScroll(e) {
    let t = this.plugin.app.workspace.activeEditor,
      n = t == null ? void 0 : t.file,
      s = t == null ? void 0 : t.editor;
    if (!n || !s || n.path !== e.path) return;
    try {
      s.scrollTo(e.left, e.top);
    } catch (a) {
      console.warn("Pi Agent: failed to restore editor scroll after external file change", a);
    }
  }
  appendStreamingThinkingDelta(e) {
    if (!e) return;
    if (!this.liveThinkingTextEl || !this.liveThinkingTextEl.isConnected) {
      this.renderMessages();
      return;
    }
    this.liveThinkingTextEl.appendText(e);
    if (this.messagesEl && this.stickToBottom)
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
  setLiveThinkingExpanded(expanded) {
    const run = this.getCurrentThreadRun();
    this.thinkingDisclosureExpanded = expanded;
    this.thinkingDisclosureUserSet = true;
    if (run) {
      run.thinkingExpanded = expanded;
      run.thinkingUserSet = true;
    }
  }
  appendStreamingDelta(e) {
    if (e) {
      if (
        ((this.activityText = ""),
        (this.activityDetail = ""),
        (this.activityStickyUntil = 0),
        (this.pendingActivity = void 0),
        this.clearPendingActivityTimer(),
        (this.streamingAssistantContent += e),
        !this.streamingTextEl)
      ) {
        this.renderMessages();
        return;
      }
      (this.streamingTextEl.appendText(e),
        this.messagesEl &&
          this.stickToBottom &&
          (this.messagesEl.scrollTop = this.messagesEl.scrollHeight));
    }
  }
  setRunningState(e) {
    const hasInput = !!this.inputEl?.value.trim() || this.composerImages.length > 0;
    const action = getSendActionState({
      running: e,
      canceling: this.canceling,
      hasInput,
      queuedCount: this.promptQueue.length
    });
    if (!this.sendButtonEl) return;
    this.sendButtonEl.empty();
    (0, f.setIcon)(this.sendButtonEl, action.icon);
    this.sendButtonEl.createSpan({ cls: "pi-agent-control-label", text: action.label });
    this.sendButtonEl.toggleAttribute("disabled", action.disabled);
    this.sendButtonEl.setAttr("aria-label", action.ariaLabel);
    this.sendButtonEl.setAttr(
      "title",
      action.titleSuffix ? `${action.ariaLabel}. ${action.titleSuffix}` : action.ariaLabel
    );
    for (const state of ["send", "queue", "cancel", "canceling"])
      this.sendButtonEl.toggleClass(`is-${state}`, action.state === state);
  }
  renderPiIcon(e) {
    (0, f.setIcon)(e, I);
  }
}

Object.assign(
  PiAgentView.prototype,
  promptQueueMethods,
  threadListMethods,
  vaultLinkMethods,
  messageRendererMethods,
  runActivityMethods
);
