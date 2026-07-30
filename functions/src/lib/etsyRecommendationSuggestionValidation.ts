import {
  ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH,
  ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH,
  ETSY_RECOMMENDATION_SUGGESTION_KINDS,
  type EtsyRecommendationSuggestionKind,
} from "../../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import {
  collectSubjectCollisionKeys,
  getStaticStyleCollisionKeys,
  getStaticSubjectCollisionKeys,
  normalizeSuggestionLabelKey,
  parseSuggestionAliases,
} from "../../../packages/shared/src/constants/etsyRecommendation/etsyRecommendationSuggestionLists";
import type { AddEtsyRecommendationSuggestionRequest } from "../../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";

import { invalidArgument } from "./errors";
import { hasAsciiControlCharacter } from "./asciiControlCharacters";

export interface ValidatedAddEtsyRecommendationSuggestion {
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  apiToken: string;
  aliases: string[];
  labelKey: string;
  collisionKeys: Set<string>;
}

function assertKind(raw: unknown): EtsyRecommendationSuggestionKind {
  if (typeof raw !== "string" || !(ETSY_RECOMMENDATION_SUGGESTION_KINDS as readonly string[]).includes(raw)) {
    throw invalidArgument('Kind must be "subject" or "style".');
  }
  return raw as EtsyRecommendationSuggestionKind;
}

function assertNoControlChars(value: string, fieldLabel: string): void {
  if (hasAsciiControlCharacter(value)) {
    throw invalidArgument(`${fieldLabel} cannot include control characters.`);
  }
}

/**
 * Validate add-suggestion payload (pure aside from HttpsError throws).
 * Does not check Firestore collisions — caller merges existing keys.
 */
export function validateAddEtsyRecommendationSuggestion(
  data: unknown,
): ValidatedAddEtsyRecommendationSuggestion {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw invalidArgument("Request data is required.");
  }
  const record = data as Record<string, unknown>;
  const kind = assertKind(record.kind);

  if (typeof record.label !== "string") {
    throw invalidArgument("A label is required.");
  }
  const label = record.label.trim();
  if (!label) {
    throw invalidArgument("A label is required.");
  }
  assertNoControlChars(label, "Label");

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

  const aliasParsed = parseSuggestionAliases(record.aliases);
  if (aliasParsed.error) {
    throw invalidArgument(aliasParsed.error);
  }

  if (kind === "style") {
    if (aliasParsed.aliases.length > 0) {
      throw invalidArgument("Tone suggestions do not support aliases.");
    }
    return {
      kind,
      label,
      apiToken: label,
      aliases: [],
      labelKey,
      collisionKeys: new Set([labelKey]),
    };
  }

  let apiToken = label;
  if (record.apiToken != null) {
    if (typeof record.apiToken !== "string") {
      throw invalidArgument("Search token must be text.");
    }
    const trimmedToken = record.apiToken.trim();
    if (trimmedToken) {
      assertNoControlChars(trimmedToken, "Search token");
      if (trimmedToken.length > ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH) {
        throw invalidArgument(
          `Search token must be ${ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH} characters or fewer.`,
        );
      }
      apiToken = trimmedToken;
    }
  }

  const tokenKey = normalizeSuggestionLabelKey(apiToken);
  if (!tokenKey) {
    throw invalidArgument("Search token must include letters or numbers.");
  }

  const collisionKeys = collectSubjectCollisionKeys({
    label,
    apiToken,
    aliases: aliasParsed.aliases,
  });

  return {
    kind,
    label,
    apiToken,
    aliases: aliasParsed.aliases,
    labelKey,
    collisionKeys,
  };
}

export function assertNoSuggestionCollision(
  kind: EtsyRecommendationSuggestionKind,
  collisionKeys: Set<string>,
  existingAdminKeys: Set<string>,
): void {
  const staticKeys =
    kind === "subject" ? getStaticSubjectCollisionKeys() : getStaticStyleCollisionKeys();
  for (const key of collisionKeys) {
    if (staticKeys.has(key) || existingAdminKeys.has(key)) {
      throw invalidArgument(
        "That suggestion already exists (matching an existing option, ignoring case).",
      );
    }
  }
}

export function validateDeactivateSuggestionId(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw invalidArgument("Request data is required.");
  }
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => key !== "suggestionId")) {
    throw invalidArgument("Only suggestionId is allowed when deactivating.");
  }
  if (typeof record.suggestionId !== "string" || !record.suggestionId.trim()) {
    throw invalidArgument("A suggestion id is required.");
  }
  return record.suggestionId.trim();
}

/** Type-only re-export for callers that build typed requests. */
export type { AddEtsyRecommendationSuggestionRequest };
