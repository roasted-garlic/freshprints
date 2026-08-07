import { randomUUID } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  CATALOG_REFERENCE_SCHEMA_VERSION,
  PORTAL_CATALOG_SCHEMA_VERSION,
  portalCatalogCardBucketNumber,
  resolvePortalCatalogPath,
  type CatalogReferenceManifest,
  type PortalCatalogCard,
  type PortalCatalogCardOverrides,
  type PortalCatalogCardBucket,
  type PortalCatalogDiscoverSnapshot,
  type PortalCatalogIdAsset,
  type PortalCatalogManifest,
  type PortalCatalogSearchShard,
  type PortalCatalogStudioReadyIndex,
  type PortalCatalogTagFacetSummary,
} from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import { adminDb, adminStorage } from "../lib/admin";
import { loadCallerProfile } from "../lib/caller";
import { failedPrecondition, permissionDenied, unauthenticated } from "../lib/errors";
import {
  buildPortalCatalogManifest,
  buildPortalCatalogStudioReadyIndex,
  buildPortalCatalogTagFacetSummary,
  buildTaxonomySnapshots,
  contentVersion,
  mapPortalCatalogCard,
  portalCatalogBrowseOrder,
  portalCatalogPathTemplates,
  resolveCardReadyOrderMillis,
  stableJson,
  type TaxonomySource,
} from "./snapshotBuilders";
import {
  classifyPortalCatalogDesignChange,
  hasMatchingPortalCardOverride,
  isNonReadyIndexFilterChurn,
  mergePortalCardOverrides,
} from "./portalCatalogChangeClassifier";
import {
  isPortalPublicationEligible,
  LEASE_BUSY_RETRY_DELAY_MS,
  PORTAL_PUBLICATION_PASS_LIMIT,
  PUBLICATION_PASS_LIMIT,
  publicationNeedsCatchUp,
  resolveNextEligiblePublishAtMs,
  shouldRetryPublicationPass,
  TRANSIENT_STORAGE_RETRY_BASE_DELAY_MS,
  withTransientStorageRetry,
} from "./publicationRecovery";
import {
  canWaitAndPublishWithinBudget,
  decidePortalDeferredWakeAction,
  PORTAL_CLAIM_DURATION_MS,
  PORTAL_MIN_PUBLICATION_INTERVAL_MS,
  PORTAL_QUIET_MS,
  PUBLISH_ATTEMPT_MARGIN_MS,
} from "./portalPublicationRateGuard";

const COORDINATION_COLLECTION = "snapshotPublicationState";
const PORTAL_COORDINATION_DOC = "portal-catalog";
/** Publication lease — sole full-scan mutex across instances. */
export const LEASE_MS = 10 * 60_000;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const IMMUTABLE_CACHE = "public,max-age=31536000,immutable";
const MANIFEST_CACHE = "public,max-age=30,must-revalidate";
/** Catalog-reference quiet window (unchanged by Amendment 9 P4). */
const DEBOUNCE_MS = 15_000;
// Re-export portal constants for existing test imports / attribution.
export {
  PORTAL_CLAIM_DURATION_MS,
  PORTAL_MIN_PUBLICATION_INTERVAL_MS,
  PORTAL_QUIET_MS,
  PORTAL_TRIGGER_TIMEOUT_MS,
  PUBLISH_ATTEMPT_MARGIN_MS,
} from "./portalPublicationRateGuard";
export { ESTIMATED_PORTAL_PUBLISH_MS } from "./portalPublicationRateGuard";
const KIB = 1024;
const TARGETED_MANIFEST_RETRY_LIMIT = 3;

export type StorageOperation = "download" | "write" | "metadata";

export interface TargetedPublicationAccounting {
  manifestReads: number;
  manifestWrites: number;
  overrideAssetReads: number;
  transactionAttempts: number;
  generationPreconditionRetries: number;
  storageDownloadOperations: number;
  storageWriteOperations: number;
  storageMetadataOperations: number;
}

export interface PortalCardOverrideStorage {
  readManifest: (
    path: string,
    onStorageOperation: (operation: StorageOperation) => void,
  ) => Promise<{ generationMatch: number; value: PortalCatalogManifest | null }>;
  readOverrides: (
    path: string,
    onStorageOperation: (operation: StorageOperation) => void,
  ) => Promise<PortalCatalogCardOverrides>;
  writeJson: (
    path: string,
    value: unknown,
    cacheControl: string,
    maxBytes: number,
    ifGenerationMatch: number | undefined,
    onStorageOperation: (operation: StorageOperation) => void,
  ) => Promise<void>;
}

// Public/client-safe and Portal catalog asset budgets. Unchanged by the AI-private budget below;
// these govern generated/catalog-reference/manifest.json, generated/catalog-reference/client/**,
// and every generated/portal-catalog/** asset (manifests, Discover, filters, search shards, card
// buckets, browse pages) via each saveJson call's own explicit maxBytes argument.
export const PUBLIC_ASSET_MAX_BYTES = 256 * KIB;

// Private AI reference snapshot (generated/catalog-reference/ai/**) budget only. This asset is
// server-only (never client-readable; see storage.rules) and is loaded through a bounded
// module-level Functions cache, so its ceiling is independent of every public/client/Portal budget
// above. Owner-approved 2026-07-23 after the real fresh-prints-dev taxonomy (~1,122 approved tags,
// ~284 KB uncompressed) exceeded the original 256 KiB ceiling; see R-013 in RISK_REGISTER.md and
// ADR-FP-120 in DECISIONS.md. Do not raise PUBLIC_ASSET_MAX_BYTES or any Portal budget to match this.
export const AI_CATALOG_REFERENCE_MAX_BYTES = 512 * KIB;
export const AI_CATALOG_REFERENCE_WARN_RATIO = 0.8;
export const AI_CATALOG_REFERENCE_WARN_BYTES = Math.floor(
  AI_CATALOG_REFERENCE_MAX_BYTES * AI_CATALOG_REFERENCE_WARN_RATIO,
);

async function saveJson(
  path: string,
  value: unknown,
  cacheControl: string,
  maxBytes = PUBLIC_ASSET_MAX_BYTES,
  ifGenerationMatch?: number,
  onStorageOperation?: (operation: StorageOperation) => void,
): Promise<void> {
  const body = JSON.stringify(value);
  if (Buffer.byteLength(body, "utf8") > maxBytes) {
    throw new Error(`snapshot-asset-budget-exceeded:${path}`);
  }
  await withTransientStorageRetry(async () => {
    onStorageOperation?.("write");
    await adminStorage.bucket().file(path).save(body, {
      resumable: false,
      metadata: { contentType: JSON_CONTENT_TYPE, cacheControl },
      ...(ifGenerationMatch !== undefined
        ? { preconditionOpts: { ifGenerationMatch } }
        : {}),
    });
    onStorageOperation?.("metadata");
    const [metadata] = await adminStorage.bucket().file(path).getMetadata();
    if (metadata.contentType !== JSON_CONTENT_TYPE || Number(metadata.size) !== Buffer.byteLength(body)) {
      throw new Error(`snapshot-asset-metadata-verification-failed:${path}`);
    }
  });
}

