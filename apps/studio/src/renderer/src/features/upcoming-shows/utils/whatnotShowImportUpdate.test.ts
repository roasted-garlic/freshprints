import assert from "node:assert/strict";
import test from "node:test";

import { Timestamp } from "firebase/firestore";

import { planWhatnotImportExistingShowUpdate } from "./whatnotShowImportUpdate";

const timestamp = Timestamp.fromDate(new Date("2026-08-03T01:00:00.000Z"));
const existing = {
  source: "whatnot",
  whatnotShowId: "show-1",
  productionStatus: "printing",
  status: "rescheduled",
  maxTotalQuantity: 80,
  maxQuantityOverridden: true,
  allocatedQuantity: 12,
  notes: "keep",
  internalMetadata: { keep: true },
};

function input(overrides: Record<string, unknown> = {}) {
  return {
    existingShowId: "doc-1",
    expectedWhatnotShowId: "show-1",
    title: "Updated title",
    whatnotUrl: "https://www.whatnot.com/live/show-1",
    scheduledStartAt: timestamp,
    sourceBaseUrlSnapshot: "https://www.whatnot.com/user/example/shows",
    candidateStatus: "ready" as const,
    ...overrides,
  };
}

test("partial scanned update validates the merged identity and reuses the existing document", () => {
  const plan = planWhatnotImportExistingShowUpdate(existing, input());
  assert.equal(plan.targetDocumentId, "doc-1");
  assert.equal(plan.payload.title, "Updated title");
  assert.equal(plan.payload.scheduledStartAt, timestamp);
});

test("update payload contains only Whatnot-owned fields and preserves every internal field", () => {
  const { payload } = planWhatnotImportExistingShowUpdate(existing, input());
  assert.deepEqual(Object.keys(payload).sort(), [
    "scheduledStartAt",
    "sourceBaseUrlSnapshot",
    "title",
    "whatnotUrl",
  ]);
  for (const forbidden of [
    "id", "status", "syncStatus", "isArchived", "productionStatus", "maxTotalQuantity",
    "maxQuantityOverridden", "allocatedQuantity", "allocations", "notes", "internalMetadata",
    "createdAt", "createdBy",
  ]) {
    assert.equal(forbidden in payload, false, `${forbidden} must be preserved by omission`);
  }
});

test("legacy record without newer optional/internal fields remains updateable", () => {
  const plan = planWhatnotImportExistingShowUpdate(
    { source: "whatnot", whatnotShowId: "show-1" },
    input(),
  );
  assert.equal(plan.targetDocumentId, "doc-1");
});

test("live update preserves existing schedule by omitting it", () => {
  const plan = planWhatnotImportExistingShowUpdate(existing, input({ candidateStatus: "live", scheduledStartAt: undefined }));
  assert.equal("scheduledStartAt" in plan.payload, false);
});

test("missing matched document is precise and never becomes create", () => {
  assert.throws(() => planWhatnotImportExistingShowUpdate(null, input()), /could not be resolved/);
});

test("missing or mismatched Whatnot identity is precise", () => {
  assert.throws(() => planWhatnotImportExistingShowUpdate(existing, input({ expectedWhatnotShowId: "" })), /identifier is missing/);
  assert.throws(
    () => planWhatnotImportExistingShowUpdate(existing, input({ expectedWhatnotShowId: "show-2" })),
    /no longer matches/,
  );
  assert.throws(
    () => planWhatnotImportExistingShowUpdate({ source: "whatnot" }, input()),
    /missing its Whatnot show identifier/,
  );
});

test("known missing title and unsupported timestamp errors are field-specific", () => {
  assert.throws(() => planWhatnotImportExistingShowUpdate(existing, input({ title: " " })), /Show title is missing/);
  assert.throws(() => planWhatnotImportExistingShowUpdate(existing, input({ scheduledStartAt: "bad" })), /Scheduled show time/);
  assert.throws(
    () => planWhatnotImportExistingShowUpdate(existing, input({ scheduledStartAt: { toDate: () => { throw new Error("bad"); } } })),
    /Scheduled show time/,
  );
});

test("invalid matched document ID is rejected before constructing a Firestore path", () => {
  assert.throws(
    () => planWhatnotImportExistingShowUpdate(existing, input({ existingShowId: "shows/doc-1" })),
    /could not be resolved/,
  );
});

test("generic incomplete-record copy is not used for known update failures", () => {
  for (const run of [
    () => planWhatnotImportExistingShowUpdate(null, input()),
    () => planWhatnotImportExistingShowUpdate(existing, input({ title: "" })),
    () => planWhatnotImportExistingShowUpdate(existing, input({ scheduledStartAt: {} })),
  ]) {
    assert.throws(run, (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.doesNotMatch((error as Error).message, /record is incomplete/i);
      return true;
    });
  }
});
