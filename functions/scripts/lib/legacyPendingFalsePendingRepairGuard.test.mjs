/**
 * Unit tests for legacy Pending false-Pending repair guards.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LEGACY_PENDING_REPAIR_ALLOWED_PROJECT_ID,
  LEGACY_PENDING_REPAIR_CONFIRM_ENV,
  LEGACY_PENDING_REPAIR_DEFAULT_ALLOWLIST,
  assertLegacyPendingRepairApplyConfirm,
  assertLegacyPendingRepairProjectId,
  classifyLegacyPendingFalsePendingCandidate,
  hasLiveShowAllocation,
  isLiveShowAllocation,
  resolveLegacyPendingRepairAllowlist,
} from "./legacyPendingFalsePendingRepairGuard.mjs";

const PASS_UPLOAD_ID = LEGACY_PENDING_REPAIR_DEFAULT_ALLOWLIST[0];
const OTHER_ALLOWLISTED = LEGACY_PENDING_REPAIR_DEFAULT_ALLOWLIST[1];

function passUpload(overrides = {}) {
  return {
    purpose: "print_request",
    catalogReviewStatus: "pending_staff_review",
    technicalStatus: "ready",
    printRequestId: "req-draft",
    ...overrides,
  };
}

function passRequest(overrides = {}) {
  return {
    status: "draft",
    ...overrides,
  };
}

function classify(overrides = {}) {
  return classifyLegacyPendingFalsePendingCandidate({
    uploadId: PASS_UPLOAD_ID,
    allowlist: LEGACY_PENDING_REPAIR_DEFAULT_ALLOWLIST,
    upload: passUpload(),
    request: passRequest(),
    allocations: [],
    ...overrides,
  });
}

describe("legacyPendingFalsePendingRepairGuard", () => {
  it("pins project to fresh-prints-prod", () => {
    assert.equal(LEGACY_PENDING_REPAIR_ALLOWED_PROJECT_ID, "fresh-prints-prod");
    assert.doesNotThrow(() => assertLegacyPendingRepairProjectId("fresh-prints-prod"));
    assert.throws(() => assertLegacyPendingRepairProjectId("fresh-prints-dev"), /Hard-pinned/);
  });

  it("requires APPLY=1 and confirm env for APPLY mode", () => {
    assert.equal(LEGACY_PENDING_REPAIR_CONFIRM_ENV, "CONFIRM_PROD_LEGACY_PENDING_REPAIR");
    assert.throws(() => assertLegacyPendingRepairApplyConfirm({ apply: undefined, confirm: "1" }), /APPLY=1/);
    assert.throws(
      () => assertLegacyPendingRepairApplyConfirm({ apply: "1", confirm: undefined }),
      /CONFIRM_PROD_LEGACY_PENDING_REPAIR/,
    );
    assert.doesNotThrow(() =>
      assertLegacyPendingRepairApplyConfirm({ apply: "1", confirm: "1" }),
    );
  });

  it("defines live allocation as non-canceled with allocatedQuantity > 0", () => {
    assert.equal(isLiveShowAllocation({ status: "pending", allocatedQuantity: 1 }), true);
    assert.equal(isLiveShowAllocation({ status: "queued", allocatedQuantity: 2 }), true);
    assert.equal(isLiveShowAllocation({ status: "canceled", allocatedQuantity: 5 }), false);
    assert.equal(isLiveShowAllocation({ status: "pending", allocatedQuantity: 0 }), false);
    assert.equal(
      hasLiveShowAllocation([
        { status: "canceled", allocatedQuantity: 9 },
        { status: "pending", allocatedQuantity: 0 },
      ]),
      false,
    );
    assert.equal(
      hasLiveShowAllocation([
        { status: "canceled", allocatedQuantity: 9 },
        { status: "pending", allocatedQuantity: 1 },
      ]),
      true,
    );
  });

  it("PASS candidate would_patch", () => {
    const result = classify();
    assert.deepEqual(result, {
      decision: "would_patch",
      reason: "proven_false_pending",
      repairPatch: { catalogReviewStatus: "not_eligible" },
    });
  });

  it("allows missing purpose as legacy print-request class", () => {
    const result = classify({ upload: passUpload({ purpose: undefined }) });
    assert.equal(result.decision, "would_patch");
  });

  it("SKIP request active", () => {
    assert.equal(classify({ request: passRequest({ status: "active" }) }).reason, "request_active");
  });

  it("SKIP request editing", () => {
    assert.equal(classify({ request: passRequest({ status: "editing" }) }).reason, "request_editing");
  });

  it("SKIP bidding acknowledgment exists", () => {
    assert.equal(
      classify({
        request: passRequest({ showQueueBiddingAcknowledgment: { acknowledgedAt: "x" } }),
      }).reason,
      "bidding_ack_present",
    );
  });

  it("SKIP live allocation exists", () => {
    assert.equal(
      classify({
        allocations: [{ status: "pending", allocatedQuantity: 1 }],
      }).reason,
      "live_allocation_present",
    );
  });

  it("does not treat canceled-only allocations as live", () => {
    const result = classify({
      allocations: [{ status: "canceled", allocatedQuantity: 3 }],
    });
    assert.equal(result.decision, "would_patch");
  });

  it("SKIP status already changed", () => {
    assert.equal(
      classify({ upload: passUpload({ catalogReviewStatus: "excluded" }) }).reason,
      "incompatible_lifecycle",
    );
    assert.equal(
      classify({ upload: passUpload({ catalogReviewStatus: "weird" }) }).reason,
      "status_changed",
    );
  });

  it("SKIP purpose donation", () => {
    assert.equal(
      classify({ upload: passUpload({ purpose: "donation" }) }).reason,
      "purpose_donation",
    );
  });

  it("SKIP purpose incompatible", () => {
    assert.equal(
      classify({ upload: passUpload({ purpose: "catalog" }) }).reason,
      "purpose_incompatible",
    );
  });

  it("SKIP promoted / incompatible lifecycle", () => {
    assert.equal(
      classify({ upload: passUpload({ catalogReviewStatus: "promoted" }) }).reason,
      "incompatible_lifecycle",
    );
    assert.equal(
      classify({ upload: passUpload({ catalogReviewStatus: "sent_to_ai_review" }) }).reason,
      "incompatible_lifecycle",
    );
  });

  it("SKIP candidate not allowlisted", () => {
    assert.equal(
      classify({ uploadId: "not-in-list" }).reason,
      "not_allowlisted",
    );
  });

  it("SKIP missing linked request / ambiguous history", () => {
    assert.equal(classify({ request: null }).reason, "missing_linked_request");
    assert.equal(
      classify({ request: passRequest({ status: "completed" }) }).reason,
      "request_status_ambiguous",
    );
    assert.equal(
      classify({ upload: passUpload({ printRequestId: "" }) }).reason,
      "missing_print_request_id",
    );
  });

  it("IDEMPOTENCY already not_eligible is safe no-op", () => {
    const result = classify({
      upload: passUpload({ catalogReviewStatus: "not_eligible" }),
    });
    assert.deepEqual(result, {
      decision: "noop_already_repaired",
      reason: "already_not_eligible",
      repairPatch: null,
    });
  });

  it("allowlist resolves from CSV override", () => {
    const list = resolveLegacyPendingRepairAllowlist(`${OTHER_ALLOWLISTED}, extra`);
    assert.deepEqual(list, [OTHER_ALLOWLISTED, "extra"]);
    assert.deepEqual(resolveLegacyPendingRepairAllowlist(""), LEGACY_PENDING_REPAIR_DEFAULT_ALLOWLIST);
  });
});
