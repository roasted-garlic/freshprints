import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  diagnosePrintRequestAssignmentInvariant,
  diagnosePrintRequestForCompletion,
} from "./printRequestCompletionDiagnostics";

describe("Print Request completion diagnostics", () => {
  it("preserves exact missing/wrong-typed and legacy-extra field names without values", () => {
    const result = diagnosePrintRequestForCompletion({
      name: "Request",
      status: "active",
      itemCount: "wrong type",
      createdBy: "owner",
      updatedBy: "owner",
      createdAt: Timestamp.now(),
      legacyImportShape: { secret: "not emitted" },
    });
    assert.equal(result.parserStatus, "incompatible");
    assert.deepEqual(result.missingFields, ["itemCount", "updatedAt"]);
    assert.deepEqual(result.legacyExtraFields, ["legacyImportShape"]);
    assert.equal(result.assignmentInvariantFailure, "neither_customer_nor_guest_id_present");
  });

  it("assignmentInvariantFailure is null for an otherwise-valid customer-owned document", () => {
    const result = diagnosePrintRequestForCompletion({
      name: "Request",
      status: "active",
      itemCount: 3,
      customerId: "customer-1",
      isInternal: false,
      requestOrigin: "portal_customer",
      createdBy: "owner",
      updatedBy: "owner",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    assert.equal(result.assignmentInvariantFailure, null);
  });

  it("classifies current server-maintained request fields as known and structurally valid", () => {
    const result = diagnosePrintRequestForCompletion({
      name: "Request",
      status: "active",
      itemCount: 3,
      customerId: "customer-1",
      isInternal: false,
      requestOrigin: "portal_customer",
      queueTab: "printing",
      showQueueBiddingAcknowledgment: {
        accepted: true,
        acceptedAt: Timestamp.now(),
        acceptedByUid: "customer-uid",
        version: "portal-bidding-ack-v3",
        upcomingShowId: "show-1",
      },
      createdBy: "owner",
      updatedBy: "owner",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    assert.deepEqual(result.legacyExtraFields, []);
    assert.equal(result.queueTabStatus, "valid");
    assert.equal(result.biddingAcknowledgmentStatus, "valid");
  });

  it("reports invalid current field shapes without emitting their values", () => {
    const result = diagnosePrintRequestForCompletion({
      queueTab: "not-a-tab",
      showQueueBiddingAcknowledgment: { accepted: false, privateValue: "not emitted" },
    });
    assert.equal(result.queueTabStatus, "invalid");
    assert.equal(result.biddingAcknowledgmentStatus, "invalid");
    assert.deepEqual(result.legacyExtraFields, []);
  });
});

describe("Print Request assignment invariant (Plan Section 29.3 — mirrors firestore.rules exactly)", () => {
  it("valid: non-internal request with only customerId", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({ isInternal: false, customerId: "c1" }),
      null,
    );
  });

  it("valid: non-internal request with only guestCustomerId", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({ isInternal: false, guestCustomerId: "g1" }),
      null,
    );
  });

  it("valid: internal request with neither id field", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({ isInternal: true }),
      null,
    );
  });

  it("invalid: non-internal request with BOTH customerId and guestCustomerId present", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({
        isInternal: false,
        customerId: "c1",
        guestCustomerId: "g1",
      }),
      "both_customer_and_guest_id_present",
    );
  });

  it("invalid: non-internal request with NEITHER id field present", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({ isInternal: false }),
      "neither_customer_nor_guest_id_present",
    );
  });

  it("invalid: internal request with a customerId still present (legacy inconsistency)", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({ isInternal: true, customerId: "c1" }),
      "both_customer_and_guest_id_present",
    );
  });

  it("invalid: requestOrigin studio_internal but isInternal is false", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({
        isInternal: false,
        customerId: "c1",
        requestOrigin: "studio_internal",
      }),
      "request_origin_mismatch",
    );
  });

  it("invalid: requestOrigin portal_customer but isInternal is true", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({
        isInternal: true,
        requestOrigin: "portal_customer",
      }),
      "request_origin_mismatch",
    );
  });

  it("valid: requestOrigin absent is never a mismatch on its own", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({ isInternal: false, customerId: "c1" }),
      null,
    );
  });

  it("empty-string id fields do not count as present", () => {
    assert.equal(
      diagnosePrintRequestAssignmentInvariant({ isInternal: false, customerId: "" }),
      "neither_customer_nor_guest_id_present",
    );
  });
});
