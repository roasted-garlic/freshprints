import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyDonationFinalizeQuotaRefundInTransaction,
  shouldRefundDonationFinalizeQuota,
  resolveDonationFinalizeQuotaRefundTarget,
} from "./refundDonationFinalizeQuota";

describe("shouldRefundDonationFinalizeQuota", () => {
  it("refunds only charged catalog_donation uploads", () => {
    assert.equal(
      shouldRefundDonationFinalizeQuota({
        purpose: "catalog_donation",
        quotaChargedFinalize: true,
        customerUid: "cust_1",
      }),
      true,
    );
  });

  it("does not refund uncharged donations", () => {
    assert.equal(
      shouldRefundDonationFinalizeQuota({
        purpose: "catalog_donation",
        quotaChargedFinalize: false,
        customerUid: "cust_1",
      }),
      false,
    );
    assert.equal(
      shouldRefundDonationFinalizeQuota({
        purpose: "catalog_donation",
        customerUid: "cust_1",
      }),
      false,
    );
  });

  it("does not refund print_request uploads (Cap L unchanged)", () => {
    assert.equal(
      shouldRefundDonationFinalizeQuota({
        purpose: "print_request",
        quotaChargedFinalize: true,
        customerUid: "cust_1",
      }),
      false,
    );
    assert.equal(
      shouldRefundDonationFinalizeQuota({
        quotaChargedFinalize: true,
        customerUid: "cust_1",
      }),
      false,
    );
  });
});

describe("resolveDonationFinalizeQuotaRefundTarget", () => {
  it("returns today's rate-limit ref for charged donations", () => {
    const target = resolveDonationFinalizeQuotaRefundTarget({
      purpose: "catalog_donation",
      quotaChargedFinalize: true,
      customerUid: "  cust_abc  ",
    });
    assert.ok(target);
    assert.equal(target.customerUid, "cust_abc");
    assert.match(target.rateLimitRef.path, /^customerUploadRateLimits\/cust_abc_\d{8}$/);
  });

  it("returns null when ownership uid is missing", () => {
    assert.equal(
      resolveDonationFinalizeQuotaRefundTarget({
        purpose: "catalog_donation",
        quotaChargedFinalize: true,
        customerUid: "   ",
      }),
      null,
    );
  });

  it("returns null when refund is not applicable", () => {
    assert.equal(
      resolveDonationFinalizeQuotaRefundTarget({
        purpose: "print_request",
        quotaChargedFinalize: true,
        customerUid: "cust_1",
      }),
      null,
    );
  });
});

describe("applyDonationFinalizeQuotaRefundInTransaction (contract)", () => {
  it("never writes a negative counter", () => {
    const updates: Array<Record<string, unknown>> = [];
    const transaction = {
      update(_ref: unknown, data: Record<string, unknown>) {
        updates.push(data);
      },
    };

    applyDonationFinalizeQuotaRefundInTransaction(
      transaction as never,
      {
        exists: true,
        data: () => ({ finalizeImageCountDonation: 0 }),
      } as never,
      { path: "customerUploadRateLimits/cust_1_20260811" } as never,
    );
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.finalizeImageCountDonation, 0);

    updates.length = 0;
    applyDonationFinalizeQuotaRefundInTransaction(
      transaction as never,
      {
        exists: true,
        data: () => ({ finalizeImageCountDonation: 3 }),
      } as never,
      { path: "customerUploadRateLimits/cust_1_20260811" } as never,
    );
    assert.equal(updates[0]?.finalizeImageCountDonation, 2);

    updates.length = 0;
    applyDonationFinalizeQuotaRefundInTransaction(
      transaction as never,
      { exists: false, data: () => undefined } as never,
      { path: "customerUploadRateLimits/cust_1_20260811" } as never,
    );
    assert.equal(updates.length, 0);
  });
});
