import { randomUUID } from "node:crypto";

import { loadAiEnrichmentSettings, type AiEnrichmentSettingsLoaded } from "./loadAiEnrichmentSettings";
import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import { logPipelineEvent } from "../lib/pipelineLog";
import {
  aiSnapshotTagsToCatalogTags,
  clearAiCatalogReferenceSnapshotCache,
  loadAiCatalogReferenceSnapshot,
} from "./loadAiCatalogReferenceSnapshot";

const CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  expiresAtMs: number;
  value: T;
}

interface CachedCategory {
  id: string;
  name: string;
  description?: string;
}

let settingsCache: CacheEntry<AiEnrichmentSettingsLoaded> | null = null;
let categoriesCache: CacheEntry<{
  categories: CachedCategory[];
  names: string[];
  idsByName: Record<string, string>;
}> | null = null;
let tagsCache: CacheEntry<CatalogTag[]> | null = null;
const runtimeInstanceId = randomUUID();
let isColdStart = true;
const activeMisses: Record<"settings" | "categories" | "tags", number> = {
  settings: 0,
  categories: 0,
  tags: 0,
};

export interface AiEnrichmentReadDiagnosticContext {
  functionName: string;
  invocationId: string;
  designId?: string;
}

function logReferenceRead(
  event: string,
  resource: keyof typeof activeMisses,
  context?: AiEnrichmentReadDiagnosticContext,
  extra: Record<string, unknown> = {},
): void {
  logPipelineEvent(event, {
    resource,
    runtimeInstanceId,
    coldStart: isColdStart,
    functionName: context?.functionName ?? "unknown",
    invocationId: context?.invocationId ?? "unknown",
    designId: context?.designId ?? null,
    ...extra,
  });
  isColdStart = false;
}

async function traceCacheMiss<T>(
  resource: keyof typeof activeMisses,
  context: AiEnrichmentReadDiagnosticContext | undefined,
  load: () => Promise<T>,
  returnedCount: (value: T) => number,
): Promise<T> {
  const concurrentMissOverlap = activeMisses[resource] > 0;
  activeMisses[resource] += 1;
  logReferenceRead("reference_cache.miss", resource, context, { concurrentMissOverlap });
  logReferenceRead("reference_query.started", resource, context);

  try {
    const value = await load();
    logReferenceRead("reference_query.completed", resource, context, {
      returnedDocumentCount: returnedCount(value),
      concurrentMissOverlap,
    });
    return value;
  } catch (error) {
    logReferenceRead("reference_query.failed", resource, context, {
      reason: error instanceof Error ? error.name : "unknown_error",
      concurrentMissOverlap,
    });
    throw error;
  } finally {
    activeMisses[resource] -= 1;
  }
}

export function clearAiEnrichmentRuntimeCache(): void {
  settingsCache = null;
  categoriesCache = null;
  tagsCache = null;
  clearAiCatalogReferenceSnapshotCache();
}

export async function loadCachedAiEnrichmentSettings(
  context?: AiEnrichmentReadDiagnosticContext,
): Promise<AiEnrichmentSettingsLoaded> {
  const now = Date.now();

  if (settingsCache && settingsCache.expiresAtMs > now) {
    logReferenceRead("reference_cache.hit", "settings", context);
    return settingsCache.value;
  }

  const value = await traceCacheMiss(
    "settings",
    context,
    loadAiEnrichmentSettings,
    () => 1,
  );
  settingsCache = { value, expiresAtMs: now + CACHE_TTL_MS };
  return value;
}

export async function loadCachedActiveCategories(
  context?: AiEnrichmentReadDiagnosticContext,
): Promise<{
  categories: CachedCategory[];
  names: string[];
  idsByName: Record<string, string>;
}> {
  const now = Date.now();

  if (categoriesCache && categoriesCache.expiresAtMs > now) {
    logReferenceRead("reference_cache.hit", "categories", context);
    return categoriesCache.value;
  }

  const value = await traceCacheMiss(
    "categories",
    context,
    async () => {
      const snapshot = await loadAiCatalogReferenceSnapshot();
      return {
        categories: snapshot.categories,
        names: snapshot.categoryNames,
        idsByName: snapshot.categoryIdsByName,
      };
    },
    (result) => result.categories.length,
  );
  categoriesCache = { value, expiresAtMs: now + CACHE_TTL_MS };
  return value;
}

export async function loadCachedApprovedTags(
  context?: AiEnrichmentReadDiagnosticContext,
): Promise<CatalogTag[]> {
  const now = Date.now();

  if (tagsCache && tagsCache.expiresAtMs > now) {
    logReferenceRead("reference_cache.hit", "tags", context);
    return tagsCache.value;
  }

  const tags = await traceCacheMiss(
    "tags",
    context,
    async () => aiSnapshotTagsToCatalogTags(await loadAiCatalogReferenceSnapshot()),
    (result) => result.length,
  );

  tagsCache = { value: tags, expiresAtMs: now + CACHE_TTL_MS };
  return tags;
}
