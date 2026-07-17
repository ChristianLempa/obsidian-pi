import { describe, expect, it } from "vitest";
import {
  claimLocalPrompt,
  enqueueLocalPrompt,
  nextDeliverablePrompt,
  normalizeLocalPromptQueue,
  releaseLocalPrompt,
  removeLocalPrompt,
  restoreLocalPrompt,
  restorePersistedLocalPromptQueue,
  takeLocalPrompt,
  updateLocalPrompt
} from "../src/ui/local-prompt-queue.mjs";

function queue() {
  return [
    { id: "one", prompt: "first", images: [], threadId: "a", createdAt: 1 },
    { id: "two", prompt: "second", images: [], threadId: "b", createdAt: 2 }
  ];
}

describe("local prompt queue", () => {
  it("preserves strict order while the first item's thread is running", () => {
    const normalized = normalizeLocalPromptQueue(queue());
    expect(nextDeliverablePrompt(normalized, (thread) => thread === "a")).toBeUndefined();
    expect(nextDeliverablePrompt(normalized, () => false)?.id).toBe("one");
    expect(
      enqueueLocalPrompt(normalized, { prompt: "third", threadId: "a" }).map((x) => x.prompt)
    ).toEqual(["first", "second", "third"]);
  });

  it("claims steering exactly once and can release it after an RPC failure", () => {
    const firstClaim = claimLocalPrompt(normalizeLocalPromptQueue(queue()), "one");
    expect(firstClaim.item?.state).toBe("steering");
    expect(claimLocalPrompt(firstClaim.queue, "one").item).toBeUndefined();
    expect(releaseLocalPrompt(firstClaim.queue, "one")[0].state).toBe("pending");
  });

  it("recovers interrupted steering without duplicating persisted items", () => {
    const restored = restorePersistedLocalPromptQueue(queue().slice(1), [queue()[0], queue()[1]]);
    expect(restored.map((item) => item.id)).toEqual(["one", "two"]);
    expect(restored.every((item) => item.state === "pending")).toBe(true);
  });

  it("atomically removes steering items and restores their queue position on rejection", () => {
    const taken = takeLocalPrompt(normalizeLocalPromptQueue(queue()), "one");
    expect(taken.queue.map((item) => item.id)).toEqual(["two"]);
    expect(takeLocalPrompt(taken.queue, "one").item).toBeUndefined();
    expect(restoreLocalPrompt(taken.queue, taken.item, taken.index).map((item) => item.id)).toEqual(
      ["one", "two"]
    );
  });

  it("supports safe edit and removal by stable id", () => {
    const edited = updateLocalPrompt(normalizeLocalPromptQueue(queue()), "two", {
      prompt: "changed"
    });
    expect(edited[1].prompt).toBe("changed");
    expect(removeLocalPrompt(edited, "one").map((item) => item.id)).toEqual(["two"]);
  });
});
