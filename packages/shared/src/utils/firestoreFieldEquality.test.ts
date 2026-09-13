import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Timestamp } from "firebase-admin/firestore";

import {
  firestoreFieldValuesEqual,
  readyApprovalAuditUnchanged,
} from "./firestoreFieldEquality";

describe("firestoreFieldValuesEqual", () => {
  it("same Timestamp value in separate instances => unchanged", () => {
    const a = Timestamp.fromDate(new Date("2026-08-11T16:49:21.556Z"));
    const b = Timestamp.fromDate(new Date("2026-08-11T16:49:21.556Z"));
    assert.equal(firestoreFieldValuesEqual(a, b), true);
  });

  it("seconds changed => changed", () => {
    const a = new Timestamp(100, 0);
    const b = new Timestamp(101, 0);
    assert.equal(firestoreFieldValuesEqual(a, b), false);
  });

  it("nanoseconds changed => changed", () => {
    const a = new Timestamp(100, 100);
    const b = new Timestamp(100, 200);
    assert.equal(firestoreFieldValuesEqual(a, b), false);
  });

  it("same null value => unchanged", () => {
    assert.equal(firestoreFieldValuesEqual(null, null), true);
  });

  it("null vs value => changed", () => {
    assert.equal(firestoreFieldValuesEqual(null, "x"), false);
  });

  it("artwork background value change => changed", () => {
    assert.equal(firestoreFieldValuesEqual("#ffffff", "#000000"), false);
    assert.equal(firestoreFieldValuesEqual(null, "#ffffff"), false);
    assert.equal(firestoreFieldValuesEqual(null, null), true);
  });
});

describe("readyApprovalAuditUnchanged", () => {
  it("detects aiReviewedBy change", () => {
    const ts = Timestamp.fromDate(new Date("2026-08-11T16:49:21.556Z"));
    assert.equal(
      readyApprovalAuditUnchanged({
        beforeAiReviewedBy: "user-a",
        afterAiReviewedBy: "user-b",
        beforeAiReviewedAt: ts,
        afterAiReviewedAt: ts,
        beforeReadyAt: ts,
        afterReadyAt: ts,
      }),
      false,
    );
  });

  it("detects readyAt change", () => {
    const before = Timestamp.fromDate(new Date("2026-08-11T16:48:21.572Z"));
    const after = Timestamp.fromDate(new Date("2026-08-11T16:49:21.556Z"));
    assert.equal(
      readyApprovalAuditUnchanged({
        beforeAiReviewedBy: "user-a",
        afterAiReviewedBy: "user-a",
        beforeAiReviewedAt: before,
        afterAiReviewedAt: before,
        beforeReadyAt: before,
        afterReadyAt: after,
      }),
      false,
    );
  });

  it("unchanged audit when timestamps are semantically equal", () => {
    const before = Timestamp.fromDate(new Date("2026-08-11T16:49:21.556Z"));
    const after = Timestamp.fromDate(new Date("2026-08-11T16:49:21.556Z"));
    assert.equal(
      readyApprovalAuditUnchanged({
        beforeAiReviewedBy: "user-a",
        afterAiReviewedBy: "user-a",
        beforeAiReviewedAt: before,
        afterAiReviewedAt: after,
        beforeReadyAt: before,
        afterReadyAt: after,
      }),
      true,
    );
  });
});
