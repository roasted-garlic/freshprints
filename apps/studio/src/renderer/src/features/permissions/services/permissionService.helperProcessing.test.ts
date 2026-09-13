import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { permissionService } from "./permissionService";

const activeOwner = { id: "owner-1", role: "owner" as const, isActive: true };
const activeAdmin = { id: "admin-1", role: "admin" as const, isActive: true };
const activeHelper = { id: "helper-1", role: "helper" as const, isActive: true };
const activeCustomer = { id: "customer-1", role: "customer" as const, isActive: true };
const inactiveHelper = { id: "helper-2", role: "helper" as const, isActive: false };

describe("helper operational image-processing permissions", () => {
  it("helper can promote/retry uploads and approve/reject/rerun AI review", () => {
    assert.equal(permissionService.canPromoteCustomerUploadToAiReview(activeHelper), true);
    assert.equal(permissionService.canRetryCustomerUploadProcessing(activeHelper), true);
    assert.equal(permissionService.canManageAiReview(activeHelper), true);
    assert.equal(permissionService.canEditAiReviewInbox(activeHelper), true);
    assert.equal(permissionService.canApproveAiReview(activeHelper), true);
    assert.equal(permissionService.canRejectAiReview(activeHelper), true);
    assert.equal(permissionService.canApproveDesignForCatalog(activeHelper), true);
    assert.equal(permissionService.canRejectDesignFromCatalog(activeHelper), true);
    assert.equal(permissionService.canRerunAiSuggestions(activeHelper), true);
  });

  it("owner and admin retain operational processing", () => {
    for (const user of [activeOwner, activeAdmin]) {
      assert.equal(permissionService.canPromoteCustomerUploadToAiReview(user), true);
      assert.equal(permissionService.canApproveDesignForCatalog(user), true);
      assert.equal(permissionService.canManageAiReview(user), true);
      assert.equal(permissionService.canRerunAiSuggestions(user), true);
    }
  });

  it("helper cannot manage Show Queue settings; owner/admin can", () => {
    assert.equal(permissionService.canManageShowQueueSettings(activeHelper), false);
    assert.equal(permissionService.canManageShowQueueSettings(inactiveHelper), false);
    assert.equal(permissionService.canManageShowQueueSettings(activeOwner), true);
    assert.equal(permissionService.canManageShowQueueSettings(activeAdmin), true);
    assert.equal(permissionService.hasPermission(activeHelper, "manageShowQueueSettings"), false);
    assert.equal(permissionService.hasPermission(activeOwner, "manageShowQueueSettings"), true);
  });

  it("helper retains operational Show Queue manage without settings", () => {
    assert.equal(permissionService.canManageUpcomingShows(activeHelper), true);
    assert.equal(permissionService.canImportWhatnotShows(activeHelper), false);
  });

  it("helper can access Settings for Studio updates only, not administrative settings tabs", () => {
    assert.equal(permissionService.isHelper(activeHelper), true);
    assert.equal(permissionService.canAccessSettingsPage(activeHelper), true);
    assert.equal(permissionService.canManageSettings(activeHelper), false);
    assert.equal(permissionService.canViewAdministrativeSettings(activeHelper), false);
    assert.equal(permissionService.hasPermission(activeHelper, "accessSettingsPage"), true);
    assert.equal(permissionService.hasPermission(activeHelper, "manageSettings"), false);
  });

  it("helper remains non-admin for users/taxonomy/restore/delete-upload/devtools", () => {
    assert.equal(permissionService.canManageUsers(activeHelper), false);
    assert.equal(permissionService.canManageRoles(activeHelper), false);
    assert.equal(permissionService.canManageSettings(activeHelper), false);
    assert.equal(permissionService.canManageCategories(activeHelper), false);
    assert.equal(permissionService.canManageTags(activeHelper), false);
    assert.equal(permissionService.canApproveSuggestedTags(activeHelper), false);
    assert.equal(permissionService.canRestoreDesigns(activeHelper), false);
    assert.equal(permissionService.canDeleteEligibleCustomerUpload(activeHelper), false);
    assert.equal(permissionService.canOpenDevTools(activeHelper), false);
  });

  it("customer cannot gain staff processing capabilities", () => {
    assert.equal(permissionService.canPromoteCustomerUploadToAiReview(activeCustomer), false);
    assert.equal(permissionService.canManageAiReview(activeCustomer), false);
    assert.equal(permissionService.canApproveDesignForCatalog(activeCustomer), false);
    assert.equal(permissionService.canManageShowQueueSettings(activeCustomer), false);
    assert.equal(permissionService.canManageUpcomingShows(activeCustomer), false);
  });
});
