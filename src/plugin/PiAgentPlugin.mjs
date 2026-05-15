import fs from "node:fs";
import * as P from "obsidian";
import { ChangeTracker } from "../changes/change-tracker.mjs";
import { ContextBuilder } from "../context/context-builder.mjs";
import { normalizeSkillFolderList } from "../context/skills.mjs";
import { VaultGraph } from "../context/vault-graph.mjs";
import { checkPiInstallation } from "../pi/health.mjs";
import { PiModelCatalog, getEffectiveConfig } from "../pi/model-catalog.mjs";
import { getCompactInstructions, PiRunner } from "../pi/runner.mjs";
import { CUSTOM_MODEL_VALUE as b, DEFAULT_SETTINGS as H, normalizeSettings } from "./settings.mjs";
import { PiAgentSettingTab } from "./settings-tab.mjs";
import {
  PI_AGENT_ICON_ID as I,
  PI_AGENT_ICON_SVG as O,
  PI_AGENT_VIEW_TYPE as T
} from "./constants.mjs";
import { ApprovalModal } from "../ui/modals/approval-modal.mjs";
import { PiSetupModal } from "../ui/modals/pi-setup-modal.mjs";
import { PiAgentView } from "../ui/PiAgentView.mjs";
import { previewFrontmatterPatch } from "../shared/frontmatter.mjs";
import { sanitizeThreadHistory } from "../shared/thread-history.mjs";
import { ThreadStore } from "../threads/thread-store.mjs";

