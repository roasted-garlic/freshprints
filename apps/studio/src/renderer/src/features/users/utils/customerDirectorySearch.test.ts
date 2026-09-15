import assert from "node:assert/strict";
import test from "node:test";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import { filterCustomers, filterCustomersByIdentity } from "./customerDirectorySearch";

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "customer-1",
    displayName: "Alex Customer",
    username: "alexprints",
    email: "alex@example.com",
    isGuest: false,
    totalPrintRequests: 0,
    createdAt: {} as Customer["createdAt"],
    updatedAt: {} as Customer["updatedAt"],
    ...overrides,
  };
}

test("customer picker search matches display name, username, and email case-insensitively", () => {
  const customers = [
    customer(),
    customer({ id: "customer-2", displayName: "Morgan Customer", username: "morgan", email: "morgan@fresh.test" }),
  ];

  assert.deepEqual(filterCustomersByIdentity(customers, "ALEX CUSTOMER").map((entry) => entry.id), ["customer-1"]);
  assert.deepEqual(filterCustomersByIdentity(customers, "MORGAN").map((entry) => entry.id), ["customer-2"]);
  assert.deepEqual(filterCustomersByIdentity(customers, "FRESH.TEST").map((entry) => entry.id), ["customer-2"]);
});

test("clearing customer picker search restores the supplied eligible list", () => {
  const eligible = [customer(), customer({ id: "customer-2" })];
  assert.deepEqual(filterCustomersByIdentity(eligible, "").map((entry) => entry.id), ["customer-1", "customer-2"]);
  assert.deepEqual(filterCustomers(eligible, "notes").map((entry) => entry.id), []);
});
