import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dialogSource = readFileSync(
  new URL("./InternalGangSheetHistoricalReconciliationDialog.tsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  fileURLToPath(new URL("../pages/UpcomingShowsPage.tsx", import.meta.url)),
  "utf8",
);
const permissionSource = readFileSync(
  fileURLToPath(
    new URL("../../permissions/services/permissionService.ts", import.meta.url),
  ),
  "utf8",
);

test("dialog uses Preview then Confirm Apply flow", () => {
  assert.match(dialogSource, /Loading impact preview/);
  assert.match(dialogSource, /Apply reconciliation/);
  assert.match(dialogSource, /\.preview\(/);
  assert.match(dialogSource, /\.apply\(/);
});

test("History surface gates reconcile UI to completed sheets + owner", () => {
  assert.match(pageSource, /Reconcile unfinished/);
  assert.match(pageSource, /productionStatus === "completed"/);
  assert.match(pageSource, /hasFinishableAllocationsForSelectedShow/);
  assert.match(pageSource, /canReconcileHistoricalInternalGangSheets/);
  assert.match(pageSource, /InternalGangSheetHistoricalReconciliationDialog/);
});

test("dialog uses centered modal overlay", () => {
  assert.match(dialogSource, /modal-overlay/);
  assert.match(dialogSource, /modal-overlay-blur/);
});

test("permission helper is owner-only", () => {
  assert.match(permissionSource, /canReconcileHistoricalInternalGangSheets/);
  const fnStart = permissionSource.indexOf("canReconcileHistoricalInternalGangSheets");
  const fnSlice = permissionSource.slice(fnStart, fnStart + 180);
  assert.match(fnSlice, /isOwner\(user\)/);
});
