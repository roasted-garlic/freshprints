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

test("past shows can still export images and gang sheets", () => {
  assert.match(pageSource, /hasExportableAllocationsForSelectedShow/);
  assert.match(pageSource, /hasShowExportableAllocations/);
  assert.doesNotMatch(pageSource, /disabled=\{isSelectedShowPast \|\| !has/);
  assert.doesNotMatch(pageSource, /openExportModal[\s\S]{0,120}isSelectedShowPast/);
  assert.doesNotMatch(pageSource, /openExportGangSheetModal[\s\S]{0,120}isSelectedShowPast/);
  assert.doesNotMatch(pageSource, /isExportMenuOpen && !isSelectedShowPast/);
});

test("Staff Gang Sheet keeps a single Add Request on the request list header", () => {
  assert.match(pageSource, /Attached print requests[\s\S]*openAddRequestModal/);
  assert.match(pageSource, /isSelectedStaffGangSheet \? \([\s\S]*Plus[\s\S]*Add Request/);
  assert.equal((pageSource.match(/\bAdd Request\b/g) ?? []).length, 1);
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

test("Internal Current/History tab change updates URL tab and selection (avoids list flicker)", () => {
  assert.match(pageSource, /handleStaffListTabChange/);
  assert.match(pageSource, /SHOW_QUEUE_TAB_QUERY_PARAM/);
  assert.match(pageSource, /skipListTabRouteSyncRef/);
  assert.match(
    pageSource,
    /const handleStaffListTabChange = useCallback\([\s\S]*applyShowQueueRoute\(\{ tab, showId: nextSelectedShowId, requestId: null \}\)/,
  );
});

test("Removing a request from Internal Sheets clears Print Requests page cache", () => {
  assert.match(pageSource, /clearPrintRequestsPageCache/);
  assert.match(
    pageSource,
    /removeShowAllocationsForRequest[\s\S]*clearPrintRequestsPageCache/,
  );
});

test("Show Queue remove confirm shows busy feedback while the remove is in flight", () => {
  assert.match(pageSource, /const \[removingRequestId, setRemovingRequestId\]/);
  assert.match(pageSource, /setRemovingRequestId\(printRequestId\)/);
  assert.match(pageSource, /isRemovingRequest \? "Removing…" : "Confirm"/);
  assert.match(pageSource, /disabled=\{isRemovingRequest\}/);
});

test("Mark Complete clears Print Requests page cache after Internal Gang Sheet completion", () => {
  assert.match(
    pageSource,
    /completeStaffGangSheetAndOpenNext[\s\S]*clearPrintRequestsPageCache/,
  );
});

test("selected Show Queue capacity and status use the settled active allocation quantity", () => {
  assert.match(
    pageSource,
    /const selectedShowAllocationSummary = useMemo\([\s\S]*buildShowAllocationOperationalSummary\(allocations\)/,
  );
  assert.match(
    pageSource,
    /const selectedShowActiveAllocatedQuantity = isAllocationsLoading[\s\S]*selectedShowAllocationSummary\.totalQuantity;/,
  );

  const capacityAndStatusSource = pageSource.match(
    /const capacity = selectedShow[\s\S]*?const pendingMaxQuantity/,
  )?.[0];
  assert.ok(capacityAndStatusSource);
  assert.match(capacityAndStatusSource, /allocatedQuantity: selectedShowActiveAllocatedQuantity/);
  assert.match(capacityAndStatusSource, /getDerivedShowStatusDisplay\(selectedShow\.productionStatus, capacity/);
  assert.match(
    pageSource,
    /const allocatedQuantity = isSelected \? selectedShowActiveAllocatedQuantity : show\.allocatedQuantity;/,
  );
  assert.match(
    pageSource,
    /assessShowCapacity\(\{\s*maxTotalQuantity: show\.maxTotalQuantity,\s*allocatedQuantity,\s*\}\)/,
  );
});

test("Show Queue request rows use the shared operational allocation summary", () => {
  assert.match(pageSource, /const allocationSummary = buildShowAllocationOperationalSummary\(group\.allocations\)/);
  assert.match(pageSource, /allocationSummary\.uniqueDesignCount/);
  assert.match(pageSource, /allocationSummary\.totalQuantity/);
  assert.match(pageSource, /allocationSummary\.sizeClassRows/);
  assert.match(pageSource, /!hasActiveAllocations \? " \| History only" : ""/);
});
