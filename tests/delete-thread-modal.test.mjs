import { describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  Modal: class {}
}));

const { getThreadDeletionChoices } = await import(
  "../src/ui/modals/delete-thread-modal.mjs"
);

describe("DeleteThreadModal choices", () => {
  it("keeps Pi session deletion separate and opt-in", () => {
    expect(getThreadDeletionChoices({ title: "Chat", piSessionId: "session.jsonl" })).toEqual([
      "cancel",
      "chat",
      "both"
    ]);
  });

  it("does not offer local Pi cleanup when the chat has no session", () => {
    expect(getThreadDeletionChoices({ title: "Chat" })).toEqual(["cancel", "chat"]);
  });
});
