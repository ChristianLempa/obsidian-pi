import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const markdownRender = vi.fn().mockResolvedValue(undefined);
const components = [];

vi.mock("obsidian", () => ({
  Component: class {
    load = vi.fn();
    unload = vi.fn();

    constructor() {
      components.push(this);
    }
  },
  MarkdownRenderer: { render: markdownRender }
}));

let renderPlainMessageContent;
let unloadMessageRenderComponents;

beforeAll(async () => {
  ({ renderPlainMessageContent, unloadMessageRenderComponents } =
    await import("../src/ui/message-renderer.mjs"));
});

beforeEach(() => {
  markdownRender.mockReset().mockResolvedValue(undefined);
  components.splice(0);
});

function createContainer() {
  const listeners = new Map();
  return {
    empty: vi.fn(),
    addClass: vi.fn(),
    setText: vi.fn(),
    addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
    click(event = {}) {
      listeners.get("click")?.(event);
    }
  };
}

describe("native message Markdown rendering", () => {
  it("gives Obsidian the same source path used for native link resolution", () => {
    const container = createContainer();
    const app = { workspace: { openLinkText: vi.fn() } };
    const view = {
      plugin: { app },
      getLinkSourcePath: () => "Projects/Current Note.md",
      messageRenderComponents: []
    };

    renderPlainMessageContent.call(view, container, "[[../Linked Note#Heading|Alias]]");

    expect(markdownRender).toHaveBeenCalledOnce();
    expect(markdownRender).toHaveBeenCalledWith(
      app,
      "[[../Linked Note#Heading|Alias]]",
      container,
      "Projects/Current Note.md",
      components[0]
    );
    expect(app.workspace.openLinkText).not.toHaveBeenCalled();
    expect(components[0].load).toHaveBeenCalledOnce();
  });

  it("leaves one-click navigation to the native renderer", () => {
    const container = createContainer();
    const workspace = { openLinkText: vi.fn().mockResolvedValue(undefined) };
    const app = { workspace };
    const view = {
      plugin: { app },
      getLinkSourcePath: () => "Projects/Current Note.md",
      messageRenderComponents: []
    };
    markdownRender.mockImplementationOnce((_app, _content, target, sourcePath) => {
      target.addEventListener("click", (event) =>
        workspace.openLinkText(event.linkText, sourcePath, event.modifier)
      );
      return Promise.resolve();
    });

    renderPlainMessageContent.call(view, container, "[[Linked Note#^block|Alias]]");
    container.click({ linkText: "Linked Note#^block", modifier: true });

    expect(workspace.openLinkText).toHaveBeenCalledOnce();
    expect(workspace.openLinkText).toHaveBeenCalledWith(
      "Linked Note#^block",
      "Projects/Current Note.md",
      true
    );
  });

  it("unloads the Obsidian components that own native rendered-link handlers", () => {
    const component = { unload: vi.fn() };
    const view = { messageRenderComponents: [component] };

    unloadMessageRenderComponents.call(view);

    expect(component.unload).toHaveBeenCalledOnce();
    expect(view.messageRenderComponents).toEqual([]);
  });
});
