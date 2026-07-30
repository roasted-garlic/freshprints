import assert from "node:assert/strict";
import test from "node:test";

import { buildClearPortalWorkingPrintRequestAccounting } from "./clearPortalWorkingPrintRequest";

test("empty clear is a zero-write zero-delete no-op and skips allocations", () => {
  assert.deepEqual(buildClearPortalWorkingPrintRequestAccounting({
    allocationDocumentsReturned: 0,
    durationMs: 5,
    itemDocumentsReturned: 0,
    outcome: "success",
    parentWrites: 0,
  }), {
    functionName: "clearPortalWorkingPrintRequest",
    eventClassification: "empty-no-op",
    readOperations: 4,
    documentsReturned: 3,
    approximateBillableReads: 4,
    writes: 0,
    deletes: 0,
    transactionAttempts: 0,
    batchSize: 0,
    retryNumber: 0,
    duplicateSkip: true,
    durationMs: 5,
    outcome: "success",
  });
});

test("nonempty clear accounts exact item deletes and parent write", () => {
  const accounting = buildClearPortalWorkingPrintRequestAccounting({
    allocationDocumentsReturned: 0,
    durationMs: 9,
    itemDocumentsReturned: 5,
    outcome: "success",
    parentWrites: 1,
  });
  assert.equal(accounting.documentsReturned, 8);
  assert.equal(accounting.approximateBillableReads, 9);
  assert.equal(accounting.writes, 1);
  assert.equal(accounting.deletes, 5);
  assert.equal(accounting.batchSize, 6);
  assert.equal(accounting.duplicateSkip, false);
});
