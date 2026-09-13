import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBlockersFromCounts,
  buildCustomerEligibilityChecksum,
  CUSTOMER_HISTORY_BLOCKER_CODES,
  isEligibleForHardDelete,
} from "./customerAccountEligibility";

describe("customerAccountEligibility", () => {
  const emptyCounts = {
    printRequests: 0,
    showAllocations: 0,
    customerUploads: 0,
    customerUploadBatches: 0,
    assistedCreationRequests: 0,
    customerNotifications: 0,
    emailDeliveryJobs: 0,
    etsyRecommendationRequests: 0,
    etsySuggestionRequests: 0,
    designIssueReports: 0,
    favorites: 0,
    webPushSubscriptions: 0,
    customRequests: 0,
    storageObjects: 0,
  };

  it("allows hard delete when no blockers exist", () => {
    const blockers = buildBlockersFromCounts(emptyCounts, {
      isDeleted: false,
      isMerged: false,
      hasIdentityOperationLock: false,
    });
    assert.equal(blockers.length, 0);
    assert.equal(isEligibleForHardDelete(blockers), true);
  });

  it("blocks hard delete for print requests", () => {
    const blockers = buildBlockersFromCounts(
      { ...emptyCounts, printRequests: 1 },
      { isDeleted: false, isMerged: false, hasIdentityOperationLock: false },
    );
    assert.equal(blockers.some((b) => b.code === CUSTOMER_HISTORY_BLOCKER_CODES.PRINT_REQUESTS), true);
    assert.equal(isEligibleForHardDelete(blockers), false);
  });

  it("blocks hard delete for design issue reports", () => {
    const blockers = buildBlockersFromCounts(
      { ...emptyCounts, designIssueReports: 1 },
      { isDeleted: false, isMerged: false, hasIdentityOperationLock: false },
    );
    assert.equal(
      blockers.some((b) => b.code === CUSTOMER_HISTORY_BLOCKER_CODES.DESIGN_ISSUE_REPORTS),
      true,
    );
  });

  it("blocks tombstoned customers", () => {
    const blockers = buildBlockersFromCounts(emptyCounts, {
      isDeleted: true,
      isMerged: false,
      hasIdentityOperationLock: false,
    });
    assert.equal(blockers.some((b) => b.code === CUSTOMER_HISTORY_BLOCKER_CODES.TOMBSTONED), true);
  });

  it("blocks merged customers", () => {
    const blockers = buildBlockersFromCounts(emptyCounts, {
      isDeleted: false,
      isMerged: true,
      hasIdentityOperationLock: false,
    });
    assert.equal(blockers.some((b) => b.code === CUSTOMER_HISTORY_BLOCKER_CODES.MERGED), true);
  });

  it("changes checksum when blocker counts change", () => {
    const base = buildCustomerEligibilityChecksum({
      customerId: "cust-1",
      updatedAtMillis: 1000,
      blockerCounts: emptyCounts,
      isDeleted: false,
      isDisabled: false,
      isMerged: false,
      hasIdentityOperationLock: false,
    });
    const withHistory = buildCustomerEligibilityChecksum({
      customerId: "cust-1",
      updatedAtMillis: 1000,
      blockerCounts: { ...emptyCounts, printRequests: 1 },
      isDeleted: false,
      isDisabled: false,
      isMerged: false,
      hasIdentityOperationLock: false,
    });
    assert.notEqual(base, withHistory);
    assert.equal(base.length, 64);
    assert.match(base, /^[0-9a-f]{64}$/);
  });
});
