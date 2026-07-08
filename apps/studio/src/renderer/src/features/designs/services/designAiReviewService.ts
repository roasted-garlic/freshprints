import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import type { Design } from "../types/design.types";
import type { AiReviewMutationInput } from "../types/aiReview.types";
import {
  buildAiReviewApprovedFields,
  buildAiReviewNeedsReviewFields,
  buildAiReviewPendingFields,
  buildAiReviewRejectedFields,
} from "../utils/aiReviewState";
import { designService } from "./designService";

function assertCanSkipAiReview(caller: User): void {
  if (!permissionService.canSkipAiReview(caller)) {
    throw new Error("You do not have permission to skip AI review items.");
  }
}

function assertCanManageAiReview(caller: User): void {
  if (!permissionService.canManageAiReview(caller)) {
    throw new Error("You do not have permission to manage AI review.");
  }
}

function assertDesignIsAiReviewMutable(design: Design): void {
  if (design.status === "archived") {
    throw new Error("Archived designs cannot be updated for AI review.");
  }
}

/**
 * Service foundation for AI review state transitions.
 *
 * Phase 3D Step 5: data model and workflow hooks only.
 * Does not call AI providers, queues, or transition `status` to `ready`.
 */
export const designAiReviewService = {
  async markAiReviewPending(
    caller: User,
    designId: string,
    input: AiReviewMutationInput = {},
  ): Promise<Design> {
    assertCanManageAiReview(caller);

    const design = await designService.getDesignById(caller, designId);
    assertDesignIsAiReviewMutable(design);

    const fields = buildAiReviewPendingFields(input);

    return designService.applyAiReviewUpdate(caller, designId, {
      ...fields,
      clearReviewedAt: true,
      clearReviewedBy: true,
      clearReviewConfidence: true,
    });
  },

  async markAiReviewApproved(
    caller: User,
    designId: string,
    input: AiReviewMutationInput = {},
  ): Promise<Design> {
    assertCanManageAiReview(caller);

    const design = await designService.getDesignById(caller, designId);
    assertDesignIsAiReviewMutable(design);

    return designService.applyAiReviewUpdate(
      caller,
      designId,
      buildAiReviewApprovedFields(caller.id, input),
    );
  },

  async markAiReviewRejected(
    caller: User,
    designId: string,
    input: AiReviewMutationInput = {},
  ): Promise<Design> {
    assertCanManageAiReview(caller);

    const design = await designService.getDesignById(caller, designId);
    assertDesignIsAiReviewMutable(design);

    return designService.applyAiReviewUpdate(
      caller,
      designId,
      buildAiReviewRejectedFields(caller.id, input),
    );
  },

  async markAiReviewNeedsReview(
    caller: User,
    designId: string,
    input: AiReviewMutationInput = {},
  ): Promise<Design> {
    assertCanSkipAiReview(caller);

    const design = await designService.getDesignById(caller, designId);
    assertDesignIsAiReviewMutable(design);

    return designService.applyAiReviewUpdate(
      caller,
      designId,
      buildAiReviewNeedsReviewFields(caller.id, input),
    );
  },
};
