export const CATALOG_REFERENCE_SCHEMA_VERSION = 1 as const;
export const PORTAL_CATALOG_SCHEMA_VERSION = 1 as const;
// Root manifest only. Bumped independently of PORTAL_CATALOG_SCHEMA_VERSION (which still applies to
// every individual generated asset: Discover, ID assets, search shards, card buckets) because only
// the manifest's own shape changed — from fully enumerated path arrays/records to deterministic
// path templates plus counts, fixing a measured 130.9 KB manifest at the real dev tag/shard/bucket
// scale (over 4x the 32 KiB budget; see R-013 follow-up in RISK_REGISTER.md). No Portal consumer of
// schema version 1 has been deployed, so no dual-parser fallback is required.
export const PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION = 2 as const;

export interface VersionedSnapshotManifest {
  schemaVersion: number;
  generation: number;
  contentVersion: string;
  previousContentVersion?: string;
  generatedAt: string;
  path: string;
}

export interface CatalogReferenceManifest extends VersionedSnapshotManifest {
  schemaVersion: typeof CATALOG_REFERENCE_SCHEMA_VERSION;
  aiPath: string;
  clientPath: string;
}

export interface AiCatalogReferenceSnapshot {
  schemaVersion: typeof CATALOG_REFERENCE_SCHEMA_VERSION;
  contentVersion: string;
  generatedAt: string;
  categories: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    aliases: string[];
    preferredWhen: string;
    status: "approved";
  }>;
  categoryNames: string[];
  categoryIdsByName: Record<string, string>;
}

export interface ClientCatalogReferenceSnapshot {
  schemaVersion: typeof CATALOG_REFERENCE_SCHEMA_VERSION;
  contentVersion: string;
  generatedAt: string;
  categories: Array<{
    id: string;
    name: string;
    sortOrder: number;
    isActive: true;
    isCustomerVisible: true;
  }>;
  tags: Array<{
    id: string;
    name: string;
    aliases: string[];
    status: "approved";
    isCustomerVisible: true;
  }>;
}

export interface PortalCatalogCard {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  thumbnailPath: string;
  previewPath?: string;
  artworkBackgroundHex?: string;
  width: number;
  height: number;
  printWidthInches?: number;
  printHeightInches?: number;
  createdAtMs?: number;
  requestCount: number;
  lastRequestedAtMs?: number;
  lastAddedToShowAtMs?: number;
  favoriteCount: number;
  updatedAtMs?: number;
}

// Compact root manifest (v2): every path family is a deterministic template plus bounded count
// metadata instead of a fully enumerated path list. Path templates use a literal "{key}" (or
// "{page}") placeholder; callers substitute the same deterministic key/index the publisher used
// (tag ID, category ID, two-character search shard key, `portalCatalogCardBucketNumber(id)`, or a
// zero-based page index) — see `resolvePortalCatalogPath` below for the canonical substitution.
export interface PortalCatalogManifest extends VersionedSnapshotManifest {
  schemaVersion: typeof PORTAL_CATALOG_MANIFEST_SCHEMA_VERSION;
  discoverPath: string;
  search: {
    strategyVersion: 1;
    shardKeyLength: 2;
    pathTemplate: string;
    // Existing shard keys only (not full paths) — lets the consumer skip a network request for a
    // search term whose shard has no matching design, without re-introducing a large path list.
    // Bounded by the shard-key alphabet (at most a few hundred short strings).
    existingShardKeys: string[];
  };
  filters: {
    tagPathTemplate: string;
    categoryPathTemplate: string;
    // Compact, immutable, versioned facet summary (tags with >=1 ready design + counts only —
    // never the full approved-tag taxonomy). Fixes the Portal tag modal showing every approved
    // tag with no design count; see the Wave C Plan amendment for the rationale and payload budget.
    tagFacetPath: string;
  };
  studio: {
    // Single compact immutable asset covering every ready design's id/tags/createdAtMs, in
    // Studio's own `createdAt DESC, id DESC` order — lets Studio's existing client-side
    // search/filter/tag-narrowing logic (unchanged) run against a generated set instead of
    // Firestore. Ordering uses createdAt (immutable after creation) rather than updatedAt
    // specifically so print-request/show/edit activity never reshuffles the visible catalog order
    // (owner decision 2026-07-24, correcting the prior updatedAt-based ordering). See the Wave C
    // Plan amendment ("Move Studio Design Library to generated low-read catalog assets").
    readyIndexPath: string;
  };
  cards: {
    bucketCount: number;
    hashVersion: 1;
    pathTemplate: string;
  };
  cardOverrides?: {
    path: string;
    version: string;
    previousPath?: string;
  };
  recent: {
    pageCount: number;
    pathTemplate: string;
  };
  categories: {
    pageCounts: Record<string, number>;
    pathTemplate: string;
  };
}

