/**
 * Unit tests: owner Ready → AI reprocess demotion core.
 * Run: npx tsx --test functions/src/ai/reprocessReadyDesignWithAiCore.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FieldValue } from "firebase-admin/firestore";

import {
  assertReadyDesignEligibleForOwnerAiReprocess,
  buildOwnerReadyAiReprocessDemotionUpdate,
  OWNER_READY_AI_REPROCESS_PRESERVED_FIELD_KEYS,
} from "./reprocessReadyDesignWithAiCore";

describe("assertReadyDesignEligibleForOwnerAiReprocess", () => {
  it("accepts ready + approved", () => {
    assert.equal(
      assertReadyDesignEligibleForOwnerAiReprocess({
        status: "ready",
        aiReviewStatus: "approved",
      }).ok,
      true,
    );
  });

  it("rejects non-ready", () => {
    const r = assertReadyDesignEligibleForOwnerAiReprocess({
      status: "imported",
      aiReviewStatus: "needs_review",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "not_ready");
  });

  it("rejects already-processing imported+pending", () => {
    const r = assertReadyDesignEligibleForOwnerAiReprocess({
      status: "imported",
      aiReviewStatus: "pending",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "already_processing");
  });

  it("rejects archived", () => {
    const r = assertReadyDesignEligibleForOwnerAiReprocess({
      status: "archived",
      aiReviewStatus: "approved",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "archived");
  });
});

describe("buildOwnerReadyAiReprocessDemotionUpdate", () => {
  it("demotes lifecycle and clears AI blobs without touching preserved keys", () => {
    const update = buildOwnerReadyAiReprocessDemotionUpdate({
      callerUid: "owner-1",
      now: FieldValue.serverTimestamp(),
    });

    assert.equal(update.status, "imported");
    assert.equal(update.aiReviewStatus, "pending");
    assert.equal(update.aiProcessingStage, "queued");
    assert.equal(update.lastOwnerAiReprocessBy, "owner-1");
    assert.ok(update.aiSuggestions);
    assert.ok(update.smartProfile === undefined);

    for (const key of OWNER_READY_AI_REPROCESS_PRESERVED_FIELD_KEYS) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(update, key),
        false,
        `must not write preserved field ${key}`,
      );
    }
  });
});
