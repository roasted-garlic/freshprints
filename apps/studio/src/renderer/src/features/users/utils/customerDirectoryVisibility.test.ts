import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import {
  classifyCustomerAccountVisibility,
  countCustomersByVisibilityTab,
  filterCustomersByVisibilityTab,
  isActiveCustomerAccount,
  isReversibleDisabledCustomer,
} from "./customerDirectoryVisibility";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    displayName: "Test Customer",
    username: "testuser",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Customer;
}

describe("customerDirectoryVisibility", () => {
  it("classifies active, disabled, closed, and merged customers", () => {
    assert.equal(classifyCustomerAccountVisibility(makeCustomer()), "active");
    assert.equal(
      classifyCustomerAccountVisibility(makeCustomer({ isDisabled: true })),
      "disabled",
    );
    assert.equal(
      classifyCustomerAccountVisibility(makeCustomer({ isDeleted: true })),
      "closed",
    );
    assert.equal(
      classifyCustomerAccountVisibility(makeCustomer({ isDisabled: true, isDeleted: true })),
      "closed",
    );
    assert.equal(
      classifyCustomerAccountVisibility(makeCustomer({ isMerged: true })),
      "merged",
    );
    assert.equal(
      classifyCustomerAccountVisibility(makeCustomer({ isMerged: true, isDisabled: true })),
      "merged",
    );
    assert.equal(
      classifyCustomerAccountVisibility(
        makeCustomer({ mergedIntoCustomerId: "cust-survivor" }),
      ),
      "merged",
    );
  });

  it("filters customers by visibility tab", () => {
    const customers = [
      makeCustomer({ id: "a" }),
      makeCustomer({ id: "b", isDisabled: true }),
      makeCustomer({ id: "c", isDeleted: true }),
      makeCustomer({ id: "d", isMerged: true }),
    ];

    assert.deepEqual(
      filterCustomersByVisibilityTab(customers, "active").map((customer) => customer.id),
      ["a"],
    );
    assert.deepEqual(
      filterCustomersByVisibilityTab(customers, "disabled").map((customer) => customer.id),
      ["b"],
    );
    assert.deepEqual(
      filterCustomersByVisibilityTab(customers, "closed").map((customer) => customer.id),
      ["c"],
    );
    assert.deepEqual(
      filterCustomersByVisibilityTab(customers, "merged").map((customer) => customer.id),
      ["d"],
    );
  });

  it("counts customers per visibility tab", () => {
    const customers = [
      makeCustomer({ id: "a" }),
      makeCustomer({ id: "b", isDisabled: true }),
      makeCustomer({ id: "c", isDeleted: true }),
      makeCustomer({ id: "d", isDisabled: true, isDeleted: true }),
      makeCustomer({ id: "e", isMerged: true }),
    ];

    assert.deepEqual(countCustomersByVisibilityTab(customers), {
      active: 1,
      disabled: 1,
      closed: 2,
      merged: 1,
    });
  });

  it("treats tombstoned and merged customers as not reversibly disabled", () => {
    assert.equal(isActiveCustomerAccount(makeCustomer()), true);
    assert.equal(isActiveCustomerAccount(makeCustomer({ isDisabled: true })), false);
    assert.equal(isActiveCustomerAccount(makeCustomer({ isDeleted: true })), false);
    assert.equal(isActiveCustomerAccount(makeCustomer({ isMerged: true })), false);
    assert.equal(isReversibleDisabledCustomer(makeCustomer({ isDisabled: true })), true);
    assert.equal(
      isReversibleDisabledCustomer(makeCustomer({ isDisabled: true, isDeleted: true })),
      false,
    );
    assert.equal(
      isReversibleDisabledCustomer(makeCustomer({ isDisabled: true, isMerged: true })),
      false,
    );
  });
});