export interface PortalCatalogCardOverrides {
  schemaVersion: typeof PORTAL_CATALOG_SCHEMA_VERSION;
  catalogVersion: string;
  overrideVersion: string;
  generatedAt: string;
  cards: PortalCatalogCard[];
}

export function resolvePortalCatalogPath(
  template: string,
  substitutions: Record<string, string | number>,
): string {
  return Object.entries(substitutions).reduce(
    (path, [key, value]) => path.split(`{${key}}`).join(String(value)),
    template,
  );
}

export interface PortalCatalogDiscoverSnapshot {
  schemaVersion: typeof PORTAL_CATALOG_SCHEMA_VERSION;
  catalogVersion: string;
  generatedAt: string;
  designs: PortalCatalogCard[];
}

export interface PortalCatalogIdAsset {
  schemaVersion: typeof PORTAL_CATALOG_SCHEMA_VERSION;
  catalogVersion: string;
  generatedAt: string;
  designIds: string[];
}

export interface PortalCatalogSearchShard extends PortalCatalogIdAsset {
  shard: string;
  terms: Record<string, string[]>;
}

/**
 * Compact Portal tag-facet summary: only tags with at least one ready design, plus each tag's
 * ready-design count. Never the full approved taxonomy (that lives in the client-safe reference
 * snapshot). Excludes zero-count tags entirely — the pre-Wave-C Portal tag modal derived this same
 * shape client-side by scanning the (then fully-hydrated) catalog; this generated asset restores
 * that behavior without full hydration.
 */
export interface PortalCatalogTagFacetSummary {
  schemaVersion: typeof PORTAL_CATALOG_SCHEMA_VERSION;
  catalogVersion: string;
  generatedAt: string;
  tags: Array<{ id: string; name: string; count: number }>;
}

export interface PortalCatalogCardBucket {
  schemaVersion: typeof PORTAL_CATALOG_SCHEMA_VERSION;
  catalogVersion: string;
  generatedAt: string;
  cards: PortalCatalogCard[];
}

/**
 * Studio-only ready-design index: per-design fields Studio's existing client-side
 * search/category/tag/halftone/dynamic-narrowing logic needs to filter the *entire* ready catalog
 * without resolving full card data (thumbnailPath/previewPath/dimensions/etc. stay in the existing
 * Portal card buckets, keyed by the same `id` — only fetched for the currently visible page).
 * `title`/`description` are included here (not just in card buckets) specifically so Studio's
 * exact substring search semantics (`filterDesignsBySearch`: id/title/description/tags) can run
 * catalog-wide without fetching every card bucket up front just to search titles — the one
 * unavoidable difference from Portal's approach, since Studio's search has no token/shard index
 * and must not be silently replaced with one. Array order is the canonical Studio browse order
 * (`createdAt DESC`, design ID `DESC` tiebreaker) — the array order itself, no separate field.
 *
 * `createdAtMs` (owner decision, 2026-07-24): the original design-creation timestamp, immutable
 * after creation (enforced by `firestore.rules`' update guard on `designs/{designId}`) — chosen
 * specifically because it never changes from print-request activity, show allocations, edits, or
 * any other operational write, unlike `updatedAt` (which every such write bumps and previously
 * caused Studio's visible catalog order to reshuffle on unrelated activity — the exact owner-
 * reported regression this field replaces). Do not reintroduce `updatedAtMs` as the ordering field
 * here; Portal's own generated assets keep their separate, unaffected `createdAt`-based order
 * (`portalCatalogBrowseOrder`) and are not changed by this.
 */
export interface PortalCatalogStudioReadyIndex {
  schemaVersion: typeof PORTAL_CATALOG_SCHEMA_VERSION;
  catalogVersion: string;
  generatedAt: string;
  designs: Array<{
    id: string;
    title: string;
    description?: string;
    categoryId?: string;
    tags: string[];
    createdAtMs: number;
  }>;
}

export const PORTAL_CATALOG_CARD_BUCKET_COUNT = 128;

export function portalCatalogCardBucketNumber(
  designId: string,
  bucketCount = PORTAL_CATALOG_CARD_BUCKET_COUNT,
): number {
  let hash = 2166136261;
  for (let index = 0; index < designId.length; index += 1) {
    hash ^= designId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % bucketCount;
}

export interface SnapshotPublicationState {
  requestedGeneration: number;
  publishedGeneration: number;
  leaseEpoch: number;
  leaseOwner: string | null;
  leaseExpiresAt: unknown;
  status: "idle" | "dirty" | "publishing" | "failed";
  wakeGeneration: number;
  lastAttemptAt: unknown;
  lastPublishedAt: unknown;
  lastErrorCode: string | null;
  lastErrorAt: unknown;
}
