import { randomUUID } from "node:crypto";

import { loadAiEnrichmentSettings, type AiEnrichmentSettingsLoaded } from "./loadAiEnrichmentSettings";
import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import { logPipelineEvent } from "../lib/pipelineLog";
import {
  aiSnapshotTagsToCatalogTags,
  clearAiCatalogReferenceSnapshotCache,
  loadAiCatalogReferenceSnapshot,
} from "./loadAiCatalogReferenceSnapshot";

const SETTINGS_CACHE_TTL_MS = 60_000;

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
const runtimeInstanceId = randomUUID();
let isColdStart = true;
let activeSettingsMisses = 0;

export interface AiEnrichmentReadDiagnosticContext {
  functionName: string;
  invocationId: string;
  designId?: string;
}

function logSettingsRead(
  event: string,
  context?: AiEnrichmentReadDiagnosticContext,
  extra: Record<string, unknown> = {},
): void {
  logPipelineEvent(event, {
    resource: "settings",
    runtimeInstanceId,
    coldStart: isColdStart,
    functionName: context?.functionName ?? "unknown",
    invocationId: context?.invocationId ?? "unknown",
    designId: context?.designId ?? null,
    ...extra,
  });
  isColdStart = false;
}

export function clearAiEnrichmentRuntimeCache(): void {
  settingsCache = null;
  clearAiCatalogReferenceSnapshotCache();
}

export async function loadCachedAiEnrichmentSettings(
  context?: AiEnrichmentReadDiagnosticContext,
): Promise<AiEnrichmentSettingsLoaded> {
  const now = Date.now();

  if (settingsCache && settingsCache.expiresAtMs > now) {
    logSettingsRead("reference_cache.hit", context);
    return settingsCache.value;
  }

  const concurrentMissOverlap = activeSettingsMisses > 0;
  activeSettingsMisses += 1;
  logSettingsRead("reference_cache.miss", context, { concurrentMissOverlap });
  logSettingsRead("reference_query.started", context);

  try {
    const value = await loadAiEnrichmentSettings();
    logSettingsRead("reference_query.completed", context, {
      returnedDocumentCount: 1,
      concurrentMissOverlap,
    });
    settingsCache = { value, expiresAtMs: now + SETTINGS_CACHE_TTL_MS };
    return value;
  } catch (error) {
    logSettingsRead("reference_query.failed", context, {
      reason: error instanceof Error ? error.name : "unknown_error",
      concurrentMissOverlap,
    });
    throw error;
  } finally {
    activeSettingsMisses -= 1;
  }
}

/**
 * Thin adapter over the sole taxonomy TTL/in-flight boundary in
 * `loadAiCatalogReferenceSnapshot`. No independent categories TTL.
 */
export async function loadCachedActiveCategories(
  context?: AiEnrichmentReadDiagnosticContext,
): Promise<{
  categories: CachedCategory[];
  names: string[];
  idsByName: Record<string, string>;
}> {
  const snapshot = await loadAiCatalogReferenceSnapshot(context);
  return {
    categories: snapshot.categories,
    names: snapshot.categoryNames,
    idsByName: snapshot.categoryIdsByName,
  };
}

/**
 * Thin adapter over the sole taxonomy TTL/in-flight boundary in
 * `loadAiCatalogReferenceSnapshot`. No independent tags TTL.
 */
export async function loadCachedApprovedTags(
  context?: AiEnrichmentReadDiagnosticContext,
): Promise<CatalogTag[]> {
  const snapshot = await loadAiCatalogReferenceSnapshot(context);
  return aiSnapshotTagsToCatalogTags(snapshot);
}
