import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS } from "../constants/assistedCreation/assistedCreation.constants";
import {
  assistedCreationApprovedProofExpiresAtMillis,
  evaluateAssistedCreationApprovedProofDownload,
  evaluateAssistedCreationApprovedProofPurge,
  isAssistedCreationProofPng,
  selectAssistedCreationProofIdsToPurgeOnTerminal,
} from "./assistedCreationApprovedProofRetention";

const DAY_MS = 24 * 60 * 60 * 1000;
const APPROVED_AT = Date.parse("2026-07-01T12:00:00.000Z");

const proofs = [
  {
    id: "p1",
    storagePath: "assisted-creation/u1/r1/proofs/p1",
    fileName: "old.png",
    contentType: "image/png",
  },
  {
    id: "p2",
    storagePath: "assisted-creation/u1/r1/proofs/p2",
    fileName: "final.png",
    contentType: "image/png",
  },
];

describe("assistedCreationApprovedProofExpiresAtMillis", () => {
  it("adds retention days", () => {
    assert.equal(
      assistedCreationApprovedProofExpiresAtMillis(APPROVED_AT),
      APPROVED_AT + ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS * DAY_MS,
    );
  });
});

describe("evaluateAssistedCreationApprovedProofDownload", () => {
  it("is eligible within the 14-day window", () => {
    const result = evaluateAssistedCreationApprovedProofDownload({
      status: "approved",
      approvedProofId: "p2",
      approvedAtMillis: APPROVED_AT,
      proofs,
      nowMs: APPROVED_AT + 3 * DAY_MS,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "eligible");
    assert.equal(result.proof?.id, "p2");
  });

  it("allows legacy approved docs missing approvedAt/approvedProofId while file exists", () => {
    const result = evaluateAssistedCreationApprovedProofDownload({
      status: "approved",
      proofs,
      nowMs: APPROVED_AT,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "eligible");
    assert.equal(result.proof?.id, "p2");
    assert.equal(result.expiresAtMillis, null);
  });

  it("fails closed when approved with no proofs", () => {
    const result = evaluateAssistedCreationApprovedProofDownload({
      status: "approved",
      proofs: [],
      nowMs: APPROVED_AT,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "missing_approval_fields");
  });

  it("expires after 14 days", () => {
    const result = evaluateAssistedCreationApprovedProofDownload({
      status: "approved",
      approvedProofId: "p2",
      approvedAtMillis: APPROVED_AT,
      proofs,
      nowMs: APPROVED_AT + ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS * DAY_MS,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "expired");
  });

  it("blocks when full size already purged", () => {
    const result = evaluateAssistedCreationApprovedProofDownload({
      status: "approved",
      approvedProofId: "p2",
      approvedAtMillis: APPROVED_AT,
      proofs: [{ ...proofs[1]!, fullSizePurgedAtMillis: APPROVED_AT + DAY_MS }],
      nowMs: APPROVED_AT + 2 * DAY_MS,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "full_size_purged");
  });
});

describe("evaluateAssistedCreationApprovedProofPurge", () => {
  it("is eligible after cool-off", () => {
    const result = evaluateAssistedCreationApprovedProofPurge({
      status: "approved",
      approvedProofId: "p2",
      approvedAtMillis: APPROVED_AT,
      proofs,
      nowMs: APPROVED_AT + ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS * DAY_MS,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "eligible");
  });

  it("waits during cool-off", () => {
    const result = evaluateAssistedCreationApprovedProofPurge({
      status: "approved",
      approvedProofId: "p2",
      approvedAtMillis: APPROVED_AT,
      proofs,
      nowMs: APPROVED_AT + 2 * DAY_MS,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "cool_off_not_elapsed");
  });
});

describe("selectAssistedCreationProofIdsToPurgeOnTerminal", () => {
  it("keeps only the approved proof on approve", () => {
    assert.deepEqual(
      selectAssistedCreationProofIdsToPurgeOnTerminal({
        terminalKind: "approved",
        approvedProofId: "p2",
        proofs,
      }),
      ["p1"],
    );
  });

  it("purges all proofs on reject/cancel", () => {
    assert.deepEqual(
      selectAssistedCreationProofIdsToPurgeOnTerminal({
        terminalKind: "rejected_or_cancelled",
        proofs,
      }),
      ["p1", "p2"],
    );
  });

  it("skips already purged proofs", () => {
    assert.deepEqual(
      selectAssistedCreationProofIdsToPurgeOnTerminal({
        terminalKind: "rejected_or_cancelled",
        proofs: [
          { ...proofs[0]!, fullSizePurgedAtMillis: APPROVED_AT },
          proofs[1]!,
        ],
      }),
      ["p2"],
    );
  });
});

describe("isAssistedCreationProofPng", () => {
  it("detects png content type", () => {
    assert.equal(isAssistedCreationProofPng("image/png"), true);
    assert.equal(isAssistedCreationProofPng("image/jpeg"), false);
  });
});
