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
  stableJson,
  type TaxonomySource,
} from "./snapshotBuilders";
import {
  classifyPortalCatalogDesignChange,
  hasMatchingPortalCardOverride,
  mergePortalCardOverrides,
} from "./portalCatalogChangeClassifier";
import {
  LEASE_BUSY_RETRY_DELAY_MS,
  PUBLICATION_PASS_LIMIT,
  publicationNeedsCatchUp,
  shouldRetryPublicationPass,
  TRANSIENT_STORAGE_RETRY_BASE_DELAY_MS,
  withTransientStorageRetry,
} from "./publicationRecovery";

const COORDINATION_COLLECTION = "snapshotPublicationState";
const LEASE_MS = 10 * 60_000;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const IMMUTABLE_CACHE = "public,max-age=31536000,immutable";
const MANIFEST_CACHE = "public,max-age=30,must-revalidate";
const DEBOUNCE_MS = 15_000;
// Bounds how long the debounce-waiter claim (see markDirtyAndClaimDebounceWaiter) stays active
// after the sleep ends, covering one realistic full publish attempt. Deliberately much smaller
// than LEASE_MS: LEASE_MS bounds the *publish lease*'s own contention-retry window, not this
// claim's liability if the waiter's invocation is killed (e.g. by its own Cloud Functions
// timeout) before reaching its `finally` release block — a hard kill skips `finally` entirely, so
// the claim would otherwise sit stuck for up to the full LEASE_MS duration
// (post-launch-catalog-and-processing-stability, Owner QA Amendment 1: live fresh-prints-dev logs
// showed 18 consecutive "joined-existing-debounce-window" events with zero
// "claimed-debounce-waiter"/"catalog-snapshot-publication" events in the same window — a claim
// stuck for its full ~10-minute duration after the prior claim owner's invocation was killed by
// the trigger functions' 60-second default timeout mid-publish).
const PUBLISH_ATTEMPT_MARGIN_MS = 90_000;
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
    [...cards].sort((left, right) => (right.createdAtMs ?? 0) - (left.createdAtMs ?? 0)),
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

async function publishKind(kind: SnapshotKind): Promise<{
  contentVersion: string;
  generation: number;
  accounting?: PortalPublicationAccounting;
}> {
  const owner = randomUUID();
  const reference = adminDb.collection(COORDINATION_COLLECTION).doc(kind);
  const generation = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    const data = snapshot.data() ?? {};
    const now = Date.now();
    const leaseExpiresAt =
      data.leaseExpiresAt instanceof Timestamp ? data.leaseExpiresAt.toMillis() : 0;
    if (data.status === "publishing" && leaseExpiresAt > now) {
      throw new Error("snapshot-publication-lease-active");
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
    const published = kind === "catalog-reference"
      ? { contentVersion: await publishReference(generation, generatedAt) }
      : await publishPortal(generation, generatedAt);
    await reference.set({
      publishedGeneration: generation,
      leaseOwner: null,
      leaseExpiresAt: null,
      status: "idle",
      lastPublishedAt: FieldValue.serverTimestamp(),
      lastErrorCode: null,
      lastErrorAt: null,
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
 * scheduling attempts into a single debounce-and-publish pass. Only the
 * invocation that claims the debounce-waiter role (see
 * markDirtyAndClaimDebounceWaiter) sleeps DEBOUNCE_MS and attempts the
 * publish; every other invocation in the same window marks dirty and
 * returns immediately — the eventual waiter's publish (and, if generation
 * has advanced further by then, the catch-up loop) covers their dirty mark
 * too. The existing transactional publish lease in publishKind() remains
 * the sole concurrency boundary for the scan/write itself; this claim only
 * bounds how many invocations redundantly sleep and race for that lease.
 */
async function markAndPublishAfterDebounce(
  kind: SnapshotKind,
  schedulingReason: string,
): Promise<void> {
  const startedAtMs = Date.now();
  // The claim must outlive the sleep below plus the eventual publish attempt, not just the sleep
  // itself — otherwise a second invocation could become a second waiter while this one's publish
  // is still in flight (see markDirtyAndClaimDebounceWaiter's doc comment). Deliberately NOT
  // LEASE_MS (10 minutes) — a killed waiter (e.g. hitting the trigger function's own timeout mid-
  // publish) would strand the claim for that entire duration, since a hard kill skips the
  // `finally` release block. PUBLISH_ATTEMPT_MARGIN_MS bounds this to a much smaller, self-healing
  // window (Owner QA Amendment 1 — see PUBLISH_ATTEMPT_MARGIN_MS's own doc comment for the live
  // log evidence that motivated this).
  const { isWaiter, waiterOwner } = await markDirtyAndClaimDebounceWaiter(
    kind,
    DEBOUNCE_MS + PUBLISH_ATTEMPT_MARGIN_MS,
  );

  logger.info("catalog-snapshot-scheduling", {
    kind,
    schedulingReason,
    outcome: isWaiter ? "claimed-debounce-waiter" : "joined-existing-debounce-window",
  });

  if (!isWaiter) {
    return;
  }

  await new Promise<void>((resolve) => setTimeout(resolve, DEBOUNCE_MS));

  try {
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
          ...(published.accounting
            ? {
              readyDesignsRead: published.accounting.readyDesignsRead,
              categoriesRead: published.accounting.categoriesRead,
              tagsRead: published.accounting.tagsRead,
            }
            : {}),
        });
        if (
          kind === "portal-catalog" &&
          published.accounting &&
          process.env.GCLOUD_PROJECT === "fresh-prints-dev"
        ) {
          logger.info("portal-catalog-publication-accounting", {
            mode: "full",
            classification: "index-filter",
            publicationReason: schedulingReason,
            pass,
            ...published.accounting,
            coordinationDocumentsRead: 2,
            coordinationDocumentsWritten: pass === 1 ? 3 : 2,
            durationMs: Date.now() - startedAtMs,
            outcome: "success",
          });
        }
      },
      onFailure: async (error, pass, retryKind) => {
        const failureCode =
          retryKind === "lease-busy"
            ? "lease-active-retrying"
            : retryKind === "transient"
              ? "transient-storage-retrying"
              : "full-publication-failed";
        logger.warn("catalog-snapshot-publication", {
          kind,
          schedulingReason,
          pass,
          durationMs: Date.now() - startedAtMs,
          outcome: retryKind === "fatal" ? "failure" : "contention",
          failureCode,
        });
        if (kind === "portal-catalog" && process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
          logger.error("portal-catalog-publication-accounting", {
            mode: "full",
            classification: "index-filter",
            publicationReason: schedulingReason,
            pass,
            durationMs: Date.now() - startedAtMs,
            outcome: "failure",
            failureCode,
          });
        }
      },
    });
  } finally {
    // Release only if this invocation still owns the claim — a failed
    // publish leaves requestedGeneration recoverable (markDirty already
    // persisted it before this ran) for the next scheduling attempt to
    // pick up as its own new debounce window.
    await releaseDebounceClaimIfOwned(kind, waiterOwner);
  }
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
      // Previously returned immediately on lease-active, permanently abandoning a higher
      // requestedGeneration (prod tag-removal: gen 9 stuck after FetchError / busy races).
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

