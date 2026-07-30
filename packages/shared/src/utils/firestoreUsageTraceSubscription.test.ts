import assert from "node:assert/strict";
import test from "node:test";
import type { FirestoreTraceSnapshot } from "./firestoreUsageTrace";

import {
  resetFirestoreUsageTraceForTests,
  setFirestoreUsageTraceContext,
  setFirestoreUsageTraceEnabled,
  subscribeFirestoreUsageTrace,
  traceGeneratedAssetOutcome,
  traceGeneratedFallbackActivation,
  traceCallableStart,
  traceFirestoreOneShotStart,
} from "./firestoreUsageTrace";

test("publishes live main-renderer events with route context", () => {
  resetFirestoreUsageTraceForTests({ app: "studio", enabled: true, route: "/inbox" });
  const snapshots: FirestoreTraceSnapshot[] = [];
  const unsubscribe = subscribeFirestoreUsageTrace((snapshot) => snapshots.push(snapshot));

  setFirestoreUsageTraceContext({ app: "studio", route: "/designs" });
  traceFirestoreOneShotStart("getDocs", {
    collection: "designs",
    signature: "designs-ready",
  });
  unsubscribe();

  const latest = snapshots.at(-1);
  assert.equal(latest?.events.at(-1)?.route, "/designs");
  assert.equal(latest?.events.at(-1)?.collection, "designs");
});

test("reset affects the subscribed authoritative session", () => {
  resetFirestoreUsageTraceForTests({ app: "studio", enabled: true, route: "/designs" });
  traceCallableStart("beforeReset");
  const snapshots: Array<{ events: unknown[] }> = [];
  const unsubscribe = subscribeFirestoreUsageTrace((snapshot) => snapshots.push(snapshot));

  resetFirestoreUsageTraceForTests({ app: "studio", enabled: true, route: "/designs" });
  unsubscribe();

  assert.equal(snapshots.at(-1)?.events.length, 0);
});

test("enable and disable update subscribers without retaining events", () => {
  resetFirestoreUsageTraceForTests({ app: "studio", enabled: true });
  traceCallableStart("beforeDisable");
  const enabledStates: boolean[] = [];
  const unsubscribe = subscribeFirestoreUsageTrace((snapshot) =>
    enabledStates.push(snapshot.enabled),
  );

  setFirestoreUsageTraceEnabled(false);
  setFirestoreUsageTraceEnabled(true);
  unsubscribe();

  assert.deepEqual(enabledStates.slice(-2), [false, true]);
});

test("records generated success, failure, and explicit fallback activation reasons", () => {
  resetFirestoreUsageTraceForTests({ app: "studio", enabled: true, route: "/designs" });
  const snapshots: FirestoreTraceSnapshot[] = [];
  const unsubscribe = subscribeFirestoreUsageTrace((snapshot) => snapshots.push(snapshot));

  traceGeneratedAssetOutcome("success", "taxonomy@generated-first-v3");
  traceGeneratedAssetOutcome("failure", "ready-index@generated-first-v3");
  traceGeneratedFallbackActivation(
    "ready-design-fallback@generated-first-v3",
    "generated-ready-index-terminal-failure",
  );
  unsubscribe();

  const events = snapshots.at(-1)?.events ?? [];
  assert.deepEqual(
    events.map((event) => event.kind),
    ["generatedAssetSuccess", "generatedAssetFailure", "fallback"],
  );
  assert.equal(events[2]?.fallbackReason, "generated-ready-index-terminal-failure");
});
