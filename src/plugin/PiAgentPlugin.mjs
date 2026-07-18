import fs from "node:fs";
import * as P from "obsidian";
import { AnnotationStore } from "../annotations/annotation-store.mjs";
import { MarkdownAnnotationsController } from "../annotations/markdown-annotations-controller.mjs";
import { ContextBuilder } from "../context/context-builder.mjs";
import { formatContextShowResponse, isContextShowPrompt } from "../context/context-show.mjs";
import { normalizeSkillFolderList } from "../context/skills.mjs";
import { VaultGraph } from "../context/vault-graph.mjs";
import { checkPiInstallation, warmupPiCli } from "../pi/health.mjs";
import { PiCommandCatalog } from "../pi/command-catalog.mjs";
import { createExtensionUiHandler } from "../pi/extension-ui.mjs";
import { PiModelCatalog } from "../pi/model-catalog.mjs";
import { getCompactInstructions, PiRunner } from "../pi/runner.mjs";
import { CUSTOM_MODEL_VALUE as b, DEFAULT_SETTINGS as H, normalizeSettings } from "./settings.mjs";
import { PiAgentSettingTab } from "./settings-tab.mjs";
import {
  PI_AGENT_DISPLAY_NAME as Ce,
  PI_AGENT_ICON_ID as I,
  PI_AGENT_ICON_SVG as O,
  PI_AGENT_VIEW_TYPE as T
} from "./constants.mjs";
import { ApprovalModal } from "../ui/modals/approval-modal.mjs";
import { PiSetupModal } from "../ui/modals/pi-setup-modal.mjs";
import { showExtensionUiDialog } from "../ui/modals/extension-ui-modal.mjs";
import { PiAgentView } from "../ui/PiAgentView.mjs";
import { requestDesktopNotificationPermission } from "../ui/desktop-notifications.mjs";
import { previewFrontmatterPatch } from "../shared/frontmatter.mjs";
import { sanitizeThreadHistory } from "../shared/thread-history.mjs";
import { ThreadStore } from "../threads/thread-store.mjs";
import {
  enqueueLocalPrompt,
  normalizeLocalPromptQueue,
  removeLocalPrompt,
  restorePersistedLocalPromptQueue,
  updateLocalPrompt
} from "../ui/local-prompt-queue.mjs";
import { applyPromptEnricher } from "../ui/prompt-payload.mjs";
import {
  createRuntimeCatalogSnapshot,
  hasSafeRuntimeCatalog,
  needsRuntimeCatalogRefresh,
  RuntimeCatalogRefreshGate
} from "../ui/model-picker.mjs";

const PI_BRAND_NAME = "Pi";

