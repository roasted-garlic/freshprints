import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { permissionService } from "./permissionService";

const activeOwner = { id: "owner-1", role: "owner" as const, isActive: true };
const activeAdmin = { id: "admin-1", role: "admin" as const, isActive: true };
const activeHelper = { id: "helper-1", role: "helper" as const, isActive: true };
const inactiveHelper = { id: "helper-2", role: "helper" as const, isActive: false };

describe("helper permission restrictions", () => {
  it("helpers can archive designs but cannot restore", () => {
    assert.equal(permissionService.canArchiveDesigns(activeHelper), true);
    assert.equal(permissionService.canRestoreDesigns(activeHelper), false);
    assert.equal(permissionService.canRestoreDesigns(activeOwner), true);
    assert.equal(permissionService.canRestoreDesigns(activeAdmin), true);
  });

  it("helpers can manage upcoming shows but cannot import Whatnot shows", () => {
    assert.equal(permissionService.canManageUpcomingShows(activeHelper), true);
    assert.equal(permissionService.canImportWhatnotShows(activeHelper), false);
    assert.equal(permissionService.canImportWhatnotShows(activeOwner), true);
    assert.equal(permissionService.canImportWhatnotShows(activeAdmin), true);
  });

  it("only owners can open Dev Tools; admin and helper cannot", () => {
    assert.equal(permissionService.canOpenDevTools(activeHelper), false);
    assert.equal(permissionService.canOpenDevTools(activeAdmin), false);
    assert.equal(permissionService.canOpenDevTools(activeOwner), true);
    assert.equal(permissionService.canOpenDevTools(inactiveHelper), false);
  });

  it("owner and admin can delete eligible uploads while helpers cannot", () => {
    assert.equal(permissionService.canDeleteEligibleCustomerUpload(activeOwner), true);
    assert.equal(permissionService.canDeleteEligibleCustomerUpload(activeAdmin), true);
    assert.equal(permissionService.canDeleteEligibleCustomerUpload(activeHelper), false);
    assert.equal(permissionService.canDeleteEligibleCustomerUpload(inactiveHelper), false);
  });

  it("helpers retain catalog exclusion permission", () => {
    assert.equal(permissionService.canExcludeCustomerUploadFromCatalog(activeOwner), true);
    assert.equal(permissionService.canExcludeCustomerUploadFromCatalog(activeAdmin), true);
    assert.equal(permissionService.canExcludeCustomerUploadFromCatalog(activeHelper), true);
  });

  it("hasPermission mirrors dedicated helpers for new keys", () => {
    assert.equal(permissionService.hasPermission(activeHelper, "restoreDesigns"), false);
    assert.equal(permissionService.hasPermission(activeHelper, "importWhatnotShows"), false);
    assert.equal(permissionService.hasPermission(activeHelper, "openDevTools"), false);
    assert.equal(permissionService.hasPermission(activeAdmin, "restoreDesigns"), true);
    assert.equal(permissionService.hasPermission(activeAdmin, "importWhatnotShows"), true);
    assert.equal(permissionService.hasPermission(activeAdmin, "openDevTools"), false);
    assert.equal(permissionService.hasPermission(activeOwner, "openDevTools"), true);
  });
});
