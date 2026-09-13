import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { permissionService } from "./permissionService";

describe("permissionService Staff Artwork capabilities", () => {
  const owner = { id: "owner-1", role: "owner" as const, isActive: true };
  const admin = { id: "admin-1", role: "admin" as const, isActive: true };
  const helper = { id: "helper-1", role: "helper" as const, isActive: true };
  const inactiveHelper = { id: "helper-2", role: "helper" as const, isActive: false };
  const customer = { id: "customer-1", role: "customer" as const, isActive: true };

  it("limits library management to active owners/admins", () => {
    for (const user of [owner, admin]) {
      assert.equal(permissionService.canManageStaffArtwork(user), true);
    }
    assert.equal(permissionService.canManageStaffArtwork(helper), false);
    assert.equal(permissionService.canManageStaffArtwork(inactiveHelper), false);
    assert.equal(permissionService.canManageStaffArtwork(customer), false);
  });

  it("allows active staff to view and select, including helpers", () => {
    for (const user of [owner, admin, helper]) {
      assert.equal(permissionService.canViewStaffArtwork(user), true);
      assert.equal(permissionService.canSelectStaffArtwork(user), true);
    }
    assert.equal(permissionService.canViewStaffArtwork(inactiveHelper), false);
    assert.equal(permissionService.canSelectStaffArtwork(customer), false);
  });
});
