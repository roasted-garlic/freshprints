import type { AiCatalogReferenceSnapshot } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import { CATALOG_REFERENCE_SCHEMA_VERSION } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import { adminDb } from "../lib/admin";

const FALLBACK_TTL_MS = 5 * 60_000;

let fallbackCache: { expiresAtMs: number; value: AiCatalogReferenceSnapshot } | null = null;
let fallbackLoad: Promise<AiCatalogReferenceSnapshot> | null = null;

async function loadFirestoreFallback(): Promise<AiCatalogReferenceSnapshot> {
  if (fallbackCache && fallbackCache.expiresAtMs > Date.now()) return fallbackCache.value;
  if (fallbackLoad) return fallbackLoad;

  fallbackLoad = (async () => {
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
      ) return;
      tags.push({
        id: document.id,
        name: data.name,
        aliases: data.aliases.filter((alias): alias is string => typeof alias === "string"),
        preferredWhen: data.preferredWhen,
        status: "approved",
      });
    });
    const value: AiCatalogReferenceSnapshot = {
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
    fallbackCache = { value, expiresAtMs: Date.now() + FALLBACK_TTL_MS };
    return value;
  })();

  try {
    return await fallbackLoad;
  } finally {
    fallbackLoad = null;
  }
}

/** Firestore-only taxonomy load (5min TTL + in-flight dedupe). */
export async function loadAiCatalogReferenceSnapshot(): Promise<AiCatalogReferenceSnapshot> {
  return loadFirestoreFallback();
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
  fallbackCache = null;
  fallbackLoad = null;
}
