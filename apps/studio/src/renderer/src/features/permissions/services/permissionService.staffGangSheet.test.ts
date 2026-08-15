import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { permissionService } from "./permissionService";

describe("permissionService Staff Gang Sheet capabilities", () => {
  const owner = { id: "owner-1", role: "owner" as const, isActive: true };
  const admin = { id: "admin-1", role: "admin" as const, isActive: true };
  const helperA = { id: "helper-a", role: "helper" as const, isActive: true };
  const helperB = { id: "helper-b", role: "helper" as const, isActive: true };

  const assignedShow = {
    source: "staff_gang_sheet",
    assignedStaffUserId: "helper-a",
  };

  it("allows owner/admin to create Staff Gang Sheet lanes", () => {
    assert.equal(permissionService.canCreateStaffGangSheetLane(owner), true);
    assert.equal(permissionService.canCreateStaffGangSheetLane(admin), true);
    assert.equal(permissionService.canCreateStaffGangSheetLane(helperA), false);
  });

  it("restricts helper manage to assigned lane only", () => {
    assert.equal(permissionService.canManageStaffGangSheetShow(owner, assignedShow), true);
    assert.equal(permissionService.canManageStaffGangSheetShow(helperA, assignedShow), true);
    assert.equal(permissionService.canManageStaffGangSheetShow(helperB, assignedShow), false);
  });
});