var be = `# Pi Agent

You are Pi, an agentic AI coding assistant from https://pi.dev, running inside Pi Agent.

The user is working in an Obsidian vault made of Markdown notes, scripts, configs, and sometimes plugin/source-code projects. Treat vault paths, wikilinks, frontmatter, headings, tags, backlinks, outgoing links, and code files as first-class context. The plugin may provide the current note, selected text, backlinks, outgoing links, explicit search results, and explicit @note, #tag, or /command attachments.

Your primary role is agentic coding and technical knowledge work inside the vault: inspect files, reason about systems, propose implementation plans, edit code or Markdown when edit tools are enabled, run commands when shell tools are enabled, and summarize concrete changes.

## Operation modes

- Chat: no Pi CLI tools are enabled. Use only the Obsidian context attached by the plugin and ask for more context when needed.
- Review: read/search/list tools are enabled. Inspect files and explain, review, summarize, or propose changes, but do not modify files.
- Edit: read/search/list plus edit/write tools are enabled. Make focused file changes when the user asks. Shell commands are not available, so ask the user to run tests/builds manually when needed.
- Full agent: Pi's complete tool set is enabled, including extension/custom tools and read/search/list/edit/write/bash. You may run appropriate shell commands for coding tasks, tests, builds, repo inspection, and diagnostics.

Pi CLI tools are controlled by the selected tool mode. They are not an OS-level sandbox. Use tools intentionally, keep edits small, and avoid destructive commands unless explicitly requested and clearly safe.

## Coding behavior

- Before editing code, inspect the relevant files and existing patterns.
- Prefer minimal, reviewable changes over broad rewrites.
- Run targeted tests or build commands when shell tools are enabled and practical; otherwise tell the user what to run.
- Preserve project conventions, formatting, imports, and file organization.
- If a task touches generated files or dependencies, explain why.
- If you cannot safely determine the right implementation, ask a concise clarification or propose a plan first.
- After code edits, summarize changed files, behavior changes, tests/builds run, and any follow-up checks.

## Vault behavior

- Treat every markdown file as user-owned knowledge.
- When the user says "this", "here", "this note", or "this idea", start from the current note and selected text before using broader search context.
- Preserve existing headings, links, aliases, tags, and frontmatter unless the user asks to change them.
- Prefer Obsidian wikilinks for vault references, for example [[Note Name]] or [[path/to/note|label]].
- Do not infer facts that are not present in notes. Say when references are weak or missing.
- If a referenced note, heading, block, or file is not present in the provided context, say it was not found instead of inventing content.
- Preserve Obsidian callouts, embeds, block IDs, footnotes, comments, and dataview/base-related sections unless the user explicitly asks to change them.
- Use Obsidian-friendly Markdown: clear headings, compact bullets, tables only when useful, and callouts only when they improve the note.

## Chat responses

- Be concise and action-oriented.
- Avoid Markdown formatting in chat responses unless the user asks for it or a structured/note-ready response clearly needs it.
- Use wikilinks when mentioning vault notes.

## Frontmatter

- Keep YAML frontmatter compact and stable.
- Common fields: type, status, tags, aliases, created, updated, project, area, source.
- Prefer arrays for tags and aliases.
- Do not delete unknown fields.
- Do not rewrite the entire YAML block unless asked. Add or update only the specific fields needed.
- Preserve existing field names, ordering, quoting style, and unknown system-managed fields as much as possible.

## Backlinks and references

- Use backlinks to understand who depends on the current note.
- Use outgoing links to understand what the current note depends on.
- Use unresolved links as possible missing notes, typos, or future note ideas.
- When researching a topic, start with exact title and alias matches, then tags, then full-text mentions.
- Before renaming, moving, deleting, or substantially changing the meaning of a note, consider backlinks and outgoing links and mention likely affected references.
- When adding new links, prefer existing note titles or aliases discovered from context instead of creating duplicate concepts.

## Obsidian Bases

- Bases are useful when notes share predictable frontmatter.
- A good Base starts from the fields already used in a folder.
- Suggested fields: type, status, tags, project, area, created, updated.
- Propose a Base config before creating it unless the user explicitly asks you to create it immediately.`;
function previewSuggestedFrontmatter(markdown, patch) {
  return previewFrontmatterPatch(markdown, patch);
}
export class PiAgentPlugin extends P.Plugin {
  constructor() {
    super(...arguments);
    this.settings = H;
    this.messages = [];
    this.threadHistory = new ThreadStore();
    this.annotationStore = new AnnotationStore();
    this.dataSaveChain = Promise.resolve();
    this.threadRunners = new Map();
    this.piCommands = [];
    this.commandCatalogLoaded = false;
    this.extensionStatuses = new Map();
    this.extensionWidgets = new Map();
    this.extensionTitle = "";
    this.localPromptQueue = [];
    this.localPromptSteering = [];
    this.localPromptQueuePaused = false;
    this.promptEnricher = undefined;
    this.modelCatalogRefreshGate = new RuntimeCatalogRefreshGate();
    this.modelCatalogRefreshedAt = 0;
    this.modelCatalogGeneration = 0;
    this.modelCatalogError = "";
  }
  async onload() {
    await this.loadSettings();

    if (!P.Platform.isDesktopApp) {
      new P.Notice("Pi Agent is desktop-only.");
      return;
    }

    if (this.settings.desktopNotifications)
      void requestDesktopNotificationPermission().catch(() => {});

    (0, P.addIcon)(I, O);
    this.extensionStatusEl = this.addStatusBarItem();
    this.rebuildServices();
    this.annotationController = new MarkdownAnnotationsController(this);
    this.annotationController.start();

    if (!this.settings.dryRun) {
      warmupPiCli(this.settings.piExecutablePath, this.getPluginDirectory());
    }

    this.refreshModelCatalog(false).catch(() => {});
    this.refreshCommandCatalog(false);
    this.refreshCurrentContextFile();

    this.registerEvent(
      this.app.workspace.on("file-open", (e) => {
        this.setCurrentContextFile(e);
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.refreshCurrentContextFile();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (
          file.extension === "md" &&
          this.annotationStore.list(oldPath).length > 0 &&
          !this.annotationStore.renamePath(oldPath, file.path)
        )
          new P.Notice(
            "Annotations could not follow the renamed note; their original records were kept."
          );
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file.extension === "md") this.annotationStore.deletePath(file.path);
      })
    );
    this.registerView(T, (e) => new PiAgentView(e, this));
    this.addRibbonIcon(I, `Open ${Ce}`, () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-pi",
      name: "Open agent chat",
      callback: () => {
        this.activateView();
      }
    });
    this.addCommand({
      id: "toggle-annotations",
      name: "Add or toggle annotation for active note",
      checkCallback: (checking) =>
        this.runWithActiveMarkdownNote(checking, () => {
          this.annotationController?.handleActiveMarkdownNote();
        })
    });
    this.addCommand({
      id: "check-pi-installation",
      name: `Check ${PI_BRAND_NAME} installation`,
      callback: () => {
        this.checkPiInstallation(true);
      }
    });
    this.addCommand({
      id: "ask-about-current-note",
      name: "Ask about current note",
      checkCallback: (e) =>
        this.runWithActiveMarkdownNote(e, () => {
          this.runCommandPrompt(
            "Use the active note as context. Summarize the key facts, assumptions, and useful follow-up questions."
          );
        })
    });
    this.addCommand({
      id: "research-around-current-note",
      name: "Research around current note",
      checkCallback: (e) =>
        this.runWithActiveMarkdownNote(e, () => {
          this.runCommandPrompt(
            "Research around the active note using backlinks, outgoing links, unresolved links, tags, and search results. Return concise findings with vault references."
          );
        })
    });
    this.addCommand({
      id: "suggest-frontmatter",
      name: "Suggest frontmatter for current note",
      checkCallback: (e) =>
        this.runWithActiveMarkdownNote(e, () => {
          this.suggestFrontmatterForCurrentNote();
        })
    });
    this.addCommand({
      id: "draft-base-from-current-note",
      name: "Draft base from current note context",
      checkCallback: (e) =>
        this.runWithActiveMarkdownNote(e, () => {
          this.runCommandPrompt(
            "Draft an Obsidian Base for notes related to the active note. Infer useful fields from frontmatter, tags, backlinks, and linked notes."
          );
        })
    });
    this.settingsTab = new PiAgentSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
  }
  onunload() {
    this.annotationController?.destroy();
    this.cancelPiRun();
    this.disposeThreadRunners();
  }
  async loadSettings() {
    let e = await this.loadData(),
      {
        chatHistory: t,
        messages: n,
        threadId: s,
        sessionId: a,
        localPromptQueue: q,
        localPromptSteering: steering,
        annotationData,
        ...o
      } = e != null ? e : {};
    this.settings = normalizeSettings(o);
    this.localPromptQueue = restorePersistedLocalPromptQueue(q, steering);
    this.localPromptSteering = [];
    this.localPromptQueuePaused = this.localPromptQueue.length > 0;
    this.settings.additionalSkillFolders = normalizeSkillFolderList(
      this.settings.additionalSkillFolders
    );
    this.threadHistory = new ThreadStore(t, n, a != null ? a : s);
    this.annotationStore = new AnnotationStore(annotationData, () => {
      this.saveAnnotations();
      this.annotationController?.refresh();
      this.refreshAnnotationBadges();
    });
    this.syncCurrentThreadState();
    if (this.settings.model && isLegacyBareModelId(this.settings.model)) {
      this.settings.customModel = `openai/${this.settings.model}`;
      this.settings.model = "__custom";
    }
  }
  async saveSettings() {
    // Invalidate before the first await so an older catalog request cannot win
    // the race against settings persistence or a service restart.
    this.modelCatalogGeneration += 1;
    this.modelCatalogRefreshedAt = 0;
    await this.savePluginData();
    if (this.hasActivePiRuns()) this.pendingServiceRebuild = true;
    else {
      this.rebuildServices();
      this.refreshCommandCatalog(false);
    }
  }
  hasActivePiRuns() {
    return [...this.threadRunners.values()].some((runner) => runner.isRunning);
  }
  rebuildServicesIfPending() {
    if (this.pendingServiceRebuild && !this.hasActivePiRuns()) {
      this.pendingServiceRebuild = false;
      this.rebuildServices();
      this.refreshCommandCatalog(false);
    }
  }
  showPiSetupIfNeeded() {
    if (this.settings.dismissedPiSetup) return;

    window.setTimeout(() => {
      if (!this.settings.dismissedPiSetup) this.checkPiInstallation(false);
    }, 800);
  }
  checkPiInstallation(showSuccess) {
    let e = checkPiInstallation(this.settings.piExecutablePath);
    if (e.ok) {
      showSuccess && new P.Notice(`Pi CLI is available: ${e.version || e.message}`);
      return e;
    }

    showSuccess ? new P.Notice(e.message) : new PiSetupModal(this, e).open();
    return e;
  }
  async refreshModelCatalog(showNotice = false, force = true) {
    if (!force && !needsRuntimeCatalogRefresh(this.settings, this.modelCatalogRefreshedAt)) {
      return { ok: true, stale: false };
    }
    const result = await this.modelCatalogRefreshGate.run(() => this.performModelCatalogRefresh());
    if (showNotice) {
      new P.Notice(
        result.ok
          ? `Loaded ${this.settings.availableModels.length} Pi models; default ${this.settings.effectiveModel}.`
          : this.modelCatalogError
      );
    }
    return result;
  }
  async performModelCatalogRefresh() {
    try {
      while (true) {
        const generation = this.modelCatalogGeneration;
        const catalog = this.catalog;
        if (!catalog) throw new Error("Pi model service is not ready.");

        let models;
        let effectiveConfig;
        try {
          models = await catalog.getAvailableModels(this.getVaultBasePath());
          effectiveConfig = catalog.getEffectiveConfig();
        } catch (error) {
          if (generation !== this.modelCatalogGeneration) continue;
          throw error;
        }
        if (generation !== this.modelCatalogGeneration) continue;

        const snapshot = createRuntimeCatalogSnapshot(models, effectiveConfig);
        this.settings.availableModels = snapshot.availableModels;
        this.settings.effectiveModel = snapshot.effectiveModel;
        this.settings.effectiveReasoning = snapshot.effectiveReasoning;
        if (
          this.settings.model === "__custom" &&
          this.settings.customModel &&
          models.some((model) => model.slug === this.settings.customModel)
        ) {
          this.settings.model = this.settings.customModel;
        }
        if (
          this.settings.model &&
          this.settings.model !== "__custom" &&
          !models.some((model) => model.slug === this.settings.model)
        ) {
          this.settings.model = "";
          this.settings.reasoningEffort = "";
        }

        this.modelCatalogRefreshedAt = Date.now();
        this.modelCatalogError = "";
        await this.savePluginData();
        if (generation !== this.modelCatalogGeneration) continue;

        this.refreshOpenModelControls();
        return { ok: true, stale: false };
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.modelCatalogError = `Could not refresh models from Pi. Check the Pi executable and configuration, then try again. ${detail}`;
      console.warn("Pi Agent: failed to refresh model catalog", error);
      this.refreshOpenModelControls();
      if (hasSafeRuntimeCatalog(this.settings)) return { ok: false, stale: true };
      throw new Error(this.modelCatalogError, { cause: error });
    }
  }
  async ensureRuntimeModelState() {
    const result = await this.refreshModelCatalog(false, false);
    if (!result.ok && this.modelCatalogError) new P.Notice(this.modelCatalogError);
    return result;
  }
  refreshOpenModelControls() {
    for (const leaf of this.app.workspace.getLeavesOfType(T)) {
      leaf.view?.runSettings?.refresh?.();
    }
    this.settingsTab?.display?.();
  }
  async refreshCommandCatalog(showNotice = false) {
    this.commandCatalog || this.rebuildServices();
    try {
      this.piCommands = (await this.commandCatalog?.getCommands(this.getVaultBasePath())) ?? [];
      this.commandCatalogLoaded = true;
      if (showNotice) new P.Notice(`Loaded ${this.piCommands.length} Pi commands.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (showNotice) new P.Notice(message);
      console.warn("Pi Agent: failed to refresh Pi commands", error);
    }
    return this.piCommands;
  }
  getPiCommands() {
    return this.piCommands;
  }
  addMessage(e) {
    return this.addMessageToThread(this.threadHistory.currentThreadId, e);
  }
  addMessageToThread(e, t) {
    let n = this.threadHistory.addMessageToThread(e, t);
    return n ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0) : !1;
  }
  startNewThread(e) {
    let t = this.threadHistory.startNewThread(e);
    return (this.syncCurrentThreadState(), this.saveThreadHistory(), t);
  }
  async forkCurrentThread() {
    const current = this.getCurrentThread();
    if (current.messages.length === 0) return undefined;

    let clonedSession;
    if (current.piSessionId) {
      const runner = this.createPiRunner(current.id);
      try {
        clonedSession = await runner.cloneSession(current.piSessionId);
        if (clonedSession) {
          await runner
            .setSessionName(clonedSession, `${current.title} (fork)`)
            .catch((error) => console.warn("Pi Agent: could not name cloned Pi session", error));
        }
      } finally {
        runner.rpcClient?.dispose();
        this.threadRunners.delete(current.id);
      }
      if (!clonedSession) return undefined;
    }

    const fork = this.threadHistory.forkCurrentThread(clonedSession);
    return fork ? (this.syncCurrentThreadState(), this.saveThreadHistory(), fork) : undefined;
  }
  getCurrentThread() {
    return this.threadHistory.getCurrentThread();
  }
  listThreads(e) {
    return this.threadHistory.listThreads(e);
  }
  async getThreadSessionStats(threadId) {
    const thread = this.threadHistory.getThread(threadId);
    if (!thread?.piSessionId) return undefined;
    return this.createPiRunner(threadId).getSessionStats(thread.piSessionId);
  }
  async exportThreadSession(threadId) {
    const thread = this.threadHistory.getThread(threadId);
    if (!thread?.piSessionId) return undefined;
    return this.createPiRunner(threadId).exportSession(thread.piSessionId);
  }
  async getThreadSessionTree(threadId) {
    const thread = this.threadHistory.getThread(threadId);
    if (!thread?.piSessionId) return undefined;
    return this.createPiRunner(threadId).getSessionTree(thread.piSessionId);
  }
  async getThreadSessionEntries(threadId, since) {
    const thread = this.threadHistory.getThread(threadId);
    if (!thread?.piSessionId) return undefined;
    return this.createPiRunner(threadId).getSessionEntries(thread.piSessionId, since);
  }
  getThreadDisplayMessageCount(e) {
    let t = Array.isArray(e == null ? void 0 : e.messages) ? e.messages.length : 0,
      n = this.countPiSessionChatMessages(e == null ? void 0 : e.piSessionId);
    return Math.max(t, n);
  }
  countPiSessionChatMessages(e) {
    let t = this.pi?.resolveSessionPath(e);
    if (!t || !fs.existsSync(t)) return 0;
    try {
      return fs
        .readFileSync(t, "utf8")
        .split(/\r?\n/)
        .reduce((t, n) => {
          if (!n.trim()) return t;
          try {
            let s = JSON.parse(n),
              a = s == null ? void 0 : s.message;
            return s.type === "message" && (a?.role === "user" || a?.role === "assistant")
              ? t + 1
              : t;
          } catch {
            return t;
          }
        }, 0);
    } catch {
      return 0;
    }
  }
  switchThread(e) {
    return this.threadHistory.switchThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  archiveThread(e = this.threadHistory.currentThreadId) {
    return this.threadHistory.archiveThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  unarchiveThread(e) {
    return this.threadHistory.unarchiveThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  archiveThreads(e) {
    const archivedIds = this.threadHistory.archiveThreads(e);
    if (archivedIds.length > 0) {
      this.syncCurrentThreadState();
      this.saveThreadHistory();
    }
    return { archivedIds, archivedCount: archivedIds.length };
  }
  deleteThread(e, options = {}) {
    const thread = this.threadHistory.getThread(e);
    if (!thread) return false;

    const runner = this.threadRunners.get(e);
    if (runner?.isRunning) return false;

    let sessionPath;
    if (options.deletePiSession && thread.piSessionId) {
      const resolver = runner ?? this.pi;
      sessionPath = resolver?.resolveSessionPath(thread.piSessionId);
      if (!sessionPath || !fs.existsSync(sessionPath)) return false;

      const sessionIsShared = this.threadHistory
        .listThreads({ includeArchived: true })
        .some(
          (other) =>
            other.id !== e &&
            other.piSessionId &&
            resolver.resolveSessionPath(other.piSessionId) === sessionPath
        );
      if (sessionIsShared) return false;
    }

    runner?.rpcClient?.dispose();
    this.threadRunners.delete(e);
    if (sessionPath) {
      try {
        fs.unlinkSync(sessionPath);
      } catch (error) {
        console.warn("Pi Agent: could not delete local Pi session", error);
        return false;
      }
    }

    return this.threadHistory.deleteThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), true)
      : false;
  }
  clearArchivedThreads() {
    let e = this.threadHistory.clearArchivedThreads();
    return e === 0 ? 0 : (this.syncCurrentThreadState(), this.saveThreadHistory(), e);
  }
  renameThread(e, t) {
    const thread = this.threadHistory.getThread(e);
    const renamed = this.threadHistory.renameThread(e, t);
    if (!renamed) return false;

    this.syncCurrentThreadState();
    this.saveThreadHistory();
    if (thread?.piSessionId) {
      const sessionName = this.threadHistory.getThread(e)?.title ?? t;
      this.createPiRunner(e)
        .setSessionName(thread.piSessionId, sessionName)
        .catch((error) => console.warn("Pi Agent: could not rename Pi session", error));
    }
    return true;
  }
  toggleThreadFavorite(e) {
    return this.threadHistory.toggleThreadFavorite(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  getExtensionUiHandler() {
    this.extensionUiHandler ??= createExtensionUiHandler({
      select: (request) => showExtensionUiDialog(this.app, request),
      confirm: (request) => showExtensionUiDialog(this.app, request),
      input: (request) => showExtensionUiDialog(this.app, request),
      editor: (request) => showExtensionUiDialog(this.app, request),
      notify: (request) => {
        const prefix =
          request.notifyType === "error"
            ? "Error: "
            : request.notifyType === "warning"
              ? "Warning: "
              : "";
        new P.Notice(`${prefix}${String(request.message ?? "")}`);
      },
      setStatus: (request) => this.setExtensionStatus(request.statusKey, request.statusText),
      setWidget: (request) =>
        this.setExtensionWidget(request.widgetKey, request.widgetLines, request.widgetPlacement),
      setTitle: (request) => this.setExtensionTitle(request.title),
      set_editor_text: (request) => this.setExtensionEditorText(request.text)
    });
    return this.extensionUiHandler;
  }
  setExtensionStatus(key, text) {
    const statusKey = String(key || "extension");
    if (text === undefined || text === null || text === "")
      this.extensionStatuses.delete(statusKey);
    else this.extensionStatuses.set(statusKey, String(text));
    this.extensionStatusEl?.setText([...this.extensionStatuses.values()].join(" · "));
  }
  setExtensionWidget(key, lines, placement = "aboveEditor") {
    const widgetKey = String(key || "extension");
    if (!Array.isArray(lines)) this.extensionWidgets.delete(widgetKey);
    else
      this.extensionWidgets.set(widgetKey, {
        lines: lines.map(String),
        placement: placement === "belowEditor" ? "belowEditor" : "aboveEditor"
      });
    this.refreshExtensionUiViews();
  }
  setExtensionTitle(title) {
    this.extensionTitle = String(title || "");
    this.refreshExtensionUiViews();
  }
  setExtensionEditorText(text) {
    const leaf = this.app.workspace.getLeavesOfType(T)[0];
    leaf?.view?.setExtensionEditorText?.(String(text ?? ""));
  }
  refreshExtensionUiViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(T)) {
      leaf.view?.renderExtensionWidgets?.();
      leaf.updateHeader?.();
    }
  }
  refreshAnnotationBadges() {
    for (const leaf of this.app.workspace.getLeavesOfType(T)) leaf.view?.renderToolBadges?.();
  }
  async activateView() {
    var n;
    let t = (n = this.app.workspace.getLeavesOfType(T)[0]) != null ? n : null;
    if (!t) {
      if (((t = this.app.workspace.getRightLeaf(!1)), !t)) {
        new P.Notice("Could not open Pi view.");
        return;
      }
      await t.setViewState({ type: T, active: !0 });
    }
    this.app.workspace.revealLeaf(t);
  }
  async runPiPrompt(e, t, n, i = this.pi, images = [], promptContext) {
    var p;
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    if (
      ((!this.graph || !this.contextBuilder || !this.pi) && this.rebuildServices(),
      !this.graph || !this.contextBuilder || !this.pi)
    )
      throw new Error("Pi services are not available.");
    let s = this.getEditorSelection();
    if (getCompactInstructions(e) === undefined && !this.commandCatalogLoaded)
      await this.refreshCommandCatalog(false);
    let a =
      getCompactInstructions(e) === undefined
        ? (promptContext ?? (await this.contextBuilder.build(e, s)))
        : void 0;
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    if (isContextShowPrompt(e)) {
      return {
        finalResponse: formatContextShowResponse(a?.inspection),
        sessionId: n,
        threadId: n,
        events: [],
        contextUsage: undefined,
        contextCompacted: false,
        tokenUsage: undefined
      };
    }
    let o = n ? this.threadHistory.getThread(n) : this.threadHistory.getCurrentThread();
    if (!o) throw new Error("Chat thread no longer exists.");
    if (!i) throw new Error("Pi runner is not available.");
    let l = getPriorThreadHistory(o.messages, e);
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    await this.ensureModelCatalogLoaded();
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    a &&
      ((p = t == null ? void 0 : t.onEvent) == null ||
        p.call(t, {
          type: "context_ready",
          raw: {
            searchResults: a.searchResults.length,
            linkedNeighborhood: a.linkedNeighborhood.length
          }
        }));
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    let h = await i.run(e, a, o.piSessionId, l, t, images);
    return (
      h.sessionId &&
        (this.threadHistory.setThreadPiSessionId(o.id, h.sessionId),
        this.syncCurrentThreadState(),
        this.saveThreadHistory()),
      h
    );
  }
  setPromptEnricher(callback) {
    this.promptEnricher = typeof callback === "function" ? callback : undefined;
  }
  async enrichPromptDelivery(delivery, context) {
    const enriched = await applyPromptEnricher(delivery, this.promptEnricher, context);
    const hasAnnotationSnapshot = Object.prototype.hasOwnProperty.call(enriched, "annotations");
    const promptContext = await this.contextBuilder.build(
      enriched.prompt,
      this.getEditorSelection(),
      {
        ...(hasAnnotationSnapshot ? { annotations: enriched.annotations } : {}),
        activeNotePath: enriched.contextFilePath
      }
    );
    return { ...enriched, promptContext };
  }
  getLocalPromptQueue() {
    return this.localPromptQueue.map((item) => ({
      ...item,
      images: item.images.map((image) => ({ ...image })),
      attachments: item.attachments.map((attachment) => ({ ...attachment })),
      annotations: item.annotations.map((annotation) => ({ ...annotation }))
    }));
  }
  isLocalPromptQueuePaused() {
    return this.localPromptQueuePaused;
  }
  resumeLocalPromptQueue() {
    this.localPromptQueuePaused = false;
  }
  beginLocalPromptSteering(item) {
    if (!this.localPromptSteering.some((candidate) => candidate.id === item.id))
      this.localPromptSteering.push(item);
    this.saveThreadHistory();
  }
  finishLocalPromptSteering(id) {
    this.localPromptSteering = this.localPromptSteering.filter((item) => item.id !== id);
    this.saveThreadHistory();
  }
  replaceLocalPromptQueue(queue) {
    this.localPromptQueue = normalizeLocalPromptQueue(queue, { preserveState: true });
    this.saveThreadHistory();
  }
  enqueueLocalPrompt(item) {
    this.localPromptQueue = enqueueLocalPrompt(this.localPromptQueue, item);
    this.saveThreadHistory();
    return this.localPromptQueue.at(-1);
  }
  updateLocalPrompt(id, patch) {
    this.localPromptQueue = updateLocalPrompt(this.localPromptQueue, id, patch);
    this.saveThreadHistory();
  }
  removeLocalPrompt(id) {
    this.localPromptQueue = removeLocalPrompt(this.localPromptQueue, id);
    this.saveThreadHistory();
  }
  async ensureModelCatalogLoaded() {
    this.settings.availableModels.length === 0 && (await this.refreshModelCatalog(!1));
  }
  getModelInfoForTokenUsage(e) {
    if (!e) return;
    let t = e.modelId || (e.provider && e.model ? `${e.provider}/${e.model}` : "");
    if (t) {
      let n = this.settings.availableModels.find((s) => s.slug === t);
      if (n) return n;
    }
    return e.model
      ? this.settings.availableModels.find((n) => n.slug.endsWith(`/${e.model}`))
      : void 0;
  }
  getSelectedModelInfo(e) {
    let t = this.getModelInfoForTokenUsage(e);
    if (t) return t;
    let n = this.settings.model === b ? this.settings.customModel : this.settings.model;
    n || (n = this.settings.effectiveModel);
    return n ? this.settings.availableModels.find((s) => s.slug === n) : void 0;
  }
  async inspectPiContext(e) {
    if (((!this.graph || !this.contextBuilder) && this.rebuildServices(), !this.contextBuilder))
      throw new Error("Pi context builder is not available.");
    return this.contextBuilder.inspectContext(e, this.getEditorSelection());
  }
  getCurrentContextFile() {
    return (this.refreshCurrentContextFile(), this.currentContextFile);
  }
  cancelPiRun(e) {
    var t;
    (e != null ? e : (t = this.pi) != null ? t : void 0)?.cancelCurrentRun();
  }
  createPiRunner(threadId = this.getCurrentThread().id) {
    (!this.graph || !this.contextBuilder) && this.rebuildServices();
    if (!this.contextBuilder) throw new Error("Pi context builder is not available.");
    const existing = this.threadRunners.get(threadId);
    if (existing) return existing;
    const runner = new PiRunner(
      this.settings,
      this.contextBuilder,
      this.getVaultBasePath(),
      this.getPluginDirectory(),
      undefined,
      this.getExtensionUiHandler()
    );
    this.threadRunners.set(threadId, runner);
    return runner;
  }
  disposeThreadRunners() {
    for (const runner of this.threadRunners.values()) runner.rpcClient?.dispose();
    this.threadRunners.clear();
  }
  rebuildServices() {
    this.modelCatalogGeneration += 1;
    this.modelCatalogRefreshedAt = 0;
    this.disposeThreadRunners();
    this.piCommands = [];
    this.commandCatalogLoaded = false;
    this.graph = new VaultGraph(this.app, this.settings, () => this.getCurrentContextFile());
    this.contextBuilder = new ContextBuilder(
      this.graph,
      this.settings,
      be,
      this.getVaultBasePath(),
      () => this.piCommands,
      (path) => this.getAnnotationsForContext(path)
    );
    this.catalog = new PiModelCatalog(this.getPluginDirectory(), this.settings);
    this.commandCatalog = new PiCommandCatalog(
      this.getPluginDirectory(),
      this.settings,
      this.getExtensionUiHandler()
    );
    this.pi = new PiRunner(
      this.settings,
      this.contextBuilder,
      this.getVaultBasePath(),
      this.getPluginDirectory(),
      undefined,
      this.getExtensionUiHandler()
    );
  }
  async consumeAnnotationsForPrompt(sourcePath) {
    this.annotationController?.cancelPick();
    const explicitFile = sourcePath ? this.app.vault.getAbstractFileByPath(sourcePath) : undefined;
    const file = explicitFile instanceof P.TFile ? explicitFile : this.getCurrentContextFile();
    if (!file) return [];
    const annotations = await this.getAnnotationsForContext(file.path);
    if (annotations.length > 0) this.annotationStore.deletePath(file.path);
    return annotations;
  }
  beginAnnotationProcessing(threadId, annotations) {
    this.annotationController?.beginProcessing(threadId, annotations);
  }
  completeAnnotationProcessingForPath(threadId, path) {
    this.annotationController?.completeProcessingForPath(threadId, path);
  }
  endAnnotationProcessingForThread(threadId) {
    this.annotationController?.endProcessingForThread(threadId);
  }
  restoreConsumedAnnotations(annotations) {
    const byPath = new Map();
    for (const annotation of Array.isArray(annotations) ? annotations : []) {
      if (!annotation?.path) continue;
      const items = byPath.get(annotation.path) ?? [];
      items.push(annotation);
      byPath.set(annotation.path, items);
    }
    try {
      for (const [path, items] of byPath) {
        const current = this.annotationStore.list(path);
        const ids = new Set(current.map((annotation) => annotation.id));
        this.annotationStore.replacePath(path, [
          ...current,
          ...items.filter((annotation) => !ids.has(annotation.id))
        ]);
      }
    } catch (error) {
      new P.Notice(
        error instanceof Error ? error.message : "Could not restore queued annotations."
      );
    }
  }
  async getAnnotationsForContext(path) {
    const annotations = this.annotationStore.list(path);
    if (annotations.length === 0) return annotations;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof P.TFile) || file.extension !== "md") return annotations;
    // Resolve against the exact current file at prompt time. Prefer an open
    // editor because vault reads can lag behind an unsaved CodeMirror change.
    const activeEditor = this.app.workspace.activeEditor;
    let content = activeEditor?.file?.path === path ? activeEditor.editor?.getValue?.() : undefined;
    if (typeof content !== "string") {
      const openLeaf = this.app.workspace
        .getLeavesOfType("markdown")
        .find((leaf) => leaf.view?.file?.path === path && leaf.view?.editor?.getValue);
      content = openLeaf?.view?.editor?.getValue?.();
    }
    if (typeof content !== "string") content = await this.app.vault.read(file);
    return this.annotationStore.reanchorPath(path, content);
  }
  syncCurrentThreadState() {
    this.messages = this.threadHistory.getCurrentMessages();
  }
  saveThreadHistory() {
    this.savePluginData().catch((e) => {
      console.warn("Pi Agent: failed to save thread history", e);
    });
  }
  saveAnnotations() {
    this.savePluginData().catch(() => {
      new P.Notice("Could not save annotations to plugin data.");
    });
  }
  savePluginData() {
    let e = {
      ...this.settings,
      chatHistory: sanitizeThreadHistory(this.threadHistory.toJSON()),
      localPromptQueue: this.localPromptQueue,
      localPromptSteering: this.localPromptSteering,
      annotationData: this.annotationStore.toJSON()
    };
    return (
      (this.dataSaveChain = this.dataSaveChain.catch(() => {}).then(() => this.saveData(e))),
      this.dataSaveChain
    );
  }
  refreshCurrentContextFile() {
    this.setCurrentContextFile(this.app.workspace.getActiveFile());
  }
  setCurrentContextFile(e) {
    this.currentContextFile = e && e.extension === "md" ? e : void 0;
  }
  runWithActiveMarkdownNote(e, t) {
    let n = this.app.workspace.getActiveFile(),
      s = !!n && n.extension === "md";
    if (e) return s;
    if (!s) {
      new P.Notice("Open a markdown note first.");
      return !1;
    }
    t();
    return !0;
  }
  async runCommandPrompt(e) {
    await this.activateView();
    let t = this.app.workspace.getLeavesOfType(T)[0],
      n = t == null ? void 0 : t.view;
    if (n instanceof PiAgentView) {
      n.runPrompt(e);
      return;
    }
    new P.Notice("Could not open Pi view.");
  }
  async runAnnotationsPrompt(path) {
    if (this.annotationStore.list(path).length === 0) {
      new P.Notice("There are no annotations to send for this note.");
      return;
    }
    await this.activateView();
    const view = this.app.workspace.getLeavesOfType(T)[0]?.view;
    if (!(view instanceof PiAgentView)) {
      new P.Notice("Could not open Pi view.");
      return;
    }
    await view.runAnnotationPrompt(
      "Follow every annotation's user-authored request. Batch non-overlapping Change annotations for this note into one targeted edit call, and answer each Question annotation without modifying its target.",
      path
    );
  }
  async suggestFrontmatterForCurrentNote() {
    var o;
    this.graph || this.rebuildServices();
    let e = (o = this.graph) == null ? void 0 : o.getActiveFile();
    if (!e) {
      new P.Notice("Open a markdown note first.");
      return;
    }
    let t = await this.app.vault.cachedRead(e),
      n = new Date().toISOString().slice(0, 10),
      s = previewSuggestedFrontmatter(t, {
        type: "note",
        status: "draft",
        updated: n,
        tags: this.inferTags(e, t)
      }),
      a = {
        id: `${Date.now()}-${e.path}`,
        path: e.path,
        before: t,
        after: s,
        reason: "Add baseline Pi-suggested frontmatter",
        frontmatterPatch: {
          type: "note",
          status: "draft",
          updated: n,
          tags: this.inferTags(e, t)
        }
      };
    new ApprovalModal(this, a, () => {}).open();
  }
  inferTags(e, t) {
    var a, o, l;
    let n = new Set(),
      s = (a = e.parent) == null ? void 0 : a.path;
    if (s && s !== "/") {
      n.add(
        (l = (o = s.split("/").pop()) == null ? void 0 : o.toLowerCase().replace(/\s+/g, "-")) !=
          null
          ? l
          : ""
      );
    }
    for (let d of t.matchAll(/#([A-Za-z0-9/_-]+)/g)) n.add(d[1]);
    return [...n].filter(Boolean).slice(0, 6);
  }
  getEditorSelection() {
    var n;
    let e = this.app.workspace.activeEditor,
      t = e == null ? void 0 : e.editor;
    return (n = t == null ? void 0 : t.getSelection()) != null ? n : "";
  }
  getVaultBasePath() {
    var t;
    let e = this.app.vault.adapter;
    return (t = e.getBasePath) == null ? void 0 : t.call(e);
  }
  getPluginDirectory() {
    var a;
    let e = this.getVaultBasePath();
    if (!e) return;
    const configDir = this.app.vault.configDir;
    let t = (a = this.manifest.dir) != null ? a : `plugins/${this.manifest.id}`,
      n = e.replace(/\/+$/, ""),
      s = t.replace(/^\/+/, "");
    if (s.startsWith(`${configDir}/`)) {
      return n.endsWith(`/${configDir}`) ? `${n}/${s.slice(configDir.length + 1)}` : `${n}/${s}`;
    }
    return n.endsWith(`/${configDir}`) ? `${n}/${s}` : `${n}/${configDir}/${s}`;
  }
}
function isLegacyBareModelId(model) {
  return !model.includes("/") && model !== "__custom";
}
function getPriorThreadHistory(r, i) {
  let e = r[r.length - 1];
  const isCurrentAttachmentOnlyMessage =
    i === "" && /^\[\d+ attached (?:image|file)s?\]$/.test(e?.content || "");
  return e?.role === "user" && (e.content === i || isCurrentAttachmentOnlyMessage)
    ? r.slice(0, -1)
    : r;
}
