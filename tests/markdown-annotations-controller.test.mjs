import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  MarkdownRenderChild: class {
    constructor(containerEl) {
      this.containerEl = containerEl;
    }
  },
  MarkdownView: class {},
  Modal: class {},
  Notice: class {},
  setIcon: () => {}
}));

import { MarkdownAnnotationsController } from "../src/annotations/markdown-annotations-controller.mjs";

function editorView(text, head = 0) {
  return {
    dom: {},
    state: {
      doc: { toString: () => text },
      selection: { main: { head } }
    }
  };
}

describe("MarkdownAnnotationsController", () => {
  it("resolves a keyboard pick target from the focused editor cursor", () => {
    const controller = new MarkdownAnnotationsController({});
    const view = editorView("One paragraph\ncontinued", 5);
    controller.pickState = { leaf: {}, editorView: view, hoverOffset: undefined };

    expect(controller.pickRangeForEditor(view)).toMatchObject({ from: 0, to: 23 });
  });

  it("keeps source pick mode active after choosing an annotation target", () => {
    const controller = new MarkdownAnnotationsController({});
    const leaf = {};
    const view = editorView("One paragraph", 5);
    controller.pickState = { kind: "editor", leaf, editorView: view, hoverOffset: undefined };
    controller.leaves.set(leaf, { leaf, view: { file: { path: "Note.md" } } });
    controller.openCreateModal = vi.fn();
    controller.cancelPick = vi.fn();

    controller.choosePickTarget(view, 5);

    expect(controller.openCreateModal).toHaveBeenCalledOnce();
    expect(controller.cancelPick).not.toHaveBeenCalled();
    expect(controller.pickState?.leaf).toBe(leaf);
  });

  it("uses a second annotation-button click only to leave persistent pick mode", async () => {
    const controller = new MarkdownAnnotationsController({});
    const leaf = {};
    controller.leaves.set(leaf, { leaf });
    controller.pickState = { kind: "editor", leaf };
    controller.cancelPick = vi.fn();

    await controller.handleHeaderAction(leaf);

    expect(controller.cancelPick).toHaveBeenCalledOnce();
  });

  it("clears the native rendered selection when submission exits pick mode", () => {
    const controller = new MarkdownAnnotationsController({});
    const leaf = {};
    const removeAllRanges = vi.fn();
    const state = {
      leaf,
      actionEl: { removeClass: vi.fn(), setAttr: vi.fn() },
      view: {
        containerEl: {
          removeClass: vi.fn(),
          ownerDocument: { getSelection: () => ({ removeAllRanges }) }
        }
      }
    };
    controller.leaves.set(leaf, state);
    controller.pickState = { kind: "rendered", leaf, state };

    controller.cancelPick();

    expect(removeAllRanges).toHaveBeenCalledOnce();
    expect(controller.pickState).toBeUndefined();
  });

  it("uses the rendered selection cached before the header button takes focus", async () => {
    const controller = new MarkdownAnnotationsController({});
    const leaf = {};
    const cached = { state: {}, startRecord: {}, endRecord: {}, range: {}, text: "Two blocks" };
    const state = {
      leaf,
      view: { file: { path: "Note.md" }, getMode: () => "preview" },
      cachedRenderedSelection: cached
    };
    controller.leaves.set(leaf, state);
    controller.renderedSelectionForState = vi.fn(() => undefined);
    controller.activateRenderedPick = vi.fn(() => true);
    controller.captureRenderedSelection = vi.fn();

    await controller.handleHeaderAction(leaf);

    expect(controller.captureRenderedSelection).toHaveBeenCalledWith(cached);
    expect(state.cachedRenderedSelection).toBeUndefined();
  });

  it("enters persistent pick mode when annotating an editor selection", async () => {
    const controller = new MarkdownAnnotationsController({});
    const leaf = {};
    const editor = {
      getValue: () => "selected text",
      getCursor: (which) => (which === "from" ? { line: 0, ch: 0 } : { line: 0, ch: 8 }),
      posToOffset: (position) => position.ch
    };
    const state = { leaf, view: { file: { path: "Note.md" }, editor, getMode: () => "source" } };
    controller.leaves.set(leaf, state);
    controller.activateEditorPick = vi.fn(() => true);
    controller.openCreateModal = vi.fn();

    await controller.handleHeaderAction(leaf);

    expect(controller.activateEditorPick).toHaveBeenCalledWith(state);
    expect(controller.openCreateModal).toHaveBeenCalledOnce();
  });

  it("opens one exact selection dialog when text is released in editor pick mode", () => {
    const controller = new MarkdownAnnotationsController({});
    const leaf = {};
    const view = {
      dom: {},
      state: {
        doc: { toString: () => "Select these words" },
        selection: { main: { empty: false, from: 7, to: 12 } }
      }
    };
    controller.pickState = { kind: "editor", leaf, editorView: view };
    controller.leaves.set(leaf, {
      leaf,
      view: { file: { path: "Note.md" }, editor: { cm: view } }
    });
    controller.openCreateModal = vi.fn();

    expect(controller.chooseEditorSelection(view)).toBe(true);
    expect(controller.chooseEditorSelection(view)).toBe(true);
    expect(controller.openCreateModal).toHaveBeenCalledOnce();
    expect(controller.openCreateModal).toHaveBeenCalledWith(
      "Note.md",
      expect.objectContaining({ quote: "these" }),
      "selection"
    );
  });

  it("clears native selections after saving so every annotation uses only its decoration", () => {
    const controller = new MarkdownAnnotationsController({});
    const editorSetCursor = vi.fn();
    const removeAllRanges = vi.fn();
    controller.leaves.set("editor", {
      view: {
        file: { path: "Note.md" },
        getMode: () => "source",
        editor: { getCursor: () => ({ line: 1, ch: 2 }), setCursor: editorSetCursor }
      }
    });
    controller.leaves.set("reading", {
      view: {
        file: { path: "Note.md" },
        getMode: () => "preview",
        containerEl: { ownerDocument: { getSelection: () => ({ removeAllRanges }) } }
      }
    });

    controller.clearNativeSelection("Note.md");

    expect(editorSetCursor).toHaveBeenCalledWith({ line: 1, ch: 2 });
    expect(removeAllRanges).toHaveBeenCalledOnce();
  });

  it("rejects oversized source blocks instead of silently truncating the target", () => {
    const controller = new MarkdownAnnotationsController({});
    const leaf = {};
    const view = editorView("x".repeat(8_001), 1);
    controller.pickState = { leaf, editorView: view, hoverOffset: undefined };
    controller.leaves.set(leaf, { leaf, view: { file: { path: "Note.md" } } });
    controller.openCreateModal = vi.fn();

    controller.choosePickTarget(view, 1);

    expect(controller.openCreateModal).not.toHaveBeenCalled();
  });

  it("associates a rendered block only with its exact reading leaf and source path", () => {
    const controller = new MarkdownAnnotationsController({});
    const element = {};
    const readingState = {
      view: {
        file: { path: "Same.md" },
        getMode: () => "preview",
        containerEl: { contains: (candidate) => candidate === element }
      }
    };
    const otherSplit = {
      view: {
        file: { path: "Same.md" },
        getMode: () => "preview",
        containerEl: { contains: () => false }
      }
    };
    controller.leaves.set({}, otherSplit);
    controller.leaves.set({}, readingState);

    expect(controller.stateForRenderedElement(element, "Same.md")).toBe(readingState);
    expect(controller.stateForRenderedElement(element, "Other.md")).toBeUndefined();
    readingState.view.getMode = () => "source";
    expect(controller.stateForRenderedElement(element, "Same.md")).toBeUndefined();
  });

  it("accepts rendered selections spanning multiple source-backed sections", () => {
    const controller = new MarkdownAnnotationsController({});
    const first = { nodeType: 1, closest: () => null, parentElement: null };
    const second = { nodeType: 1, closest: () => null, parentElement: null };
    const range = {
      startContainer: first,
      startOffset: 1,
      endContainer: second,
      endOffset: 4
    };
    const state = {
      view: {
        containerEl: {
          contains: () => true,
          ownerDocument: {
            getSelection: () => ({
              isCollapsed: false,
              rangeCount: 1,
              getRangeAt: () => range,
              toString: () => "across sections"
            })
          }
        }
      }
    };
    const firstRecord = { state };
    const secondRecord = { state };
    controller.renderedByElement.set(first, firstRecord);
    controller.renderedByElement.set(second, secondRecord);

    expect(controller.renderedSelectionForState(state)).toMatchObject({
      state,
      startRecord: firstRecord,
      endRecord: secondRecord,
      range,
      text: "across sections"
    });

    const generated = {
      closest: (selector) => (selector.includes(".dataview") ? generated : null)
    };
    expect(controller.closestRenderedRecord(generated, state)).toBeUndefined();
  });

  it("captures exact UTF-16 endpoints across rendered paragraphs", async () => {
    const source = "First paragraph.\n\nSecond paragraph.";
    const firstText = { nodeType: 3, nodeValue: "First paragraph." };
    const secondText = { nodeType: 3, nodeValue: "Second paragraph." };
    const element = (textNode) => ({
      nodeType: 1,
      childNodes: [textNode],
      contains: (candidate) => candidate === textNode,
      isConnected: true
    });
    const firstElement = element(firstText);
    const secondElement = element(secondText);
    const state = {
      view: { file: { path: "Note.md" }, getMode: () => "preview" }
    };
    const startRecord = {
      state,
      sourcePath: "Note.md",
      element: firstElement,
      getSectionInfo: () => ({ text: "First paragraph.", lineStart: 0, lineEnd: 0 })
    };
    const endRecord = {
      state,
      sourcePath: "Note.md",
      element: secondElement,
      getSectionInfo: () => ({ text: "Second paragraph.", lineStart: 2, lineEnd: 2 })
    };
    const controller = new MarkdownAnnotationsController({
      app: { vault: { read: vi.fn().mockResolvedValue(source) } }
    });
    controller.openCreateModal = vi.fn();

    await controller.captureRenderedSelection({
      state,
      startRecord,
      endRecord,
      range: {
        startContainer: firstText,
        startOffset: 6,
        endContainer: secondText,
        endOffset: 6
      },
      text: "paragraph. Second"
    });

    expect(controller.openCreateModal).toHaveBeenCalledWith(
      "Note.md",
      expect.objectContaining({
        quote: "paragraph.\n\nSecond",
        range: {
          from: 6,
          to: 24,
          start: { line: 0, ch: 6 },
          end: { line: 2, ch: 6 }
        }
      }),
      "selection"
    );
  });

  it("opens the dialog for multi-element selections sharing broad section metadata", async () => {
    const source = "Repeated alpha.\n\nRepeated beta.";
    const textNode = (value) => ({ nodeType: 3, nodeValue: value });
    const firstWord = textNode("Repeated");
    const firstTail = textNode(" alpha.");
    const secondWord = textNode("Repeated");
    const secondTail = textNode(" beta.");
    const element = (...nodes) => ({
      nodeType: 1,
      childNodes: nodes,
      contains: (candidate) => nodes.includes(candidate),
      isConnected: true
    });
    const firstElement = element(firstWord, firstTail);
    const secondElement = element(secondWord, secondTail);
    const state = {
      view: { file: { path: "Note.md" }, getMode: () => "preview" }
    };
    const broadInfo = () => ({ text: source, lineStart: 0, lineEnd: 2 });
    const startRecord = {
      state,
      sourcePath: "Note.md",
      element: firstElement,
      getSectionInfo: broadInfo
    };
    const endRecord = {
      state,
      sourcePath: "Note.md",
      element: secondElement,
      getSectionInfo: broadInfo
    };
    const controller = new MarkdownAnnotationsController({
      app: { vault: { read: vi.fn().mockResolvedValue(source) } }
    });
    controller.openCreateModal = vi.fn();

    await controller.captureRenderedSelection({
      state,
      startRecord,
      endRecord,
      range: {
        startContainer: firstWord,
        startOffset: 0,
        endContainer: secondWord,
        endOffset: 8
      },
      text: "Repeated alpha.\n\nRepeated"
    });

    expect(controller.openCreateModal).toHaveBeenCalledWith(
      "Note.md",
      expect.objectContaining({
        quote: "Repeated alpha.\n\nRepeated",
        range: expect.objectContaining({ from: 0, to: 25 })
      }),
      "selection"
    );
  });

  it("cleans stale rendered records after a mode switch", () => {
    const controller = new MarkdownAnnotationsController({
      annotationStore: { list: () => [] },
      app: { workspace: { getLeavesOfType: () => [leaf] } }
    });
    const leaf = {};
    const state = {
      leaf,
      path: "Note.md",
      view: { file: { path: "Note.md" }, getMode: () => "source" },
      listEl: { empty: vi.fn(), toggleClass: vi.fn() }
    };
    leaf.view = state.view;
    controller.leaves.set(leaf, state);
    const element = {
      classList: { remove: vi.fn() },
      removeAttribute: vi.fn(),
      removeEventListener: vi.fn()
    };
    const record = { state, element, listeners: [], savedTabIndex: null };
    controller.renderedRecords.add(record);
    controller.renderedByElement.set(element, record);

    controller.refresh();

    expect(controller.renderedRecords.size).toBe(0);
    expect(element.classList.remove).toHaveBeenCalledWith("pi-agent-annotation-rendered-block");
  });

  it("opens a rendered multi-element selection on mouse release without a duplicate click", async () => {
    vi.useFakeTimers();
    const controller = new MarkdownAnnotationsController({});
    const state = {};
    const selection = { state, startRecord: {}, endRecord: {}, range: {}, text: "Two blocks" };
    controller.renderedSelectionForState = vi.fn(() => selection);
    controller.captureRenderedSelection = vi.fn().mockResolvedValue(undefined);
    const listeners = {};
    const record = {
      state,
      element: { addEventListener: (type, listener) => (listeners[type] = listener) },
      listeners: []
    };
    controller.pickState = { kind: "rendered", state };
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    controller.addRenderedListeners(record);

    listeners.mouseup(event);
    listeners.click(event);
    await Promise.resolve();

    expect(controller.captureRenderedSelection).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    vi.useRealTimers();
  });

  it("handles rendered keyboard picks only in their owning split", () => {
    const controller = new MarkdownAnnotationsController({});
    controller.captureRendered = vi.fn();
    const listeners = {};
    const record = {
      state: {},
      element: { addEventListener: (type, listener) => (listeners[type] = listener) },
      listeners: []
    };
    controller.addRenderedListeners(record);
    const event = { key: "Enter", preventDefault: vi.fn(), stopPropagation: vi.fn() };

    controller.pickState = { kind: "rendered", state: {} };
    listeners.keydown(event);
    expect(controller.captureRendered).not.toHaveBeenCalled();

    controller.pickState = { kind: "rendered", state: record.state };
    listeners.keydown(event);
    expect(controller.captureRendered).toHaveBeenCalledWith(record, "");
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it("tracks processing per thread and clears only the successfully mutated path", () => {
    const controller = new MarkdownAnnotationsController({});
    const attached = {
      id: "one",
      path: "Note.md",
      status: "attached",
      range: { from: 2, to: 8 }
    };
    const detached = {
      id: "detached",
      path: "Note.md",
      status: "detached",
      range: { from: 10, to: 15 }
    };

    controller.beginProcessing("thread-one", [
      attached,
      detached,
      { ...attached, id: "two", path: "Other.md" }
    ]);
    expect(controller.processingForPath("Note.md")).toEqual([attached]);
    expect(controller.processingForPath("Note.md")[0]).not.toBe(attached);

    expect(controller.completeProcessingForPath("thread-one", "Note.md")).toBe(true);
    expect(controller.processingForPath("Note.md")).toEqual([]);
    expect(controller.processingForPath("Other.md")).toHaveLength(1);
    expect(controller.endProcessingForThread("thread-one")).toBe(true);
    expect(controller.processingByThread.size).toBe(0);
  });

  it("does no work for an unannotated Markdown modification", () => {
    const read = vi.fn();
    const reanchorPath = vi.fn();
    const controller = new MarkdownAnnotationsController({
      app: { vault: { read } },
      annotationStore: { list: vi.fn(() => []), reanchorPath }
    });
    controller.reanchorModifiedFile = vi.fn();
    controller.refresh = vi.fn();
    controller.refreshPath = vi.fn();

    controller.handleMarkdownFileModified({ path: "Note.md", extension: "md" });

    expect(read).not.toHaveBeenCalled();
    expect(reanchorPath).not.toHaveBeenCalled();
    expect(controller.reanchorModifiedFile).not.toHaveBeenCalled();
    expect(controller.refresh).not.toHaveBeenCalled();
    expect(controller.refreshPath).not.toHaveBeenCalled();
  });

  it("debounces re-anchoring for an annotated Markdown path", async () => {
    vi.useFakeTimers();
    const read = vi.fn().mockResolvedValue("changed text");
    const reanchorPath = vi.fn();
    const controller = new MarkdownAnnotationsController({
      app: { vault: { read } },
      annotationStore: { list: vi.fn(() => [{ id: "one" }]), reanchorPath }
    });
    controller.refreshPath = vi.fn();
    const file = { path: "Note.md", extension: "md" };

    controller.handleMarkdownFileModified(file);
    controller.handleMarkdownFileModified(file);
    expect(read).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(150);

    expect(read).toHaveBeenCalledOnce();
    expect(reanchorPath).toHaveBeenCalledWith("Note.md", "changed text");
    expect(controller.refreshPath).toHaveBeenCalledWith("Note.md");
    vi.useRealTimers();
  });

  it("ignores an in-flight re-anchor after unload", async () => {
    let resolveRead;
    const read = new Promise((resolve) => {
      resolveRead = resolve;
    });
    const reanchorPath = vi.fn();
    const controller = new MarkdownAnnotationsController({
      app: { vault: { read: () => read } },
      annotationStore: { list: vi.fn(() => [{ id: "one" }]), reanchorPath }
    });
    const pending = controller.reanchorFileNow({ path: "Note.md" });

    controller.destroy();
    resolveRead("changed text");
    await pending;

    expect(reanchorPath).not.toHaveBeenCalled();
    expect(controller.modifyTimers.size).toBe(0);
  });

  it("keeps annotations scoped to their split Markdown leaf", () => {
    const list = vi.fn((path) => [{ id: path }]);
    const controller = new MarkdownAnnotationsController({ annotationStore: { list } });
    const firstEditor = editorView("first");
    const secondEditor = editorView("second");
    controller.leaves.set(
      {},
      {
        view: {
          file: { path: "First.md" },
          editor: { cm: firstEditor },
          containerEl: { contains: () => false }
        }
      }
    );
    controller.leaves.set(
      {},
      {
        view: {
          file: { path: "Second.md" },
          editor: { cm: secondEditor },
          containerEl: { contains: () => false }
        }
      }
    );

    expect(controller.annotationsForEditor(secondEditor)).toEqual([{ id: "Second.md" }]);
    expect(list).toHaveBeenCalledWith("Second.md");
  });
});
