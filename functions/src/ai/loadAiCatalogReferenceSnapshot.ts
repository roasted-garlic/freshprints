import type { AiCatalogReferenceSnapshot } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import { CATALOG_REFERENCE_SCHEMA_VERSION } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import { randomUUID } from "node:crypto";

import { adminDb } from "../lib/admin";
import { logPipelineEvent } from "../lib/pipelineLog";
import { readTaxonomyMaterializationCorpus } from "../taxonomy/rebuildTaxonomyMaterialization";

/**
 * Process-local AI taxonomy cache.
 * Revision-keyed (RC5); TTL is secondary. Not global across Function instances.
 */
export const AI_TAXONOMY_CACHE_TTL_MS = 15 * 60_000;

/** After this many FS fallbacks in-process, stay on FS-only for the circuit window (RC3). */
export const TAXONOMY_FALLBACK_CIRCUIT_THRESHOLD = 3;
export const TAXONOMY_FALLBACK_CIRCUIT_MS = 5 * 60_000;

export interface AiTaxonomyLoadContext {
  functionName?: string;
  invocationId?: string;
  designId?: string;
}

type TaxonomyLogEvent =
  | "taxonomy-cache-hit"
  | "taxonomy-cache-miss"
  | "taxonomy-cache-join-inflight"
  | "taxonomy-cache-expired"
  | "taxonomy-load-success"
  | "taxonomy-load-failure"
  | "taxonomy-fallback-fs"
  | "taxonomy-materialization-hit"
  | "taxonomy-fallback-circuit-open";

interface AiTaxonomyCacheDeps {
  loadTaxonomy: () => Promise<{ snapshot: AiCatalogReferenceSnapshot; revision: number | "fs-fallback" }>;
  now: () => number;
  log: (event: TaxonomyLogEvent, context: Record<string, unknown>) => void;
  ttlMs: number;
  runtimeInstanceId: string;
}

interface CacheEntry {
  value: AiCatalogReferenceSnapshot;
  revision: number | "fs-fallback";
  expiresAtMs: number;
  categoryCount: number;
  tagCount: number;
}

async function defaultLoadFromFirestoreDocs(): Promise<AiCatalogReferenceSnapshot> {
  const [categoriesSnapshot, tagsSnapshot] = await Promise.all([
    adminDb.collection("categories").where("isActive", "==", true).get(),
    adminDb.collection("tags").where("status", "==", "approved").get(),
  ]);
  const categories: AiCatalogReferenceSnapshot["categories"] = [];
  const tags: AiCatalogReferenceSnapshot["tags"] = [];
  categoriesSnapshot.forEach((document) => {
    const data = document.data();
    if (typeof data.name !== "string" || !data.name.trim()) return;
    categories.push({
      id: document.id,
      name: data.name.trim(),
      ...(typeof data.description === "string" && data.description.trim()
        ? { description: data.description.trim() }
        : {}),
    });
  });
  tagsSnapshot.forEach((document) => {
    const data = document.data();
    if (
      typeof data.name !== "string" ||
      !Array.isArray(data.aliases) ||
      typeof data.preferredWhen !== "string"
    ) {
      return;
    }
    tags.push({
      id: document.id,
      name: data.name,
      aliases: data.aliases.filter((alias): alias is string => typeof alias === "string"),
      preferredWhen: data.preferredWhen,
      status: "approved",
    });
  });
  return {
    schemaVersion: CATALOG_REFERENCE_SCHEMA_VERSION,
    contentVersion: "firestore-fallback",
    generatedAt: new Date().toISOString(),
    categories,
    tags,
    categoryNames: categories.map(({ name }) => name),
    categoryIdsByName: Object.fromEntries(
      categories.map(({ id, name }) => [name.toLowerCase(), id]),
    ),
  };
}

function corpusToSnapshot(
  corpus: { categories: AiCatalogReferenceSnapshot["categories"]; tags: AiCatalogReferenceSnapshot["tags"] },
  revision: number,
): AiCatalogReferenceSnapshot {
  return {
    schemaVersion: CATALOG_REFERENCE_SCHEMA_VERSION,
    contentVersion: `materialization-r${revision}`,
    generatedAt: new Date().toISOString(),
    categories: corpus.categories,
    tags: corpus.tags,
    categoryNames: corpus.categories.map(({ name }) => name),
    categoryIdsByName: Object.fromEntries(
      corpus.categories.map(({ id, name }) => [name.toLowerCase(), id]),
    ),
  };
}

