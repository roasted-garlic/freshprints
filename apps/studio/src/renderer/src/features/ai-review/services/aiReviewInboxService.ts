import { catalogApprovalService } from "../../designs/services/catalogApprovalService";
import { designService } from "../../designs/services/designService";
import type { Design } from "../../designs/types/design.types";
import type { DesignListPage, DesignListQuery } from "../../designs/types/designQuery.types";
import { parseTagsInput } from "../../designs/utils/designFormMapper";
import { filterDesignsByAiReviewStatus } from "../../designs/utils/designLibrarySearch";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import { buildAiReviewInboxListQuery } from "../constants/aiReviewInboxConstants";
import { aiEnrichmentEnqueueService } from "./aiEnrichmentEnqueueService";
import type { AiReviewDraftForm, AiReviewInboxFilters } from "../types/aiReviewInbox.types";

function assertCanApproveInbox(caller: User): void {
  if (!permissionService.canApproveDesignForCatalog(caller)) {
    throw new Error("You do not have permission to approve designs.");
  }
}

function assertCanRejectInbox(caller: User): void {
  if (!permissionService.canRejectDesignFromCatalog(caller)) {
    throw new Error("You do not have permission to reject designs.");
  }
}

function applyInboxClientFilters(designs: Design[], filters: AiReviewInboxFilters): Design[] {
  if (filters.tab === "processing") {
    return filterDesignsByAiReviewStatus(designs, "pending");
  }

  return designs;
}

export const aiReviewInboxService = {
  buildListQuery(filters: AiReviewInboxFilters): DesignListQuery {
    return buildAiReviewInboxListQuery(filters);
  },

  async listInboxPage(
    caller: User,
    filters: AiReviewInboxFilters,
    options?: { cursor?: DesignListPage["nextCursor"] },
  ): Promise<DesignListPage> {
    const listQuery = buildAiReviewInboxListQuery(filters);
    const page = await designService.listDesignsPage(caller, {
      ...listQuery,
      cursor: options?.cursor,
    });

    const filteredDesigns = applyInboxClientFilters(page.designs, filters);

    return {
      designs: filteredDesigns,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    };
  },

  async approveFromInbox(caller: User, designId: string, draft: AiReviewDraftForm): Promise<Design> {
    assertCanApproveInbox(caller);

    const tags = parseTagsInput(draft.tagsInput);

    await designService.updateDesign(caller, designId, {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      categoryId: draft.categoryId.trim() || undefined,
      tags,
    });

    return catalogApprovalService.approveDesignForCatalog(caller, designId);
  },

  async rejectFromInbox(caller: User, designId: string, reason?: string): Promise<Design> {
    assertCanRejectInbox(caller);
    return catalogApprovalService.rejectDesignFromCatalog(caller, designId, reason);
  },

  async reopenFromInbox(caller: User, designId: string): Promise<Design> {
    if (!permissionService.canReopenRejectedDesign(caller)) {
      throw new Error("You do not have permission to reopen rejected designs.");
    }

    return catalogApprovalService.reopenRejectedForReview(caller, designId);
  },

  async rerunAiFromInbox(
    caller: User,
    designId: string,
  ): Promise<void> {
    if (!permissionService.canRerunAiSuggestions(caller)) {
      throw new Error("You do not have permission to re-run AI suggestions.");
    }

    const design = await designService.getDesignById(caller, designId);

    const canResetNeedsReview =
      design.status === "imported" && design.aiReviewStatus === "needs_review";
    const canResetRejected = design.status === "rejected";

    if (!canResetNeedsReview && !canResetRejected) {
      throw new Error("Only Needs Review or Rejected designs can be sent back to Processing.");
    }

    const result = await aiEnrichmentEnqueueService.resetForProcessing(designId);

    if (!result.reset) {
      throw new Error("AI processing could not be reset. Please try again.");
    }
  },
};
