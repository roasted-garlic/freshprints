import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(path.join(here, "../pages/UpcomingShowsPage.tsx"), "utf8");
const routesSource = readFileSync(
  path.join(here, "../../../routes/AppRoutes.tsx"),
  "utf8",
);
const sidebarSource = readFileSync(
  path.join(here, "../../../shared/components/Sidebar.tsx"),
  "utf8",
);

test("Internal Sheets has a dedicated route and sidebar link", () => {
  assert.match(routesSource, /path="\/internal-gang-sheets"/);
  assert.match(routesSource, /lockedSurface="staff_gang_sheets"/);
  assert.match(routesSource, /lockedSurface="shows"/);
  assert.match(sidebarSource, /Internal Sheets/);
  assert.match(sidebarSource, /to: "\/internal-gang-sheets"/);
});

test("Show Queue page locks surface and redirects mismatched deep links", () => {
  assert.match(pageSource, /lockedSurface/);
  assert.match(pageSource, /decideQuerySurfaceSync/);
  assert.match(pageSource, /clear_incompatible_query/);
  assert.match(pageSource, /getShowQueueSurfacePath/);
  assert.doesNotMatch(pageSource, /setQueueSurface\(/);
});

test("open Staff Gang Sheet exposes Add Request on Attached print requests section", () => {
  assert.match(pageSource, /canShowAddRequestAction/);
  assert.match(pageSource, /canEnableAddRequestAction/);
  assert.match(pageSource, /Attached print requests[\s\S]*Add Request/);
});

test("Staff Gang Sheet keeps a single Add Request on the request list header", () => {
  assert.match(pageSource, /!isSelectedStaffGangSheet \? \([\s\S]*Add Request/);
  assert.match(pageSource, /Attached print requests[\s\S]*openAddRequestModal/);
});

test("Staff Gang Sheet hides production timer card", () => {
  assert.match(pageSource, /!isSelectedStaffGangSheet && permissionService\.canManageUpcomingShows/);
  assert.match(pageSource, /show-production-timer-card/);
});

test("Staff create modal has no assignee picker", () => {
  assert.doesNotMatch(pageSource, /selectedAssigneeUserId/);
  assert.doesNotMatch(pageSource, /assignedStaffUserId/);
  assert.match(pageSource, /createStaffGangSheetLane\(user,/);
  assert.match(pageSource, /staffGangSheetCycleNumber: nextStaffGangSheetCycleNumber/);
});

test("Staff Add Request options preserve empty placeholder and isInternal eligibility", () => {
  assert.match(pageSource, /option\.value === ""/);
  assert.match(pageSource, /isInternal: request\.isInternal/);
});

test("Add Request keeps Staff surface after allocation success path uses fixedShowId", () => {
  assert.match(pageSource, /fixedShowId=\{selectedShow\.id\}/);
});

test("Internal Current/History tab change updates URL selection (avoids History flicker)", () => {
  assert.match(pageSource, /handleStaffListTabChange/);
  assert.match(
    pageSource,
    /const handleStaffListTabChange = useCallback\([\s\S]*updateSelectedShowPath\(nextSelectedShowId, null\)/,
  );
});

test("Removing a request from Internal Sheets clears Print Requests page cache", () => {
  assert.match(pageSource, /clearPrintRequestsPageCache/);
  assert.match(
    pageSource,
    /removeShowAllocationsForRequest[\s\S]*clearPrintRequestsPageCache/,
  );
});
