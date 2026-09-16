import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./unqueueStudioCustomerPrintRequestFromShow.ts", import.meta.url),
  "utf8",
);

test("staff unqueue soft-cancels allocations instead of deleting them", () => {
  assert.match(source, /status:\s*"canceled"/);
  assert.match(source, /canceledAt:\s*FieldValue\.serverTimestamp\(\)/);
  assert.match(source, /canceledBy:\s*caller\.id/);
  assert.doesNotMatch(source, /transaction\.delete\(allocationDoc\.ref\)/);
});

test("staff unqueue recomputes show quantity treating this-tx cancels as canceled", () => {
  assert.match(source, /canceledThisTx\.has\(doc\.id\)/);
  assert.match(source, /computeShowAllocatedQuantityFromAllocations/);
  assert.match(source, /canceledAllocationIds:\s*\[\.\.\.canceledThisTx\]/);
});