export function warnIfApproachingAiReferenceBudget(
  path: string,
  bytes: number,
  contentVersion: string,
  tagCount: number,
  categoryCount: number,
): boolean {
  if (bytes < AI_CATALOG_REFERENCE_WARN_BYTES) return false;
  logger.warn("catalog-reference-ai-snapshot-approaching-budget", {
    path,
    bytes,
    maxBytes: AI_CATALOG_REFERENCE_MAX_BYTES,
    percentUsed: Math.round((bytes / AI_CATALOG_REFERENCE_MAX_BYTES) * 1000) / 10,
    contentVersion,
    tagCount,
    categoryCount,
  });
  return true;
}

async function existingManifest<T extends { contentVersion: string }>(
  path: string,
  onStorageOperation?: (operation: StorageOperation) => void,
): Promise<{ generationMatch: number; value: T | null }> {
  const file = adminStorage.bucket().file(path);
  try {
    return await withTransientStorageRetry(async () => {
      onStorageOperation?.("download");
      onStorageOperation?.("metadata");
      const [[bytes], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
      return {
        generationMatch: Number(metadata.generation),
        value: JSON.parse(bytes.toString("utf8")) as T,
      };
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 404) return { generationMatch: 0, value: null };
    throw error;
  }
}

async function loadJsonAsset<T>(
  path: string,
  onStorageOperation?: (operation: StorageOperation) => void,
): Promise<T> {
  return withTransientStorageRetry(async () => {
    onStorageOperation?.("download");
    const [bytes] = await adminStorage.bucket().file(path).download();
    return JSON.parse(bytes.toString("utf8")) as T;
  });
}

function isStoragePreconditionFailure(error: unknown): boolean {
  const code = (error as { code?: number }).code;
  return code === 412;
}

export async function publishPortalCardOverride(
  card: PortalCatalogCard,
  generatedAt = new Date().toISOString(),
  storage: PortalCardOverrideStorage = {
    readManifest: existingManifest,
    readOverrides: loadJsonAsset,
    writeJson: saveJson,
  },
): Promise<{
  contentVersion: string;
  overrideVersion: string;
  outcome: "success" | "duplicate-skipped";
  accounting: Readonly<TargetedPublicationAccounting>;
}> {
  const startedAtMs = Date.now();
  const manifestPath = "generated/portal-catalog/manifest.json";
  const accounting: TargetedPublicationAccounting = {
    manifestReads: 0,
    manifestWrites: 0,
    overrideAssetReads: 0,
    transactionAttempts: 0,
    generationPreconditionRetries: 0,
    storageDownloadOperations: 0,
    storageWriteOperations: 0,
    storageMetadataOperations: 0,
  };
  const recordStorageOperation = (operation: StorageOperation): void => {
    if (operation === "download") accounting.storageDownloadOperations += 1;
    if (operation === "write") accounting.storageWriteOperations += 1;
    if (operation === "metadata") accounting.storageMetadataOperations += 1;
  };
  const logAccounting = (
    outcome: "success" | "failure" | "duplicate-skipped",
    pass: number,
    failureCode?: string,
  ): void => {
    if (process.env.GCLOUD_PROJECT !== "fresh-prints-dev") return;
    const fields = {
      mode: "targeted",
      classification: "card-only",
      publicationReason: "design-write",
      pass,
      readyDesignsRead: 0,
      categoriesRead: 0,
      tagsRead: 0,
      coordinationDocumentsRead: 0,
      coordinationDocumentsWritten: 0,
      firestoreReadsTotal: 0,
      ...accounting,
      durationMs: Date.now() - startedAtMs,
      outcome,
      ...(failureCode ? { failureCode } : {}),
    };
    if (outcome === "failure") logger.error("portal-catalog-publication-accounting", fields);
    else logger.info("portal-catalog-publication-accounting", fields);
  };
  for (let pass = 1; pass <= TARGETED_MANIFEST_RETRY_LIMIT; pass += 1) {
    accounting.manifestReads += 1;
    const prior = await storage.readManifest(
      manifestPath,
      recordStorageOperation,
    );
    if (!prior.value) throw new Error("portal-catalog-manifest-missing");
    let priorCards: PortalCatalogCard[] = [];
    if (prior.value.cardOverrides) {
      accounting.overrideAssetReads += 1;
      priorCards = (await storage.readOverrides(
        prior.value.cardOverrides.path,
        recordStorageOperation,
      )).cards;
    }
    if (prior.value.cardOverrides && hasMatchingPortalCardOverride(priorCards, card)) {
      logAccounting("duplicate-skipped", pass);
      return {
        contentVersion: prior.value.contentVersion,
        overrideVersion: prior.value.cardOverrides.version,
        outcome: "duplicate-skipped",
        accounting,
      };
    }
    const cards = mergePortalCardOverrides(priorCards, card);
    const overrideVersion = contentVersion(prior.value.generation, cards);
    const overridePath = `generated/portal-catalog/card-overrides/v${overrideVersion}.json`;
    const asset: PortalCatalogCardOverrides = {
      schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
      catalogVersion: prior.value.contentVersion,
      overrideVersion,
      generatedAt,
      cards,
    };
    await storage.writeJson(
      overridePath,
      asset,
      IMMUTABLE_CACHE,
      512 * KIB,
      undefined,
      recordStorageOperation,
    );
    const nextManifest: PortalCatalogManifest = {
      ...prior.value,
      generatedAt,
      cardOverrides: {
        path: overridePath,
        version: overrideVersion,
        ...(prior.value.cardOverrides?.path
          ? { previousPath: prior.value.cardOverrides.path }
          : {}),
      },
    };
    try {
      accounting.manifestWrites += 1;
      await storage.writeJson(
        manifestPath,
        nextManifest,
        MANIFEST_CACHE,
        32 * KIB,
        prior.generationMatch,
        recordStorageOperation,
      );
      logAccounting("success", pass);
      return {
        contentVersion: prior.value.contentVersion,
        overrideVersion,
        outcome: "success",
        accounting,
      };
    } catch (error) {
      if (isStoragePreconditionFailure(error) && pass < TARGETED_MANIFEST_RETRY_LIMIT) {
        accounting.generationPreconditionRetries += 1;
        continue;
      }
      logAccounting(
        "failure",
        pass,
        isStoragePreconditionFailure(error)
          ? "manifest-precondition-failed"
          : "targeted-publication-failed",
      );
      throw error;
    }
  }
  throw new Error("portal-card-override-retry-exhausted");
}

async function loadTaxonomySource(): Promise<TaxonomySource> {
  const [categoriesSnapshot, tagsSnapshot] = await Promise.all([
    adminDb.collection("categories").where("isActive", "==", true).get(),
    adminDb.collection("tags").where("status", "==", "approved").get(),
  ]);
  const categories: TaxonomySource["categories"] = [];
  const tags: CatalogTag[] = [];
  categoriesSnapshot.forEach((document) => {
    const data = document.data();
    if (typeof data.name !== "string" || !data.name.trim()) return;
    categories.push({
      id: document.id,
      name: data.name.trim(),
      ...(typeof data.description === "string" && data.description.trim()
        ? { description: data.description.trim() }
        : {}),
      sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    });
  });
  tagsSnapshot.forEach((document) => {
    const data = document.data();
    if (
      typeof data.name !== "string" ||
      !Array.isArray(data.aliases) ||
      typeof data.preferredWhen !== "string"
    ) return;
    tags.push({
      id: document.id,
      name: data.name,
      aliases: data.aliases.filter((alias): alias is string => typeof alias === "string"),
      preferredWhen: data.preferredWhen,
      status: "approved",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
      updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : "",
    });
  });
  return { categories, tags };
}

async function publishReference(generation: number, generatedAt: string): Promise<string> {
  const manifestPath = "generated/catalog-reference/manifest.json";
  const prior = await existingManifest<CatalogReferenceManifest>(manifestPath);
  const source = await loadTaxonomySource();
  const snapshots = buildTaxonomySnapshots(source, generation, generatedAt);
  const version = snapshots.ai.contentVersion;
  const aiPath = `generated/catalog-reference/ai/v${version}.json`;
  const clientPath = `generated/catalog-reference/client/v${version}.json`;
  const aiBody = JSON.stringify(snapshots.ai);
  warnIfApproachingAiReferenceBudget(
    aiPath,
    Buffer.byteLength(aiBody, "utf8"),
    version,
    source.tags.length,
    source.categories.length,
  );
  await Promise.all([
    saveJson(
      aiPath,
      snapshots.ai,
      "private,max-age=31536000,immutable",
      AI_CATALOG_REFERENCE_MAX_BYTES,
    ),
    saveJson(clientPath, snapshots.client, IMMUTABLE_CACHE, PUBLIC_ASSET_MAX_BYTES),
  ]);
  const manifest: CatalogReferenceManifest = {
    schemaVersion: CATALOG_REFERENCE_SCHEMA_VERSION,
    generation,
    contentVersion: version,
    ...(prior.value?.contentVersion
      ? { previousContentVersion: prior.value.contentVersion }
      : {}),
    generatedAt,
    path: manifestPath,
    aiPath,
    clientPath,
  };
  await saveJson(
    manifest.path,
    manifest,
    MANIFEST_CACHE,
    32 * KIB,
    prior.generationMatch,
  );
  return version;
}

function searchTerms(card: PortalCatalogCard, taxonomy: TaxonomySource): string[] {
  const categoryName = taxonomy.categories.find(({ id }) => id === card.categoryId)?.name ?? "";
  const tagWords = card.tags.flatMap((tagId) => {
    const tag = taxonomy.tags.find(
      ({ id, name }) => id === tagId || name.toLowerCase() === tagId.toLowerCase(),
    );
    return tag ? [tag.name, ...tag.aliases] : [tagId];
  });
  const raw = [card.title, card.description ?? "", categoryName, ...tagWords]
    .join(" ")
    .toLowerCase();
  const substrings = new Set<string>();
  for (const word of raw.split(/[^a-z0-9]+/).filter(Boolean)) {
    const bounded = word.slice(0, 32);
    for (let start = 0; start < bounded.length; start += 1) {
      for (let end = start + 1; end <= bounded.length; end += 1) {
        substrings.add(bounded.slice(start, end));
      }
    }
  }
  return [...substrings];
}

interface PortalPublicationAccounting {
  readyDesignsRead: number;
  categoriesRead: number;
  tagsRead: number;
}

async function publishPortal(
  generation: number,
  generatedAt: string,
): Promise<{ contentVersion: string; accounting: PortalPublicationAccounting }> {
  const manifestPath = "generated/portal-catalog/manifest.json";
  const prior = await existingManifest<PortalCatalogManifest>(manifestPath);
  const [snapshot, taxonomy] = await Promise.all([
    adminDb.collection("designs").where("status", "==", "ready").get(),
    loadTaxonomySource(),
  ]);
  const cards = snapshot.docs
    .map((document) => mapPortalCatalogCard(document.id, document.data()))
    .filter((card): card is PortalCatalogCard => card !== null);
  const version = contentVersion(generation, cards);
  const root = `generated/portal-catalog/v${version}`;
  const ranked = [...cards].sort(
    (left, right) =>
      (right.requestCount + right.favoriteCount) - (left.requestCount + left.favoriteCount) ||
      (right.createdAtMs ?? 0) - (left.createdAtMs ?? 0),
  );
  const discoverPath = `${root}/discover.json`;
  const discover: PortalCatalogDiscoverSnapshot = {
    schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
    catalogVersion: version,
    generatedAt,
    designs: ranked.slice(0, 160),
  };
  const tagNamesById = new Map(taxonomy.tags.map((tag) => [tag.id, tag.name]));
  const browseOrder = portalCatalogBrowseOrder(cards);
  const tagAssets = new Map<string, string[]>();
  const categoryAssets = new Map<string, string[]>();
  const shardTerms = new Map<string, Record<string, string[]>>();
  for (const card of browseOrder) {
    if (card.categoryId) {
      categoryAssets.set(card.categoryId, [...(categoryAssets.get(card.categoryId) ?? []), card.id]);
    }
    for (const tag of card.tags) {
      tagAssets.set(tag, [...(tagAssets.get(tag) ?? []), card.id]);
    }
    for (const term of searchTerms(card, taxonomy)) {
      const shard = /^[a-z0-9]/.test(term)
        ? `${term[0]}${term[1] ?? "_"}`
        : "__";
      const terms = shardTerms.get(shard) ?? {};
      terms[term] = [...(terms[term] ?? []), card.id];
      shardTerms.set(shard, terms);
    }
  }
  const page = <T>(values: T[], size: number): T[][] => {
    const pages: T[][] = [];
    for (let index = 0; index < values.length; index += size) {
      pages.push(values.slice(index, index + size));
    }
    return pages;
  };
  const cardBuckets = new Map<number, PortalCatalogCard[]>();
  for (const card of cards) {
    const bucket = portalCatalogCardBucketNumber(card.id);
    cardBuckets.set(bucket, [...(cardBuckets.get(bucket) ?? []), card]);
  }
  const recentPages = page(
    // Owner QA Amendment 3: default browse pages order by the most recent transition into
    // `ready` (readyAtMs), falling back to createdAtMs for legacy designs. The metric-ranked
    // `ranked`/discover collection above is deliberately unchanged.
    [...cards].sort(
      (left, right) => resolveCardReadyOrderMillis(right) - resolveCardReadyOrderMillis(left),
    ),
    40,
  );
  const categoryPages = new Map<string, PortalCatalogCard[][]>();
  for (const card of cards) {
    if (!card.categoryId) continue;
    const categoryCards = categoryPages.get(card.categoryId) ?? [[]];
    let current = categoryCards[categoryCards.length - 1]!;
    if (current.length >= 40) {
      current = [];
      categoryCards.push(current);
    }
    current.push(card);
    categoryPages.set(card.categoryId, categoryCards);
  }
  // Real per-asset Storage paths for the writes below, derived from the same templates the
  // compact manifest stores (see buildPortalCatalogManifest) — never a fully enumerated path list.
  // A manifest that instead enumerated every tag/category/shard/bucket/page path measured 130.9 KB
  // at the real dev tag/shard/bucket scale, over 4x the 32 KiB manifest budget.
  const templates = portalCatalogPathTemplates(root);
  const tagFacet: PortalCatalogTagFacetSummary = {
    schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
    catalogVersion: version,
    generatedAt,
    tags: buildPortalCatalogTagFacetSummary(cards, tagNamesById),
  };
  const studioReadyIndex: PortalCatalogStudioReadyIndex = {
    schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
    catalogVersion: version,
    generatedAt,
    designs: buildPortalCatalogStudioReadyIndex(cards),
  };
  await Promise.all([
    saveJson(discoverPath, discover, IMMUTABLE_CACHE, 512 * KIB),
    saveJson(templates.tagFacetPath, tagFacet, IMMUTABLE_CACHE, 256 * KIB),
    saveJson(templates.studioReadyIndexPath, studioReadyIndex, IMMUTABLE_CACHE, 512 * KIB),
    ...[...tagAssets].map(([tag, designIds]) => {
      const asset: PortalCatalogIdAsset = {
        schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
        catalogVersion: version,
        generatedAt,
        designIds,
      };
      return saveJson(
        resolvePortalCatalogPath(templates.tagPathTemplate, { tagId: tag }),
        asset,
        IMMUTABLE_CACHE,
        256 * KIB,
      );
    }),
    ...[...categoryAssets].map(([categoryId, designIds]) => {
      const asset: PortalCatalogIdAsset = {
        schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
        catalogVersion: version,
        generatedAt,
        designIds,
      };
      return saveJson(
        resolvePortalCatalogPath(templates.categoryPathTemplate, { categoryId }),
        asset,
        IMMUTABLE_CACHE,
        256 * KIB,
      );
    }),
    ...[...shardTerms].map(([shard, terms]) => {
      const asset: PortalCatalogSearchShard = {
        schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
        catalogVersion: version,
        generatedAt,
        shard,
        terms,
        designIds: [...new Set(Object.values(terms).flat())],
      };
      return saveJson(
        resolvePortalCatalogPath(templates.searchShardPathTemplate, { shard }),
        asset,
        IMMUTABLE_CACHE,
        256 * KIB,
      );
    }),
    ...[...cardBuckets].map(([bucket, bucketCards]) => {
      const asset: PortalCatalogCardBucket = {
        schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
        catalogVersion: version,
        generatedAt,
        cards: bucketCards,
      };
      return saveJson(
        resolvePortalCatalogPath(templates.cardBucketPathTemplate, { bucket }),
        asset,
        IMMUTABLE_CACHE,
        32 * KIB,
      );
    }),
    ...recentPages.map((designs, index) => saveJson(
      resolvePortalCatalogPath(templates.recentPagePathTemplate, { page: index }),
      {
        schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
        catalogVersion: version,
        generatedAt,
        designs,
      },
      IMMUTABLE_CACHE,
      2 * 1024 * KIB,
    )),
    ...[...categoryPages].flatMap(([categoryId, pages]) =>
      pages.map((designs, index) => saveJson(
        resolvePortalCatalogPath(templates.categoryPagePathTemplate, { categoryId, page: index }),
        {
          schemaVersion: PORTAL_CATALOG_SCHEMA_VERSION,
          catalogVersion: version,
          generatedAt,
          designs,
        },
        IMMUTABLE_CACHE,
        2 * 1024 * KIB,
      )),
    ),
  ]);
  const manifest: PortalCatalogManifest = buildPortalCatalogManifest({
    generation,
    contentVersion: version,
    ...(prior.value?.contentVersion
      ? { previousContentVersion: prior.value.contentVersion }
      : {}),
    generatedAt,
    manifestPath,
    discoverPath,
    root,
    existingShardKeys: [...shardTerms.keys()],
    recentPageCount: recentPages.length,
    categoryPageCounts: Object.fromEntries(
      [...categoryPages].map(([categoryId, pages]) => [categoryId, pages.length]),
    ),
  });
  await saveJson(
    manifest.path,
    manifest,
    MANIFEST_CACHE,
    32 * KIB,
    prior.generationMatch,
  );
  return {
    contentVersion: version,
    accounting: {
      readyDesignsRead: snapshot.size,
      categoriesRead: taxonomy.categories.length,
      tagsRead: taxonomy.tags.length,
    },
  };
}

type SnapshotKind = "catalog-reference" | "portal-catalog";

async function markDirty(kind: SnapshotKind): Promise<void> {
  await adminDb.collection(COORDINATION_COLLECTION).doc(kind).set({
    requestedGeneration: FieldValue.increment(1),
    wakeGeneration: FieldValue.increment(1),
    status: "dirty",
  }, { merge: true });
}

/**
 * Decides, from the coordination document's current debounce-claim fields,
 * whether the calling invocation should become the one that sleeps
 * DEBOUNCE_MS and then publishes ("waiter"), or should simply mark dirty
 * and return immediately, trusting an already-active waiter (or the
 * existing lease/catch-up-loop generation check) to cover its dirty mark.
 *
 * Cloud Functions gives no cross-invocation shared memory, so a plain
 * per-invocation setTimeout previously meant every qualifying trigger
 * invocation in a burst independently slept and raced for the lease
 * (post-launch-catalog-and-processing-stability, Workstream C). This claim
 * is a persisted (Firestore-backed), not process-local, coordination
 * signal: exactly one invocation per debounce window becomes the waiter;
 * the rest coalesce into its eventual publish.
 *
 * Deliberately not a strict mutual-exclusion guarantee — the existing
 * transactional publish lease in publishKind() remains the sole
 * concurrency boundary for the actual publish/scan. This claim only
 * reduces how many invocations redundantly sleep and attempt to publish; a
 * missed or double claim (e.g. a crashed waiter, a clock skew edge) is
 * safe, just occasionally less efficient, never incorrect.
 *
 * The claim's own expiry (set by the caller to cover both the sleep and a
 * publish-attempt margin, not just the sleep) is deliberately longer than
 * DEBOUNCE_MS itself — a claim that expired the moment the sleep ended
 * would let a second invocation become a second waiter while the first
 * waiter's runPublicationCatchUpLoop() is still in flight, which is safe
 * (the lease still prevents a concurrent scan) but defeats the point of
 * coalescing.
 */
export function shouldBecomeDebounceWaiter(
  data: { debounceOwner?: unknown; debounceExpiresAt?: unknown },
  nowMs: number,
): boolean {
  const claimExpiresAt =
    data.debounceExpiresAt instanceof Timestamp ? data.debounceExpiresAt.toMillis() : 0;
  const hasOwner = typeof data.debounceOwner === "string" && data.debounceOwner.length > 0;
  return !(hasOwner && claimExpiresAt > nowMs);
}

/**
 * Marks the coordination doc dirty and, in the same transaction, either
 * claims the debounce-waiter role (if no other invocation currently holds
 * an unexpired claim) or joins an already-claimed window. Returns whether
 * this invocation must become the waiter.
 *
 * claimDurationMs should cover the full sleep-then-publish window (sleep +
 * a publish-attempt margin), not just the debounce sleep itself — see
 * shouldBecomeDebounceWaiter's doc comment.
 */
async function markDirtyAndClaimDebounceWaiter(
  kind: SnapshotKind,
  claimDurationMs: number,
): Promise<{ isWaiter: boolean; waiterOwner: string }> {
  const reference = adminDb.collection(COORDINATION_COLLECTION).doc(kind);
  const owner = randomUUID();
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const data = snapshot.data() ?? {};
    const now = Date.now();
    const isWaiter = shouldBecomeDebounceWaiter(data, now);
    transaction.set(reference, {
      requestedGeneration: FieldValue.increment(1),
      wakeGeneration: FieldValue.increment(1),
      status: "dirty",
      ...(isWaiter
        ? { debounceOwner: owner, debounceExpiresAt: Timestamp.fromMillis(now + claimDurationMs) }
        : {}),
    }, { merge: true });
    return { isWaiter, waiterOwner: owner };
  });
}

