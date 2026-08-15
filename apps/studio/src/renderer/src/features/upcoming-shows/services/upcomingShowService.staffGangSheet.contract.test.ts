import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const serviceSource = readFileSync(path.join(here, "upcomingShowService.ts"), "utf8");
const createStart = serviceSource.indexOf("async createStaffGangSheetLane(");
const completeStart = serviceSource.indexOf("async completeStaffGangSheetAndOpenNext(");
const createSlice = serviceSource.slice(createStart, completeStart);

test("Internal Gang Sheet create uses trusted callable with client SDK fallback; omits assignee", () => {
  assert.ok(createStart >= 0);
  assert.ok(completeStart > createStart);
  assert.match(createSlice, /createInitialStaffGangSheet/);
  assert.match(createSlice, /callTracedFunction/);
  assert.match(createSlice, /createStaffGangSheetLaneViaClientSdk/);
  assert.match(createSlice, /shouldFallbackToClientStaffGangSheetCreate/);
  assert.doesNotMatch(createSlice, /assignedStaffUserId:/);
});

test("allocatePrintRequestItem enforces Staff origin allowlist", () => {
  assert.match(serviceSource, /canAllocateOriginToShowSource/);
  assert.match(serviceSource, /Only Internal print requests can be added to Internal Gangsheets/);
});

test("allocate and remove sync queueTab after mutation", () => {
  assert.match(serviceSource, /syncPrintRequestQueueTabBestEffort/);
  assert.match(serviceSource, /upcomingShowService\.allocatePrintRequestItem/);
  assert.match(serviceSource, /upcomingShowService\.removeShowAllocationsForRequest/);
  assert.match(serviceSource, /upcomingShowService\.removeShowAllocation/);
  assert.match(serviceSource, /trigger backup will reconcile/);
});

test("complete+next uses trusted callable", () => {
  assert.match(serviceSource, /completeStaffGangSheetAndOpenNext/);
  assert.match(serviceSource, /callTracedFunction/);
});
