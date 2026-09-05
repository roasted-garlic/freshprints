import { syncHalftoneTagInList } from "@fresh-prints/shared/utils/halftoneReviewState";

import { catalogApprovalService } from "../../designs/services/catalogApprovalService";
import { companionSetService } from "../../designs/services/companionSetService";
import { designService } from "../../designs/services/designService";
import type { Design } from "../../designs/types/design.types";
import type { DesignListPage, DesignListQuery } from "../../designs/types/designQuery.types";
import {
  buildArtworkBackgroundUpdateValue,
  parseTagsInput,
} from "../../designs/utils/designFormMapper";
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

    const tags = syncHalftoneTagInList(parseTagsInput(draft.tagsInput), draft.markAsHalftone);
    const artworkBackgroundHex = buildArtworkBackgroundUpdateValue(draft);
    if (draft.artworkBackgroundPreset === "custom" && artworkBackgroundHex === undefined) {
      throw new Error("Enter a valid 6-digit hex color (for example #2c2d2d).");
    }

    const draftUpdated = await designService.updateDesign(caller, designId, {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      categoryId: draft.categoryId.trim() || undefined,
      tags,
      artworkBackgroundHex: artworkBackgroundHex ?? null,
      isExplicitContent: draft.isExplicitContent,
      censoredTerms: parseTagsInput(draft.censoredTermsInput),
      explicitContentAutomationLocked: draft.explicitContentAutomationLocked,
      halftoneStaffDecision: {
        value: draft.markAsHalftone,
        decidedBy: caller.id,
        isExplicitOverride: true,
      },
    });

    if (draft.expectsCompanions) {
      // Staff working-queue flag only — never creates or infers companion-set membership.
      await companionSetService.markNeedsCompanion(caller, designId);
    }

    return catalogApprovalService.approveDesignForCatalog(caller, designId, draftUpdated);
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

  async archiveFromInbox(caller: User, designId: string): Promise<Design> {
    return catalogApprovalService.archiveRejectedDesign(caller, designId);
  },

  /**
   * Persist artwork background immediately (preview control / reprocess prep).
   * Uses design-edit permission so Processing tab can save without Needs Review edit rights.
   */
  async updateArtworkBackgroundFromInbox(
    caller: User,
    designId: string,
    values: Pick<AiReviewDraftForm, "artworkBackgroundPreset" | "artworkBackgroundCustomHex">,
  ): Promise<Design> {
    if (!permissionService.canEditDesigns(caller)) {
      throw new Error("You do not have permission to update artwork background.");
    }

    const artworkBackgroundHex = buildArtworkBackgroundUpdateValue(values);
    if (values.artworkBackgroundPreset === "custom" && artworkBackgroundHex === undefined) {
      throw new Error("Enter a valid #RRGGBB custom background color.");
    }

    return designService.updateDesign(caller, designId, {
      artworkBackgroundHex: artworkBackgroundHex ?? null,
    });
  },

  /**
   * Persist staff halftone decision immediately (Processing preview control).
   * Couples preview mat to halftone like Needs Review approve prep.
   */
  async updateHalftoneFromInbox(
    caller: User,
    design: Design,
    markAsHalftone: boolean,
  ): Promise<Design> {
    if (!permissionService.canEditDesigns(caller)) {
      throw new Error("You do not have permission to update halftone.");
    }

    const tags = syncHalftoneTagInList(design.tags, markAsHalftone);
    const artworkBackgroundHex = buildArtworkBackgroundUpdateValue({
      artworkBackgroundPreset: markAsHalftone ? "lightBlack" : "grey",
      artworkBackgroundCustomHex: "",
    });

    return designService.updateDesign(caller, design.id, {
      tags,
      artworkBackgroundHex: artworkBackgroundHex ?? null,
      halftoneStaffDecision: {
        value: markAsHalftone,
        decidedBy: caller.id,
        isExplicitOverride: true,
      },
    });
  },

  async rerunAiFromInbox(
    caller: User,
    designId: string,
  ): Promise<{
    aiReviewStatus: "pending";
    designId: string;
    reset: true;
    status: "imported";
  }> {
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

    return result;
  },
};
