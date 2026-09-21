import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => {
  class ObsidianBase {}
  return {
    Plugin: ObsidianBase,
    ItemView: ObsidianBase,
    Modal: ObsidianBase,
    PluginSettingTab: ObsidianBase,
    MarkdownRenderChild: ObsidianBase,
    MarkdownView: ObsidianBase,
    Notice: ObsidianBase,
    Menu: ObsidianBase,
    Setting: ObsidianBase,
    FuzzySuggestModal: ObsidianBase,
    SuggestModal: ObsidianBase,
    TFile: ObsidianBase,
    Platform: { isDesktopApp: true },
    addIcon: vi.fn(),
    setIcon: vi.fn(),
    normalizePath: (value) => value
  };
});

const { PiAgentPlugin } = await import("../src/plugin/PiAgentPlugin.mjs");

describe("PiAgentPlugin extension status visibility", () => {
  it("updates immediately and persists without rebuilding or disposing RPC services", async () => {
    let finishSave;
    let persistedStatusVisibility;
    const plugin = Object.create(PiAgentPlugin.prototype);
    plugin.settings = { showExtensionStatus: true };
    plugin.renderExtensionStatuses = vi.fn();
    plugin.savePluginData = vi.fn(() => {
      persistedStatusVisibility = plugin.settings.showExtensionStatus;
      return new Promise((resolve) => {
        finishSave = resolve;
      });
    });
    plugin.saveSettings = vi.fn();
    plugin.rebuildServices = vi.fn();
    plugin.disposeThreadRunners = vi.fn();

    const saving = plugin.setShowExtensionStatus(false);

    expect(plugin.settings.showExtensionStatus).toBe(false);
    expect(plugin.renderExtensionStatuses).toHaveBeenCalledOnce();
    expect(plugin.savePluginData).toHaveBeenCalledOnce();
    expect(persistedStatusVisibility).toBe(false);
    expect(plugin.saveSettings).not.toHaveBeenCalled();
    expect(plugin.rebuildServices).not.toHaveBeenCalled();
    expect(plugin.disposeThreadRunners).not.toHaveBeenCalled();

    finishSave();
    await saving;
  });
});
