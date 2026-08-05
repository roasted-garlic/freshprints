import { createHash } from "node:crypto";

import type {
  AiCatalogReferenceSnapshot,
  ClientCatalogReferenceSnapshot,
  PortalCatalogCard,
  PortalCatalogManifest,
} from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import {
  CATALOG_REFERENCE_SCHEMA_VERSION,
  PORTAL_CATALOG_CARD_BUCKET_COUNT,
  PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION,
} from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";

export interface TaxonomySource {
  categories: Array<{ id: string; name: string; description?: string; sortOrder: number }>;
  tags: CatalogTag[];
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function contentVersion(generation: number, value: unknown): string {
  const digest = createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 16);
  return `${generation}-${digest}`;
}

export function buildTaxonomySnapshots(
  source: TaxonomySource,
  generation: number,
  generatedAt: string,
): { ai: AiCatalogReferenceSnapshot; client: ClientCatalogReferenceSnapshot } {
  const categories = [...source.categories].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
  const tags = [...source.tags].sort((left, right) => left.name.localeCompare(right.name));
  const version = contentVersion(generation, {
    categories: categories.map(({ id, name, description, sortOrder }) => ({
      id,
      name,
      description,
      sortOrder,
    })),
    tags: tags.map(({ id, name, aliases, preferredWhen, status }) => ({
      id,
      name,
      aliases: [...aliases].sort(),
      preferredWhen,
      status,
    })),
  });
  const aiCategories = categories.map(({ id, name, description }) => ({
    id,
    name,
    ...(description ? { description } : {}),
  }));

  return {
    ai: {
      schemaVersion: CATALOG_REFERENCE_SCHEMA_VERSION,
      contentVersion: version,
      generatedAt,
      categories: aiCategories,
      tags: tags.map(({ id, name, aliases, preferredWhen }) => ({
        id,
        name,
        aliases: [...aliases],
        preferredWhen,
        status: "approved" as const,
      })),
      categoryNames: aiCategories.map(({ name }) => name),
      categoryIdsByName: Object.fromEntries(
        aiCategories.map(({ id, name }) => [name.toLowerCase(), id]),
      ),
    },
    client: {
      schemaVersion: CATALOG_REFERENCE_SCHEMA_VERSION,
      contentVersion: version,
      generatedAt,
      categories: categories.map(({ id, name, sortOrder }) => ({
        id,
        name,
        sortOrder,
        isActive: true,
        isCustomerVisible: true,
      })),
      tags: tags.map(({ id, name, aliases }) => ({
        id,
        name,
        aliases: [...aliases],
        status: "approved",
        isCustomerVisible: true,
      })),
    },
  };
}

export function mapPortalCatalogCard(
  id: string,
  data: Record<string, unknown>,
): PortalCatalogCard | null {
  if (
    data.status !== "ready" ||
    typeof data.title !== "string" ||
    typeof data.thumbnailPath !== "string"
  ) {
    return null;
  }
  const millis = (value: unknown): number | undefined => {
    if (
      value &&
      typeof value === "object" &&
      "toMillis" in value &&
      typeof (value as { toMillis?: unknown }).toMillis === "function"
    ) {
      return (value as { toMillis: () => number }).toMillis();
    }
    return undefined;
  };
  return {
    id,
    title: data.title,
    ...(typeof data.description === "string" ? { description: data.description } : {}),
    ...(typeof data.categoryId === "string" ? { categoryId: data.categoryId } : {}),
    tags: Array.isArray(data.tags)
      ? data.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    thumbnailPath: data.thumbnailPath,
    ...(typeof data.previewPath === "string" ? { previewPath: data.previewPath } : {}),
    ...(typeof data.artworkBackgroundHex === "string"
      ? { artworkBackgroundHex: data.artworkBackgroundHex }
      : {}),
    width: typeof data.width === "number" ? data.width : 0,
    height: typeof data.height === "number" ? data.height : 0,
    ...(typeof data.printWidthInches === "number"
      ? { printWidthInches: data.printWidthInches }
      : {}),
    ...(typeof data.printHeightInches === "number"
      ? { printHeightInches: data.printHeightInches }
      : {}),
    ...(millis(data.createdAt) !== undefined ? { createdAtMs: millis(data.createdAt) } : {}),
    ...(millis(data.readyAt) !== undefined ? { readyAtMs: millis(data.readyAt) } : {}),
    requestCount: typeof data.requestCount === "number" ? data.requestCount : 0,
    ...(millis(data.lastRequestedAt) !== undefined
      ? { lastRequestedAtMs: millis(data.lastRequestedAt) }
      : {}),
    ...(millis(data.lastAddedToShowAt) !== undefined
      ? { lastAddedToShowAtMs: millis(data.lastAddedToShowAt) }
      : {}),
    favoriteCount: typeof data.favoriteCount === "number" ? data.favoriteCount : 0,
    ...(millis(data.updatedAt) !== undefined ? { updatedAtMs: millis(data.updatedAt) } : {}),
  };
}

