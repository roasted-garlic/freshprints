import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { permissionService } from "./permissionService";

const activeOwner = { id: "owner-1", role: "owner" as const, isActive: true };
const activeAdmin = { id: "admin-1", role: "admin" as const, isActive: true };
const activeHelper = { id: "helper-1", role: "helper" as const, isActive: true };

describe("AI review permissions", () => {
  it("C. owner and admin can manage AI review", () => {
    assert.equal(permissionService.canManageAiReview(activeOwner), true);
    assert.equal(permissionService.canApproveAiReview(activeAdmin), true);
    assert.equal(permissionService.canRejectAiReview(activeAdmin), true);
    assert.equal(permissionService.canOverrideAiReview(activeOwner), true);
  });

  it("helpers can view and skip but not manage AI review", () => {
    assert.equal(permissionService.canViewAiReview(activeHelper), true);
    assert.equal(permissionService.canSkipAiReview(activeHelper), true);
    assert.equal(permissionService.canEditAiReviewInbox(activeHelper), false);
    assert.equal(permissionService.canManageAiReview(activeHelper), false);
    assert.equal(permissionService.canApproveAiReview(activeHelper), false);
  });

  it("F/G. helpers cannot approve catalog designs; owner/admin can", () => {
    assert.equal(permissionService.canApproveDesignForCatalog(activeHelper), false);
    assert.equal(permissionService.canRejectDesignFromCatalog(activeHelper), false);
    assert.equal(permissionService.canApproveDesignForCatalog(activeOwner), true);
    assert.equal(permissionService.canRejectDesignFromCatalog(activeAdmin), true);
  });
});
