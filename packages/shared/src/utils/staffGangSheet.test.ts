import assert from "node:assert/strict";
import test from "node:test";

import {
  canAllocateOriginToShowSource,
  formatStaffGangSheetTitle,
  isPortalAllocatableShowSource,
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

test("Staff Gang Sheet origin allowlist: studio_internal and studio_customer only", () => {
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "studio_internal" }),
    true,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "studio_customer" }),
    true,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "portal_customer" }),
    false,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "whatnot", requestOrigin: "portal_customer" }),
    true,
  );
});

test("formatStaffGangSheetTitle uses cycle number", () => {
  assert.equal(formatStaffGangSheetTitle(1), "Staff Gang Sheet #1");
  assert.equal(formatStaffGangSheetTitle(4), "Staff Gang Sheet #4");
});
