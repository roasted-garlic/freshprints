import { loadAiEnrichmentSettings, type AiEnrichmentSettingsLoaded } from "./loadAiEnrichmentSettings";
import type { CatalogTag } from "../../../shared/types/catalogTag.types";
import { adminDb } from "../lib/admin";

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

export function clearAiEnrichmentRuntimeCache(): void {
  settingsCache = null;
  categoriesCache = null;
  tagsCache = null;
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
  categories: CachedCategory[];
  names: string[];
  idsByName: Record<string, string>;
}> {
  const now = Date.now();

  if (categoriesCache && categoriesCache.expiresAtMs > now) {
    return categoriesCache.value;
  }

  const snapshot = await adminDb.collection("categories").where("isActive", "==", true).get();
  const categories: CachedCategory[] = [];
  const names: string[] = [];
  const idsByName: Record<string, string> = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    const name = data.name;

    if (typeof name === "string" && name.trim()) {
      const trimmedName = name.trim();
      const description = typeof data.description === "string" ? data.description.trim() : "";
      categories.push({
        id: doc.id,
        name: trimmedName,
        ...(description ? { description } : {}),
      });
      names.push(trimmedName);
      idsByName[trimmedName.toLowerCase()] = doc.id;
    }
  });

  const value = { categories, names, idsByName };
  categoriesCache = { value, expiresAtMs: now + CACHE_TTL_MS };
  return value;
}

export async function loadCachedApprovedTags(): Promise<CatalogTag[]> {
  const now = Date.now();

  if (tagsCache && tagsCache.expiresAtMs > now) {
    return tagsCache.value;
  }

  const snapshot = await adminDb.collection("tags").where("status", "==", "approved").get();
  const tags: CatalogTag[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (
      typeof data.name === "string" &&
      Array.isArray(data.aliases) &&
      typeof data.preferredWhen === "string"
    ) {
      tags.push({
        aliases: data.aliases.filter((alias): alias is string => typeof alias === "string"),
        createdAt: data.createdAt,
        createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
        id: doc.id,
        name: data.name,
        preferredWhen: data.preferredWhen,
        status: "approved",
        updatedAt: data.updatedAt,
        updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : "",
      });
    }
  });

  tagsCache = { value: tags, expiresAtMs: now + CACHE_TTL_MS };
  return tags;
}
