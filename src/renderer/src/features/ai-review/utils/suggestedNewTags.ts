import type { SuggestedNewTag } from "../../../../../../shared/types/catalogTag.types";
import type { CreateCatalogTagInput } from "../../designs/types/catalogTag.types";
import { formatTagsInput, tryParseTagsInput } from "../../designs/utils/designFormMapper";
import {
  formatTagsSanitizationNote,
  sanitizeDesignTagsForDisplay,
} from "../../designs/utils/designTagNormalizer";
import type { AiReviewDraftForm } from "../types/aiReviewInbox.types";

export function normalizeSuggestedTagKey(name: string): string {
  return name.trim().toLowerCase();
}

export function filterIgnoredSuggestedTags(
  suggestedNewTags: readonly SuggestedNewTag[] | undefined,
  ignoredNames: readonly string[],
): SuggestedNewTag[] {
  const ignored = new Set(ignoredNames.map(normalizeSuggestedTagKey));

  return (suggestedNewTags ?? []).filter((tag) => !ignored.has(normalizeSuggestedTagKey(tag.name)));
}

export function buildSuggestedTagApprovalInput(tag: SuggestedNewTag): CreateCatalogTagInput {
  return {
    aliases: tag.aliases,
    name: tag.name,
    preferredWhen: tag.preferredWhen,
  };
}

export function addApprovedSuggestedTagToDraftTags(
  draftForm: AiReviewDraftForm,
  approvedTagName: string,
): AiReviewDraftForm {
  const currentTags = tryParseTagsInput(draftForm.tagsInput);
  const normalizedName = normalizeSuggestedTagKey(approvedTagName);

  if (!normalizedName || currentTags.includes(normalizedName)) {
    return draftForm;
  }

  const sanitization = sanitizeDesignTagsForDisplay([...currentTags, normalizedName]);

  return {
    ...draftForm,
    tagsAdjustmentNote: formatTagsSanitizationNote(sanitization) ?? draftForm.tagsAdjustmentNote,
    tagsInput: formatTagsInput(sanitization.tags),
  };
}