let fallbackCount = 0;
let circuitOpenUntilMs = 0;

async function defaultLoadTaxonomy(): Promise<{
  snapshot: AiCatalogReferenceSnapshot;
  revision: number | "fs-fallback";
}> {
  const now = Date.now();
  if (circuitOpenUntilMs > now) {
    logPipelineEvent("taxonomy-fallback-circuit-open", {
      fallbackCount,
      circuitOpenUntilMs,
    });
    const snapshot = await defaultLoadFromFirestoreDocs();
    return { snapshot, revision: "fs-fallback" };
  }

  const materialized = await readTaxonomyMaterializationCorpus();
  if (materialized.ok) {
    logPipelineEvent("taxonomy-materialization-hit", {
      revision: materialized.revision,
      chunkCount: materialized.meta.chunkCount,
      tagCount: materialized.meta.tagCount,
      categoryCount: materialized.meta.categoryCount,
      reason: "healthy_materialization",
    });
    fallbackCount = 0;
    return {
      snapshot: corpusToSnapshot(materialized.corpus, materialized.revision),
      revision: materialized.revision,
    };
  }

  fallbackCount += 1;
  logPipelineEvent("taxonomy-fallback-fs", {
    reason: materialized.reason,
    fallbackCount,
    revision: null,
    chunkCount: null,
    runtimeInstanceId: deps.runtimeInstanceId,
    coldStart: isColdStart,
  });
  if (fallbackCount >= TAXONOMY_FALLBACK_CIRCUIT_THRESHOLD) {
    circuitOpenUntilMs = now + TAXONOMY_FALLBACK_CIRCUIT_MS;
    logPipelineEvent("taxonomy-fallback-circuit-open", {
      fallbackCount,
      circuitOpenUntilMs,
      reason: "threshold",
    });
  }

  const snapshot = await defaultLoadFromFirestoreDocs();
  return { snapshot, revision: "fs-fallback" };
}

function defaultLog(event: TaxonomyLogEvent, context: Record<string, unknown>): void {
  logPipelineEvent(event, context);
}

function createDefaultDeps(): AiTaxonomyCacheDeps {
  return {
    loadTaxonomy: defaultLoadTaxonomy,
    now: () => Date.now(),
    log: defaultLog,
    ttlMs: AI_TAXONOMY_CACHE_TTL_MS,
    runtimeInstanceId: randomUUID(),
  };
}

let deps: AiTaxonomyCacheDeps = createDefaultDeps();

/** Monotonic generation; bumped on clear so in-flight loads cannot republish after clear. */
let cacheGeneration = 0;
let cacheEntry: CacheEntry | null = null;
/** In-flight Promise for the current generation only. */
let taxonomyInFlight: Promise<AiCatalogReferenceSnapshot> | null = null;
let taxonomyInFlightGeneration: number | null = null;
let isColdStart = true;

function baseLogContext(context?: AiTaxonomyLoadContext): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    runtimeInstanceId: deps.runtimeInstanceId,
    coldStart: isColdStart,
    ttlMs: deps.ttlMs,
    functionName: context?.functionName ?? "unknown",
    invocationId: context?.invocationId ?? "unknown",
  };
  if (context?.designId) {
    payload.designId = context.designId;
  }
  return payload;
}

function finishColdStartFlag(): void {
  isColdStart = false;
}

