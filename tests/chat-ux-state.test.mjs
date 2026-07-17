import { describe, expect, it } from "vitest";
import { getSendActionState } from "../src/ui/send-state.mjs";
import { formatArchiveAllResult, planArchiveAllThreads } from "../src/ui/thread-bulk-actions.mjs";

describe("chat UX state", () => {
  it("keeps send, queue, cancel, and canceling actions distinct", () => {
    expect(getSendActionState({ running: false, canceling: false, hasInput: true }).state).toBe(
      "send"
    );
    expect(getSendActionState({ running: true, canceling: false, hasInput: true }).state).toBe(
      "queue"
    );
    expect(getSendActionState({ running: true, canceling: false, hasInput: false }).state).toBe(
      "cancel"
    );
    expect(getSendActionState({ running: true, canceling: true, hasInput: false })).toMatchObject({
      state: "canceling",
      disabled: true
    });
  });

  it("plans archive-all while refusing active and already archived chats", () => {
    const plan = planArchiveAllThreads(
      [
        { id: "ready", archived: false },
        { id: "running", archived: false },
        { id: "old", archived: true }
      ],
      ["running"]
    );

    expect(plan).toEqual({
      archiveIds: ["ready"],
      skippedIds: ["running"],
      archiveCount: 1,
      skippedCount: 1
    });
    expect(formatArchiveAllResult({ archivedCount: 1, skippedCount: 1 })).toBe(
      "1 chat archived; 1 active chat was skipped."
    );
  });
});
