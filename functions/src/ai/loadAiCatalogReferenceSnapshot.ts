import {
  parseAiCatalogReferenceSnapshot,
  parseCatalogReferenceManifest,
} from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.parsers";
import type { AiCatalogReferenceSnapshot } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import { CATALOG_REFERENCE_SCHEMA_VERSION } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import { adminDb, adminStorage } from "../lib/admin";

const MANIFEST_PATH = "generated/catalog-reference/manifest.json";
const FALLBACK_TTL_MS = 5 * 60_000;
const MANIFEST_TTL_MS = 60_000;

let cachedSnapshot: AiCatalogReferenceSnapshot | null = null;
let manifestExpiresAtMs = 0;
const immutableSnapshots = new Map<string, AiCatalogReferenceSnapshot>();
let snapshotLoad: Promise<AiCatalogReferenceSnapshot> | null = null;
let fallbackCache: { expiresAtMs: number; value: AiCatalogReferenceSnapshot } | null = null;
let fallbackLoad: Promise<AiCatalogReferenceSnapshot> | null = null;

async function downloadJson(path: string): Promise<unknown> {
  const [bytes] = await adminStorage.bucket().file(path).download();
  return JSON.parse(bytes.toString("utf8")) as unknown;
}

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

export async function loadAiCatalogReferenceSnapshot(): Promise<AiCatalogReferenceSnapshot> {
  if (process.env.AI_CATALOG_SNAPSHOT_ENABLED === "false") {
    return loadFirestoreFallback();
  }
  if (cachedSnapshot && manifestExpiresAtMs > Date.now()) return cachedSnapshot;
  if (snapshotLoad) return snapshotLoad;

  snapshotLoad = (async () => {
    try {
      const manifest = parseCatalogReferenceManifest(await downloadJson(MANIFEST_PATH));
      const snapshot = immutableSnapshots.get(manifest.contentVersion) ??
        parseAiCatalogReferenceSnapshot(await downloadJson(manifest.aiPath));
      if (snapshot.contentVersion !== manifest.contentVersion) {
        throw new Error("AI catalog reference snapshot version mismatch.");
      }
      immutableSnapshots.delete(snapshot.contentVersion);
      immutableSnapshots.set(snapshot.contentVersion, snapshot);
      while (immutableSnapshots.size > 2) {
        const oldest = immutableSnapshots.keys().next().value as string | undefined;
        if (!oldest) break;
        immutableSnapshots.delete(oldest);
      }
      cachedSnapshot = snapshot;
      manifestExpiresAtMs = Date.now() + MANIFEST_TTL_MS;
      return snapshot;
    } catch {
      return loadFirestoreFallback();
    }
  })();

  try {
    return await snapshotLoad;
  } finally {
    snapshotLoad = null;
  }
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
  cachedSnapshot = null;
  manifestExpiresAtMs = 0;
  immutableSnapshots.clear();
  snapshotLoad = null;
  fallbackCache = null;
  fallbackLoad = null;
}
