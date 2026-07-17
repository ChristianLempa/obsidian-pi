import fs from "node:fs";
import { describe, expect, it } from "vitest";

const extensionSource = fs.readFileSync(
  "src/annotations/markdown-annotation-extension.mjs",
  "utf8"
);
const controllerSource = fs.readFileSync(
  "src/annotations/markdown-annotations-controller.mjs",
  "utf8"
);
const pluginSource = fs.readFileSync("src/plugin/PiAgentPlugin.mjs", "utf8");
const viewSource = fs.readFileSync("src/ui/PiAgentView.mjs", "utf8");
const queueSource = fs.readFileSync("src/ui/prompt-queue.mjs", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

describe("annotation processing UX", () => {
  it("masks exact source ranges for selections and blocks without changing line layout", () => {
    expect(extensionSource).toContain("processingAnnotationsForEditor");
    expect(extensionSource).toContain("Decoration.mark");
    expect(extensionSource).toContain("pi-agent-annotation-processing-range");
    expect(extensionSource).not.toContain("pi-agent-annotation-processing-line");
    expect(controllerSource).toContain("data-reading-annotation");
    expect(controllerSource).not.toContain('classList.toggle("pi-agent-annotation-rendered-block"');
    expect(extensionSource).not.toContain("pi-agent-annotation-block");
    expect(styles).not.toContain("box-shadow: inset 3px 0 0 var(--interactive-accent)");
    expect(styles).toMatch(
      /\.pi-agent-annotation-range \{[\s\S]*?background:[\s\S]*?border-bottom:/
    );
    expect(extensionSource).toContain("mouseup(_event, view)");
    expect(extensionSource).toContain("controller.chooseEditorSelection(view)");
    expect(extensionSource).toContain("view.state.selection.main.empty");
  });

  it("uses a gray accent sweep with a static reduced-motion fallback", () => {
    expect(styles).toContain("@keyframes pi-agent-annotation-processing-flow");
    expect(styles).toMatch(
      /\.pi-agent-annotation-processing-range[\s\S]*?var\(--background-modifier-border\)[\s\S]*?var\(--interactive-accent\)/
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.pi-agent-annotation-processing-range[\s\S]*?animation: none;[\s\S]*?background-image: none;/
    );
    expect(styles).toContain(".pi-agent-annotation-processing-range::spelling-error");
    expect(styles).toMatch(
      /\.pi-agent-annotation-processing-range[\s\S]*?text-decoration: none !important;/
    );
  });

  it("reveals resolved changed ranges without replaying document edits", () => {
    expect(extensionSource).toContain("revealRangesForEditor");
    expect(extensionSource).toContain("pi-agent-annotation-reveal-range");
    expect(styles).toContain("@keyframes pi-agent-annotation-reveal");
    expect(styles).toMatch(
      /\.pi-agent-annotation-reveal-range[\s\S]*?clip-path: inset\(0 100% 0 0\)/
    );
  });

  it("exposes annotation-only sending from the sticky scrollable list", () => {
    expect(controllerSource).toContain('text: "Send to Pi"');
    expect(controllerSource).toContain("runAnnotationsPrompt(path)");
    expect(styles).toMatch(
      /\.pi-agent-annotations-list \{[\s\S]*?max-height:[\s\S]*?overflow: auto;/
    );
    expect(styles).toMatch(/\.pi-agent-annotations-list-heading \{[\s\S]*?position: sticky;/);
  });

  it("removes stored highlights before starting the processing transition", () => {
    const consumeStart = pluginSource.indexOf("async consumeAnnotationsForPrompt");
    const consumeEnd = pluginSource.indexOf("beginAnnotationProcessing(token", consumeStart);
    const consumeSource = pluginSource.slice(consumeStart, consumeEnd);
    expect(consumeSource.indexOf("annotationStore.deletePath")).toBeGreaterThan(-1);
    expect(consumeSource.indexOf("annotationStore.deletePath")).toBeLessThan(
      consumeSource.indexOf("beginAnnotationProcessing(processingToken")
    );
  });

  it("releases processing state on unsent errors, queue removal, retrieval, and run settlement", () => {
    expect(viewSource).toContain("restoreUnsentAnnotations");
    expect(viewSource).toContain("endAnnotationProcessingForThread(t)");
    expect(queueSource).toContain("endAnnotationProcessing(item.annotationBatchId)");
    expect(queueSource).toContain("restoreConsumedAnnotations(item.annotations)");
  });
});
