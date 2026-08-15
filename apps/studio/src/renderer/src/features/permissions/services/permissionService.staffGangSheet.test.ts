import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { permissionService } from "./permissionService";

describe("permissionService Staff Gang Sheet capabilities", () => {
  const owner = { id: "owner-1", role: "owner" as const, isActive: true };
  const admin = { id: "admin-1", role: "admin" as const, isActive: true };
  const helperA = { id: "helper-a", role: "helper" as const, isActive: true };
  const helperB = { id: "helper-b", role: "helper" as const, isActive: true };
  const customer = { id: "cust-1", role: "customer" as const, isActive: true };

  const sharedShow = {
    source: "staff_gang_sheet",
  };

  it("allows owner/admin/helper to create the initial shared Staff Gang Sheet", () => {
    assert.equal(permissionService.canCreateStaffGangSheetLane(owner), true);
    assert.equal(permissionService.canCreateStaffGangSheetLane(admin), true);
    assert.equal(permissionService.canCreateStaffGangSheetLane(helperA), true);
    assert.equal(permissionService.canCreateStaffGangSheetLane(customer), false);
  });

  it("allows any staff to manage the shared Staff Gang Sheet", () => {
    assert.equal(permissionService.canManageStaffGangSheetShow(owner, sharedShow), true);
    assert.equal(permissionService.canManageStaffGangSheetShow(helperA, sharedShow), true);
    assert.equal(permissionService.canManageStaffGangSheetShow(helperB, sharedShow), true);
    assert.equal(permissionService.canManageStaffGangSheetShow(customer, sharedShow), false);
  });
});
