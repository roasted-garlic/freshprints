import {
  ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH,
  ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH,
  ETSY_RECOMMENDATION_SUGGESTION_KINDS,
  type EtsyRecommendationSuggestionKind,
} from "../../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import { normalizeSuggestionLabelKey } from "../../../packages/shared/src/constants/etsyRecommendation/etsyRecommendationSuggestionLists";

import { invalidArgument } from "./errors";

export interface ValidatedEtsySuggestionRequestInput {
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  apiToken: string;
  labelKey: string;
}

export function validateEtsySuggestionRequestInput(data: unknown): ValidatedEtsySuggestionRequestInput {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw invalidArgument("Request data is required.");
  }
  const record = data as Record<string, unknown>;
  if (
    typeof record.kind !== "string" ||
    !(ETSY_RECOMMENDATION_SUGGESTION_KINDS as readonly string[]).includes(record.kind)
  ) {
    throw invalidArgument('Kind must be "subject" or "style".');
  }
  const kind = record.kind as EtsyRecommendationSuggestionKind;
  if (typeof record.label !== "string") {
    throw invalidArgument("A label is required.");
  }
  const label = record.label.trim().replace(/\s+/g, " ");
  if (!label) {
    throw invalidArgument("A label is required.");
  }
  if (/[\u0000-\u001f\u007f]/.test(label)) {
    throw invalidArgument("Label cannot include control characters.");
  }
  const maxLen =
    kind === "subject"
      ? ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH
      : ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH;
  if (label.length > maxLen) {
    throw invalidArgument(`Label must be ${maxLen} characters or fewer.`);
  }
  const labelKey = normalizeSuggestionLabelKey(label);
  if (!labelKey) {
    throw invalidArgument("Label must include letters or numbers.");
  }

  let apiToken = label;
  if (kind === "subject" && record.apiToken != null) {
    if (typeof record.apiToken !== "string") {
      throw invalidArgument("Search token must be text.");
    }
    const trimmed = record.apiToken.trim().replace(/\s+/g, " ");
    if (trimmed) {
      if (trimmed.length > ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH) {
        throw invalidArgument(
          `Search token must be ${ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH} characters or fewer.`,
        );
      }
      apiToken = trimmed;
    }
  }

  return { kind, label, apiToken, labelKey };
}

export function validateSuggestionRequestId(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw invalidArgument("Request data is required.");
  }
  const record = data as Record<string, unknown>;
  if (typeof record.requestId !== "string" || !record.requestId.trim()) {
    throw invalidArgument("A request id is required.");
  }
  return record.requestId.trim();
}