/**
 * Clears the debounce claim only if it still belongs to `owner` — so a
 * waiter that finished publishing does not clear a newer claim a
 * subsequent invocation has since taken over (e.g. after this waiter's own
 * claim expired and a later invocation reclaimed the role before this
 * invocation's cleanup ran).
 */
async function releaseDebounceClaimIfOwned(kind: SnapshotKind, owner: string): Promise<void> {
  const reference = adminDb.collection(COORDINATION_COLLECTION).doc(kind);
  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const data = snapshot.data() ?? {};
    if (data.debounceOwner !== owner) return;
    transaction.set(reference, {
      debounceOwner: null,
      debounceExpiresAt: null,
    }, { merge: true });
  });
}

async function publishKind(
  kind: SnapshotKind,
  options?: {
    /**
     * When true (owner/admin callables only), skip the portal min-interval eligibility gate.
     * Automatic design/W2 paths leave this undefined/false.
     */
    bypassMinInterval?: boolean;
  },
): Promise<{
  contentVersion: string;
  generation: number;
  accounting?: PortalPublicationAccounting;
}> {
  const owner = randomUUID();
  const reference = adminDb.collection(COORDINATION_COLLECTION).doc(kind);
  const bypassMinInterval = options?.bypassMinInterval === true;
  const generation = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const data = snapshot.data() ?? {};
    const now = Date.now();
    const leaseExpiresAt =
      data.leaseExpiresAt instanceof Timestamp ? data.leaseExpiresAt.toMillis() : 0;
    if (data.status === "publishing" && leaseExpiresAt > now) {
      throw new Error("snapshot-publication-lease-active");
    }
    if (
      kind === "portal-catalog" &&
      !bypassMinInterval &&
      !isPortalPublicationEligible(data, now)
    ) {
      throw new Error("snapshot-publication-not-yet-eligible");
    }
    const requested = typeof data.requestedGeneration === "number"
      ? data.requestedGeneration
      : 0;
    transaction.set(reference, {
      requestedGeneration: requested,
      publishedGeneration: typeof data.publishedGeneration === "number"
        ? data.publishedGeneration
        : 0,
      leaseEpoch: (typeof data.leaseEpoch === "number" ? data.leaseEpoch : 0) + 1,
      leaseOwner: owner,
      leaseExpiresAt: Timestamp.fromMillis(now + LEASE_MS),
      status: "publishing",
      lastAttemptAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return requested;
  });
  try {
    const generatedAt = new Date().toISOString();
    const publishedAtMs = Date.now();
    const published = kind === "catalog-reference"
      ? { contentVersion: await publishReference(generation, generatedAt) }
      : await publishPortal(generation, generatedAt);
    // Amendment 9 P4: nextEligiblePublishAt advances in the same authoritative write as
    // publishedGeneration so automatic paths cannot mark published without a rate-limit stamp.
    await reference.set({
      publishedGeneration: generation,
      leaseOwner: null,
      leaseExpiresAt: null,
      status: "idle",
      lastPublishedAt: FieldValue.serverTimestamp(),
      lastErrorCode: null,
      lastErrorAt: null,
      ...(kind === "portal-catalog"
        ? {
          nextEligiblePublishAt: Timestamp.fromMillis(
            publishedAtMs + PORTAL_MIN_PUBLICATION_INTERVAL_MS,
          ),
        }
        : {}),
    }, { merge: true });
    return { ...published, generation };
  } catch (error) {
    await reference.set({
      leaseOwner: null,
      leaseExpiresAt: null,
      status: "failed",
      lastErrorCode: error instanceof Error ? error.name : "unknown",
      lastErrorAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    throw error;
  }
}

/**
 * Marks the coordination doc dirty for `kind` and coalesces concurrent
 * scheduling attempts into a single debounce-and-publish pass.
 *
 * Catalog-reference: legacy quiet (DEBOUNCE_MS) + catch-up up to PUBLICATION_PASS_LIMIT.
 * Portal-catalog (Amendment 9 P4): PORTAL_QUIET_MS + eligibility gate + passLimit=1 + W2 wake.
 */
async function markAndPublishAfterDebounce(
  kind: SnapshotKind,
  schedulingReason: string,
): Promise<void> {
  const startedAtMs = Date.now();
  const claimDurationMs =
    kind === "portal-catalog"
      ? PORTAL_CLAIM_DURATION_MS
      : DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS;
  const quietMs = kind === "portal-catalog" ? PORTAL_QUIET_MS : DEBOUNCE_MS;

  const { isWaiter, waiterOwner } = await markDirtyAndClaimDebounceWaiter(
    kind,
    claimDurationMs,
  );

  logger.info("catalog-snapshot-scheduling", {
    kind,
    schedulingReason,
    outcome: isWaiter ? "claimed-debounce-waiter" : "joined-existing-debounce-window",
  });

  if (!isWaiter) {
    return;
  }

  await new Promise<void>((resolve) => setTimeout(resolve, quietMs));

  // Must not request W2 while this invocation still holds the debounce claim —
  // W2 would join the claim and exit, then claim release strands remaining dirty.
  let needsDeferredWake = false;
  try {
    if (kind === "portal-catalog") {
      const result = await runPortalAutomaticPublicationPass({
        startedAtMs,
        schedulingReason,
        source: "design-trigger",
      });
      needsDeferredWake = result.needsDeferredWake;
    } else {
      await runPublicationCatchUpLoop({
        publish: () => publishKind(kind),
        readRequestedGeneration: async () => {
          const latest = await adminDb.collection(COORDINATION_COLLECTION).doc(kind).get();
          return latest.data()?.requestedGeneration;
        },
        onSuccess: async (published, pass) => {
          logger.info("catalog-snapshot-publication", {
            kind,
            schedulingReason,
            pass,
            durationMs: Date.now() - startedAtMs,
            outcome: "success",
            generation: published.generation,
          });
        },
        onFailure: async (_error, pass, retryKind) => {
          logger.warn("catalog-snapshot-publication", {
            kind,
            schedulingReason,
            pass,
            durationMs: Date.now() - startedAtMs,
            outcome: retryKind === "fatal" ? "failure" : "contention",
            failureCode:
              retryKind === "lease-busy"
                ? "lease-active-retrying"
                : retryKind === "transient"
                  ? "transient-storage-retrying"
                  : "full-publication-failed",
          });
        },
      });
    }
  } finally {
    await releaseDebounceClaimIfOwned(kind, waiterOwner);
  }

  if (needsDeferredWake) {
    await requestPortalDeferredWake("deferred-wake-requested");
  }
}

/**
 * Request a W2 deferred wake without bumping requestedGeneration.
 * Bumping deferredWakeNonce is the only signal that makes W2 process (anti-recursion).
 */
async function requestPortalDeferredWake(outcome: string): Promise<void> {
  const reference = adminDb.collection(COORDINATION_COLLECTION).doc(PORTAL_COORDINATION_DOC);
  const latest = await reference.get();
  const data = latest.data() ?? {};
  const eligibleAt =
    resolveNextEligiblePublishAtMs(data) ?? Date.now();
  await reference.set({
    deferredWakeNonce: FieldValue.increment(1),
    deferredWakeAt: Timestamp.fromMillis(eligibleAt),
    status: typeof data.status === "string" ? data.status : "dirty",
  }, { merge: true });
  logger.info("catalog-snapshot-scheduling", {
    kind: "portal-catalog",
    schedulingReason: "deferred-wake",
    outcome,
  });
}

async function claimPortalDebounceWaiterOnly(
  claimDurationMs: number,
): Promise<{ isWaiter: boolean; waiterOwner: string }> {
  const reference = adminDb.collection(COORDINATION_COLLECTION).doc(PORTAL_COORDINATION_DOC);
  const owner = randomUUID();
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const data = snapshot.data() ?? {};
    const now = Date.now();
    const isWaiter = shouldBecomeDebounceWaiter(data, now);
    if (isWaiter) {
      transaction.set(reference, {
        debounceOwner: owner,
        debounceExpiresAt: Timestamp.fromMillis(now + claimDurationMs),
      }, { merge: true });
    }
    return { isWaiter, waiterOwner: owner };
  });
}

