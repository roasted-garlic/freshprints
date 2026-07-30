import assert from "node:assert/strict";
import test from "node:test";

import { buildPortalCatalogAddAccounting } from "./addPortalCatalogDesignToPrintRequest";

test("accounts for a created catalog line and its analytics trigger", () => {
  assert.deepEqual(buildPortalCatalogAddAccounting("created", {
    transactionAttempts: 2,
    transactionDocumentsReturned: 7,
    durationMs: 25,
    outcome: "success",
  }), {
    itemWrites: 1,
    parentRequestWrites: 1,
    designAnalyticsWrites: 1,
    idempotencyWrites: 0,
    otherWrites: 0,
    totalWrites: 3,
    itemOutcome: "created",
    readOperations: 8,
    documentsReturned: 11,
    transactionAttempts: 2,
    batchSize: 0,
    deletes: 0,
    duplicateSkip: false,
    durationMs: 25,
    outcome: "success",
  });
});

test("does not claim a create-only analytics trigger for quantity increments", () => {
  assert.deepEqual(buildPortalCatalogAddAccounting("incremented", {
    transactionAttempts: 1,
    transactionDocumentsReturned: 3,
    durationMs: 10,
    outcome: "success",
  }), {
    itemWrites: 1,
    parentRequestWrites: 1,
    designAnalyticsWrites: 0,
    idempotencyWrites: 0,
    otherWrites: 0,
    totalWrites: 2,
    itemOutcome: "incremented",
    readOperations: 6,
    documentsReturned: 7,
    transactionAttempts: 1,
    batchSize: 0,
    deletes: 0,
    duplicateSkip: false,
    durationMs: 10,
    outcome: "success",
  });
});
