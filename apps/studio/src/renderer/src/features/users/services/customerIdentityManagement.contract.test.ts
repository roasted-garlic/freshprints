import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { permissionService } from "../../permissions/services/permissionService";

describe("customer identity management permissions", () => {
  const owner = { id: "owner-1", role: "owner" as const, isActive: true };
  const admin = { id: "admin-1", role: "admin" as const, isActive: true };
  const helper = { id: "helper-1", role: "helper" as const, isActive: true };

  it("allows owner and admin to change customer username", () => {
    assert.equal(permissionService.canChangeCustomerUsername(owner), true);
    assert.equal(permissionService.canChangeCustomerUsername(admin), true);
    assert.equal(permissionService.canChangeCustomerUsername(helper), false);
  });

  it("restricts destructive identity actions to owner", () => {
    assert.equal(permissionService.canHardDeleteCustomerAccount(owner), true);
    assert.equal(permissionService.canHardDeleteCustomerAccount(admin), false);
    assert.equal(permissionService.canDisableCustomerAccount(owner), true);
    assert.equal(permissionService.canDisableCustomerAccount(admin), false);
    assert.equal(permissionService.canResolveDuplicateCustomerAccount(owner), true);
    assert.equal(permissionService.canResolveDuplicateCustomerAccount(admin), false);
    assert.equal(permissionService.canResolveDuplicateCustomerAccount(helper), false);
    assert.equal(permissionService.canMergeCustomerAccounts(owner), true);
    assert.equal(permissionService.canMergeCustomerAccounts(admin), false);
    assert.equal(permissionService.canMergeCustomerAccounts(helper), false);
  });
});
