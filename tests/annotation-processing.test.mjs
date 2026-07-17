import fs from "node:fs";
import { describe, expect, it } from "vitest";

const extensionSource = fs.readFileSync(
  "src/annotations/markdown-annotation-extension.mjs",
  "utf8"
);
const viewSource = fs.readFileSync("src/ui/PiAgentView.mjs", "utf8");
const queueSource = fs.readFileSync("src/ui/prompt-queue.mjs", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

describe("annotation processing UX", () => {
  it("masks exact source ranges for selections and blocks without changing line layout", () => {
    expect(extensionSource).toContain("processingAnnotationsForEditor");
    expect(extensionSource).toContain("Decoration.mark");
    expect(extensionSource).toContain("pi-agent-annotation-processing-range");
    expect(extensionSource).not.toContain("pi-agent-annotation-processing-line");
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

  it("releases processing state on unsent errors, queue removal, retrieval, and run settlement", () => {
    expect(viewSource).toContain("restoreUnsentAnnotations");
    expect(viewSource).toContain("endAnnotationProcessingForThread(t)");
    expect(queueSource).toContain("endAnnotationProcessing(item.annotationBatchId)");
    expect(queueSource).toContain("restoreConsumedAnnotations(item.annotations)");
  });
});
