import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, "createInitialStaffGangSheet.ts"), "utf8");

test("createInitialStaffGangSheet is owner/admin only and writes no assignee", () => {
  assert.match(source, /caller\.role !== "owner"/);
  assert.match(source, /STAFF_GANG_SHEET_ACTIVE_PRODUCTION_STATUSES/);
  assert.match(source, /staffGangSheetCycleNumber: cycleNumber/);
  assert.doesNotMatch(source, /assignedStaffUserId/);
});
