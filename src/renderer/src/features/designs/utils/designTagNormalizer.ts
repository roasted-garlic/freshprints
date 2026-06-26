export const MAX_DESIGN_TAGS = 20;
export const MAX_DESIGN_TAG_LENGTH = 40;

export interface SanitizeDesignTagsResult {
  tags: string[];
  truncatedCount: number;
  skippedDuplicateCount: number;
  skippedOverLimitCount: number;
}

export function formatTagsSanitizationNote(result: SanitizeDesignTagsResult): string | null {
  const parts: string[] = [];

  if (result.truncatedCount > 0) {
    parts.push(
      `${result.truncatedCount} tag(s) shortened to ${MAX_DESIGN_TAG_LENGTH} characters`,
    );
  }

  if (result.skippedOverLimitCount > 0) {
    parts.push(`${result.skippedOverLimitCount} tag(s) omitted (maximum ${MAX_DESIGN_TAGS} tags)`);
  }

  if (parts.length === 0) {
    return null;
  }

  return `${parts.join(". ")}.`;
}

/**
 * Normalizes tags for display and form seeding without throwing.
 * Over-length tags are truncated; excess tags beyond MAX_DESIGN_TAGS are dropped.
 */
export function sanitizeDesignTagsForDisplay(tags: string[]): SanitizeDesignTagsResult {
  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();
  let truncatedCount = 0;
  let skippedDuplicateCount = 0;
  let skippedOverLimitCount = 0;

  for (const rawTag of tags) {
    let normalizedTag = rawTag.trim().toLowerCase();

    if (!normalizedTag) {
      continue;
    }

    if (normalizedTag.length > MAX_DESIGN_TAG_LENGTH) {
      truncatedCount += 1;
      normalizedTag = normalizedTag.slice(0, MAX_DESIGN_TAG_LENGTH).trim();

      if (!normalizedTag) {
        continue;
      }
    }

    if (seenTags.has(normalizedTag)) {
      skippedDuplicateCount += 1;
      continue;
    }

    if (normalizedTags.length >= MAX_DESIGN_TAGS) {
      skippedOverLimitCount += 1;
      continue;
    }

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  }

  return {
    tags: normalizedTags,
    truncatedCount,
    skippedDuplicateCount,
    skippedOverLimitCount,
  };
}

export function normalizeDesignTags(tags: string[]): string[] {
  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const rawTag of tags) {
    const normalizedTag = rawTag.trim().toLowerCase();

    if (!normalizedTag) {
      continue;
    }

    if (normalizedTag.length > MAX_DESIGN_TAG_LENGTH) {
      throw new Error(`Tags must be ${MAX_DESIGN_TAG_LENGTH} characters or fewer.`);
    }

    if (seenTags.has(normalizedTag)) {
      continue;
    }

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);

    if (normalizedTags.length > MAX_DESIGN_TAGS) {
      throw new Error(`A design can have at most ${MAX_DESIGN_TAGS} tags.`);
    }
  }

  return normalizedTags;
}
