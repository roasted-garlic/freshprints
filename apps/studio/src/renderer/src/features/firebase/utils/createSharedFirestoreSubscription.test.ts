import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getFirestoreUsageTraceSnapshot,
  resetFirestoreUsageTraceForTests,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { createSharedFirestoreSubscription } from "./createSharedFirestoreSubscription";

describe("createSharedFirestoreSubscription", () => {
  it("starts one upstream subscription for multiple subscribers and tears down on last leave", () => {
    resetFirestoreUsageTraceForTests({ enabled: false });
    let startCount = 0;
    let stopCount = 0;
    const emitter: { next?: (value: number) => void } = {};

    const shared = createSharedFirestoreSubscription<number>({
      traceKey: "test:shared",
      start: ({ next }) => {
        startCount += 1;
        emitter.next = next;
        return () => {
          stopCount += 1;
          delete emitter.next;
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
    emitter.next?.(7);
    assert.deepEqual(seenA, [7]);
    assert.deepEqual(seenB, [7]);

    unsubA();
    assert.equal(stopCount, 0);
    emitter.next?.(8);
    assert.deepEqual(seenA, [7]);
    assert.deepEqual(seenB, [7, 8]);

    unsubB();
    assert.equal(stopCount, 1);
  });

  it("balances a Strict Mode-style subscribe cleanup replay with safe metadata", () => {
    resetFirestoreUsageTraceForTests({ app: "studio", enabled: true, route: "/inbox" });
    let startCount = 0;
    let stopCount = 0;
    const traceMetadata = {
      app: "studio" as const,
      collection: "assistedCreationRequests",
      limit: 100,
      orderBy: ["createdAt desc"],
      source: "strict-mode-test",
      triggerReason: "authentication" as const,
    };
    const shared = createSharedFirestoreSubscription<number>({
      traceKey: "test:strict-mode",
      traceMetadata,
      start: () => {
        startCount += 1;
        return () => {
          stopCount += 1;
        };
      },
    });

    const firstCleanup = shared.subscribe(() => undefined);
    firstCleanup();
    const replayCleanup = shared.subscribe(() => undefined);
    replayCleanup();

    const snapshot = getFirestoreUsageTraceSnapshot();
    const signature = Object.keys(snapshot.listenerAttaches)[0];
    assert.equal(startCount, 2);
    assert.equal(stopCount, 2);
    assert.equal(snapshot.listenerAttaches[signature], 2);
    assert.equal(snapshot.listenerDetaches[signature], 2);
    assert.equal(snapshot.currentListeners, 0);
    assert.deepEqual(snapshot.summary.duplicateActiveSignatures, {});
    assert.equal(snapshot.summary.routeOwnership["/inbox:strict-mode-test"], 4);
  });
});