export const rebuildCatalogSnapshots = onCall(async (request) => {
  if (!request.auth?.uid) throw unauthenticated();
  await assertOwnerAdmin(request.auth.uid);
  await Promise.all([markDirty("catalog-reference"), markDirty("portal-catalog")]);
  const [referenceResult, portalResult] = await Promise.allSettled([
    publishKind("catalog-reference"),
    publishKind("portal-catalog"),
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
 * Owner/admin catch-up for a stuck portal-catalog coordination doc
 * (`requestedGeneration` > `publishedGeneration`, e.g. after FetchError).
 * Does **not** bump requestedGeneration — drains the existing dirty watermark.
 * Exported for ops runners that share the callable's exact drain path.
 */
export async function drainPortalCatalogPublicationCatchUp(): Promise<{
  requestedGeneration: number | null;
  publishedGeneration: number | null;
  status: string | null;
}> {
  await runPublicationCatchUpLoop({
    publish: () => publishKind("portal-catalog"),
    readRequestedGeneration: async () => {
      const latest = await adminDb.collection(COORDINATION_COLLECTION).doc("portal-catalog").get();
      return latest.data()?.requestedGeneration;
    },
  });
  const latest = await adminDb.collection(COORDINATION_COLLECTION).doc("portal-catalog").get();
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

// timeoutSeconds explicitly raised from the 60-second default: the debounce-waiter invocation
// sleeps DEBOUNCE_MS then runs a full publishKind() scan/write pass, which can exceed 60s on a
// catalog of real size — a hard timeout kill skips the claim's release entirely (see
// PUBLISH_ATTEMPT_MARGIN_MS's doc comment for the live-log evidence this was actually happening
// on fresh-prints-dev). 300s comfortably covers DEBOUNCE_MS + a realistic full publish with
// margin, well under the Cloud Functions v2 event-driven ceiling.
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

// See onCategorySnapshotSourceWritten's comment for why timeoutSeconds is explicitly raised.
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

// See onCategorySnapshotSourceWritten's comment for why timeoutSeconds is explicitly raised.
export const onPortalCatalogSnapshotSourceWritten = onDocumentWritten(
  { document: "designs/{designId}", timeoutSeconds: 300 },
  async (event) => {
    const before = event.data?.before.exists ? event.data.before.data() : undefined;
    const after = event.data?.after.exists ? event.data.after.data() : undefined;
    const classification = classifyPortalCatalogDesignChange(before, after);
    if (classification === "operational") {
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
          outcome: "skipped",
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