/**
 * The one customer-facing browse order every generated Portal ID list (tag/category/search-term
 * candidates) is built from: "Studio-newest first" (`createdAt DESC`), design ID `DESC` as the
 * stable tiebreaker — matching the existing Firestore browse convention in
 * `catalogService.ts` (`orderBy(sortField, 'desc'), orderBy('__name__', 'desc')`). Because every
 * derived ID list shares this same relative order, the Portal consumer can intersect any
 * combination of them (tag filter ∩ category filter ∩ search-term matches) and the result stays
 * correctly ordered without needing to resolve card data before pagination.
 */
/**
 * Canonical default catalog ordering key (Owner QA Amendment 3): the most recent transition into
 * `status: "ready"`, with a documented `createdAtMs` fallback for legacy designs approved before
 * `readyAt` existed. Shared by both the Portal and Studio generated orders so Studio and Portal
 * agree. Metric collections (Popular / Most Liked / Recently Requested) keep their own keys.
 */
export function resolveCardReadyOrderMillis(card: PortalCatalogCard): number {
  return card.readyAtMs ?? card.createdAtMs ?? 0;
}

export function portalCatalogBrowseOrder(cards: PortalCatalogCard[]): PortalCatalogCard[] {
  return [...cards].sort(
    (left, right) =>
      resolveCardReadyOrderMillis(right) - resolveCardReadyOrderMillis(left) ||
      right.id.localeCompare(left.id),
  );
}

/**
 * Studio's own browse order — deliberately independent of `portalCatalogBrowseOrder` (Portal's own
 * separate `createdAt`-based order for Discover/search/tag/category assets; unaffected by this
 * function). Studio's Design Library orders by the design's original creation timestamp
 * (`createdAt DESC`), with design ID `DESC` as the stable tiebreaker.
 *
 * **Owner correction (2026-07-24):** this previously sorted by `updatedAtMs`, mirroring Studio's
 * then-current Firestore-backed default sort field. The owner reported that this let unrelated
 * activity — adding a design to a print request, show allocation metrics, or editing
 * title/description/tags/category/halftone — visibly reshuffle the Design Library, since every
 * one of those writes bumps `updatedAt`. `createdAt` is immutable after a design's creation
 * (enforced by `firestore.rules`' update guard on `designs/{designId}` — no code path in the repo
 * writes to it post-creation), so ordering by it guarantees a design's position never changes
 * except when a newer design is created.
 */
export function studioCatalogReadyOrder(cards: PortalCatalogCard[]): PortalCatalogCard[] {
  return [...cards].sort(
    (left, right) =>
      resolveCardReadyOrderMillis(right) - resolveCardReadyOrderMillis(left) ||
      right.id.localeCompare(left.id),
  );
}

/**
 * Builds the compact Studio-only ready-design index: minimal per-design fields (id/tags/
 * createdAtMs) Studio's existing client-side search/filter/tag-narrowing logic needs, in Studio's
 * own `createdAt DESC, id DESC` order (the array order is the order — no separate ordering field).
 * Card fields (title, description, thumbnailPath, etc.) are deliberately omitted here; Studio
 * resolves those from the existing Portal card buckets, keyed by the same `id`, to avoid
 * duplicating card data across two generated assets.
 */
export function buildPortalCatalogStudioReadyIndex(
  cards: PortalCatalogCard[],
): Array<{
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  createdAtMs: number;
}> {
  return studioCatalogReadyOrder(cards).map((card) => ({
    id: card.id,
    title: card.title,
    ...(card.description ? { description: card.description } : {}),
    ...(card.categoryId ? { categoryId: card.categoryId } : {}),
    tags: card.tags,
    createdAtMs: card.createdAtMs ?? 0,
  }));
}

