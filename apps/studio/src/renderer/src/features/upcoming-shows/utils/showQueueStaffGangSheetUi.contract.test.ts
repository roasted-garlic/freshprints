import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(path.join(here, "../pages/UpcomingShowsPage.tsx"), "utf8");

test("Staff Gang Sheets surface click clears incompatible URL selection", () => {
  assert.match(pageSource, /updateSelectedShowPath\(null\)/);
  assert.match(pageSource, /decideQuerySurfaceSync/);
  assert.match(pageSource, /clear_incompatible_query/);
});

test("open Staff Gang Sheet exposes header Add Request via canShowAddRequestAction", () => {
  assert.match(pageSource, /canShowAddRequestAction/);
  assert.match(pageSource, /canEnableAddRequestAction/);
  assert.match(pageSource, /show-detail-header-actions[\s\S]*Add Request/);
});

test("Staff Gang Sheet hides Attached-section Add Request (Staff-only one button)", () => {
  assert.match(pageSource, /Attached print requests/);
  assert.match(pageSource, /!isSelectedStaffGangSheet \? \([\s\S]*Add Request/);
});

test("Staff Gang Sheet hides production timer card", () => {
  assert.match(pageSource, /!isSelectedStaffGangSheet && permissionService\.canManageUpcomingShows/);
  assert.match(pageSource, /show-production-timer-card/);
});

test("Staff create modal has no assignee picker", () => {
  assert.doesNotMatch(pageSource, /selectedAssigneeUserId/);
  assert.doesNotMatch(pageSource, /assignedStaffUserId/);
  assert.match(pageSource, /createStaffGangSheetLane\(user, \{\}\)/);
});

test("Staff Add Request options preserve empty placeholder", () => {
  assert.match(pageSource, /option\.value === ""/);
  assert.match(pageSource, /studio_internal/);
});

test("Add Request keeps Staff surface after allocation success path uses fixedShowId", () => {
  assert.match(pageSource, /fixedShowId=\{selectedShow\.id\}/);
});
