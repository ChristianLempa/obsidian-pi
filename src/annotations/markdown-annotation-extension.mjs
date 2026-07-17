import { StateEffect } from "@codemirror/state";
import { Decoration, ViewPlugin } from "@codemirror/view";

const refreshAnnotations = StateEffect.define();

export function createMarkdownAnnotationExtension(controller) {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.view = view;
        this.decorations = buildDecorations(view, controller);
        controller.connectEditor(view);
      }

      update(update) {
        const refreshRequested = update.transactions.some((transaction) =>
          transaction.effects.some((effect) => effect.is(refreshAnnotations))
        );
        if (refreshRequested || (update.selectionSet && controller.isPicking(update.view))) {
          this.decorations = buildDecorations(update.view, controller);
        } else if (update.docChanged) {
          this.decorations = controller.isPicking(update.view)
            ? buildDecorations(update.view, controller)
            : this.decorations.map(update.changes);
        }
      }

      destroy() {
        controller.disconnectEditor(this.view);
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
      eventHandlers: {
        mousemove(event, view) {
          if (!controller.isPicking(view)) return false;
          const line = event.target?.closest?.(".cm-line") ?? null;
          if (line) controller.hoverPickTarget(view, view.posAtDOM(line));
          return false;
        },
        mouseleave(_event, view) {
          if (controller.isPicking(view)) controller.hoverPickTarget(view, undefined);
          return false;
        },
        click(event, view) {
          if (!controller.isPicking(view)) return false;
          const line = event.target?.closest?.(".cm-line") ?? null;
          if (!line) return false;
          event.preventDefault();
          controller.choosePickTarget(view, view.posAtDOM(line));
          return true;
        },
        keydown(event, view) {
          if (!controller.isPicking(view)) return false;
          if (event.key === "Escape") {
            event.preventDefault();
            controller.cancelPick();
            return true;
          }
          if (event.key !== "Enter") return false;
          event.preventDefault();
          controller.choosePickTarget(view, view.state.selection.main.head);
          return true;
        }
      }
    }
  );
}

export function requestAnnotationRefresh(view) {
  view?.dispatch?.({ effects: refreshAnnotations.of(null) });
}

function buildDecorations(view, controller) {
  const ranges = [];
  const documentLength = view.state.doc.length;
  for (const annotation of controller.annotationsForEditor(view)) {
    if (annotation.status !== "attached") continue;
    const from = Math.min(documentLength, annotation.range.from);
    const to = Math.min(documentLength, annotation.range.to);
    if (to <= from) continue;
    ranges.push(
      Decoration.mark({
        class: `pi-agent-annotation-range pi-agent-annotation-${annotation.intent}`,
        attributes: { "data-annotation-id": annotation.id }
      }).range(from, to)
    );
  }

  for (const annotation of controller.processingAnnotationsForEditor(view)) {
    const from = Math.min(documentLength, annotation.range.from);
    const to = Math.min(documentLength, annotation.range.to);
    if (to <= from) continue;
    ranges.push(
      Decoration.mark({
        class: "pi-agent-annotation-processing-range",
        attributes: { "data-annotation-processing": "true" }
      }).range(from, to)
    );
  }

  for (const reveal of controller.revealRangesForEditor(view)) {
    const from = Math.min(documentLength, reveal.from);
    const to = Math.min(documentLength, reveal.to);
    if (to <= from) continue;
    ranges.push(
      Decoration.mark({
        class: "pi-agent-annotation-reveal-range",
        attributes: { "data-annotation-reveal": "true" }
      }).range(from, to)
    );
  }

  const candidate = controller.pickRangeForEditor(view);
  if (candidate && candidate.to > candidate.from) {
    const startLine = view.state.doc.lineAt(Math.min(documentLength, candidate.from)).number;
    const endOffset = Math.min(documentLength, Math.max(candidate.from, candidate.to - 1));
    const endLine = view.state.doc.lineAt(endOffset).number;
    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
      const line = view.state.doc.line(lineNumber);
      ranges.push(Decoration.line({ class: "pi-agent-annotation-pick-line" }).range(line.from));
    }
  }
  return Decoration.set(ranges, true);
}