export interface PortalCatalogPathTemplates {
  searchShardPathTemplate: string;
  tagPathTemplate: string;
  categoryPathTemplate: string;
  cardBucketPathTemplate: string;
  recentPagePathTemplate: string;
  categoryPagePathTemplate: string;
  tagFacetPath: string;
  studioReadyIndexPath: string;
}

/**
 * Single source of truth for every Portal catalog path template, shared by the writer (which
 * substitutes real keys to upload each immutable asset) and the compact manifest (which stores only
 * the templates). Keeping one function prevents the writer and the manifest from drifting apart.
 * `tagFacetPath` is a fixed path (no substitution key needed) — one summary per catalog version.
 */
export function portalCatalogPathTemplates(root: string): PortalCatalogPathTemplates {
  return {
    searchShardPathTemplate: `${root}/search/shard-{shard}.json`,
    tagPathTemplate: `${root}/filters/tags/{tagId}.json`,
    categoryPathTemplate: `${root}/filters/categories/{categoryId}.json`,
    cardBucketPathTemplate: `${root}/cards/bucket-{bucket}.json`,
    recentPagePathTemplate: `${root}/recent/page-{page}.json`,
    categoryPagePathTemplate: `${root}/categories/{categoryId}/page-{page}.json`,
    tagFacetPath: `${root}/filters/tags-facet.json`,
    studioReadyIndexPath: `${root}/studio/ready-index.json`,
  };
}

/**
 * Builds the compact Portal tag-facet summary from ready-card tag membership: only tags with at
 * least one ready design, each with its ready-design count. Excludes zero-count tags entirely.
 * `tagNamesById` supplies display names from the canonical taxonomy (never invented here).
 */
export function buildPortalCatalogTagFacetSummary(
  cards: PortalCatalogCard[],
  tagNamesById: Map<string, string>,
): Array<{ id: string; name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    for (const tagId of new Set(card.tags)) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, name: tagNamesById.get(id) ?? id, count }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export interface PortalCatalogManifestInput {
  generation: number;
  contentVersion: string;
  previousContentVersion?: string;
  generatedAt: string;
  manifestPath: string;
  discoverPath: string;
  root: string;
  existingShardKeys: string[];
  recentPageCount: number;
  categoryPageCounts: Record<string, number>;
}

/**
 * Builds the compact root Portal catalog manifest: deterministic path templates and bounded count
 * metadata only, never a fully enumerated path list. A manifest that instead enumerated every
 * tag/category/shard/bucket/page path measured 130.9 KB at the real dev tag/shard/bucket scale —
 * over 4x the 32 KiB manifest budget (`snapshot-asset-budget-exceeded:generated/portal-catalog/manifest.json`).
 */
export function buildPortalCatalogManifest(input: PortalCatalogManifestInput): PortalCatalogManifest {
  const {
    searchShardPathTemplate,
    tagPathTemplate,
    categoryPathTemplate,
    cardBucketPathTemplate,
    recentPagePathTemplate,
    categoryPagePathTemplate,
    tagFacetPath,
    studioReadyIndexPath,
  } = portalCatalogPathTemplates(input.root);
  return {
    schemaVersion: PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION,
    generation: input.generation,
    contentVersion: input.contentVersion,
    ...(input.previousContentVersion ? { previousContentVersion: input.previousContentVersion } : {}),
    generatedAt: input.generatedAt,
    path: input.manifestPath,
    discoverPath: input.discoverPath,
    search: {
      strategyVersion: 1,
      shardKeyLength: 2,
      pathTemplate: searchShardPathTemplate,
      existingShardKeys: [...input.existingShardKeys].sort(),
    },
    filters: {
      tagPathTemplate,
      categoryPathTemplate,
      tagFacetPath,
    },
    studio: {
      readyIndexPath: studioReadyIndexPath,
    },
    cards: {
      bucketCount: PORTAL_CATALOG_CARD_BUCKET_COUNT,
      hashVersion: 1,
      pathTemplate: cardBucketPathTemplate,
    },
    recent: {
      pageCount: input.recentPageCount,
      pathTemplate: recentPagePathTemplate,
    },
    categories: {
      pageCounts: input.categoryPageCounts,
      pathTemplate: categoryPagePathTemplate,
    },
  };
}
