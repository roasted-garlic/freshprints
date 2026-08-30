import assert from "node:assert/strict";
import test from "node:test";

import {
  canAllocateOriginToShowSource,
  formatStaffGangSheetTitle,
  isPortalAllocatableShowSource,
  isStaffGangSheetActiveProductionStatus,
  isStaffGangSheetSource,
  resolveInternalGangSheetMaxTotalQuantity,
  resolveNextStaffGangSheetCycleNumber,
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

test("Internal Gang Sheet origin allowlist: studio_internal or isInternal", () => {
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "studio_internal" }),
    true,
  );
  assert.equal(
    canAllocateOriginToShowSource({
      source: "staff_gang_sheet",
      requestOrigin: undefined,
      isInternal: true,
    }),
    true,
  );
  assert.equal(
    canAllocateOriginToShowSource({ source: "staff_gang_sheet", requestOrigin: "studio_customer" }),
    false,
  );
  assert.equal(
    canAllocateOriginToShowSource({
      source: "staff_gang_sheet",
      requestOrigin: "studio_customer",
      isInternal: true,
    }),
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
  assert.equal(
    canAllocateOriginToShowSource({ source: "whatnot", requestOrigin: "studio_customer" }),
    true,
  );
  assert.equal(
    canAllocateOriginToShowSource({
      source: "whatnot",
      requestOrigin: "studio_internal",
      isInternal: true,
    }),
    false,
  );
  assert.equal(
    canAllocateOriginToShowSource({
      source: "dev_fixture",
      requestOrigin: undefined,
      isInternal: true,
    }),
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
  assert.equal(formatStaffGangSheetTitle(1), "Internal Gang Sheet #1");
  assert.equal(formatStaffGangSheetTitle(4), "Internal Gang Sheet #4");
});

test("resolveNextStaffGangSheetCycleNumber advances past history", () => {
  assert.equal(resolveNextStaffGangSheetCycleNumber([]), 1);
  assert.equal(resolveNextStaffGangSheetCycleNumber([1]), 2);
  assert.equal(resolveNextStaffGangSheetCycleNumber([1, 3, 2]), 4);
  assert.equal(resolveNextStaffGangSheetCycleNumber([undefined, null, 5]), 6);
});

test("resolveInternalGangSheetMaxTotalQuantity defaults to 200", () => {
  assert.equal(resolveInternalGangSheetMaxTotalQuantity(undefined), 200);
  assert.equal(resolveInternalGangSheetMaxTotalQuantity(null), 200);
  assert.equal(resolveInternalGangSheetMaxTotalQuantity(150), 150);
});
