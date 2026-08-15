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

test("Staff Gang Sheet create uses trusted callable and omits assignee write", () => {
  assert.ok(createStart >= 0);
  assert.ok(completeStart > createStart);
  assert.match(createSlice, /createInitialStaffGangSheet/);
  assert.match(createSlice, /callTracedFunction/);
  assert.doesNotMatch(createSlice, /assignedStaffUserId:/);
  assert.doesNotMatch(createSlice, /setDoc\(/);
});

test("allocatePrintRequestItem enforces Staff origin allowlist", () => {
  assert.match(serviceSource, /canAllocateOriginToShowSource/);
  assert.match(serviceSource, /Only studio_internal print requests can be added to Staff Gang Sheets/);
});

test("complete+next uses trusted callable (helper create blocked by Rules)", () => {
  assert.match(serviceSource, /completeStaffGangSheetAndOpenNext/);
  assert.match(serviceSource, /callTracedFunction/);
});
