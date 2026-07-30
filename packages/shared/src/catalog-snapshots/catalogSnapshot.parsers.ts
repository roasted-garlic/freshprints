import {
  CATALOG_REFERENCE_SCHEMA_VERSION,
  PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION,
  PORTAL_CATALOG_SCHEMA_VERSION,
  type AiCatalogReferenceSnapshot,
  type CatalogReferenceManifest,
  type ClientCatalogReferenceSnapshot,
  type PortalCatalogCardBucket,
  type PortalCatalogCardOverrides,
  type PortalCatalogDiscoverSnapshot,
  type PortalCatalogIdAsset,
  type PortalCatalogManifest,
  type PortalCatalogSearchShard,
  type PortalCatalogStudioReadyIndex,
  type PortalCatalogTagFacetSummary,
} from "./catalogSnapshot.types";

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function schema(value: Record<string, unknown>, expected: number, label: string): void {
  if (value.schemaVersion !== expected) {
    throw new Error(`${label} uses unsupported schemaVersion.`);
  }
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function generation(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error("generation must be a non-negative integer.");
  }
  return value;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value;
}

export function parseCatalogReferenceManifest(value: unknown): CatalogReferenceManifest {
  const parsed = object(value, "catalog reference manifest");
  schema(parsed, CATALOG_REFERENCE_SCHEMA_VERSION, "catalog reference manifest");
  generation(parsed.generation);
  string(parsed.contentVersion, "contentVersion");
  string(parsed.generatedAt, "generatedAt");
  string(parsed.path, "path");
  string(parsed.aiPath, "aiPath");
  string(parsed.clientPath, "clientPath");
  return parsed as unknown as CatalogReferenceManifest;
}

export function parseAiCatalogReferenceSnapshot(value: unknown): AiCatalogReferenceSnapshot {
  const parsed = object(value, "AI catalog reference snapshot");
  schema(parsed, CATALOG_REFERENCE_SCHEMA_VERSION, "AI catalog reference snapshot");
  string(parsed.contentVersion, "contentVersion");
  string(parsed.generatedAt, "generatedAt");
  array(parsed.categories, "categories");
  array(parsed.tags, "tags");
  array(parsed.categoryNames, "categoryNames");
  object(parsed.categoryIdsByName, "categoryIdsByName");
  return parsed as unknown as AiCatalogReferenceSnapshot;
}

export function parseClientCatalogReferenceSnapshot(value: unknown): ClientCatalogReferenceSnapshot {
  const parsed = object(value, "client catalog reference snapshot");
  schema(parsed, CATALOG_REFERENCE_SCHEMA_VERSION, "client catalog reference snapshot");
  string(parsed.contentVersion, "contentVersion");
  string(parsed.generatedAt, "generatedAt");
  array(parsed.categories, "categories");
  array(parsed.tags, "tags");
  return parsed as unknown as ClientCatalogReferenceSnapshot;
}

function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return value;
}

export function parsePortalCatalogManifest(value: unknown): PortalCatalogManifest {
  const parsed = object(value, "portal catalog manifest");
  schema(parsed, PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION, "portal catalog manifest");
  generation(parsed.generation);
  string(parsed.contentVersion, "contentVersion");
  string(parsed.generatedAt, "generatedAt");
  string(parsed.path, "path");
  string(parsed.discoverPath, "discoverPath");

  const search = object(parsed.search, "search");
  if (search.strategyVersion !== 1) throw new Error("search.strategyVersion must be 1.");
  if (search.shardKeyLength !== 2) throw new Error("search.shardKeyLength must be 2.");
  string(search.pathTemplate, "search.pathTemplate");
  array(search.existingShardKeys, "search.existingShardKeys");

  const filters = object(parsed.filters, "filters");
  string(filters.tagPathTemplate, "filters.tagPathTemplate");
  string(filters.categoryPathTemplate, "filters.categoryPathTemplate");
  string(filters.tagFacetPath, "filters.tagFacetPath");

  const studio = object(parsed.studio, "studio");
  string(studio.readyIndexPath, "studio.readyIndexPath");

  const cards = object(parsed.cards, "cards");
  number(cards.bucketCount, "cards.bucketCount");
  if (cards.hashVersion !== 1) throw new Error("cards.hashVersion must be 1.");
  string(cards.pathTemplate, "cards.pathTemplate");
  if (parsed.cardOverrides !== undefined) {
    const overrides = object(parsed.cardOverrides, "cardOverrides");
    string(overrides.path, "cardOverrides.path");
    string(overrides.version, "cardOverrides.version");
    if (overrides.previousPath !== undefined) {
      string(overrides.previousPath, "cardOverrides.previousPath");
    }
  }

  const recent = object(parsed.recent, "recent");
  number(recent.pageCount, "recent.pageCount");
  string(recent.pathTemplate, "recent.pathTemplate");

  const categories = object(parsed.categories, "categories");
  object(categories.pageCounts, "categories.pageCounts");
  string(categories.pathTemplate, "categories.pathTemplate");

  return parsed as unknown as PortalCatalogManifest;
}

