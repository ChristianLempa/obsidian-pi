import { MarkdownRenderChild, MarkdownView, Notice, setIcon } from "obsidian";
import { captureAnchor } from "./annotation-anchors.mjs";
import { ANNOTATION_LIMITS, positionToOffset } from "./annotation-model.mjs";
import { AnnotationDeleteModal, AnnotationModal } from "./annotation-modal.mjs";
import { resolveMarkdownBlockRange } from "./markdown-block-range.mjs";
import {
  rangesOverlap,
  resolveReadingModeCapture,
  resolveSectionRange
} from "./reading-mode-capture.mjs";
import {
  createMarkdownAnnotationExtension,
  requestAnnotationRefresh
} from "./markdown-annotation-extension.mjs";

const SEMANTIC_BLOCKS = "p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,table,hr";
const GENERATED_OR_EMBEDDED =
  ".internal-embed,.markdown-embed,.embed-container,.dataview,.block-language-dataview,.mod-ui";

class AnnotationRenderChild extends MarkdownRenderChild {
  constructor(containerEl, cleanup) {
    super(containerEl);
    this.cleanup = cleanup;
  }

  onunload() {
    this.cleanup();
  }
}

export class MarkdownAnnotationsController {
  constructor(plugin) {
    this.plugin = plugin;
    this.leaves = new Map();
    this.editorViews = new Set();
    this.renderedRecords = new Set();
    this.renderedByElement = new WeakMap();
    this.pickState = undefined;
    this.modifyVersions = new Map();
    this.processingBatches = new Map();
    this.destroyed = false;
  }

