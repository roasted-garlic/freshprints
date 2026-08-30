import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(path.join(here, rel), "utf8");
}

test("recovery callables export from functions index", () => {
  const index = read("index.ts");
  assert.match(index, /previewShowProductionRecovery/);
  assert.match(index, /applyShowProductionRecovery/);
});

test("force_completed is owner-only", () => {
  const source = read("previewShowProductionRecovery.ts");
  assert.match(source, /assertOwnerCaller/);
  assert.match(source, /force_completed/);
  assert.match(source, /Only owners can apply Force Completed/);
});

test("staff actions use assertStaffCaller", () => {
  const source = read("previewShowProductionRecovery.ts");
  assert.match(source, /assertStaffCaller/);
});

test("apply revalidates preview before mutation", () => {
  const source = read("previewShowProductionRecovery.ts");
  assert.match(source, /const recheck = await buildShowProductionRecoveryPreview/);
});

test("lib invokes queue tab recompute after release", () => {
  const lib = read("lib/showProductionRecovery.ts");
  assert.match(lib, /recomputeAndPersistQueueTab/);
  assert.match(lib, /reconcilePrintRequestsAfterShowFinish/);
});

test("lib applies ADR-FP-071 guard before active to editing", () => {
  const lib = read("lib/showProductionRecovery.ts");
  assert.match(lib, /shouldTransitionActiveRequestToEditing/);
  assert.match(lib, /customerHasOtherContinuableRequest/);
});

test("lib recalculates show allocated quantity after apply", () => {
  const lib = read("lib/showProductionRecovery.ts");
  assert.match(lib, /computeShowAllocatedQuantityFromAllocations/);
  assert.match(lib, /allocatedQuantity: recalculatedTotal/);
});
