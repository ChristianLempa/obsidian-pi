import { describe, expect, it } from "vitest";
import { sanitizeThreadHistory } from "../src/shared/thread-history.mjs";

describe("thread history helpers", () => {
  it("keeps every thread and repairs an invalid current reference", () => {
    const threads = Array.from({ length: 41 }, (_, index) => ({
      id: `thread-${index + 1}`,
      updatedAt: index + 1,
      messages: []
    }));

    const result = sanitizeThreadHistory({ currentThreadId: "missing", threads });

    expect(result.threads).toHaveLength(41);
    expect(result.threads[0].id).toBe("thread-41");
    expect(result.currentThreadId).toBe("thread-41");
  });
});
