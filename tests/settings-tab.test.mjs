import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => {
  class PluginSettingTab {
    constructor(app, plugin) {
      this.app = app;
      this.plugin = plugin;
      this.containerEl = { empty: vi.fn() };
    }
  }

  class Setting {
    setName() {
      return this;
    }

    setHeading() {
      return this;
    }
  }

  return {
    FuzzySuggestModal: class {},
    Modal: class {},
    Notice: class {},
    PluginSettingTab,
    Setting,
    SuggestModal: class {}
  };
});

const { PiAgentSettingTab } = await import("../src/plugin/settings-tab.mjs");

function createTab() {
  return new PiAgentSettingTab(
    { vault: { configDir: ".config" } },
    { settings: { ignoredFolders: [".git"] } }
  );
}

function flattenDefinitions(definitions) {
  return definitions.flatMap((definition) =>
    definition.type === "group" ? (definition.items ?? []) : [definition]
  );
}

describe("Pi agent settings tab API compatibility", () => {
  it("uses the vault's configured settings folder instead of a hardcoded path", () => {
    const tab = createTab();

    expect(tab.plugin.settings.ignoredFolders).toEqual([".config", ".git"]);
  });

  it("exposes every setting through searchable 1.13 definitions", () => {
    const definitions = createTab().getSettingDefinitions();
    const items = flattenDefinitions(definitions);

    expect(items.map((item) => item.name)).toEqual([
      "Model",
      "Thinking level",
      "Tool mode",
      "Desktop completion notifications",
      "Custom instructions",
      "Chat history folder",
      "Existing chat migration",
      "Custom model slug",
      "Pi executable path",
      "Check Pi installation",
      "Include default Pi skills",
      "Additional skill folders",
      "Ignored folders/directories"
    ]);
    expect(items.every((item) => typeof item.render === "function")).toBe(true);
  });

  it("keeps legacy display rendering while routing 1.13 refreshes through update", () => {
    const tab = createTab();
    tab.renderLegacyDefinition = vi.fn();

    tab.display();
    expect(tab.containerEl.empty).toHaveBeenCalledOnce();
    expect(tab.renderLegacyDefinition).toHaveBeenCalledTimes(13);

    tab.containerEl.empty.mockClear();
    tab.update = vi.fn();
    tab.display();
    expect(tab.update).toHaveBeenCalledOnce();
    expect(tab.containerEl.empty).not.toHaveBeenCalled();
  });
});
