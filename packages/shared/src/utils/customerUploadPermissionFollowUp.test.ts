import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canRequestCustomerUploadPermissionFollowUp,
  describeCustomerUploadPermissionActivity,
  isTerminalCustomerUploadPermissionDenial,
  resolveCustomerUploadPermissionAskCount,
} from "./customerUploadPermissionFollowUp";

describe("customerUploadPermissionFollowUp helpers", () => {
  it("resolves legacy declined as one ask used", () => {
    assert.equal(
      resolveCustomerUploadPermissionAskCount({
        catalogPermissionFollowUpStatus: "declined",
      }),
      1,
    );
    assert.equal(
      resolveCustomerUploadPermissionAskCount({
        catalogPermissionAskCount: 2,
        catalogPermissionFollowUpStatus: "declined",
      }),
      2,
    );
  });

  it("allows a second ask after first decline and blocks a third", () => {
    assert.equal(
      canRequestCustomerUploadPermissionFollowUp({
        catalogReviewStatus: "excluded_from_catalog",
        catalogExclusionReason: "customer_permission_denied",
        catalogPermissionFollowUpStatus: "not_requested",
        catalogPermissionAskCount: 0,
      }),
      true,
    );
    assert.equal(
      canRequestCustomerUploadPermissionFollowUp({
        catalogReviewStatus: "excluded_from_catalog",
        catalogExclusionReason: "customer_permission_denied",
        catalogPermissionFollowUpStatus: "declined",
        catalogPermissionAskCount: 1,
      }),
      true,
    );
    assert.equal(
      canRequestCustomerUploadPermissionFollowUp({
        catalogReviewStatus: "excluded_from_catalog",
        catalogExclusionReason: "customer_permission_denied",
        catalogPermissionFollowUpStatus: "declined",
        catalogPermissionAskCount: 2,
      }),
      false,
    );
    assert.equal(
      canRequestCustomerUploadPermissionFollowUp({
        catalogReviewStatus: "excluded_from_catalog",
        catalogExclusionReason: "customer_permission_denied",
        catalogPermissionFollowUpStatus: "requested",
        catalogPermissionAskCount: 1,
      }),
      false,
    );
  });

  it("marks second decline as terminal for Excluded handoff", () => {
    assert.equal(
      isTerminalCustomerUploadPermissionDenial({
        catalogExclusionReason: "customer_permission_denied",
        catalogPermissionFollowUpStatus: "declined",
        catalogPermissionAskCount: 1,
      }),
      false,
    );
    assert.equal(
      isTerminalCustomerUploadPermissionDenial({
        catalogExclusionReason: "customer_permission_denied",
        catalogPermissionFollowUpStatus: "declined",
        catalogPermissionAskCount: 2,
      }),
      true,
    );
  });

  it("describes activity rows for the Studio modal", () => {
    assert.match(
      describeCustomerUploadPermissionActivity({ id: "i", kind: "initial_denial" }),
      /Initial/,
    );
    assert.match(
      describeCustomerUploadPermissionActivity({ id: "a", kind: "ask_sent", attempt: 2 }),
      /2 of 2/,
    );
  });
});
