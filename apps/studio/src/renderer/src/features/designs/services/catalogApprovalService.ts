import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import type { Design } from "../types/design.types";
import { buildAiReviewApprovedFields, buildAiReviewNeedsReviewFields, buildAiReviewRejectedFields } from "../utils/aiReviewState";
import { designService } from "./designService";

function assertCanRejectCatalog(caller: User): void {
  if (!permissionService.canRejectDesignFromCatalog(caller)) {
    throw new Error("You do not have permission to reject catalog designs.");
  }
}

function assertCanManageCatalogApproval(caller: User): void {
  if (!permissionService.canApproveDesignForCatalog(caller)) {
    throw new Error("You do not have permission to approve or reject catalog designs.");
  }
}

function assertDesignIsCatalogApprovalMutable(design: Design): void {
  if (design.status === "archived") {
    throw new Error("Archived designs cannot be approved or rejected.");
  }
}

/**
 * Coordinates catalog `status` with AI review fields after staff or future AI review.
 *
 * Phase 3D Step 6: service foundation only — no UI buttons, no AI providers.
 */
export const catalogApprovalService = {
  async approveDesignForCatalog(caller: User, designId: string): Promise<Design> {
    assertCanManageCatalogApproval(caller);

    const design = await designService.getDesignById(caller, designId);
    assertDesignIsCatalogApprovalMutable(design);

    if (design.status === "rejected") {
      throw new Error("Rejected designs cannot be approved for the catalog.");
    }

    if (design.status === "ready") {
      throw new Error("This design is already approved for the catalog.");
    }

    const reviewFields = buildAiReviewApprovedFields(caller.id);

    return designService.applyCatalogApprovalUpdate(caller, designId, {
      status: "ready",
      aiReviewStatus: reviewFields.aiReviewStatus,
      aiReviewed: reviewFields.aiReviewed,
      aiProcessed: reviewFields.aiProcessed,
      aiReviewedBy: caller.id,
      aiReviewVersion: reviewFields.aiReviewVersion,
      aiReviewNotes: reviewFields.aiReviewNotes,
      aiReviewConfidence: reviewFields.aiReviewConfidence,
    });
  },

  async rejectDesignFromCatalog(
    caller: User,
    designId: string,
    reason?: string,
  ): Promise<Design> {
    assertCanRejectCatalog(caller);

    const design = await designService.getDesignById(caller, designId);
    assertDesignIsCatalogApprovalMutable(design);

    if (design.status === "rejected") {
      throw new Error("This design is already rejected.");
    }

    const reviewFields = buildAiReviewRejectedFields(caller.id, {
      aiReviewNotes: reason,
    });

    return designService.applyCatalogApprovalUpdate(caller, designId, {
      status: "rejected",
      aiReviewStatus: reviewFields.aiReviewStatus,
      aiReviewed: reviewFields.aiReviewed,
      aiProcessed: reviewFields.aiProcessed,
      aiReviewedBy: caller.id,
      aiReviewVersion: reviewFields.aiReviewVersion,
      aiReviewNotes: reviewFields.aiReviewNotes,
      aiReviewConfidence: reviewFields.aiReviewConfidence,
    });
  },

  /**
   * Soft-archives a rejected design so the owner can Delete images from Design Library → Archived.
   */
  async archiveRejectedDesign(caller: User, designId: string): Promise<Design> {
    if (!permissionService.canArchiveDesigns(caller)) {
      throw new Error("You do not have permission to archive designs.");
    }

    const design = await designService.getDesignById(caller, designId);

    if (design.status !== "rejected") {
      throw new Error("Only rejected designs can be archived from AI Review.");
    }

    return designService.archiveDesign(caller, designId);
  },

  async reopenRejectedForReview(caller: User, designId: string): Promise<Design> {
    if (!permissionService.canReopenRejectedDesign(caller)) {
      throw new Error("You do not have permission to reopen rejected designs.");
    }

    const design = await designService.getDesignById(caller, designId);

    if (design.status !== "rejected") {
      throw new Error("Only rejected designs can be reopened for review.");
    }

    const reviewFields = buildAiReviewNeedsReviewFields(caller.id);

    return designService.applyReopenFromRejectedUpdate(caller, designId, {
      aiReviewStatus: reviewFields.aiReviewStatus,
      aiReviewed: reviewFields.aiReviewed,
      aiProcessed: reviewFields.aiProcessed,
      aiReviewedBy: caller.id,
    });
  },
};
