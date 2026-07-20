import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  setIcon(element, icon) {
    element.icon = icon;
  }
}));

import {
  renderActivityMessage,
  renderMessage,
  renderThinkingDisclosure
} from "../src/ui/message-renderer.mjs";

class FakeElement {
  constructor(tag, options = {}) {
    this.tag = tag;
    this.cls = options.cls ?? "";
    this.text = options.text ?? "";
    this.attr = options.attr ?? {};
    this.children = [];
    this.listeners = new Map();
    this.open = false;
  }

  createEl(tag, options) {
    const child = new FakeElement(tag, options);
    this.children.push(child);
    return child;
  }

  createDiv(options) {
    return this.createEl("div", options);
  }

  createSpan(options) {
    return this.createEl("span", options);
  }

  toggleAttribute(name, enabled) {
    if (name === "open") this.open = enabled;
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  descendants() {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }
}

const threadListSource = readFileSync(
  new URL("../src/ui/thread-list-view.mjs", import.meta.url),
  "utf8"
);
const viewSource = readFileSync(new URL("../src/ui/PiAgentView.mjs", import.meta.url), "utf8");
const messageRendererSource = readFileSync(
  new URL("../src/ui/message-renderer.mjs", import.meta.url),
  "utf8"
);
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("native chat polish", () => {
  it("renders live thinking as an open native disclosure with an animated status label", () => {
    const root = new FakeElement("div");
    const rendered = renderThinkingDisclosure(
      root,
      "Readable\nwrapped reasoning",
      true,
      vi.fn(),
      true
    );
    const descendants = rendered.details.descendants();

    expect(rendered.details.tag).toBe("details");
    expect(rendered.details.open).toBe(true);
    expect(rendered.text.tag).toBe("div");
    expect(rendered.text.text).toContain("wrapped reasoning");
    expect(descendants.some((element) => element.tag === "pre")).toBe(false);
    expect(descendants.map((element) => element.icon).filter(Boolean)).toEqual(["chevron-right"]);
    expect(descendants.some((element) => element.text === "Live")).toBe(false);
    expect(descendants.some((element) => element.text === "THINKING")).toBe(true);
    expect(
      descendants.some(
        (element) => element.cls === "pi-agent-thinking-label" && element.attr.role === "status"
      )
    ).toBe(true);

    rendered.setExpanded(false);
    expect(rendered.details.open).toBe(false);
  });

  it("renders completed thinking collapsed with Markdown and without live-only status UI", () => {
    const root = new FakeElement("div");
    const onToggle = vi.fn();
    const renderMarkdown = vi.fn();
    const rendered = renderThinkingDisclosure(
      root,
      "**Finished reasoning**",
      false,
      onToggle,
      false,
      "Thinking",
      renderMarkdown
    );
    const descendants = rendered.details.descendants();

    expect(rendered.details.open).toBe(false);
    expect(descendants.map((element) => element.icon).filter(Boolean)).toEqual(["chevron-right"]);
    expect(descendants.some((element) => element.attr.role === "status")).toBe(false);
    expect(descendants.some((element) => element.text === "THINKING")).toBe(true);
    expect(renderMarkdown).toHaveBeenCalledWith(rendered.text, "**Finished reasoning**");

    rendered.details.open = true;
    rendered.details.listeners.get("toggle")();
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("renders tool activity inside the assistant response box instead of the Agent heading", () => {
    const messagesEl = new FakeElement("div");
    const view = {
      messagesEl,
      activityText: "Editing note.md",
      streamingThinkingContent: "**Updating** the note",
      thinkingDisclosureExpanded: true,
      renderRoleLabel: vi.fn(),
      renderThinkingDisclosure,
      renderPlainMessageContent: vi.fn(),
      setLiveThinkingExpanded: vi.fn()
    };

    renderActivityMessage.call(view);

    const message = messagesEl.children[0];
    const response = message.children.find((element) => element.cls === "pi-agent-message-content");
    const disclosure = response.children[0];
    const label = disclosure
      .descendants()
      .find((element) => element.cls === "pi-agent-thinking-label");
    expect(view.renderRoleLabel).toHaveBeenCalledWith(message, "pi");
    expect(label.text).toBe("EDITING NOTE.MD");
    expect(view.renderPlainMessageContent).toHaveBeenCalledWith(
      disclosure.children[1],
      "**Updating** the note"
    );
  });

  it("integrates completed thinking into the assistant response box", () => {
    const messagesEl = new FakeElement("div");
    const renderPlainMessageContent = vi.fn();
    const view = {
      messagesEl,
      completedThinkingExpansion: new Map(),
      getCurrentThreadId: () => "thread",
      renderRoleLabel: vi.fn(),
      renderToolErrors: vi.fn(),
      renderThinkingDisclosure,
      renderPlainMessageContent
    };

    renderMessage.call(
      view,
      { role: "assistant", content: "Answer", thinking: "Reasoning", createdAt: 1 },
      0
    );

    const message = messagesEl.children[0];
    const response = message.children.find((element) => element.cls === "pi-agent-message-content");
    expect(response.children[0].cls).toBe("pi-agent-thinking-disclosure");
    expect(response.children[1].cls).toBe("pi-agent-message-answer");
    expect(renderPlainMessageContent).toHaveBeenCalledWith(
      response.children[0].children[1],
      "Reasoning"
    );
    expect(renderPlainMessageContent).toHaveBeenCalledWith(response.children[1], "Answer");
    expect(messageRendererSource).toContain("this.renderThinkingDisclosure(\n      response");
    expect(messageRendererSource).toContain(
      'answer = response.createDiv({ cls: "pi-agent-message-answer" })'
    );
    expect(styles).toMatch(
      /\.pi-agent-thinking-disclosure \{[\s\S]*?border-bottom: 1px solid var\(--background-modifier-border-hover\)/
    );
    expect(styles).not.toMatch(
      /\.pi-agent-thinking-content \{[\s\S]*?background: var\(--background-primary-alt\);/
    );
    expect(styles).not.toMatch(
      /\.pi-agent-thinking-content \{[\s\S]*?border-top: 1px solid var\(--background-modifier-border\);/
    );
    expect(styles).toMatch(/\.pi-agent-thinking-disclosure summary \{[\s\S]*?padding: 0;/);
    expect(styles).toMatch(/\.pi-agent-thinking-disclosure \{[\s\S]*?padding-bottom: 6px;/);
    expect(styles).toMatch(
      /\.pi-agent-thinking-disclosure\.is-live \{\s*border-bottom-color: transparent;\s*margin-bottom: -4px;\s*padding-bottom: 0;/
    );
    expect(styles).toMatch(/\.pi-agent-thinking-content \{[\s\S]*?padding: 0 0 0 18px;/);
    expect(styles).toMatch(
      /\.pi-agent-thinking-content\.markdown-rendered > \* \{\s*margin-block: 3px;/
    );
  });

  it("preserves a user-set thinking disclosure state when a run completes or fails", () => {
    expect(viewSource.match(/n\.thinkingUserSet \? n\.thinkingExpanded : false/g)).toHaveLength(2);
    expect(viewSource).toContain("if (!n.thinkingUserSet) n.thinkingExpanded = false");
    expect(viewSource).toContain("this.liveThinkingSetExpanded?.(n.thinkingExpanded)");
  });

  it("keeps archive-all directly visible and removes the empty history overflow", () => {
    expect(threadListSource).toContain('setIcon)(archiveButton, "archive")');
    expect(threadListSource).toContain('"aria-label": "Archive all chats"');
    expect(threadListSource).not.toContain("showThreadListMenu");
    expect(threadListSource).not.toContain('setIcon)(menuButton, "more-vertical")');
  });

  it("fills selected favorite stars with non-accent current color", () => {
    expect(styles).toMatch(
      /\.pi-agent-header-favorite\.is-favorite svg,[\s\S]*?fill: currentColor;/
    );
    expect(styles).toMatch(
      /\.pi-agent-header-favorite\.is-favorite \{\s*color: var\(--text-normal\);/
    );
    expect(styles).toMatch(
      /\.pi-agent-thread-favorite\.is-favorite \{\s*color: var\(--text-muted\);/
    );
  });

  it("keeps animated activity text inside the response disclosure with reduced-motion fallback", () => {
    expect(messageRendererSource).not.toContain("pi-agent-inline-activity");
    expect(styles).not.toContain(".pi-agent-inline-activity");
    expect(messageRendererSource).not.toContain("pi-agent-inline-activity-spinner");
    expect(messageRendererSource).not.toContain("pi-agent-thinking-spinner");
    expect(messageRendererSource).toContain('this.activityText || "Thinking"');
    expect(messageRendererSource).toContain('this.activityText || "Responding"');
    expect(messageRendererSource).toContain(".toUpperCase()");
    expect(styles).toMatch(
      /\.pi-agent-thinking-label \{[\s\S]*?font-weight: var\(--font-bold\);[\s\S]*?letter-spacing: 0\.04em;/
    );
    expect(styles).toContain("@keyframes pi-agent-activity-flow");
    expect(styles).toMatch(
      /\.pi-agent-thinking-disclosure\.is-live \.pi-agent-thinking-label \{[\s\S]*?animation: pi-agent-activity-flow 1\.2s linear infinite;/
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.pi-agent-thinking-disclosure\.is-live \.pi-agent-thinking-label,[\s\S]*?animation: none;[\s\S]*?-webkit-text-fill-color: var\(--text-muted\);[\s\S]*?\.pi-agent-thinking-chevron \{\s*transition: none;/
    );
    expect(viewSource).not.toContain('setIcon)(icon, "brain")');
  });

  it("makes both user and assistant response bubbles visually distinct", () => {
    expect(styles).toMatch(
      /\.pi-agent-message-content \{[\s\S]*?background: var\(--background-secondary-alt\);[\s\S]*?border: 1px solid var\(--background-modifier-border\);/
    );
    expect(styles).toMatch(
      /\.pi-agent-message-assistant \.pi-agent-message-content \{[\s\S]*?border-color: var\(--background-modifier-border-hover\);/
    );
    expect(styles).toMatch(
      /\.pi-agent-message-user \.pi-agent-message-content \{[\s\S]*?interactive-accent\) 14%[\s\S]*?border-color:/
    );
  });
});
