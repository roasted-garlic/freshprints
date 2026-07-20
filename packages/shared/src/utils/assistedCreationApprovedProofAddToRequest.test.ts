import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateAssistedApprovedProofAddToRequest } from "./assistedCreationApprovedProofAddToRequest";

const APPROVED_AT = Date.parse("2026-07-01T12:00:00.000Z");
const WITHIN_WINDOW = Date.parse("2026-07-05T12:00:00.000Z");
const AFTER_WINDOW = Date.parse("2026-07-20T12:00:00.000Z");

const proof = {
  id: "proof-1",
  storagePath: "assisted-creation/u1/r1/proofs/proof-1.png",
  fileName: "proof-1.png",
  contentType: "image/png",
  fullSizePurgedAtMillis: null as number | null,
};

describe("evaluateAssistedApprovedProofAddToRequest", () => {
  it("is eligible when full-res download is available", () => {
    const result = evaluateAssistedApprovedProofAddToRequest({
      status: "approved",
      approvedProofId: "proof-1",
      approvedAtMillis: APPROVED_AT,
      proofs: [proof],
      printRequestIngest: null,
      nowMs: WITHIN_WINDOW,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "full_res_available");
    assert.equal(result.alreadyIngested, false);
    assert.equal(result.proof?.id, "proof-1");
  });

  it("is eligible when already ingested even after purge", () => {
    const result = evaluateAssistedApprovedProofAddToRequest({
      status: "approved",
      approvedProofId: "proof-1",
      approvedAtMillis: APPROVED_AT,
      proofs: [{ ...proof, fullSizePurgedAtMillis: AFTER_WINDOW, storagePath: "" }],
      printRequestIngest: {
        customerUploadId: "up-1",
        printRequestItemId: "item-1",
        printRequestId: "pr-1",
        assistedProofId: "proof-1",
      },
      nowMs: AFTER_WINDOW,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "already_ingested");
    assert.equal(result.alreadyIngested, true);
  });

  it("hides CTA when purged and never ingested", () => {
    const result = evaluateAssistedApprovedProofAddToRequest({
      status: "approved",
      approvedProofId: "proof-1",
      approvedAtMillis: APPROVED_AT,
      proofs: [{ ...proof, fullSizePurgedAtMillis: AFTER_WINDOW, storagePath: "" }],
      printRequestIngest: null,
      nowMs: AFTER_WINDOW,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "purged_never_ingested");
  });

  it("rejects non-approved status", () => {
    const result = evaluateAssistedApprovedProofAddToRequest({
      status: "proof_ready",
      approvedProofId: "proof-1",
      approvedAtMillis: APPROVED_AT,
      proofs: [proof],
      nowMs: WITHIN_WINDOW,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "not_approved");
  });
});
