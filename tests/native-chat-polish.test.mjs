import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  setIcon(element, icon) {
    element.icon = icon;
  }
}));

import { renderThinkingDisclosure } from "../src/ui/message-renderer.mjs";

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
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("native chat polish", () => {
  it("renders live thinking as an open native disclosure with a chevron and status", () => {
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
    expect(descendants.map((element) => element.icon).filter(Boolean)).toEqual([
      "chevron-right",
      "loader"
    ]);
    expect(descendants.some((element) => element.attr.role === "status")).toBe(true);

    rendered.setExpanded(false);
    expect(rendered.details.open).toBe(false);
  });

  it("renders completed thinking collapsed without live-only status UI", () => {
    const root = new FakeElement("div");
    const onToggle = vi.fn();
    const rendered = renderThinkingDisclosure(root, "Finished reasoning", false, onToggle);
    const descendants = rendered.details.descendants();

    expect(rendered.details.open).toBe(false);
    expect(descendants.map((element) => element.icon).filter(Boolean)).toEqual(["chevron-right"]);
    expect(descendants.some((element) => element.attr.role === "status")).toBe(false);

    rendered.details.open = true;
    rendered.details.listeners.get("toggle")();
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("preserves a user-set thinking disclosure state when a run completes or fails", () => {
    expect(viewSource.match(/n\.thinkingUserSet \? n\.thinkingExpanded : false/g)).toHaveLength(2);
    expect(viewSource).toContain("if (!n.thinkingUserSet) n.thinkingExpanded = false");
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

  it("removes decorative thinking treatments and respects reduced motion", () => {
    expect(styles).not.toContain("pi-agent-activity-flow");
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.pi-agent-thinking-chevron \{\s*transition: none;/
    );
    expect(viewSource).not.toContain('setIcon)(icon, "brain")');
  });
});
