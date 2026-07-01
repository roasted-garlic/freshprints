import type { CatalogTag, CatalogTagInput } from "../types/catalogTag.types";

export const MAX_CATALOG_TAG_LENGTH = 40;
export const MAX_CATALOG_TAG_PREFERRED_WHEN_LENGTH = 500;

export interface NormalizedCatalogTagInput {
  name: string;
  aliases: string[];
  preferredWhen: string;
}

export interface CatalogTagCollision {
  field: "name" | "alias";
  value: string;
  message: string;
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCatalogTagToken(value: string, fieldLabel = "Tag"): string {
  const normalized = collapseWhitespace(value).toLowerCase();

  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  if (normalized.length > MAX_CATALOG_TAG_LENGTH) {
    throw new Error(`${fieldLabel} must be ${MAX_CATALOG_TAG_LENGTH} characters or fewer.`);
  }

  if (normalized.includes("/")) {
    throw new Error(`${fieldLabel} cannot contain slashes.`);
  }

  return normalized;
}

export function getCatalogTagDocumentId(name: string): string {
  const normalizedName = normalizeCatalogTagToken(name, "Tag name");
  const documentId = normalizedName
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!documentId) {
    throw new Error("Tag name must include at least one letter or number.");
  }

  return documentId;
}

export function normalizeCatalogTagAliases(aliases: readonly string[] | undefined, name: string): string[] {
  const normalizedName = normalizeCatalogTagToken(name, "Tag name");
  const normalizedAliases: string[] = [];
  const seenAliases = new Set<string>();

  for (const alias of aliases ?? []) {
    const normalizedAlias = normalizeCatalogTagToken(alias, "Alias");

    if (normalizedAlias === normalizedName || seenAliases.has(normalizedAlias)) {
      continue;
    }

    seenAliases.add(normalizedAlias);
    normalizedAliases.push(normalizedAlias);
  }

  return normalizedAliases;
}

export function normalizeCatalogTagInput(input: CatalogTagInput): NormalizedCatalogTagInput {
  const name = normalizeCatalogTagToken(input.name, "Tag name");
  const preferredWhen = collapseWhitespace(input.preferredWhen);

  if (!preferredWhen) {
    throw new Error("Preferred usage guidance is required.");
  }

  if (preferredWhen.length > MAX_CATALOG_TAG_PREFERRED_WHEN_LENGTH) {
    throw new Error(
      `Preferred usage guidance must be ${MAX_CATALOG_TAG_PREFERRED_WHEN_LENGTH} characters or fewer.`,
    );
  }

  return {
    name,
    aliases: normalizeCatalogTagAliases(input.aliases, name),
    preferredWhen,
  };
}

function buildLookupEntries(tags: readonly CatalogTag[], excludeTagId?: string): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const tag of tags) {
    if (tag.id === excludeTagId) {
      continue;
    }

    lookup.set(tag.name, tag.name);

    for (const alias of tag.aliases) {
      lookup.set(alias, tag.name);
    }
  }

  return lookup;
}

export function findCatalogTagCollision(
  input: NormalizedCatalogTagInput,
  existingTags: readonly CatalogTag[],
  excludeTagId?: string,
): CatalogTagCollision | null {
  const existingLookup = buildLookupEntries(existingTags, excludeTagId);

  if (existingLookup.has(input.name)) {
    return {
      field: "name",
      value: input.name,
      message: `A tag or alias already uses "${input.name}".`,
    };
  }

  for (const alias of input.aliases) {
    if (existingLookup.has(alias)) {
      return {
        field: "alias",
        value: alias,
        message: `The alias "${alias}" already belongs to another tag.`,
      };
    }
  }

  const seenValues = new Set<string>([input.name]);

  for (const alias of input.aliases) {
    if (seenValues.has(alias)) {
      return {
        field: "alias",
        value: alias,
        message: `The alias "${alias}" duplicates this tag name or another alias.`,
      };
    }

    seenValues.add(alias);
  }

  return null;
}

export function assertCatalogTagAvailable(
  input: NormalizedCatalogTagInput,
  existingTags: readonly CatalogTag[],
  excludeTagId?: string,
): void {
  const collision = findCatalogTagCollision(input, existingTags, excludeTagId);

  if (collision) {
    throw new Error(collision.message);
  }
}

export function resolveCatalogTagCandidate(candidate: string, tags: readonly CatalogTag[]): string | null {
  let normalizedCandidate: string;

  try {
    normalizedCandidate = normalizeCatalogTagToken(candidate, "Tag candidate");
  } catch {
    return null;
  }

  for (const tag of tags) {
    if (tag.status !== "approved") {
      continue;
    }

    if (tag.name === normalizedCandidate || tag.aliases.includes(normalizedCandidate)) {
      return tag.name;
    }
  }

  return null;
}
