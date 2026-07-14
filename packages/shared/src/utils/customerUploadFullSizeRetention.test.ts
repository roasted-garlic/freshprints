import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CUSTOMER_UPLOAD_FULL_SIZE_IDLE_AFTER_DAYS,
  evaluateCustomerUploadFullSizeRetention,
} from "./customerUploadFullSizeRetention";

describe("evaluateCustomerUploadFullSizeRetention", () => {
  const nowMs = Date.UTC(2026, 6, 14, 12, 0, 0);
  const idleMs = nowMs - (CUSTOMER_UPLOAD_FULL_SIZE_IDLE_AFTER_DAYS + 1) * 24 * 60 * 60 * 1000;

  const base = {
    technicalStatus: "ready",
    onWorkingPrintRequest: false,
    hasActiveAllocation: false,
    hasAnyAllocation: false,
    allLinkedShowsAllowPurge: true,
    nowMs,
  };

  it("purges idle never-queued request uploads", () => {
    const result = evaluateCustomerUploadFullSizeRetention({
      ...base,
      updatedAtMillis: idleMs,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "eligible_idle");
  });

  it("keeps uploads on active allocations", () => {
    const result = evaluateCustomerUploadFullSizeRetention({
      ...base,
      hasActiveAllocation: true,
      hasAnyAllocation: true,
      updatedAtMillis: idleMs,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "active_allocation");
  });

  it("purges after shows finished with terminal allocations", () => {
    const result = evaluateCustomerUploadFullSizeRetention({
      ...base,
      hasAnyAllocation: true,
      allLinkedShowsAllowPurge: true,
      updatedAtMillis: nowMs,
    });
    assert.equal(result.eligible, true);
    assert.equal(result.reason, "eligible_after_show");
  });

  it("blocks donations and working requests", () => {
    assert.equal(
      evaluateCustomerUploadFullSizeRetention({
        ...base,
        purpose: "catalog_donation",
        updatedAtMillis: idleMs,
      }).reason,
      "not_print_request",
    );
    assert.equal(
      evaluateCustomerUploadFullSizeRetention({
        ...base,
        onWorkingPrintRequest: true,
        updatedAtMillis: idleMs,
      }).reason,
      "working_print_request",
    );
  });
});
