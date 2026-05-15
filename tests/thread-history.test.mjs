import { describe, expect, it } from "vitest";
import { sanitizeThreadHistory } from "../src/shared/thread-history.mjs";

describe("thread history helpers", () => {
  it("keeps compact change review data before persistence", () => {
    const result = sanitizeThreadHistory({
      currentThreadId: "a",
      threads: [
        {
          id: "a",
          updatedAt: 2,
          messages: [
            {
              role: "assistant",
              content: "done",
              changeSummaries: [
                {
                  files: [{ path: "note.md" }],
                  stats: { filesChanged: 1 },
                  sourceEventType: "vault-snapshot",
                  unifiedDiff: "diff",
                  fileSnapshots: [{ before: "secret" }]
                }
              ],
              changedFiles: [{ path: "note.md" }],
              changeStats: { filesChanged: 1 }
            }
          ]
        }
      ]
    });

    expect(result.threads[0].messages[0]).toEqual({
      role: "assistant",
      content: "done",
      changeSummaries: [
        {
          files: [{ path: "note.md" }],
          stats: { filesChanged: 1 },
          sourceEventType: "vault-snapshot",
          unifiedDiff: "diff"
        }
      ],
      changedFiles: [{ path: "note.md" }],
      changeStats: { filesChanged: 1 }
    });
  });
});
