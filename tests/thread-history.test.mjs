import { describe, expect, it } from "vitest";
import { sanitizeThreadHistory } from "../src/shared/thread-history.mjs";

describe("thread history helpers", () => {
  it("keeps the most recent threads before persistence", () => {
    const result = sanitizeThreadHistory(
      {
        currentThreadId: "a",
        threads: [
          { id: "old", updatedAt: 1, messages: [] },
          { id: "new", updatedAt: 2, messages: [] }
        ]
      },
      1
    );

    expect(result).toEqual({
      currentThreadId: "a",
      threads: [{ id: "new", updatedAt: 2, messages: [] }]
    });
  });
});
