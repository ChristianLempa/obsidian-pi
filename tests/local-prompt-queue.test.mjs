import { describe, expect, it } from "vitest";
import { captureAnchor } from "../src/annotations/annotation-anchors.mjs";
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

  it("persists text attachments through claim, restore, retrieve-style edit, and one-time take", () => {
    const attachment = {
      id: "file-1",
      kind: "text",
      fileName: "config.yaml",
      mimeType: "application/yaml",
      content: "enabled: true",
      originalSize: 13,
      includedBytes: 13,
      truncated: false,
      source: "vault",
      path: "config.yaml"
    };
    const normalized = normalizeLocalPromptQueue([
      {
        id: "files",
        prompt: "review",
        images: [],
        attachments: [attachment],
        threadId: "a",
        createdAt: 1
      }
    ]);
    expect(normalized[0].attachments).toEqual([attachment]);
    const taken = takeLocalPrompt(normalized, "files");
    expect(taken.item.attachments[0].fileName).toBe("config.yaml");
    expect(takeLocalPrompt(taken.queue, "files").item).toBeUndefined();
    const restored = restoreLocalPrompt(taken.queue, taken.item, taken.index);
    expect(claimLocalPrompt(restored, "files", "delivering").item.state).toBe("delivering");
  });

  it("persists a consumed annotation snapshot through queue claims and restoration", () => {
    const annotation = {
      id: "annotation-1",
      path: "Note.md",
      intent: "change",
      context: "Rewrite this",
      targetKind: "selection",
      ...captureAnchor("before target after", 7, 13)
    };
    const normalized = normalizeLocalPromptQueue([
      {
        id: "annotated",
        prompt: "Apply annotations",
        annotations: [annotation],
        threadId: "a",
        createdAt: 1
      }
    ]);

    expect(normalized[0].annotations).toHaveLength(1);
    const taken = takeLocalPrompt(normalized, "annotated");
    const restored = restoreLocalPrompt(taken.queue, taken.item, taken.index);
    expect(restored[0].annotations[0]).toMatchObject({
      id: "annotation-1",
      path: "Note.md",
      context: "Rewrite this"
    });
  });

  it("supports safe edit and removal by stable id", () => {
    const edited = updateLocalPrompt(normalizeLocalPromptQueue(queue()), "two", {
      prompt: "changed"
    });
    expect(edited[1].prompt).toBe("changed");
    expect(removeLocalPrompt(edited, "one").map((item) => item.id)).toEqual(["two"]);
  });
});