  start() {
    this.destroyed = false;
    this.plugin.registerEditorExtension(createMarkdownAnnotationExtension(this));
    this.plugin.registerMarkdownPostProcessor((el, ctx) => this.registerRenderedSection(el, ctx));
    this.plugin.registerEvent(this.plugin.app.workspace.on("layout-change", () => this.refresh()));
    this.plugin.registerEvent(this.plugin.app.workspace.on("file-open", () => this.refresh()));
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("active-leaf-change", () => this.refresh())
    );
    this.plugin.registerDomEvent(
      document,
      "keydown",
      (event) => {
        if (event.key !== "Escape" || !this.pickState) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.cancelPick();
      },
      { capture: true }
    );
    this.plugin.registerEvent(
      this.plugin.app.vault.on("modify", (file) => this.handleMarkdownFileModified(file))
    );
    this.plugin.registerEvent(
      this.plugin.app.vault.on("rename", (file, oldPath) => {
        this.modifyVersions.delete(oldPath);
        this.modifyVersions.delete(file.path);
        this.refresh();
      })
    );
    this.plugin.registerEvent(
      this.plugin.app.vault.on("delete", (file) => {
        this.modifyVersions.delete(file.path);
        this.refresh();
      })
    );
    this.refresh();
  }

  destroy() {
    this.destroyed = true;
    this.modifyVersions.clear();
    this.processingBatches.clear();
    this.cancelPick();
    for (const record of [...this.renderedRecords]) this.removeRenderedRecord(record);
    for (const state of this.leaves.values()) this.removeLeaf(state);
    this.leaves.clear();
    this.editorViews.clear();
  }

  refresh() {
    if (this.destroyed) return;
    const markdownLeaves = new Set(this.plugin.app.workspace.getLeavesOfType("markdown"));
    for (const [leaf, state] of this.leaves) {
      if (!markdownLeaves.has(leaf) || leaf.view !== state.view) {
        this.removeLeaf(state);
        this.leaves.delete(leaf);
      }
    }
    for (const leaf of markdownLeaves) {
      if (!(leaf.view instanceof MarkdownView) || this.leaves.has(leaf)) continue;
      this.addLeaf(leaf, leaf.view);
    }
    for (const state of this.leaves.values()) {
      const nextPath = state.view.file?.path;
      const reading = this.isReadingState(state);
      if (state.path !== nextPath && this.pickState?.leaf === state.leaf) this.cancelPick();
      if (
        this.pickState?.leaf === state.leaf &&
        ((this.pickState.kind === "rendered" && !reading) ||
          (this.pickState.kind === "editor" && reading))
      )
        this.cancelPick();
      if (state.path !== nextPath || !reading) {
        for (const record of [...this.renderedRecords]) {
          if (record.state === state) this.removeRenderedRecord(record);
        }
      }
      state.path = nextPath;
      this.renderList(state);
    }
    this.refreshRenderedHighlights();
    for (const view of this.editorViews) requestAnnotationRefresh(view);
  }

  addLeaf(leaf, view) {
    const actionEl = view.addAction("message-square-plus", "Annotations", () =>
      this.handleHeaderAction(leaf)
    );
    actionEl.addClass("pi-agent-annotations-action");
    actionEl.setAttr("aria-label", "Add or toggle annotation");
    actionEl.setAttr("aria-pressed", "false");

    const listEl = view.containerEl.createDiv({
      cls: "pi-agent-annotations-list",
      attr: {
        "aria-label": "Annotations for this note",
        "aria-live": "polite",
        role: "region"
      }
    });
    view.containerEl.addClass("pi-agent-annotations-host");
    this.leaves.set(leaf, { leaf, view, actionEl, listEl, path: view.file?.path });
  }

  removeLeaf(state) {
    state.actionEl.remove();
    state.listEl.remove();
    state.view.containerEl.removeClass("pi-agent-annotations-host");
    if (this.pickState?.leaf === state.leaf) this.cancelPick();
    for (const record of [...this.renderedRecords]) {
      if (record.state === state) this.removeRenderedRecord(record);
    }
  }

  handleActiveMarkdownNote() {
    this.refresh();
    const activeLeaf = this.plugin.app.workspace.activeLeaf;
    const state = this.leaves.get(activeLeaf);
    if (!state || !state.view.file || state.view.file.extension !== "md") {
      new Notice("Open an active Markdown note to use annotations.");
      return;
    }
    void this.handleHeaderAction(activeLeaf);
  }

  async handleHeaderAction(leaf) {
    const state = this.leaves.get(leaf);
    if (!state) return;
    if (this.pickState?.leaf === leaf) {
      this.cancelPick();
      return;
    }
    if (this.isReadingState(state)) {
      const selection = this.renderedSelectionForState(state);
      if (selection?.invalid) return;
      if (selection) {
        if (!this.activateRenderedPick(state)) return;
        await this.captureRendered(selection.record, selection.text);
      } else this.activateRenderedPick(state);
      return;
    }

    const editor = state.view.editor;
    const text = editor.getValue();
    const fromPosition = editor.getCursor("from");
    const toPosition = editor.getCursor("to");
    const offset = (position) =>
      typeof editor.posToOffset === "function"
        ? editor.posToOffset(position)
        : positionToOffset(text, position);
    const from = offset(fromPosition);
    const to = offset(toPosition);
    if (to > from) {
      if (to - from > ANNOTATION_LIMITS.quote) {
        new Notice("The selected Markdown text is too large to annotate.");
        return;
      }
      if (!this.activateEditorPick(state)) return;
      this.openCreateModal(state.view.file?.path, captureAnchor(text, from, to), "selection");
      return;
    }
    this.activateEditorPick(state);
  }

  toggleEditorPick(state) {
    if (this.pickState?.leaf === state.leaf) return this.cancelPick();
    this.activateEditorPick(state);
  }

  activateEditorPick(state) {
    if (this.pickState?.kind === "editor" && this.pickState.leaf === state.leaf) return true;
    this.cancelPick();
    const editorView = this.editorViewForState(state);
    if (!editorView) {
      new Notice("The Markdown editor is not ready yet.");
      return false;
    }
    this.pickState = {
      kind: "editor",
      leaf: state.leaf,
      editorView,
      hoverOffset: undefined,
      editorAriaLabel: editorView.dom.getAttribute("aria-label")
    };
    state.actionEl.addClass("is-active");
    state.actionEl.setAttr("aria-pressed", "true");
    editorView.dom.classList.add("pi-agent-annotation-pick-mode");
    editorView.dom.setAttribute(
      "aria-label",
      "Annotation pick mode. Hover or focus a paragraph, then click or press Enter."
    );
    state.view.editor.focus();
    requestAnnotationRefresh(editorView);
    return true;
  }

  toggleRenderedPick(state) {
    if (this.pickState?.leaf === state.leaf) return this.cancelPick();
    this.activateRenderedPick(state);
  }

  activateRenderedPick(state) {
    if (this.pickState?.kind === "rendered" && this.pickState.leaf === state.leaf) return true;
    this.cancelPick();
    const records = this.recordsForState(state);
    if (records.length === 0) {
      new Notice("No source-backed Markdown blocks are available in this reading view.");
      return false;
    }
    this.pickState = { kind: "rendered", leaf: state.leaf, state, focused: undefined };
    state.actionEl.addClass("is-active");
    state.actionEl.setAttr("aria-pressed", "true");
    state.view.containerEl.addClass("pi-agent-annotation-reading-pick-mode");
    for (const record of records) this.enableRenderedTarget(record);
    return true;
  }

  cancelPick() {
    const pick = this.pickState;
    if (!pick) return;
    const state = this.leaves.get(pick.leaf);
    state?.actionEl.removeClass("is-active");
    state?.actionEl.setAttr("aria-pressed", "false");
    if (pick.kind === "editor") {
      pick.editorView.dom.classList.remove("pi-agent-annotation-pick-mode");
      if (pick.editorAriaLabel == null) pick.editorView.dom.removeAttribute("aria-label");
      else pick.editorView.dom.setAttribute("aria-label", pick.editorAriaLabel);
      requestAnnotationRefresh(pick.editorView);
    } else if (state) {
      state.view.containerEl.removeClass("pi-agent-annotation-reading-pick-mode");
      for (const record of this.recordsForState(state)) this.disableRenderedTarget(record);
    }
    this.pickState = undefined;
  }

  isPicking(view) {
    return (
      (this.pickState?.kind === "editor" || this.pickState?.kind == null) &&
      this.pickState?.editorView === view
    );
  }

  hoverPickTarget(view, offset) {
    if (!this.isPicking(view) || this.pickState.hoverOffset === offset) return;
    this.pickState.hoverOffset = offset;
    requestAnnotationRefresh(view);
  }

  pickRangeForEditor(view) {
    if (!this.isPicking(view)) return undefined;
    const offset = this.pickState.hoverOffset ?? view.state.selection.main.head;
    return resolveMarkdownBlockRange(view.state.doc.toString(), offset);
  }

  choosePickTarget(view, offset) {
    if (!this.isPicking(view)) return;
    const state = this.leaves.get(this.pickState.leaf);
    if (!state) return this.cancelPick();
    const text = view.state.doc.toString();
    const range = resolveMarkdownBlockRange(text, offset);
    if (range.to <= range.from) {
      new Notice("Choose a non-empty Markdown line or paragraph.");
      return;
    }
    if (range.to - range.from > ANNOTATION_LIMITS.quote) {
      new Notice("This Markdown block is too large to annotate.");
      return;
    }
    const anchor = captureAnchor(text, range.from, range.to);
    this.openCreateModal(state.view.file?.path, anchor, "block");
  }

  registerRenderedSection(root, ctx) {
    if (!ctx?.sourcePath || !root?.querySelectorAll) return;
    const candidates = [root, ...root.querySelectorAll(SEMANTIC_BLOCKS)].filter(
      (element) => element.matches?.(SEMANTIC_BLOCKS) && !element.closest?.(GENERATED_OR_EMBEDDED)
    );
    const records = [];
    for (const element of candidates) {
      const state = this.stateForRenderedElement(element, ctx.sourcePath);
      if (!state || this.renderedByElement.has(element)) continue;
      const info = ctx.getSectionInfo(element);
      if (!info) continue;
      const record = {
        element,
        state,
        sourcePath: ctx.sourcePath,
        getSectionInfo: () => ctx.getSectionInfo(element),
        listeners: []
      };
      this.renderedRecords.add(record);
      this.renderedByElement.set(element, record);
      this.addRenderedListeners(record);
      records.push(record);
      if (this.pickState?.kind === "rendered" && this.pickState.state === state)
        this.enableRenderedTarget(record);
    }
    if (records.length > 0) {
      ctx.addChild(
        new AnnotationRenderChild(root, () => {
          for (const record of records) this.removeRenderedRecord(record);
        })
      );
      this.refreshRenderedHighlights();
    }
  }

  addRenderedListeners(record) {
    const onClick = (event) => {
      if (this.pickState?.kind !== "rendered" || this.pickState.state !== record.state) return;
      event.preventDefault();
      event.stopPropagation();
      const selection = this.renderedSelectionForState(record.state);
      if (selection?.invalid) return;
      void this.captureRendered(selection?.record ?? record, selection?.text ?? "");
    };
    const onFocus = () => {
      if (this.pickState?.kind !== "rendered" || this.pickState.state !== record.state) return;
      this.setFocusedRenderedRecord(record);
    };
    const onKeyDown = (event) => {
      if (
        event.key !== "Enter" ||
        this.pickState?.kind !== "rendered" ||
        this.pickState.state !== record.state
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void this.captureRendered(record, "");
    };
    for (const [type, listener] of [
      ["click", onClick],
      ["focus", onFocus],
      ["keydown", onKeyDown]
    ]) {
      record.element.addEventListener(type, listener);
      record.listeners.push([type, listener]);
    }
  }

  enableRenderedTarget(record) {
    if (record.savedTabIndex === undefined) {
      record.savedTabIndex = record.element.getAttribute("tabindex") ?? null;
      record.savedAriaLabel = record.element.getAttribute("aria-label") ?? null;
    }
    record.element.setAttribute("tabindex", "0");
    record.element.setAttribute("aria-label", "Annotate this Markdown block");
    record.element.classList.add("pi-agent-annotation-rendered-target");
  }

  disableRenderedTarget(record) {
    record.element.classList.remove(
      "pi-agent-annotation-rendered-target",
      "is-focused",
      "pi-agent-annotation-navigated"
    );
    if (record.savedTabIndex === null) record.element.removeAttribute("tabindex");
    else if (record.savedTabIndex !== undefined)
      record.element.setAttribute("tabindex", record.savedTabIndex);
    if (record.savedAriaLabel === null) record.element.removeAttribute("aria-label");
    else if (record.savedAriaLabel !== undefined)
      record.element.setAttribute("aria-label", record.savedAriaLabel);
    delete record.savedTabIndex;
    delete record.savedAriaLabel;
  }

  setFocusedRenderedRecord(record) {
    for (const item of this.recordsForState(record.state))
      item.element.classList.toggle("is-focused", item === record);
    this.pickState.focused = record;
  }

  removeRenderedRecord(record) {
    this.disableRenderedTarget(record);
    record.element.classList.remove(
      "pi-agent-annotation-rendered-block",
      "pi-agent-annotation-processing-rendered"
    );
    for (const [type, listener] of record.listeners)
      record.element.removeEventListener(type, listener);
    this.renderedRecords.delete(record);
    this.renderedByElement.delete(record.element);
  }

  stateForRenderedElement(element, sourcePath) {
    for (const state of this.leaves.values()) {
      if (state.view.file?.path !== sourcePath || !this.isReadingState(state)) continue;
      if (state.view.containerEl.contains(element)) return state;
    }
  }

  recordsForState(state) {
    return [...this.renderedRecords].filter(
      (record) =>
        record.state === state &&
        record.sourcePath === state.view.file?.path &&
        record.element.isConnected
    );
  }

  renderedSelectionForState(state) {
    const selection =
      state.view.containerEl.ownerDocument?.getSelection?.() ?? globalThis.getSelection?.();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return undefined;
    const anchor = elementFromNode(selection.anchorNode);
    const focus = elementFromNode(selection.focusNode);
    const anchorRecord = this.closestRenderedRecord(anchor, state);
    const focusRecord = this.closestRenderedRecord(focus, state);
    if (!anchorRecord || anchorRecord !== focusRecord) {
      new Notice("Select text within one source-backed Markdown block.");
      return { invalid: true };
    }
    const text = selection.toString();
    if (!text) {
      new Notice("Choose a non-empty rendered selection.");
      return { invalid: true };
    }
    return { record: anchorRecord, text };
  }

  closestRenderedRecord(element, state) {
    if (element?.closest?.(GENERATED_OR_EMBEDDED)) return undefined;
    let current = element;
    while (current && state.view.containerEl.contains(current)) {
      const record = this.renderedByElement.get(current);
      if (record?.state === state) return record;
      current = current.parentElement;
    }
  }

  async captureRendered(record, renderedText) {
    const state = record.state;
    const file = state.view.file;
    if (
      !file ||
      file.path !== record.sourcePath ||
      !this.isReadingState(state) ||
      !record.element.isConnected
    ) {
      new Notice("That rendered target is no longer part of this Markdown view.");
      return;
    }
    try {
      const source = await this.plugin.app.vault.read(file);
      if (state.view.file?.path !== record.sourcePath || !record.element.isConnected) return;
      const resolved = resolveReadingModeCapture(source, record.getSectionInfo(), renderedText);
      if (resolved.error) {
        new Notice(resolved.error);
        return;
      }
      if (resolved.notice) new Notice(resolved.notice);
      const anchor = {
        ...captureAnchor(source, resolved.range.from, resolved.range.to),
        renderedText: resolved.renderedText,
        anchorLabel: resolved.anchorLabel
      };
      this.openCreateModal(record.sourcePath, anchor, resolved.targetKind);
    } catch {
      new Notice("Could not read the current Markdown source.");
    }
  }

  refreshRenderedHighlights() {
    for (const record of this.renderedRecords) {
      const annotations = this.plugin.annotationStore.list(record.sourcePath);
      const processing = this.processingForPath(record.sourcePath);
      const source =
        record.state.view.editor?.getValue?.() ?? record.state.view.getViewData?.() ?? "";
      const sectionRange = resolveSectionRange(source, record.getSectionInfo());
      const highlighted =
        sectionRange &&
        annotations.some(
          (annotation) =>
            annotation.status === "attached" && rangesOverlap(annotation.range, sectionRange)
        );
      const isProcessing =
        sectionRange &&
        processing.some(
          (annotation) =>
            annotation.status === "attached" && rangesOverlap(annotation.range, sectionRange)
        );
      record.element.classList.toggle("pi-agent-annotation-rendered-block", Boolean(highlighted));
      record.element.classList.toggle(
        "pi-agent-annotation-processing-rendered",
        Boolean(isProcessing)
      );
    }
  }

  isReadingState(state) {
    return state.view.getMode?.() === "preview";
  }

  openCreateModal(path, anchor, targetKind) {
    if (!path) return;
    new AnnotationModal(this.plugin.app, {
      anchor,
      onSave: ({ context, intent }) => {
        this.plugin.annotationStore.create({
          path,
          context,
          intent,
          targetKind,
          status: "attached",
          ...anchor
        });
        this.refresh();
      }
    }).open();
  }

  openEditModal(state, annotation) {
    new AnnotationModal(this.plugin.app, {
      anchor: annotation,
      annotation,
      onSave: ({ context, intent }) => {
        this.plugin.annotationStore.update(annotation.path, annotation.id, { context, intent });
        this.refresh();
      }
    }).open();
  }

  renderList(state) {
    const path = state.view.file?.path;
    const annotations = path ? this.plugin.annotationStore.list(path) : [];
    state.listEl.empty();
    state.listEl.toggleClass("is-empty", annotations.length === 0);
    if (annotations.length === 0) return;

    const heading = state.listEl.createDiv({ cls: "pi-agent-annotations-list-heading" });
    heading.createSpan({ text: `Annotations (${annotations.length})` });
    for (const annotation of annotations) {
      const row = state.listEl.createDiv({
        cls: `pi-agent-annotation-item${annotation.status === "detached" ? " is-detached" : ""}`
      });
      const copy = row.createDiv({ cls: "pi-agent-annotation-copy" });
      copy.createDiv({
        cls: "pi-agent-annotation-quote",
        text: truncate(annotation.renderedText || annotation.quote, 72)
      });
      copy.createDiv({
        cls: "pi-agent-annotation-context-preview",
        text: truncate(annotation.context, 92)
      });
      const metadata = copy.createDiv({ cls: "pi-agent-annotation-meta" });
      metadata.createSpan({ text: annotation.intent === "change" ? "Change" : "Question" });
      metadata.createSpan({ text: annotation.status === "detached" ? "Detached" : "Attached" });
      if (annotation.targetKind === "block") metadata.createSpan({ text: "Block anchor" });

      const actions = row.createDiv({ cls: "pi-agent-annotation-item-actions" });
      this.iconButton(actions, "locate-fixed", "Navigate to annotation", () =>
        this.navigateTo(state, annotation)
      );
      this.iconButton(actions, "pencil", "Edit annotation", () =>
        this.openEditModal(state, annotation)
      );
      this.iconButton(actions, "trash-2", "Delete annotation", () => {
        new AnnotationDeleteModal(this.plugin.app, () => {
          this.plugin.annotationStore.delete(annotation.path, annotation.id);
          this.refresh();
        }).open();
      });
    }
  }

  iconButton(parent, icon, label, handler) {
    const button = parent.createEl("button", {
      cls: "pi-agent-annotation-item-action clickable-icon",
      attr: { type: "button", "aria-label": label, title: label }
    });
    setIcon(button, icon);
    button.addEventListener("click", handler);
    return button;
  }

  navigateTo(state, annotation) {
    if (annotation.status !== "attached") {
      new Notice("This annotation is detached from the current note text.");
      return;
    }
    this.plugin.app.workspace.setActiveLeaf(state.leaf, { focus: true });
    if (this.isReadingState(state)) {
      const source = state.view.editor?.getValue?.() ?? state.view.getViewData?.() ?? "";
      const record = this.recordsForState(state).find((item) => {
        const range = resolveSectionRange(source, item.getSectionInfo());
        return range && rangesOverlap(annotation.range, range);
      });
      if (!record) {
        new Notice("The annotated source block is not currently rendered.");
        return;
      }
      const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      record.element.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth"
      });
      record.element.classList.add("pi-agent-annotation-navigated");
      globalThis.setTimeout?.(
        () => record.element.classList.remove("pi-agent-annotation-navigated"),
        1600
      );
      return;
    }
    state.view.editor.setSelection(annotation.range.start, annotation.range.end);
    state.view.editor.scrollIntoView(
      { from: annotation.range.start, to: annotation.range.end },
      true
    );
    state.view.editor.focus();
  }

  connectEditor(view) {
    this.editorViews.add(view);
  }

  disconnectEditor(view) {
    this.editorViews.delete(view);
    if (this.pickState?.editorView === view) this.cancelPick();
  }

  editorViewForState(state) {
    const direct = state.view.editor?.cm;
    if (direct && this.editorViews.has(direct)) return direct;
    for (const view of this.editorViews) {
      if (state.view.containerEl.contains(view.dom)) return view;
    }
  }

  stateForEditor(view) {
    for (const state of this.leaves.values()) {
      if (state.view.editor?.cm === view || state.view.containerEl.contains(view.dom)) return state;
    }
  }

  annotationsForEditor(view) {
    const path = this.stateForEditor(view)?.view.file?.path;
    return path ? this.plugin.annotationStore.list(path) : [];
  }

  processingAnnotationsForEditor(view) {
    const path = this.stateForEditor(view)?.view.file?.path;
    return path ? this.processingForPath(path) : [];
  }

  beginProcessing(token, annotations, threadId) {
    const key = String(token || "");
    if (!key) return;
    const items = (Array.isArray(annotations) ? annotations : []).filter(
      (annotation) =>
        annotation?.status === "attached" &&
        annotation.path &&
        Number.isFinite(annotation.range?.from) &&
        Number.isFinite(annotation.range?.to) &&
        annotation.range.to > annotation.range.from
    );
    if (items.length === 0) {
      this.endProcessing(key);
      return;
    }
    this.processingBatches.set(key, {
      threadId: String(threadId || ""),
      annotations: items.map((annotation) => structuredCloneSafe(annotation))
    });
    this.refresh();
  }

  endProcessing(token) {
    if (!this.processingBatches.delete(String(token || ""))) return false;
    this.refresh();
    return true;
  }

  endProcessingForPath(path) {
    const target = String(path || "");
    let changed = false;
    for (const [token, batch] of this.processingBatches) {
      if (!batch.annotations.some((annotation) => annotation.path === target)) continue;
      this.processingBatches.delete(token);
      changed = true;
    }
    if (changed) this.refresh();
    return changed;
  }

  endProcessingForThread(threadId) {
    const target = String(threadId || "");
    let changed = false;
    for (const [token, batch] of this.processingBatches) {
      if (batch.threadId !== target) continue;
      this.processingBatches.delete(token);
      changed = true;
    }
    if (changed) this.refresh();
    return changed;
  }

  processingForPath(path) {
    const target = String(path || "");
    return [...this.processingBatches.values()].flatMap((batch) =>
      batch.annotations
        .filter((annotation) => annotation.path === target)
        .map((annotation) => structuredCloneSafe(annotation))
    );
  }

  handleMarkdownFileModified(file) {
    if (file.extension !== "md") return;
    this.endProcessingForPath(file.path);
    this.reanchorModifiedFile(file);
  }

  async reanchorModifiedFile(file) {
    const version = (this.modifyVersions.get(file.path) ?? 0) + 1;
    this.modifyVersions.set(file.path, version);
    try {
      const text = await this.plugin.app.vault.read(file);
      if (this.destroyed || this.modifyVersions.get(file.path) !== version) return;
      this.plugin.annotationStore.reanchorPath(file.path, text);
      this.refresh();
    } catch {
      // File lifecycle events can invalidate an in-flight read; no annotation data is logged.
    } finally {
      if (this.modifyVersions.get(file.path) === version) this.modifyVersions.delete(file.path);
    }
  }
}

function structuredCloneSafe(value) {
  return typeof globalThis.structuredClone === "function"
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function elementFromNode(node) {
  return node?.nodeType === 1 ? node : node?.parentElement;
}

function truncate(value, limit) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "No context";
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}
