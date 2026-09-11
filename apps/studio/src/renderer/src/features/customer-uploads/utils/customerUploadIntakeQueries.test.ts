import assert from "node:assert/strict";
import test from "node:test";

import { isMissingCustomerUploadPurpose } from "@fresh-prints/shared/utils/customerUploadPurpose";

import {
  CUSTOMER_UPLOAD_INTAKE_PAGE_SIZE,
  filterCatalogIntakeEligibleDocs,
  filterLegacyMissingPurposeDocs,
  mergeIntakeDocsByCreatedAtDesc,
  resolveStudioIntakeListSortMs,
  runWithConcurrencyLimit,
} from "./customerUploadIntakeQueries.ts";

function doc(
  id: string,
  purpose: unknown,
  createdAtMs: number,
  catalogPendingQueuedAtMs?: number,
) {
  return {
    id,
    data: () => ({
      purpose,
      createdAt: { toMillis: () => createdAtMs },
      ...(typeof catalogPendingQueuedAtMs === "number"
        ? { catalogPendingQueuedAt: { toMillis: () => catalogPendingQueuedAtMs } }
        : {}),
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

test("follow-up approval makes an originally denied upload visible in Pending", () => {
  const docs = [
    {
      id: "approved-follow-up",
      data: () => ({ catalogUseAcknowledged: false, catalogPermissionFollowUpStatus: "approved" }),
    },
    {
      id: "declined-follow-up",
      data: () => ({ catalogUseAcknowledged: false, catalogPermissionFollowUpStatus: "declined" }),
    },
  ];
  assert.deepEqual(filterCatalogIntakeEligibleDocs(docs).map((item) => item.id), ["approved-follow-up"]);
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

test("Ask Again → Allow re-queued uploads sort above older createdAt siblings", () => {
  const primary = [
    doc("older-sibling", "print_request", 200),
    doc("reallowed", "print_request", 100, 500),
    doc("newer-sibling", "print_request", 300),
  ];
  const merged = mergeIntakeDocsByCreatedAtDesc(primary, [], 10);
  assert.deepEqual(
    merged.map((item) => item.id),
    ["reallowed", "newer-sibling", "older-sibling"],
  );
  assert.equal(resolveStudioIntakeListSortMs(primary[1]!.data()), 500);
  assert.equal(resolveStudioIntakeListSortMs(primary[2]!.data()), 300);
});

test("Ask Again → Allow sorts by follow-up respondedAt when catalogPendingQueuedAt is missing", () => {
  const reallowed = {
    id: "reallowed",
    data: () => ({
      purpose: "print_request",
      createdAt: { toMillis: () => 100 },
      catalogPermissionFollowUpStatus: "approved",
      catalogPermissionFollowUpRespondedAt: { toMillis: () => 900 },
    }),
  };
  const sibling = doc("sibling", "print_request", 400);
  const merged = mergeIntakeDocsByCreatedAtDesc([sibling, reallowed], [], 10);
  assert.deepEqual(
    merged.map((item) => item.id),
    ["reallowed", "sibling"],
  );
});

test("buildPurposeScopedIntakeQuery accepts custom page size", async () => {
  const { buildPurposeScopedIntakeQuery } = await import("./customerUploadIntakeQueries.ts");
  // Smoke: helper remains exported for load-more pageSize wiring.
  assert.equal(typeof buildPurposeScopedIntakeQuery, "function");
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
