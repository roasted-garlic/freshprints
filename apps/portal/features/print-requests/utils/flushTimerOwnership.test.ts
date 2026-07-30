import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clearOwnedFlushTimers } from "./flushTimerOwnership";

describe("flush timer ownership", () => {
  it("clears exactly the effect-owned timers without touching a replacement registry", () => {
    const owned = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    const replacement = new Map([["c", 3]]);
    const cleared: number[] = [];

    clearOwnedFlushTimers(owned, (timer) => cleared.push(timer));

    assert.deepEqual(cleared, [1, 2]);
    assert.equal(owned.size, 0);
    assert.deepEqual([...replacement.entries()], [["c", 3]]);
  });
});
