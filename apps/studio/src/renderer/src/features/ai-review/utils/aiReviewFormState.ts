import { resolveAiReviewHalftoneStaffToggle } from "@fresh-prints/shared/utils/halftoneReviewState";

import type { Design } from "../../designs/types/design.types";
import { formatTagsInput, mapArtworkBackgroundToForm } from "../../designs/utils/designFormMapper";

import type { AiReviewDraftForm } from "../types/aiReviewInbox.types";

/**
 * Seeds Final Catalog Information from the same persisted `aiSuggestions` object
 * shown in the AI Suggestions panel. One AI response per processing run — no second
 * AI call. Field-level fallback to catalog fields only when a suggestion field is empty.
 */
export function createAiReviewDraftFromDesign(design: Design): AiReviewDraftForm {
  const suggestions = design.aiSuggestions;
  const hasAiSeed = Boolean(suggestions && !suggestions.errorCode);

  const suggestedTitle = suggestions?.title?.trim();
  const suggestedDescription = suggestions?.description?.trim();
  const suggestedCategoryId = suggestions?.categoryId?.trim();
  return {
    title: hasAiSeed && suggestedTitle ? suggestedTitle : design.title,
    description:
      hasAiSeed && suggestedDescription ? suggestedDescription : design.description ?? "",
    categoryId:
      hasAiSeed && suggestedCategoryId ? suggestedCategoryId : design.categoryId ?? "",
    tagsInput: "",
    markAsHalftone: resolveAiReviewHalftoneStaffToggle({
      staffDecision: design.halftoneStaffDecision,
      submitterResponse: design.halftoneSubmitterResponse,
    }),
    isExplicitContent: design.isExplicitContent === true,
    censoredTermsInput: formatTagsInput(design.censoredTerms ?? []),
    explicitContentAutomationLocked: design.explicitContentAutomationLocked === true,
    // Queue flag only — a design already linked to a companion set (no queue flag) does not seed
    // this toggle ON, since "expects companions" here means "waiting to be linked," not "linked."
    expectsCompanions: design.companionSetIncomplete === true,
    ...mapArtworkBackgroundToForm(design),
  };
}

export function isAiReviewDraftDirty(baseline: AiReviewDraftForm, draft: AiReviewDraftForm): boolean {
  return (
    baseline.title !== draft.title ||
    baseline.description !== draft.description ||
    baseline.categoryId !== draft.categoryId ||
    baseline.markAsHalftone !== draft.markAsHalftone ||
    baseline.isExplicitContent !== draft.isExplicitContent ||
    baseline.censoredTermsInput !== draft.censoredTermsInput ||
    baseline.explicitContentAutomationLocked !== draft.explicitContentAutomationLocked ||
    baseline.expectsCompanions !== draft.expectsCompanions ||
    baseline.artworkBackgroundPreset !== draft.artworkBackgroundPreset ||
    baseline.artworkBackgroundCustomHex !== draft.artworkBackgroundCustomHex
  );
}
