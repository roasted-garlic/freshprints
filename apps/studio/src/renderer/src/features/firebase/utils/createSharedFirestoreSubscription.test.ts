import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resetFirestoreUsageTraceForTests } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { createSharedFirestoreSubscription } from "./createSharedFirestoreSubscription";

describe("createSharedFirestoreSubscription", () => {
  it("starts one upstream subscription for multiple subscribers and tears down on last leave", () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    let startCount = 0;
    let stopCount = 0;
    let emitNext: ((value: number) => void) | null = null;

    const shared = createSharedFirestoreSubscription<number>({
      traceKey: "test:shared",
      start: ({ next }) => {
        startCount += 1;
        emitNext = next;
        return () => {
          stopCount += 1;
          emitNext = null;
        };
      },
    });

    const seenA: number[] = [];
    const seenB: number[] = [];
    const unsubA = shared.subscribe((value) => {
      seenA.push(value);
    });
    const unsubB = shared.subscribe((value) => {
      seenB.push(value);
    });

    assert.equal(startCount, 1);
    emitNext?.(7);
    assert.deepEqual(seenA, [7]);
    assert.deepEqual(seenB, [7]);

    unsubA();
    assert.equal(stopCount, 0);
    emitNext?.(8);
    assert.deepEqual(seenA, [7]);
    assert.deepEqual(seenB, [7, 8]);

    unsubB();
    assert.equal(stopCount, 1);
  });
});
