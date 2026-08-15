import assert from "node:assert/strict";
import test from "node:test";

import {
  canAllocateOriginToShowSource,
  formatStaffGangSheetTitle,
  isPortalAllocatableShowSource,
  isStaffGangSheetActiveProductionStatus,
  isStaffGangSheetSource,
} from "./staffGangSheet";

test("isStaffGangSheetSource recognizes only staff_gang_sheet", () => {
  assert.equal(isStaffGangSheetSource("staff_gang_sheet"), true);
  assert.equal(isStaffGangSheetSource("whatnot"), false);
  assert.equal(isStaffGangSheetSource(undefined), false);
});

test("Portal allocatable source excludes staff_gang_sheet", () => {
  assert.equal(isPortalAllocatableShowSource("whatnot"), true);
  assert.equal(isPortalAllocatableShowSource("staff_gang_sheet"), false);
});

test("Staff Gang Sheet origin allowlist: studio_internal only", () => {
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "studio_internal" }),
    true,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "studio_customer" }),
    false,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "portal_customer" }),
    false,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: undefined }),
    false,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: null }),
    false,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "unknown" }),
    false,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "whatnot", requestOrigin: "portal_customer" }),
    true,
  );
});

test("Staff Gang Sheet eligibility does not infer from isInternal (origin must be persisted)", () => {
  // Missing origin is denied even if a caller might also know isInternal elsewhere.
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: undefined }),
    false,
  );
});

test("active Staff production statuses cover open/full/printing only", () => {
  assert.equal(isStaffGangSheetActiveProductionStatus("open"), true);
  assert.equal(isStaffGangSheetActiveProductionStatus("full"), true);
  assert.equal(isStaffGangSheetActiveProductionStatus("printing"), true);
  assert.equal(isStaffGangSheetActiveProductionStatus("completed"), false);
  assert.equal(isStaffGangSheetActiveProductionStatus("canceled"), false);
});

test("formatStaffGangSheetTitle uses cycle number", () => {
  assert.equal(formatStaffGangSheetTitle(1), "Staff Gang Sheet #1");
  assert.equal(formatStaffGangSheetTitle(4), "Staff Gang Sheet #4");
});
