import { loadAiEnrichmentSettings, type AiEnrichmentSettingsLoaded } from "./loadAiEnrichmentSettings";
import { adminDb } from "../lib/admin";

const CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  expiresAtMs: number;
  value: T;
}

let settingsCache: CacheEntry<AiEnrichmentSettingsLoaded> | null = null;
let categoriesCache: CacheEntry<{
  names: string[];
  idsByName: Record<string, string>;
}> | null = null;

export function clearAiEnrichmentRuntimeCache(): void {
  settingsCache = null;
  categoriesCache = null;
}

export async function loadCachedAiEnrichmentSettings(): Promise<AiEnrichmentSettingsLoaded> {
  const now = Date.now();

  if (settingsCache && settingsCache.expiresAtMs > now) {
    return settingsCache.value;
  }

  const value = await loadAiEnrichmentSettings();
  settingsCache = { value, expiresAtMs: now + CACHE_TTL_MS };
  return value;
}

export async function loadCachedActiveCategories(): Promise<{
  names: string[];
  idsByName: Record<string, string>;
}> {
  const now = Date.now();

  if (categoriesCache && categoriesCache.expiresAtMs > now) {
    return categoriesCache.value;
  }

  const snapshot = await adminDb.collection("categories").where("isActive", "==", true).get();
  const names: string[] = [];
  const idsByName: Record<string, string> = {};

  snapshot.forEach((doc) => {
    const name = doc.data().name;

    if (typeof name === "string" && name.trim()) {
      names.push(name);
      idsByName[name.trim().toLowerCase()] = doc.id;
    }
  });

  const value = { names, idsByName };
  categoriesCache = { value, expiresAtMs: now + CACHE_TTL_MS };
  return value;
}