var be = `# Pi Agent

You are Pi, an agentic AI coding assistant from https://pi.dev, running inside Pi Agent.

The user is working in an Obsidian vault made of Markdown notes, scripts, configs, and sometimes plugin/source-code projects. Treat vault paths, wikilinks, frontmatter, headings, tags, backlinks, outgoing links, and code files as first-class context. The plugin may provide the current note, selected text, backlinks, outgoing links, search results, and explicit @note, #tag, or /command attachments.

Your primary role is agentic coding and technical knowledge work inside the vault: inspect files, reason about systems, propose implementation plans, edit code or Markdown when edit tools are enabled, run commands when shell tools are enabled, and summarize concrete changes.

## Operation modes

- Chat: no Pi CLI tools are enabled. Use only the Obsidian context attached by the plugin and ask for more context when needed.
- Review: read/search/list tools are enabled. Inspect files and explain, review, summarize, or propose changes, but do not modify files.
- Edit: read/search/list plus edit/write tools are enabled. Make focused file changes when the user asks. Shell commands are not available, so ask the user to run tests/builds manually when needed.
- Full agent: read/search/list/edit/write/bash tools are enabled. You may run appropriate shell commands for coding tasks, tests, builds, repo inspection, and diagnostics.

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
- Cite vault references as wikilinks when possible, for example [[Project Alpha]].
- Do not infer facts that are not present in notes. Say when references are weak or missing.
- If a referenced note, heading, block, or file is not present in the provided context, say it was not found instead of inventing content.
- Preserve Obsidian callouts, embeds, block IDs, footnotes, comments, and dataview/base-related sections unless the user explicitly asks to change them.
- Prefer Obsidian wikilinks for vault notes. Use [[Note Name]] or [[path/to/note|label]] instead of raw Markdown links for internal vault references.
- Use Obsidian-friendly Markdown: clear headings, compact bullets, tables only when useful, and callouts only when they improve the note.

## Chat responses

- Be concise and action-oriented.
- Avoid Markdown formatting in chat responses unless the user asks for it or a structured/note-ready response clearly needs it.
- When mentioning vault notes in chat, wikilinks or vault paths are useful because the plugin makes them clickable.

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
    this.dataSaveChain = Promise.resolve();
  }
  async onload() {
    if ((await this.loadSettings(), !P.Platform.isDesktopApp)) {
      new P.Notice("Pi Agent is desktop-only.");
      return;
    }
    ((0, P.addIcon)(I, O),
      this.rebuildServices(),
      this.refreshCurrentContextFile(),
      this.registerEvent(
        this.app.workspace.on("file-open", (e) => {
          this.setCurrentContextFile(e);
        })
      ),
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", () => {
          this.refreshCurrentContextFile();
        })
      ),
      this.registerView(T, (e) => new PiAgentView(e, this)),
      this.addRibbonIcon(I, "Open Pi Agent", () => {
        this.activateView();
      }),
      this.addCommand({
        id: "open-pi",
        name: "Open agent chat",
        callback: () => {
          this.activateView();
        }
      }),
      this.addCommand({
        id: "check-pi-installation",
        name: "Check Pi installation",
        callback: () => {
          this.checkPiInstallation(true);
        }
      }),
      this.addCommand({
        id: "ask-about-current-note",
        name: "Ask about current note",
        checkCallback: (e) =>
          this.runWithActiveMarkdownNote(e, () => {
            this.runCommandPrompt(
              "Use the active note as context. Summarize the key facts, assumptions, and useful follow-up questions."
            );
          })
      }),
      this.addCommand({
        id: "research-around-current-note",
        name: "Research around current note",
        checkCallback: (e) =>
          this.runWithActiveMarkdownNote(e, () => {
            this.runCommandPrompt(
              "Research around the active note using backlinks, outgoing links, unresolved links, tags, and search results. Return concise findings with vault references."
            );
          })
      }),
      this.addCommand({
        id: "suggest-frontmatter",
        name: "Suggest frontmatter for current note",
        checkCallback: (e) =>
          this.runWithActiveMarkdownNote(e, () => {
            this.suggestFrontmatterForCurrentNote();
          })
      }),
      this.addCommand({
        id: "draft-base-from-current-note",
        name: "Draft base from current note context",
        checkCallback: (e) =>
          this.runWithActiveMarkdownNote(e, () => {
            this.runCommandPrompt(
              "Draft an Obsidian Base for notes related to the active note. Infer useful fields from frontmatter, tags, backlinks, and linked notes."
            );
          })
      }),
      this.addSettingTab(new PiAgentSettingTab(this.app, this)));
  }
  onunload() {
    this.cancelPiRun();
  }
  async loadSettings() {
    let e = await this.loadData(),
      { chatHistory: t, messages: n, threadId: s, sessionId: a, ...o } = e != null ? e : {};
    ((this.settings = normalizeSettings(o)),
      (this.settings.additionalSkillFolders = normalizeSkillFolderList(
        this.settings.additionalSkillFolders
      )),
      (this.threadHistory = new ThreadStore(t, n, a != null ? a : s)));
    let l = getEffectiveConfig(this.getVaultBasePath());
    ((this.settings.effectiveModel = l.effectiveModel || ""),
      (this.settings.effectiveReasoning = l.effectiveReasoning || ""),
      this.syncCurrentThreadState(),
      this.settings.model &&
        isLegacyBareModelId(this.settings.model) &&
        ((this.settings.customModel = `openai/${this.settings.model}`),
        (this.settings.model = "__custom")));
  }
  async saveSettings() {
    (await this.savePluginData(), this.rebuildServices());
  }
  showPiSetupIfNeeded() {
    if (this.settings.dismissedPiSetup) return;

    window.setTimeout(() => {
      if (!this.settings.dismissedPiSetup) this.checkPiInstallation(false);
    }, 800);
  }
  checkPiInstallation(showSuccess) {
    let e = checkPiInstallation();
    if (e.ok) {
      showSuccess && new P.Notice(`Pi CLI is available: ${e.version || e.message}`);
      return e;
    }

    showSuccess ? new P.Notice(e.message) : new PiSetupModal(this, e).open();
    return e;
  }
  async refreshModelCatalog(e) {
    var t;
    this.catalog || this.rebuildServices();
    try {
      let n = await ((t = this.catalog) == null ? void 0 : t.getAvailableModels()),
        s = this.catalog ? this.catalog.getEffectiveConfig(this.getVaultBasePath()) : {};
      if (!n || n.length === 0) {
        e && new P.Notice("Pi returned no models.");
        return;
      }
      ((this.settings.availableModels = n),
        (this.settings.effectiveModel = s.effectiveModel || ""),
        (this.settings.effectiveReasoning = s.effectiveReasoning || ""),
        await this.saveSettings(),
        e &&
          new P.Notice(
            `Loaded ${n.length} Pi models${this.settings.effectiveModel ? `; default ${this.settings.effectiveModel}` : ""}.`
          ));
    } catch (n) {
      let s = n instanceof Error ? n.message : String(n);
      (e && new P.Notice(s), console.warn("Pi Agent: failed to refresh model catalog", n));
    }
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
  forkCurrentThread() {
    var t;
    let e = this.getCurrentThread(),
      n = e.piSessionId
        ? (t = this.pi) == null
          ? void 0
          : t.createForkSessionFile(e.piSessionId)
        : void 0,
      s = this.threadHistory.forkCurrentThread(n);
    return s ? (this.syncCurrentThreadState(), this.saveThreadHistory(), s) : void 0;
  }
  getCurrentThread() {
    return this.threadHistory.getCurrentThread();
  }
  listThreads(e) {
    return this.threadHistory.listThreads(e);
  }
  getThreadDisplayMessageCount(e) {
    let t = Array.isArray(e == null ? void 0 : e.messages) ? e.messages.length : 0,
      n = this.countPiSessionChatMessages(e == null ? void 0 : e.piSessionId);
    return Math.max(t, n);
  }
  countPiSessionChatMessages(e) {
    if (!e || !fs.existsSync(e)) return 0;
    try {
      return fs
        .readFileSync(e, "utf8")
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
  deleteThread(e) {
    return this.threadHistory.deleteThread(e)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
  }
  clearArchivedThreads() {
    let e = this.threadHistory.clearArchivedThreads();
    return e === 0 ? 0 : (this.syncCurrentThreadState(), this.saveThreadHistory(), e);
  }
  renameThread(e, t) {
    return this.threadHistory.renameThread(e, t)
      ? (this.syncCurrentThreadState(), this.saveThreadHistory(), !0)
      : !1;
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
  async runPiPrompt(e, t, n, i = this.pi) {
    var p;
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    if (
      ((!this.graph || !this.contextBuilder || !this.pi || !this.changeTracker) &&
        this.rebuildServices(),
      !this.graph || !this.contextBuilder || !this.pi || !this.changeTracker)
    )
      throw new Error("Pi services are not available.");
    let s = this.getEditorSelection(),
      a = getCompactInstructions(e) === undefined ? await this.contextBuilder.build(e, s) : void 0;
    if (t != null && t.isCanceled && t.isCanceled()) throw new Error("Pi run canceled.");
    let o = n ? this.threadHistory.getThread(n) : this.threadHistory.getCurrentThread();
    if (!o) throw new Error("Chat thread no longer exists.");
    if (!i) throw new Error("Pi runner is not available.");
    let l = getPriorThreadHistory(o.messages, e),
      d = this.shouldTrackPiChanges() ? await this.changeTracker.snapshot() : void 0;
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
    let h = await i.run(e, a, o.piSessionId, l, t),
      u;
    if (d)
      try {
        u = await this.changeTracker.diff(d);
      } catch (m) {
        let c = m instanceof Error ? m.message : String(m);
        h = {
          ...h,
          finalResponse:
            `${h.finalResponse}\n\nWarning: Pi Agent could not summarize vault changes after this run: ${c}`.trim()
        };
        console.warn("Pi Agent: failed to summarize post-run vault changes", m);
      }
    let m = u ? mergeRunChanges(h, u) : h;
    return (
      h.sessionId &&
        (this.threadHistory.setThreadPiSessionId(o.id, h.sessionId),
        this.syncCurrentThreadState(),
        this.saveThreadHistory()),
      m
    );
  }
  shouldTrackPiChanges() {
    let e = this.settings.sandboxMode === "workspace-write" ? "edit" : this.settings.sandboxMode;
    return e === "edit" || e === "full-agent";
  }
  getSelectedModelInfo() {
    let e = this.settings.model === b ? this.settings.customModel : this.settings.model;
    e || (e = this.settings.effectiveModel);
    return e ? this.settings.availableModels.find((t) => t.slug === e) : void 0;
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
  createPiRunner() {
    (!this.graph || !this.contextBuilder) && this.rebuildServices();
    if (!this.contextBuilder) throw new Error("Pi context builder is not available.");
    return new PiRunner(
      this.settings,
      this.contextBuilder,
      this.getVaultBasePath(),
      this.getPluginDirectory()
    );
  }
  rebuildServices() {
    ((this.graph = new VaultGraph(this.app, this.settings, () => this.getCurrentContextFile())),
      (this.contextBuilder = new ContextBuilder(
        this.graph,
        this.settings,
        be,
        this.getVaultBasePath()
      )),
      (this.catalog = new PiModelCatalog(this.getPluginDirectory())),
      (this.changeTracker = new ChangeTracker(this.app, this.settings)),
      (this.pi = new PiRunner(
        this.settings,
        this.contextBuilder,
        this.getVaultBasePath(),
        this.getPluginDirectory()
      )));
  }
  syncCurrentThreadState() {
    this.messages = this.threadHistory.getCurrentMessages();
  }
  saveThreadHistory() {
    this.savePluginData().catch((e) => {
      console.warn("Pi Agent: failed to save thread history", e);
    });
  }
  savePluginData() {
    let e = {
      ...this.settings,
      availableModels: [],
      chatHistory: sanitizeThreadHistory(this.threadHistory.toJSON())
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
    s &&
      s !== "/" &&
      n.add(
        (l = (o = s.split("/").pop()) == null ? void 0 : o.toLowerCase().replace(/\s+/g, "-")) !=
          null
          ? l
          : ""
      );
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
    let t = (a = this.manifest.dir) != null ? a : `plugins/${this.manifest.id}`,
      n = e.replace(/\/+$/, ""),
      s = t.replace(/^\/+/, "");
    return s.startsWith(".obsidian/")
      ? `${n}/${s}`
      : n.endsWith("/.obsidian")
        ? `${n}/${s}`
        : `${n}/.obsidian/${s}`;
  }
}
function isLegacyBareModelId(model) {
  return !model.includes("/") && model !== "__custom";
}
function mergeRunChanges(r, i) {
  var n, s;
  let e = [...((n = r.changes) != null ? n : []), i],
    t = mergeChangedFiles([...((s = r.changedFiles) != null ? s : []), ...i.files]);
  return {
    ...r,
    changes: e,
    changedFiles: t,
    changeStats: {
      filesChanged: t.length,
      additions: t.reduce((a, o) => a + o.additions, 0),
      deletions: t.reduce((a, o) => a + o.deletions, 0)
    }
  };
}
function getPriorThreadHistory(r, i) {
  let e = r[r.length - 1];
  return (e == null ? void 0 : e.role) === "user" && e.content === i ? r.slice(0, -1) : r;
}
function mergeChangedFiles(r) {
  let i = new Map();
  for (let e of r) {
    let t = i.get(e.path);
    if (!t) {
      i.set(e.path, { ...e });
      continue;
    }
    ((t.additions = Math.max(t.additions, e.additions)),
      (t.deletions = Math.max(t.deletions, e.deletions)),
      t.status === "unknown" && (t.status = e.status),
      e.previousPath && (t.previousPath = e.previousPath));
  }
  return [...i.values()];
}