export function parsePortalCatalogCardOverrides(value: unknown): PortalCatalogCardOverrides {
  const parsed = parsePortalAsset<PortalCatalogCardOverrides>(
    value,
    "portal card overrides",
  );
  string(parsed.overrideVersion, "overrideVersion");
  array(parsed.cards, "cards");
  return parsed;
}

function parsePortalAsset<T>(value: unknown, label: string): T {
  const parsed = object(value, label);
  schema(parsed, PORTAL_CATALOG_SCHEMA_VERSION, label);
  string(parsed.catalogVersion, "catalogVersion");
  string(parsed.generatedAt, "generatedAt");
  return parsed as T;
}

export function parsePortalCatalogDiscoverSnapshot(value: unknown): PortalCatalogDiscoverSnapshot {
  const parsed = parsePortalAsset<PortalCatalogDiscoverSnapshot>(value, "portal discover snapshot");
  array(parsed.designs, "designs");
  return parsed;
}

export function parsePortalCatalogIdAsset(value: unknown): PortalCatalogIdAsset {
  const parsed = parsePortalAsset<PortalCatalogIdAsset>(value, "portal ID asset");
  array(parsed.designIds, "designIds");
  return parsed;
}

export function parsePortalCatalogSearchShard(value: unknown): PortalCatalogSearchShard {
  const parsed = parsePortalAsset<PortalCatalogSearchShard>(value, "portal search shard");
  string(parsed.shard, "shard");
  object(parsed.terms, "terms");
  return parsed;
}

export function parsePortalCatalogCardBucket(value: unknown): PortalCatalogCardBucket {
  const parsed = parsePortalAsset<PortalCatalogCardBucket>(value, "portal card bucket");
  array(parsed.cards, "cards");
  return parsed;
}

export function parsePortalCatalogTagFacetSummary(value: unknown): PortalCatalogTagFacetSummary {
  const parsed = parsePortalAsset<PortalCatalogTagFacetSummary>(value, "portal tag facet summary");
  const tags = array(parsed.tags, "tags");
  for (const [index, entry] of tags.entries()) {
    const tag = object(entry, `tags[${index}]`);
    string(tag.id, `tags[${index}].id`);
    string(tag.name, `tags[${index}].name`);
    const count = number(tag.count, `tags[${index}].count`);
    if (count < 1) throw new Error(`tags[${index}].count must be at least 1 (zero-count tags must be excluded).`);
  }
  return parsed;
}

export function parsePortalCatalogStudioReadyIndex(value: unknown): PortalCatalogStudioReadyIndex {
  const parsed = parsePortalAsset<PortalCatalogStudioReadyIndex>(value, "portal studio ready index");
  const designs = array(parsed.designs, "designs");
  for (const [index, entry] of designs.entries()) {
    const design = object(entry, `designs[${index}]`);
    string(design.id, `designs[${index}].id`);
    string(design.title, `designs[${index}].title`);
    if (design.description !== undefined) {
      string(design.description, `designs[${index}].description`);
    }
    if (design.categoryId !== undefined) {
      string(design.categoryId, `designs[${index}].categoryId`);
    }
    array(design.tags, `designs[${index}].tags`);
    for (const [tagIndex, tag] of (design.tags as unknown[]).entries()) {
      string(tag, `designs[${index}].tags[${tagIndex}]`);
    }
    number(design.createdAtMs, `designs[${index}].createdAtMs`);
  }
  return parsed;
}
