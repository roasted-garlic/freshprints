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
  const suggestedTags = suggestions?.tags?.filter((tag) => tag.trim()) ?? [];
  const rawTags =
    hasAiSeed && suggestedTags.length > 0 ? suggestedTags : design.tags;
  const { tagsInput, tagsAdjustmentNote } = buildSanitizedTagsInput(rawTags);

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
    baseline.artworkBackgroundPreset !== draft.artworkBackgroundPreset ||
    baseline.artworkBackgroundCustomHex !== draft.artworkBackgroundCustomHex
  );
}
