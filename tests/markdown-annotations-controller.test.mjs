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

  it("rejects generated content and selections spanning source-backed sections", () => {
    const notices = [];
    const controller = new MarkdownAnnotationsController({});
    const state = {
      view: {
        containerEl: {
          contains: () => true,
          ownerDocument: {
            getSelection: () => ({
              isCollapsed: false,
              rangeCount: 1,
              anchorNode: first,
              focusNode: second,
              toString: () => "across sections"
            })
          }
        }
      }
    };
    const first = { nodeType: 1, closest: () => null, parentElement: null };
    const second = { nodeType: 1, closest: () => null, parentElement: null };
    controller.renderedByElement.set(first, { state });
    controller.renderedByElement.set(second, { state });

    expect(controller.renderedSelectionForState(state)).toEqual({ invalid: true });

    const generated = {
      closest: (selector) => (selector.includes(".dataview") ? generated : null)
    };
    expect(controller.closestRenderedRecord(generated, state)).toBeUndefined();
    expect(notices).toEqual([]);
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

  it("ignores an in-flight modify after unload", async () => {
    let resolveRead;
    const read = new Promise((resolve) => {
      resolveRead = resolve;
    });
    const reanchorPath = vi.fn();
    const controller = new MarkdownAnnotationsController({
      app: { vault: { read: () => read } },
      annotationStore: { reanchorPath }
    });
    const pending = controller.reanchorModifiedFile({ path: "Note.md" });

    controller.destroy();
    resolveRead("changed text");
    await pending;

    expect(reanchorPath).not.toHaveBeenCalled();
    expect(controller.modifyVersions.size).toBe(0);
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
