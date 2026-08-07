import type { AiCatalogReferenceSnapshot } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import { CATALOG_REFERENCE_SCHEMA_VERSION } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import { randomUUID } from "node:crypto";

import { adminDb } from "../lib/admin";
import { logPipelineEvent } from "../lib/pipelineLog";

/**
 * Process-local AI taxonomy cache TTL.
 * Firestore remains authoritative. Cloud Function instances are independent —
 * this is not a global guarantee. Cold starts always load fresh Firestore data.
 */
export const AI_TAXONOMY_CACHE_TTL_MS = 15 * 60_000;

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
  | "taxonomy-load-failure";

interface AiTaxonomyCacheDeps {
  loadFromFirestore: () => Promise<AiCatalogReferenceSnapshot>;
  now: () => number;
  log: (event: TaxonomyLogEvent, context: Record<string, unknown>) => void;
  ttlMs: number;
  runtimeInstanceId: string;
}

interface CacheEntry {
  value: AiCatalogReferenceSnapshot;
  expiresAtMs: number;
  categoryCount: number;
  tagCount: number;
}

async function defaultLoadFromFirestore(): Promise<AiCatalogReferenceSnapshot> {
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

function defaultLog(event: TaxonomyLogEvent, context: Record<string, unknown>): void {
  logPipelineEvent(event, context);
}

function createDefaultDeps(): AiTaxonomyCacheDeps {
  return {
    loadFromFirestore: defaultLoadFromFirestore,
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

  if (cacheEntry && cacheEntry.expiresAtMs > now) {
    deps.log("taxonomy-cache-hit", {
      ...baseLogContext(context),
      cacheAgeMs: now - (cacheEntry.expiresAtMs - deps.ttlMs),
      categoryCount: cacheEntry.categoryCount,
      tagCount: cacheEntry.tagCount,
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
      const value = await deps.loadFromFirestore();
      const elapsedMs = deps.now() - startedAtMs;
      const categoryCount = value.categories.length;
      const tagCount = value.tags.length;

      // Only publish into the live cache when this load's generation is still current.
      if (loadGeneration === cacheGeneration) {
        cacheEntry = {
          value,
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
 * Firestore-only taxonomy load with process-local TTL + in-flight dedupe.
 * Not globally authoritative across Function instances.
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

/**
 * Invalidate process-local taxonomy cache. Bumps generation so any in-flight
 * load that started before clear cannot republish into the live cache.
 */
export function clearAiCatalogReferenceSnapshotCache(): void {
  cacheGeneration += 1;
  cacheEntry = null;
  taxonomyInFlight = null;
  taxonomyInFlightGeneration = null;
}

/** @internal Test hooks — not for production callers. */
export function __setAiTaxonomyCacheTestDeps(
  overrides: Partial<AiTaxonomyCacheDeps> & {
    loadFromFirestore: () => Promise<AiCatalogReferenceSnapshot>;
  },
): void {
  clearAiCatalogReferenceSnapshotCache();
  isColdStart = true;
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
  deps = createDefaultDeps();
}
