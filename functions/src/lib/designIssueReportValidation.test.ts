import assert from "node:assert/strict";
import test from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import { chicagoDayKey, parseDesignIssueReportSubmission, safeDesignIssueHash } from "./designIssueReportValidation";

test("normalizes descriptions and validates the approved boundaries", () => {
  assert.equal(parseDesignIssueReportSubmission({ designId: "design_1", idempotencyKey: "1234567890abcdef", description: "  wrong name\r\nshown  " }).description, "wrong name\nshown");
  assert.throws(() => parseDesignIssueReportSubmission({ designId: "design_1", idempotencyKey: "1234567890abcdef", description: "short" }), (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument");
  assert.throws(() => parseDesignIssueReportSubmission({ designId: "../bad", idempotencyKey: "1234567890abcdef", description: "A valid description" }), HttpsError);
});

test("Chicago quota day and fingerprints are deterministic", () => {
  assert.equal(chicagoDayKey(new Date("2026-08-02T04:30:00Z")), "2026-08-01");
  assert.equal(safeDesignIssueHash("same"), safeDesignIssueHash("same"));
  assert.notEqual(safeDesignIssueHash("same"), safeDesignIssueHash("different"));
});
