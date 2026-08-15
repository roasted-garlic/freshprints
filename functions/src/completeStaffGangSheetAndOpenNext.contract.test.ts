import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, "completeStaffGangSheetAndOpenNext.ts"), "utf8");

test("complete callable creates shared next cycle without assignedStaffUserId", () => {
  assert.match(source, /staffGangSheetCycleNumber: nextCycleNumber/);
  assert.doesNotMatch(source, /assignedStaffUserId,/);
  assert.doesNotMatch(source, /assignedStaffUserId:/);
});

test("complete callable enforces shared active uniqueness and idempotent open successor", () => {
  assert.match(source, /STAFF_GANG_SHEET_ACTIVE_PRODUCTION_STATUSES/);
  assert.match(source, /loadActiveStaffGangSheetsExcluding/);
  assert.match(source, /alreadyCompleted: true/);
  assert.match(source, /multiple open Staff Gang Sheets exist/);
});

test("complete callable allows any staff caller (no assignee gate)", () => {
  assert.match(source, /assertStaffCaller/);
  assert.doesNotMatch(source, /assignedStaffUserId !== caller\.id/);
});
