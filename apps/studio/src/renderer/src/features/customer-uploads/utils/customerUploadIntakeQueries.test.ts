import assert from "node:assert/strict";
import test from "node:test";

import { isMissingCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";

import {
  CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE,
  filterCatalogIntakeEligibleDocs,
  filterLegacyMissingPurposeDocs,
  mergeIntakeDocsByCreatedAtDesc,
  runWithConcurrencyLimit,
} from "./customerUploadIntakeQueries.ts";

function doc(id: string, purpose: unknown, createdAtMs: number) {
  return {
    id,
    data: () => ({
      purpose,
      createdAt: { toMillis: () => createdAtMs },
    }),
  };
}

test("isMissingCustomerUploadPurpose covers blank legacy purpose fields", () => {
  assert.equal(isMissingCustomerUploadPurpose(undefined), true);
  assert.equal(isMissingCustomerUploadPurpose(null), true);
  assert.equal(isMissingCustomerUploadPurpose(""), true);
  assert.equal(isMissingCustomerUploadPurpose("print_request"), false);
  assert.equal(isMissingCustomerUploadPurpose("catalog_donation"), false);
});

test("filterCatalogIntakeEligibleDocs removes customer-declined library permission uploads", () => {
  const docs = [
    { id: "allowed", data: () => ({ catalogUseAcknowledged: true }) },
    { id: "denied", data: () => ({ catalogUseAcknowledged: false }) },
    { id: "legacy", data: () => ({}) },
  ];
  assert.deepEqual(
    filterCatalogIntakeEligibleDocs(docs).map((item) => item.id),
    ["allowed", "legacy"],
  );
});

test("filterLegacyMissingPurposeDocs keeps only purpose-absent docs", () => {
  const docs = [
    doc("a", undefined, 3),
    doc("b", "catalog_donation", 2),
    doc("c", "print_request", 1),
    doc("d", null, 0),
  ];
  assert.deepEqual(
    filterLegacyMissingPurposeDocs(docs).map((item) => item.id),
    ["a", "d"],
  );
});

test("mergeIntakeDocsByCreatedAtDesc prefers newest and caps page size", () => {
  const primary = [doc("p1", "print_request", 100), doc("p2", "print_request", 50)];
  const legacy = [doc("legacy", undefined, 75), doc("p1", undefined, 999)];
  const merged = mergeIntakeDocsByCreatedAtDesc(primary, legacy, 2);
  assert.deepEqual(
    merged.map((item) => item.id),
    ["p1", "legacy"],
  );
  assert.equal(CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE, 50);
});

test("runWithConcurrencyLimit never exceeds concurrency and covers all items", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const seen: number[] = [];
  await runWithConcurrencyLimit([1, 2, 3, 4, 5], 2, async (item) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    seen.push(item);
    inFlight -= 1;
  });
  assert.equal(maxInFlight, 2);
  assert.deepEqual(seen.sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});
