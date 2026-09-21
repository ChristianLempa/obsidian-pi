import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  FuzzySuggestModal: class {},
  Notice: class {},
  SuggestModal: class {},
  setIcon: vi.fn()
}));

import { RunSettingsControls } from "../src/ui/run-settings.mjs";

const viewSource = readFileSync(new URL("../src/ui/PiAgentView.mjs", import.meta.url), "utf8");
const threadListSource = readFileSync(
  new URL("../src/ui/thread-list-view.mjs", import.meta.url),
  "utf8"
);
const runSettingsSource = readFileSync(
  new URL("../src/ui/run-settings.mjs", import.meta.url),
  "utf8"
);
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("compact composer run settings", () => {
  it("keeps the full current model and thinking values available to the picker labels", () => {
    const controls = new RunSettingsControls({
      settings: {
        model: "acme/long",
        reasoningEffort: "xhigh",
        effectiveModel: "acme/long",
        effectiveReasoning: "low",
        availableModels: [
          {
            slug: "acme/long",
            provider: "acme",
            displayName: "A very long readable model name"
          }
        ]
      }
    });

    expect(controls.getModelLabel()).toBe("A very long readable model name");
    expect(controls.formatDefaultReasoningLabel()).toBe("XHigh");
  });

  it("keeps accessible picker labels and refresh callbacks without dead expansion state", () => {
    expect(runSettingsSource).toContain('"aria-label": `${name}: ${label}`');
    expect(runSettingsSource).toContain(
      'createSpan({ cls: "pi-agent-control-label", text: label })'
    );
    expect(runSettingsSource.match(/this\.plugin\.refreshOpenModelControls\(\)/g)).toHaveLength(2);
    expect(`${viewSource}\n${threadListSource}`).not.toMatch(
      /composerBarExpanded|composerBarExpandEl|updateComposerBarExpansion/
    );
  });

  it("keeps compact labels visible while run settings can wrap, shrink, and ellipsize", () => {
    expect(styles).toMatch(/\.pi-agent-run-settings \{[^}]*flex-wrap: wrap;/);
    expect(styles).toMatch(
      /button\.pi-agent-run-setting \{[^}]*flex: 0 1 auto;[^}]*min-width: 0;/
    );
    expect(styles).toMatch(/\.pi-agent-composer-bar \{[^}]*flex-wrap: wrap;/);
    expect(styles).toMatch(
      /\.pi-agent-control-label \{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;/
    );
    expect(styles).not.toMatch(
      /\.pi-agent-composer-bar\.is-compact[^{]*\.pi-agent-control-label\s*\{[^}]*display:\s*none/
    );
    expect(styles).not.toContain("is-expanded");
  });
});
