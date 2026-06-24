export const MAX_DESIGN_TAGS = 20;
export const MAX_DESIGN_TAG_LENGTH = 40;

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
