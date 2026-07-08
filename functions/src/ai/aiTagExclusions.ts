import {
  ADDITIONAL_TAG_EXCLUSION_PATTERN,
  BASE_AI_TAG_EXCLUSIONS,
  MAX_ADDITIONAL_TAG_EXCLUSIONS,
} from "../../../packages/shared/src/constants/aiTagExclusions.constants";

export { BASE_AI_TAG_EXCLUSIONS, MAX_ADDITIONAL_TAG_EXCLUSIONS };

/** @deprecated Use BASE_AI_TAG_EXCLUSIONS or effective merged list from settings. */
export const AI_TAG_EXCLUSIONS = BASE_AI_TAG_EXCLUSIONS;

export function resolveAdditionalTagExclusions(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalized = entry.trim().toLowerCase();

    if (
      !normalized ||
      !ADDITIONAL_TAG_EXCLUSION_PATTERN.test(normalized) ||
      seen.has(normalized) ||
      BASE_AI_TAG_EXCLUSIONS.includes(normalized as (typeof BASE_AI_TAG_EXCLUSIONS)[number])
    ) {
      continue;
    }

    seen.add(normalized);
    resolved.push(normalized);

    if (resolved.length >= MAX_ADDITIONAL_TAG_EXCLUSIONS) {
      break;
    }
  }

  return resolved;
}

export function mergeTagExclusions(additionalTagExclusions: readonly string[] = []): string[] {
  const merged = new Set<string>(BASE_AI_TAG_EXCLUSIONS);

  for (const tag of additionalTagExclusions) {
    const normalized = tag.trim().toLowerCase();

    if (normalized && ADDITIONAL_TAG_EXCLUSION_PATTERN.test(normalized)) {
      merged.add(normalized);
    }
  }

  return [...merged];
}

function buildExclusionSet(exclusions: readonly string[]): Set<string> {
  return new Set(exclusions.map((tag) => tag.toLowerCase().trim()).filter(Boolean));
}

/** Exact lowercase token match only — avoids false positives such as "deadline". */
export function isExcludedAiTag(tag: string, exclusions: readonly string[]): boolean {
  const normalized = tag.toLowerCase().trim();
  return normalized.length > 0 && buildExclusionSet(exclusions).has(normalized);
}

export function filterExcludedAiTags(tags: string[], exclusions: readonly string[]): string[] {
  const exclusionSet = buildExclusionSet(exclusions);
  return tags.filter((tag) => {
    const normalized = tag.toLowerCase().trim();
    return normalized.length > 0 && !exclusionSet.has(normalized);
  });
}

export function buildTagExclusionPromptSection(exclusions: readonly string[]): string {
  return `
Tag exclusions: never use these tag words: ${exclusions.join(", ")}.
For skeleton or skull artwork, prefer tags like skeleton, bones, spooky, halloween, dance, retro, groovy, edgy, illustration, cartoon, punk, rock, humor, funny — never death or skull.`;
}
