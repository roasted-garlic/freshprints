import assert from "node:assert/strict";
import test from "node:test";

import { permissionService } from "./permissionService";

function user(role: "owner" | "admin" | "helper" | "customer", isActive = true) {
  return { id: role, role, isActive };
}

test("only active owners manage email providers", () => {
  assert.equal(permissionService.canManageEmailProviders(user("owner")), true);
  assert.equal(permissionService.canManageEmailProviders(user("owner", false)), false);
  assert.equal(permissionService.canManageEmailProviders(user("admin")), false);
  assert.equal(permissionService.canManageEmailProviders(user("helper")), false);
  assert.equal(permissionService.canManageEmailProviders(user("customer")), false);
});