/**
 * One automatic portal full-publication attempt with eligibility wait + W2 re-arm.
 * passLimit=1: never immediately serial-scans additional generations in this wake.
 *
 * Does NOT call requestPortalDeferredWake — the caller must release its debounce
 * claim first, then wake if needsDeferredWake is true (avoids W2 join-and-exit race).
 */
async function runPortalAutomaticPublicationPass(options: {
  startedAtMs: number;
  schedulingReason: string;
  source: "design-trigger" | "deferred-wake";
}): Promise<{ needsDeferredWake: boolean }> {
  const reference = adminDb.collection(COORDINATION_COLLECTION).doc(PORTAL_COORDINATION_DOC);
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const latest = await reference.get();
  const data = latest.data() ?? {};
  const requested =
    typeof data.requestedGeneration === "number" ? data.requestedGeneration : 0;
  const published =
    typeof data.publishedGeneration === "number" ? data.publishedGeneration : 0;
  if (!publicationNeedsCatchUp(requested, published)) {
    return { needsDeferredWake: false };
  }

  const nowMs = Date.now();
  const eligibleAt = resolveNextEligiblePublishAtMs(data);
  const waitMs = eligibleAt === null ? 0 : Math.max(0, eligibleAt - nowMs);
  if (waitMs > 0) {
    if (!canWaitAndPublishWithinBudget(waitMs, options.startedAtMs, nowMs)) {
      logger.info("catalog-snapshot-scheduling", {
        kind: "portal-catalog",
        schedulingReason: options.schedulingReason,
        outcome: "deferred-not-yet-eligible",
        waitMs,
      });
      return { needsDeferredWake: true };
    }
    await sleep(waitMs);
  }

  try {
    await runPublicationCatchUpLoop({
      // Transient/lease retries may retry the *same* attempted pass; success still
      // advances at most one generation because passLimit=1 stops after first success.
      passLimit: PORTAL_PUBLICATION_PASS_LIMIT,
      publish: () => publishKind("portal-catalog"),
      readRequestedGeneration: async () => {
        const snap = await reference.get();
        return snap.data()?.requestedGeneration;
      },
      onSuccess: async (publishedResult, pass) => {
        logger.info("catalog-snapshot-publication", {
          kind: "portal-catalog",
          schedulingReason: options.schedulingReason,
          pass,
          durationMs: Date.now() - options.startedAtMs,
          outcome: options.source === "deferred-wake" ? "deferred-wake-published" : "success",
          generation: publishedResult.generation,
          ...(publishedResult.accounting
            ? {
              readyDesignsRead: publishedResult.accounting.readyDesignsRead,
              categoriesRead: publishedResult.accounting.categoriesRead,
              tagsRead: publishedResult.accounting.tagsRead,
            }
            : {}),
        });
        if (
          publishedResult.accounting &&
          process.env.GCLOUD_PROJECT === "fresh-prints-dev"
        ) {
          logger.info("portal-catalog-publication-accounting", {
            mode: "full",
            classification: "index-filter",
            publicationReason: options.schedulingReason,
            pass,
            ...publishedResult.accounting,
            coordinationDocumentsRead: 2,
            coordinationDocumentsWritten: 2,
            durationMs: Date.now() - options.startedAtMs,
            outcome: "success",
          });
        }
      },
      onFailure: async (_error, pass, retryKind) => {
        const failureCode =
          retryKind === "lease-busy"
            ? options.source === "deferred-wake"
              ? "deferred-wake-lease-busy"
              : "lease-active-retrying"
            : retryKind === "transient"
              ? "transient-storage-retrying"
              : options.source === "deferred-wake"
                ? "deferred-wake-failed"
                : "full-publication-failed";
        logger.warn("catalog-snapshot-publication", {
          kind: "portal-catalog",
          schedulingReason: options.schedulingReason,
          pass,
          durationMs: Date.now() - options.startedAtMs,
          outcome: retryKind === "fatal" ? "failure" : "contention",
          failureCode,
        });
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "snapshot-publication-not-yet-eligible") {
      logger.info("catalog-snapshot-scheduling", {
        kind: "portal-catalog",
        schedulingReason: options.schedulingReason,
        outcome: "deferred-not-yet-eligible",
      });
      return { needsDeferredWake: true };
    }
    throw error;
  }

  const after = await reference.get();
  const afterData = after.data() ?? {};
  const afterRequested =
    typeof afterData.requestedGeneration === "number" ? afterData.requestedGeneration : 0;
  const afterPublished =
    typeof afterData.publishedGeneration === "number" ? afterData.publishedGeneration : 0;
  if (publicationNeedsCatchUp(afterRequested, afterPublished)) {
    return { needsDeferredWake: true };
  }
  return { needsDeferredWake: false };
}

/**
 * Drains `requestedGeneration` ahead of `publishedGeneration` with bounded retries.
 * Exported for unit tests of the tag-removal stuck-publish recovery behavior.
 */
export async function runPublicationCatchUpLoop(options: {
  publish: () => Promise<{ generation: number; accounting?: PortalPublicationAccounting }>;
  readRequestedGeneration: () => Promise<unknown>;
  passLimit?: number;
  sleep?: (ms: number) => Promise<void>;
  onSuccess?: (
    published: { generation: number; accounting?: PortalPublicationAccounting },
    pass: number,
  ) => Promise<void>;
  onFailure?: (
    error: unknown,
    pass: number,
    retryKind: ReturnType<typeof shouldRetryPublicationPass>,
  ) => Promise<void>;
}): Promise<void> {
  const passLimit = options.passLimit ?? PUBLICATION_PASS_LIMIT;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;
  for (let pass = 0; pass < passLimit; pass += 1) {
    try {
      const published = await options.publish();
      await options.onSuccess?.(published, pass + 1);
      const requested = await options.readRequestedGeneration();
      if (!publicationNeedsCatchUp(requested, published.generation)) {
        return;
      }
      lastError = undefined;
    } catch (error) {
      lastError = error;
      const retryKind = shouldRetryPublicationPass(error);
      await options.onFailure?.(error, pass + 1, retryKind);
      // Not-yet-eligible is not a same-pass retry — caller must defer wake.
      if (error instanceof Error && error.message === "snapshot-publication-not-yet-eligible") {
        throw error;
      }
      if (retryKind === "lease-busy" && pass < passLimit - 1) {
        await sleep(LEASE_BUSY_RETRY_DELAY_MS);
        continue;
      }
      if (retryKind === "transient" && pass < passLimit - 1) {
        await sleep(TRANSIENT_STORAGE_RETRY_BASE_DELAY_MS * (pass + 1) * 5);
        continue;
      }
      throw error;
    }
  }
  if (lastError) throw lastError;
}

async function assertOwnerAdmin(uid: string): Promise<void> {
  const caller = await loadCallerProfile(uid);
  if (!caller.isActive || (caller.role !== "owner" && caller.role !== "admin")) {
    throw permissionDenied("Only an owner or admin can publish catalog snapshots.");
  }
}

export const SNAPSHOT_ASSET_BUDGET_EXCEEDED = "snapshot/payload-budget-exceeded";
export const SNAPSHOT_METADATA_VERIFICATION_FAILED = "snapshot/storage-write-failed";
export const SNAPSHOT_BUILD_FAILED = "snapshot/build-failed";

export function mapPublicationFailure(kind: SnapshotKind, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("snapshot-asset-budget-exceeded:")) {
    const path = message.slice("snapshot-asset-budget-exceeded:".length);
    throw failedPrecondition(
      `Catalog snapshot publication (${kind}) stopped: a generated asset exceeded its size budget. ` +
        "This is a data-shape limit, not a transient error; it will fail again on retry until the " +
        "underlying content is reduced or the approved budget/sharding design changes.",
      { code: SNAPSHOT_ASSET_BUDGET_EXCEEDED, kind, path },
    );
  }
  if (message.startsWith("snapshot-asset-metadata-verification-failed:")) {
    const path = message.slice("snapshot-asset-metadata-verification-failed:".length);
    throw failedPrecondition(
      `Catalog snapshot publication (${kind}) stopped: a generated asset failed post-write ` +
        "verification in Storage. Retry may succeed if this was transient.",
      { code: SNAPSHOT_METADATA_VERIFICATION_FAILED, kind, path },
    );
  }
  throw failedPrecondition(
    `Catalog snapshot publication (${kind}) failed. See server logs for the correlation ID.`,
    { code: SNAPSHOT_BUILD_FAILED, kind },
  );
}

/**
 * Owner/admin rebuild — intentional bypass of quiet/min-interval scheduling.
 * Still stamps nextEligiblePublishAt on successful portal publish so automatic paths honor it.
 */
export const rebuildCatalogSnapshots = onCall(async (request) => {
  if (!request.auth?.uid) throw unauthenticated();
  await assertOwnerAdmin(request.auth.uid);
  await Promise.all([markDirty("catalog-reference"), markDirty("portal-catalog")]);
  const [referenceResult, portalResult] = await Promise.allSettled([
    publishKind("catalog-reference"),
    publishKind("portal-catalog", { bypassMinInterval: true }),
  ]);
  if (referenceResult.status === "rejected") {
    mapPublicationFailure("catalog-reference", referenceResult.reason);
  }
  if (portalResult.status === "rejected") {
    mapPublicationFailure("portal-catalog", portalResult.reason);
  }
  return {
    reference: {
      contentVersion: referenceResult.value.contentVersion,
      generation: referenceResult.value.generation,
    },
    portal: {
      contentVersion: portalResult.value.contentVersion,
      generation: portalResult.value.generation,
    },
  };
});

/**
 * Owner/admin catch-up for a stuck portal-catalog coordination doc.
 * Explicitly bypasses quiet/min-interval; may drain multiple generations (ops escape hatch).
 */
export async function drainPortalCatalogPublicationCatchUp(): Promise<{
  requestedGeneration: number | null;
  publishedGeneration: number | null;
  status: string | null;
}> {
  await runPublicationCatchUpLoop({
    publish: () => publishKind("portal-catalog", { bypassMinInterval: true }),
    readRequestedGeneration: async () => {
      const latest = await adminDb.collection(COORDINATION_COLLECTION).doc(PORTAL_COORDINATION_DOC).get();
      return latest.data()?.requestedGeneration;
    },
  });
  const latest = await adminDb.collection(COORDINATION_COLLECTION).doc(PORTAL_COORDINATION_DOC).get();
  const data = latest.data() ?? {};
  return {
    requestedGeneration:
      typeof data.requestedGeneration === "number" ? data.requestedGeneration : null,
    publishedGeneration:
      typeof data.publishedGeneration === "number" ? data.publishedGeneration : null,
    status: typeof data.status === "string" ? data.status : null,
  };
}

export const retryPortalCatalogPublication = onCall(async (request) => {
  if (!request.auth?.uid) throw unauthenticated();
  await assertOwnerAdmin(request.auth.uid);
  try {
    return await drainPortalCatalogPublicationCatchUp();
  } catch (error) {
    mapPublicationFailure("portal-catalog", error);
  }
});

// timeoutSeconds: quiet + publish must fit; Amendment 1 — hard kill skips claim release.
export const onCategorySnapshotSourceWritten = onDocumentWritten(
  { document: "categories/{categoryId}", timeoutSeconds: 300 },
  async (event) => {
    const project = (value: Record<string, unknown> | undefined) => value ? {
      name: value.name,
      description: value.description,
      sortOrder: value.sortOrder,
      isActive: value.isActive,
    } : null;
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    if (stableJson(project(before)) === stableJson(project(after))) return;
    await markAndPublishAfterDebounce("catalog-reference", "category-write");
  },
);

export const onTagSnapshotSourceWritten = onDocumentWritten(
  { document: "tags/{tagId}", timeoutSeconds: 300 },
  async (event) => {
    const project = (value: Record<string, unknown> | undefined) => value ? {
      name: value.name,
      aliases: value.aliases,
      preferredWhen: value.preferredWhen,
      status: value.status,
    } : null;
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    if (stableJson(project(before)) === stableJson(project(after))) return;
    await markAndPublishAfterDebounce("catalog-reference", "tag-write");
  },
);

export const onPortalCatalogSnapshotSourceWritten = onDocumentWritten(
  { document: "designs/{designId}", timeoutSeconds: 300 },
  async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    const classification = classifyPortalCatalogDesignChange(before, after);
    if (classification === "operational") {
      const skipReason = isNonReadyIndexFilterChurn(before, after)
        ? "non-ready-index-filter-skipped"
        : "skipped";
      if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
        logger.info("portal-catalog-publication-accounting", {
          mode: "none",
          classification,
          publicationReason: "design-write",
          pass: 0,
          readyDesignsRead: 0,
          categoriesRead: 0,
          tagsRead: 0,
          coordinationDocumentsRead: 0,
          coordinationDocumentsWritten: 0,
          durationMs: 0,
          outcome: skipReason,
        });
      }
      return;
    }
    if (classification === "card-only" && after) {
      const card = mapPortalCatalogCard(event.params.designId, after);
      if (card) {
        await publishPortalCardOverride(card, event.time);
        return;
      }
    }
    await markAndPublishAfterDebounce("portal-catalog", "design-write");
  },
);

