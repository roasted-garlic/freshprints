import assert from "node:assert/strict";
import test from "node:test";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import {
  filterCustomersForIntakeSearch,
  formatIntakeUploaderSubtitle,
} from "./customerUploadIntakeSearch.ts";

function customer(partial: Partial<Customer> & Pick<Customer, "id" | "displayName">): Customer {
  return {
    isGuest: false,
    totalPrintRequests: 0,
    createdAt: {} as Customer["createdAt"],
    updatedAt: {} as Customer["updatedAt"],
    ...partial,
  };
}

test("filterCustomersForIntakeSearch matches display name and username", () => {
  const customers = [
    customer({ id: "1", displayName: "Hayley Moll", username: "hayleym" }),
    customer({ id: "2", displayName: "Katie Asher", username: "katiea" }),
    customer({ id: "3", displayName: "Other", username: "hayley-alt" }),
  ];

  assert.deepEqual(
    filterCustomersForIntakeSearch(customers, "hayley").map((entry) => entry.id).sort(),
    ["1", "3"],
  );
  assert.deepEqual(
    filterCustomersForIntakeSearch(customers, "katiea").map((entry) => entry.id),
    ["2"],
  );
  assert.deepEqual(filterCustomersForIntakeSearch(customers, "   "), []);
});

test("formatIntakeUploaderSubtitle includes username when present", () => {
  assert.equal(
    formatIntakeUploaderSubtitle({
      customerDisplayName: "Hayley Moll",
      customerUsername: "hayleym",
      technicalStatus: "ready",
    }),
    "Hayley Moll (@hayleym) · ready",
  );
  assert.equal(
    formatIntakeUploaderSubtitle({
      customerDisplayName: "Guest",
      technicalStatus: "ready",
    }),
    "Guest · ready",
  );
});
