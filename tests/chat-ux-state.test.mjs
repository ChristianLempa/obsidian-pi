import { describe, expect, it } from "vitest";
import { getSendActionState } from "../src/ui/send-state.mjs";
import { formatBulkDeleteResult, planBulkThreadDeletion } from "../src/ui/thread-bulk-actions.mjs";

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

  it("plans bulk deletion with favorite protection and active-run safety", () => {
    const plan = planBulkThreadDeletion(
      [
        { id: "ready", favorite: false },
        { id: "favorite", favorite: true },
        { id: "running", favorite: false },
        { id: "running-favorite", favorite: true }
      ],
      ["running", "running-favorite"]
    );

    expect(plan).toEqual({
      all: {
        deleteIds: ["ready", "favorite"],
        skippedIds: ["running", "running-favorite"],
        deleteCount: 2,
        skippedCount: 2
      },
      exceptFavorites: {
        deleteIds: ["ready"],
        skippedIds: ["running"],
        deleteCount: 1,
        skippedCount: 1
      },
      favoriteCount: 2
    });
    expect(
      formatBulkDeleteResult({ deletedCount: 1, skippedCount: 1, createdEmptyChat: true })
    ).toBe(
      "1 chat deleted; 1 active chat was skipped; a new empty chat was created. Local Pi sessions were kept."
    );
  });

  it("handles zero favorites and all-favorite histories", () => {
    expect(
      planBulkThreadDeletion([
        { id: "one", favorite: false },
        { id: "two", favorite: false }
      ]).exceptFavorites.deleteIds
    ).toEqual(["one", "two"]);

    const allFavorites = planBulkThreadDeletion([
      { id: "one", favorite: true },
      { id: "two", favorite: true }
    ]);
    expect(allFavorites.exceptFavorites.deleteCount).toBe(0);
    expect(allFavorites.all.deleteIds).toEqual(["one", "two"]);
  });
});