async function loadThroughCache(
  context?: AiTaxonomyLoadContext,
): Promise<AiCatalogReferenceSnapshot> {
  const now = deps.now();

  // Revision-keyed hit: same revision in process memory → zero FS (TTL secondary).
  if (cacheEntry && cacheEntry.expiresAtMs > now) {
    deps.log("taxonomy-cache-hit", {
      ...baseLogContext(context),
      cacheAgeMs: now - (cacheEntry.expiresAtMs - deps.ttlMs),
      categoryCount: cacheEntry.categoryCount,
      tagCount: cacheEntry.tagCount,
      revision: cacheEntry.revision,
    });
    finishColdStartFlag();
    return cacheEntry.value;
  }

  if (cacheEntry && cacheEntry.expiresAtMs <= now) {
    deps.log("taxonomy-cache-expired", {
      ...baseLogContext(context),
      cacheAgeMs: now - (cacheEntry.expiresAtMs - deps.ttlMs),
      categoryCount: cacheEntry.categoryCount,
      tagCount: cacheEntry.tagCount,
      revision: cacheEntry.revision,
    });
    cacheEntry = null;
  }

  if (taxonomyInFlight && taxonomyInFlightGeneration === cacheGeneration) {
    deps.log("taxonomy-cache-join-inflight", {
      ...baseLogContext(context),
    });
    finishColdStartFlag();
    return taxonomyInFlight;
  }

  const loadGeneration = cacheGeneration;
  deps.log("taxonomy-cache-miss", {
    ...baseLogContext(context),
  });

  const startedAtMs = deps.now();
  const loadSlot: { promise: Promise<AiCatalogReferenceSnapshot> | null } = {
    promise: null,
  };
  loadSlot.promise = (async (): Promise<AiCatalogReferenceSnapshot> => {
    try {
      const loaded = await deps.loadTaxonomy();
      const value = loaded.snapshot;
      const elapsedMs = deps.now() - startedAtMs;
      const categoryCount = value.categories.length;
      const tagCount = value.tags.length;

      if (loadGeneration === cacheGeneration) {
        cacheEntry = {
          value,
          revision: loaded.revision,
          expiresAtMs: deps.now() + deps.ttlMs,
          categoryCount,
          tagCount,
        };
      }

      deps.log("taxonomy-load-success", {
        ...baseLogContext(context),
        elapsedMs,
        categoryCount,
        tagCount,
        documentCount: categoryCount + tagCount,
        publishedToCache: loadGeneration === cacheGeneration,
        revision: loaded.revision,
        source: loaded.revision === "fs-fallback" ? "firestore" : "materialization",
      });
      return value;
    } catch (error) {
      deps.log("taxonomy-load-failure", {
        ...baseLogContext(context),
        elapsedMs: deps.now() - startedAtMs,
        reason: error instanceof Error ? error.name : "unknown_error",
      });
      throw error;
    } finally {
      if (
        taxonomyInFlight === loadSlot.promise &&
        taxonomyInFlightGeneration === loadGeneration
      ) {
        taxonomyInFlight = null;
        taxonomyInFlightGeneration = null;
      }
    }
  })();

  taxonomyInFlight = loadSlot.promise;
  taxonomyInFlightGeneration = loadGeneration;
  finishColdStartFlag();
  return loadSlot.promise;
}

/**
 * Prefer compact materialization (O(chunks)); FS full hydrate only on fallback (RC3).
 */
export async function loadAiCatalogReferenceSnapshot(
  context?: AiTaxonomyLoadContext,
): Promise<AiCatalogReferenceSnapshot> {
  return loadThroughCache(context);
}

export function aiSnapshotTagsToCatalogTags(
  snapshot: AiCatalogReferenceSnapshot,
): CatalogTag[] {
  return snapshot.tags.map((tag) => ({
    ...tag,
    createdAt: null,
    updatedAt: null,
    createdBy: "catalog-reference-snapshot",
    updatedBy: "catalog-reference-snapshot",
  }));
}

export function clearAiCatalogReferenceSnapshotCache(): void {
  cacheGeneration += 1;
  cacheEntry = null;
  taxonomyInFlight = null;
  taxonomyInFlightGeneration = null;
}

/** @internal Test hooks — not for production callers. */
export function __setAiTaxonomyCacheTestDeps(
  overrides: Partial<AiTaxonomyCacheDeps> & {
    loadTaxonomy: () => Promise<{ snapshot: AiCatalogReferenceSnapshot; revision: number | "fs-fallback" }>;
  },
): void {
  clearAiCatalogReferenceSnapshotCache();
  isColdStart = true;
  fallbackCount = 0;
  circuitOpenUntilMs = 0;
  deps = {
    ...createDefaultDeps(),
    ...overrides,
    runtimeInstanceId: overrides.runtimeInstanceId ?? "test-runtime-instance",
  };
}

/** @internal Reset module state after tests. */
export function __resetAiTaxonomyCacheForTests(): void {
  clearAiCatalogReferenceSnapshotCache();
  isColdStart = true;
  fallbackCount = 0;
  circuitOpenUntilMs = 0;
  deps = createDefaultDeps();
}