/**
 * Amendment 9 P4 W2 — coordination-document deferred wake.
 * Fires only on meaningful deferredWakeNonce advances while dirty remains.
 * Does not require another design/category/tag write to drain the final generation.
 * Anti-recursion: bookkeeping writes that do not bump deferredWakeNonce are ignored;
 * after a successful drain with no remaining dirty, the idle stamp does not re-process.
 */
export const onPortalCatalogPublicationStateWritten = onDocumentWritten(
  {
    document: `${COORDINATION_COLLECTION}/${PORTAL_COORDINATION_DOC}`,
    timeoutSeconds: 300,
  },
  async (event) => {
    const startedAtMs = Date.now();
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    const decision = decidePortalDeferredWakeAction({ before, after });
    if (decision !== "process") {
      return;
    }

    const { isWaiter, waiterOwner } = await claimPortalDebounceWaiterOnly(
      PORTAL_CLAIM_DURATION_MS,
    );
    logger.info("catalog-snapshot-scheduling", {
      kind: "portal-catalog",
      schedulingReason: "deferred-wake",
      outcome: isWaiter ? "deferred-wake-claimed" : "deferred-wake-joined",
    });
    if (!isWaiter) {
      return;
    }

    let needsDeferredWake = false;
    try {
      const result = await runPortalAutomaticPublicationPass({
        startedAtMs,
        schedulingReason: "deferred-wake",
        source: "deferred-wake",
      });
      needsDeferredWake = result.needsDeferredWake;
    } finally {
      await releaseDebounceClaimIfOwned("portal-catalog", waiterOwner);
    }

    if (needsDeferredWake) {
      await requestPortalDeferredWake("deferred-wake-requested");
    }
  },
);
