import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { Timestamp } from "firebase/firestore";

import { PRINT_REQUEST_HISTORY_PAGE_SIZE } from "../types/customerPrintRequestHistory.types";
import { resolveLogicalCustomerIds } from "./resolveLogicalCustomerIds";

function buildCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "survivor-1",
    displayName: "Fresh Prints",
    username: "fresh_prints",
    email: "fresh@example.com",
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
    totalPrintRequests: 20,
    totalDesignsUploaded: 0,
    ...overrides,
  } as Customer;
}

describe("resolveLogicalCustomerIds pagination helpers", () => {
  it("uses the approved page size constant of 15", () => {
    assert.equal(PRINT_REQUEST_HISTORY_PAGE_SIZE, 15);
  });

  it("includes merged source ids for alias-aware history", () => {
    assert.deepEqual(resolveLogicalCustomerIds(buildCustomer({ mergedSourceCustomerIds: ["source-1"] })), [
      "survivor-1",
      "source-1",
    ]);
  });
});
