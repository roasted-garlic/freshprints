import { resolveAiReviewHalftoneStaffToggle } from "@fresh-prints/shared/utils/halftoneReviewState";

import type { Design } from "../../designs/types/design.types";
import { formatTagsInput, mapArtworkBackgroundToForm } from "../../designs/utils/designFormMapper";
import {
  formatTagsSanitizationNote,
  sanitizeDesignTagsForDisplay,
} from "../../designs/utils/designTagNormalizer";

import type { AiReviewDraftForm } from "../types/aiReviewInbox.types";

function buildSanitizedTagsInput(rawTags: string[]): {
  tagsInput: string;
  tagsAdjustmentNote?: string;
} {
  const sanitization = sanitizeDesignTagsForDisplay(rawTags);
  const tagsAdjustmentNote = formatTagsSanitizationNote(sanitization) ?? undefined;

  if (import.meta.env?.DEV && tagsAdjustmentNote) {
    console.warn("[AI Review] design tags adjusted for display limits:", tagsAdjustmentNote, {
      before: rawTags,
      after: sanitization.tags,
    });
  }

  return {
    tagsInput: formatTagsInput(sanitization.tags),
    tagsAdjustmentNote,
  };
}

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
  // AI tag generation is retired from the active enrichment contract. Keep
  // staff-entered/historical design tags intact, but never seed new tags from
  // legacy aiSuggestions.tags.
  const { tagsInput, tagsAdjustmentNote } = buildSanitizedTagsInput(design.tags);

  return {
    title: hasAiSeed && suggestedTitle ? suggestedTitle : design.title,
    description:
      hasAiSeed && suggestedDescription ? suggestedDescription : design.description ?? "",
    categoryId:
      hasAiSeed && suggestedCategoryId ? suggestedCategoryId : design.categoryId ?? "",
    tagsInput,
    tagsAdjustmentNote,
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
    baseline.tagsInput !== draft.tagsInput ||
    baseline.markAsHalftone !== draft.markAsHalftone ||
    baseline.isExplicitContent !== draft.isExplicitContent ||
    baseline.censoredTermsInput !== draft.censoredTermsInput ||
    baseline.explicitContentAutomationLocked !== draft.explicitContentAutomationLocked ||
    baseline.expectsCompanions !== draft.expectsCompanions ||
    baseline.artworkBackgroundPreset !== draft.artworkBackgroundPreset ||
    baseline.artworkBackgroundCustomHex !== draft.artworkBackgroundCustomHex
  );
}
