import assert from "node:assert/strict";
import test from "node:test";

import { loadGeneratedReadyDesignsWithVerifiedFallback } from "./generatedReadyDesignLoad";

test("successful generated load requests catalog assets and never starts Firestore fallback", async () => {
  const requests: string[] = [];
  let fallbackCalls = 0;
  const result = await loadGeneratedReadyDesignsWithVerifiedFallback({
    loadGenerated: async () => {
      requests.push("portal-catalog/studio/manifest", "portal-catalog/studio/ready-index");
      return [{ id: "design-1" }];
    },
    loadFirestoreFallback: async () => {
      fallbackCalls += 1;
      return [{ id: "firestore-design" }];
    },
  });

  assert.deepEqual(requests, [
    "portal-catalog/studio/manifest",
    "portal-catalog/studio/ready-index",
  ]);
  assert.equal(fallbackCalls, 0);
  assert.deepEqual(result, { source: "generated", entries: [{ id: "design-1" }] });
});

test("Firestore fallback starts only after a rejected generated load", async () => {
  const order: string[] = [];
  const result = await loadGeneratedReadyDesignsWithVerifiedFallback({
    loadGenerated: async () => {
      order.push("generated");
      throw new Error("asset unavailable");
    },
    loadFirestoreFallback: async () => {
      order.push("firestore");
      return [{ id: "fallback" }];
    },
  });

  assert.deepEqual(order, ["generated", "firestore"]);
  assert.equal(result.source, "firestore-fallback");
});

test("Strict Mode cleanup prevents a stale mount from activating fallback", async () => {
  let fallbackCalls = 0;
  const result = await loadGeneratedReadyDesignsWithVerifiedFallback({
    loadGenerated: async () => {
      throw new Error("asset unavailable after remount");
    },
    loadFirestoreFallback: async () => {
      fallbackCalls += 1;
      return [{ id: "stale-fallback" }];
    },
    shouldActivateFallback: () => false,
  });

  assert.equal(fallbackCalls, 0);
  assert.deepEqual(result, { source: "unavailable", entries: [] });
});
