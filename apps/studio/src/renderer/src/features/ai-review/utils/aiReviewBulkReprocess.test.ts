import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runAiReviewBulkReprocess } from "./aiReviewBulkReprocess";

describe("runAiReviewBulkReprocess", () => {
  it("deduplicates IDs and runs serially with start/finish progress", async () => {
    const order: string[] = [];
    const progress: Array<{ designId: string; phase: string; current: number; completed: number }> =
      [];
    const result = await runAiReviewBulkReprocess({
      designIds: ["a", "b", "a", "c"],
      reprocessOne: async (designId) => {
        order.push(designId);
        return { ok: true };
      },
      onProgress: ({ designId, phase, current, completed }) =>
        progress.push({ designId, phase, current, completed }),
    });

    assert.deepEqual(order, ["a", "b", "c"]);
    assert.deepEqual(progress, [
      { designId: "a", phase: "start", current: 1, completed: 0 },
      { designId: "a", phase: "finish", current: 1, completed: 1 },
      { designId: "b", phase: "start", current: 2, completed: 1 },
      { designId: "b", phase: "finish", current: 2, completed: 2 },
      { designId: "c", phase: "start", current: 3, completed: 2 },
      { designId: "c", phase: "finish", current: 3, completed: 3 },
    ]);
    assert.deepEqual(result.successfulIds, ["a", "b", "c"]);
  });

  it("continues after a partial failure and preserves the failure", async () => {
    const result = await runAiReviewBulkReprocess({
      designIds: ["a", "b", "c"],
      reprocessOne: async (designId) =>
        designId === "b" ? { ok: false, message: "blocked" } : { ok: true },
    });
    assert.deepEqual(result.successfulIds, ["a", "c"]);
    assert.deepEqual(result.failures, [{ designId: "b", message: "blocked" }]);
  });
});
