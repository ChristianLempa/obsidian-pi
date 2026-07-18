import fs from "node:fs";
import { describe, expect, it } from "vitest";

const viewSource = fs.readFileSync("src/ui/PiAgentView.mjs", "utf8");
const pluginSource = fs.readFileSync("src/plugin/PiAgentPlugin.mjs", "utf8");
const controllerSource = fs.readFileSync(
  "src/annotations/markdown-annotations-controller.mjs",
  "utf8"
);
const modalSource = fs.readFileSync("src/annotations/annotation-modal.mjs", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

describe("pending context badges", () => {
  it("uses compact badges without duplicate current-note prose", () => {
    expect(viewSource).not.toContain("Current:");
    expect(viewSource).not.toContain("No current note");
    expect(viewSource).toContain("pi-agent-context-badge-remove");
    expect(viewSource).toContain(
      "this.renderPendingBadge(badges, contextFile.name, { title: contextFile.path })"
    );
    expect(viewSource).not.toContain("`Remove ${contextFile.name}`");
    expect(viewSource).toContain("`Remove ${image.fileName || \"image\"}`");
    expect(viewSource).toContain("`Remove ${attachment.fileName}`");
    expect(viewSource).toContain("`Clear ${label}`");
    expect(styles).toMatch(
      /\.pi-agent-context-badge \{[\s\S]*?background: var\(--background-secondary\);[\s\S]*?max-width:/
    );
  });

  it("keeps the current note mandatory while removing real pending files and annotations", () => {
    expect(viewSource).not.toContain("excludedContextPath");
    expect(viewSource).not.toContain("includeActiveNote");
    expect(pluginSource).not.toContain("includeActiveNote");
    expect(viewSource).toContain("if (!onRemove) return");
    expect(viewSource).toContain(
      "this.composerImages = this.composerImages.filter((item) => item.id !== image.id)"
    );
    expect(viewSource).toContain("(item) => item.id !== attachment.id");
    expect(viewSource).toContain("this.plugin.annotationStore.deletePath(contextFile.path)");
    expect(viewSource).toContain("contextFilePath: annotationSourcePath");
    expect(pluginSource).toContain("this.refreshAnnotationBadges()");
    expect(pluginSource).toContain("Follow every annotation's user-authored request");
  });
});

describe("compact annotation controls", () => {
  it("deletes annotation metadata immediately without a confirmation modal", () => {
    expect(controllerSource).not.toContain("AnnotationDeleteModal");
    expect(controllerSource).toContain(
      "this.plugin.annotationStore.delete(annotation.path, annotation.id)"
    );
    expect(controllerSource).toContain('"Delete annotation"');
  });

  it("keeps labelled, validated, keyboard-accessible native-style dialog controls", () => {
    expect(modalSource).not.toContain("annotation-modal-quote");
    expect(modalSource).not.toContain("anchorLabel");
    expect(modalSource).toContain('text: "Request"');
    expect(modalSource).toContain('attr: { "aria-label": "Annotation intent" }');
    expect(modalSource).toContain('type: "radio"');
    expect(modalSource).toContain('text: "Save"');
    expect(modalSource).toContain('this.scope.register(["Mod"], "Enter"');
    expect(modalSource).toContain('this.contextEl.setAttr("aria-describedby", errorId)');
    expect(modalSource).toContain('this.contextEl?.setAttr("aria-invalid", "true")');
    expect(styles).toMatch(
      /\.pi-agent-annotation-intent:has\(input:checked\)[\s\S]*?background: var\(--interactive-accent\);/
    );
  });
});
