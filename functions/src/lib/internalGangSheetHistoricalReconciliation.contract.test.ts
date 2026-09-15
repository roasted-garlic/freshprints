import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const libSource = readFileSync(
  path.join(here, "internalGangSheetHistoricalReconciliation.ts"),
  "utf8",
);
const callableSource = readFileSync(
  path.join(here, "..", "previewInternalGangSheetHistoricalReconciliation.ts"),
  "utf8",
);
const indexSource = readFileSync(path.join(here, "..", "index.ts"), "utf8");

test("historical reconciliation reuses finish + reconcile helpers", () => {
  assert.match(libSource, /finishShowAllocationsInTransaction/);
  assert.match(libSource, /reconcilePrintRequestsAfterShowFinish/);
  assert.doesNotMatch(libSource, /createStaffGangSheet|openNextStaffGangSheet|createNextInternal/);
});

test("apply re-asserts staff_gang_sheet + completed before writes", () => {
  assert.match(libSource, /source\) !== "staff_gang_sheet"/);
  assert.match(libSource, /productionStatus\) !== "completed"/);
  assert.match(libSource, /runTransaction/);
});

test("apply does not mutate productionStatus away from completed", () => {
  assert.doesNotMatch(libSource, /productionStatus:\s*["'](?:printing|queued|open|in_progress)/);
  assert.doesNotMatch(libSource, /\.update\([^)]*productionStatus/);
});

test("preview path performs no Firestore writes", () => {
  const previewFn = libSource.slice(
    libSource.indexOf("export async function buildInternalGangSheetHistoricalReconciliationPreview"),
    libSource.indexOf("export async function applyInternalGangSheetHistoricalReconciliation"),
  );
  assert.doesNotMatch(previewFn, /transaction\.(?:set|update|delete)/);
  assert.doesNotMatch(previewFn, /runTransaction/);
  assert.doesNotMatch(previewFn, /FieldValue/);
  assert.doesNotMatch(previewFn, /\.doc\([^)]*\)\.(?:set|update|delete)\(/);
});

test("callables are owner-only", () => {
  assert.match(callableSource, /caller\.role !== "owner"/);
  assert.match(callableSource, /Only owners can reconcile historical Internal Gang Sheets/);
  assert.doesNotMatch(callableSource, /\["owner",\s*"admin"\]/);
});

test("index exports preview and apply callables", () => {
  assert.match(indexSource, /previewInternalGangSheetHistoricalReconciliation/);
  assert.match(indexSource, /applyInternalGangSheetHistoricalReconciliation/);
});
