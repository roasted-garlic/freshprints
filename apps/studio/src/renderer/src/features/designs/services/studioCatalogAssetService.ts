import { getDownloadURL, ref } from "firebase/storage";

import {
  parseCatalogReferenceManifest,
  parseClientCatalogReferenceSnapshot,
  parsePortalCatalogCardBucket,
  parsePortalCatalogCardOverrides,
  parsePortalCatalogManifest,
  parsePortalCatalogStudioReadyIndex,
} from "@fresh-prints/shared/catalog-snapshots/catalogSnapshot.parsers";
import {
  portalCatalogCardBucketNumber,
  resolvePortalCatalogPath,
  type ClientCatalogReferenceSnapshot,
  type PortalCatalogCard,
  type PortalCatalogManifest,
  type PortalCatalogStudioReadyIndex,
} from "@fresh-prints/shared/catalog-snapshots/catalogSnapshot.types";
import { applyPortalCatalogCardOverrides } from "@fresh-prints/shared/catalog-snapshots/catalogCardOverrides";
import { traceStorageAssetComplete, traceStorageAssetStart } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { storage } from "../../../config/firebase";
import { MaterializedCardBucketCache } from "../utils/materializedCardBucketCache";
import { studioGeneratedCardOverrideService } from "./studioGeneratedCardOverrideService";

const PORTAL_MANIFEST_PATH = "generated/portal-catalog/manifest.json";
const REFERENCE_MANIFEST_PATH = "generated/catalog-reference/manifest.json";
const MANIFEST_TTL_MS = 30_000;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;

/** Sanitized path CLASS for the debug tracer — never the real Storage path/download URL. */
function assetClassForPath(path: string): string {
  if (path === PORTAL_MANIFEST_PATH) return "portal-catalog/studio/manifest";
  if (path === REFERENCE_MANIFEST_PATH) return "portal-catalog/studio/taxonomy-manifest";
  if (path.includes("ready-index") || path.includes("studio")) return "portal-catalog/studio/ready-index";
  if (path.includes("cards")) return "portal-catalog/studio/card-bucket";
  if (path.includes("client")) return "portal-catalog/studio/taxonomy";
  return "portal-catalog/studio/other";
}

const cache = new Map<string, { bytes: number; value: unknown }>();
const inflightByPath = new Map<string, Promise<unknown>>();
let cacheBytes = 0;
let manifestCache: { expiresAtMs: number; value: PortalCatalogManifest } | null = null;
let manifestLoad: Promise<PortalCatalogManifest> | null = null;
let referenceCache: { expiresAtMs: number; value: ClientCatalogReferenceSnapshot } | null = null;
let referenceLoad: Promise<ClientCatalogReferenceSnapshot> | null = null;
const materializedCardBuckets = new MaterializedCardBucketCache<
  ReturnType<typeof parsePortalCatalogCardBucket>
>();

function putCache(path: string, value: unknown, bytes: number): void {
  const prior = cache.get(path);
  if (prior) cacheBytes -= prior.bytes;
  cache.delete(path);
  cache.set(path, { bytes, value });
  cacheBytes += bytes;
  while (cacheBytes > MAX_CACHE_BYTES) {
    const oldest = cache.entries().next().value as
      | [string, { bytes: number; value: unknown }]
      | undefined;
    if (!oldest) break;
    cache.delete(oldest[0]);
    materializedCardBuckets.delete(oldest[0]);
    cacheBytes -= oldest[1].bytes;
  }
}

/**
 * Fetches a generated catalog JSON asset through Electron's main process (via
 * `window.freshPrints.catalogAsset.fetchJson`), not a renderer `fetch()` — see the Wave C Plan
 * amendment's Electron transport decision. The renderer still resolves the download URL itself
 * (same `getDownloadURL()` call already used elsewhere in Studio); only the actual HTTP fetch
 * happens in main, where CORS is not enforced, sidestepping packaged Electron's `file://` origin.
 */
async function fetchJson(path: string): Promise<unknown> {
  const assetClass = assetClassForPath(path);
  const startedAtMs = Date.now();
  const existing = cache.get(path);
  if (existing) {
    cache.delete(path);
    cache.set(path, existing);
    traceStorageAssetStart(assetClass, { app: "studio", triggerReason: "route" });
    traceStorageAssetComplete(assetClass, { app: "studio", triggerReason: "route" }, {
      cacheStatus: "hit",
    });
    return existing.value;
  }

  // One active IPC download per exact immutable Storage path — concurrent callers share the same
  // Promise instead of duplicating the fetch (parity with Portal's fix; Wave C live-test
  // remediation, 2026-07-25). Rejected loads are evicted in finally.
  const inflight = inflightByPath.get(path);
  if (inflight) {
    traceStorageAssetStart(assetClass, { app: "studio", triggerReason: "route" });
    traceStorageAssetComplete(assetClass, { app: "studio", triggerReason: "route" }, {
      cacheStatus: "in-flight-reuse",
    });
    return inflight;
  }
  const load = fetchJsonUncached(path, assetClass, startedAtMs);
  inflightByPath.set(path, load);
  try {
    return await load;
  } finally {
    inflightByPath.delete(path);
  }
}

async function fetchJsonUncached(
  path: string,
  assetClass: string,
  startedAtMs: number,
): Promise<unknown> {
  traceStorageAssetStart(assetClass, { app: "studio", triggerReason: "route" });
  let downloadUrl: string;
  try {
    downloadUrl = await getDownloadURL(ref(storage, path));
  } catch {
    traceStorageAssetComplete(assetClass, { app: "studio", triggerReason: "route" }, {
      durationMs: Date.now() - startedAtMs,
      errorCode: "storage-url-construction-failed",
      failureCode: "storage-url-construction-failed",
      failureStage: "url-construction",
    });
    throw new Error("Unable to resolve the generated Storage asset URL.");
  }

  let result: Awaited<ReturnType<typeof window.freshPrints.catalogAsset.fetchJson>>;
  try {
    result = await window.freshPrints.catalogAsset.fetchJson({ downloadUrl });
  } catch {
    traceStorageAssetComplete(assetClass, { app: "studio", triggerReason: "route" }, {
      durationMs: Date.now() - startedAtMs,
      errorCode: "electron-ipc-request-failed",
      failureCode: "electron-ipc-request-failed",
      failureStage: "electron-ipc",
    });
    throw new Error("Unable to request the generated asset through Electron.");
  }
  if (!result.success) {
    const diagnostics = result.error.diagnostics;
    traceStorageAssetComplete(assetClass, { app: "studio", triggerReason: "route" }, {
      durationMs: diagnostics.durationMs,
      errorCode: diagnostics.failureCode ?? result.error.code,
      failureCode: diagnostics.failureCode ?? result.error.code,
      failureStage: diagnostics.failureStage ?? "electron-ipc",
      httpStatus: diagnostics.httpStatus,
    });
    throw new Error(result.error.message);
  }

  const bytes = new TextEncoder().encode(JSON.stringify(result.data.json)).byteLength;
  putCache(path, result.data.json, bytes);
  traceStorageAssetComplete(assetClass, { app: "studio", triggerReason: "route" }, {
    bytes,
    cacheStatus: "miss",
    durationMs: result.data.diagnostics.durationMs,
    httpStatus: result.data.diagnostics.httpStatus,
  });
  return result.data.json;
}

function parseAsset<T>(
  path: string,
  value: unknown,
  parser: (input: unknown) => T,
  failureStage: "shared-schema-parsing" | "manifest-path-resolution" | "ready-index-path-resolution",
): T {
  try {
    return parser(value);
  } catch {
    const assetClass = assetClassForPath(path);
    traceStorageAssetComplete(assetClass, { app: "studio", triggerReason: "route" }, {
      errorCode: "generated-asset-contract-invalid",
      failureCode: "generated-asset-contract-invalid",
      failureStage,
    });
    throw new Error(`Generated asset failed ${failureStage}.`);
  }
}

async function loadManifest(): Promise<PortalCatalogManifest> {
  if (manifestCache && manifestCache.expiresAtMs > Date.now()) {
    return manifestCache.value;
  }
  if (manifestLoad) return manifestLoad;
  manifestLoad = (async () => {
    cache.delete(PORTAL_MANIFEST_PATH);
    const value = parseAsset(
      PORTAL_MANIFEST_PATH,
      await fetchJson(PORTAL_MANIFEST_PATH),
      parsePortalCatalogManifest,
      "shared-schema-parsing",
    );
    manifestCache = { value, expiresAtMs: Date.now() + MANIFEST_TTL_MS };
    return value;
  })();
  try {
    return await manifestLoad;
  } finally {
    manifestLoad = null;
  }
}

/**
 * Every ready design's `id`/`title`/`description`/`categoryId`/`tags`/`createdAtMs`, in Studio's
 * `createdAt DESC, id DESC` order — one compact asset covering the whole ready catalog (see the
 * Wave C Plan amendment). Ordering uses the immutable creation timestamp (owner decision,
 * 2026-07-24) specifically so print-request/show/edit activity never reshuffles the visible order.
 * Studio's existing client-side search/category/tag/halftone/dynamic-narrowing logic (unchanged)
 * runs against this set instead of Firestore.
 */
async function listReadyIndex(): Promise<PortalCatalogStudioReadyIndex["designs"]> {
  const manifest = await loadManifest();
  const readyIndexPath = manifest.studio.readyIndexPath;
  if (!readyIndexPath) {
    traceStorageAssetComplete(
      assetClassForPath(PORTAL_MANIFEST_PATH),
      { app: "studio", triggerReason: "route" },
      {
        errorCode: "ready-index-path-missing",
        failureCode: "ready-index-path-missing",
        failureStage: "ready-index-path-resolution",
      },
    );
    throw new Error("Generated ready-index path is unavailable.");
  }
  const index = parseAsset(
    readyIndexPath,
    await fetchJson(readyIndexPath),
    parsePortalCatalogStudioReadyIndex,
    "shared-schema-parsing",
  );
  return index.designs;
}

/**
 * Resolves full card fields (title, description, thumbnailPath, categoryId, etc.) for a set of
 * ready-design IDs from the existing public Portal card buckets — reused as-is, no new asset.
 * Bounded by which buckets the given IDs actually hash into, not the whole catalog.
 */
async function loadCards(designIds: string[]): Promise<Map<string, PortalCatalogCard>> {
  const manifest = await loadManifest();
  const requiredBuckets = new Set(
    designIds.map((id) => portalCatalogCardBucketNumber(id, manifest.cards.bucketCount)),
  );
  const paths = [...requiredBuckets].map((bucket) =>
    resolvePortalCatalogPath(manifest.cards.pathTemplate, { bucket }),
  );
  const buckets = await materializedCardBuckets.load(
    paths,
    async (path) => parsePortalCatalogCardBucket(await fetchJson(path)),
  );
  const cards = new Map(
    buckets.flatMap((bucket) => bucket.cards).map((card) => [card.id, card]),
  );
  if (manifest.cardOverrides) {
    const overrides = parsePortalCatalogCardOverrides(
      await fetchJson(manifest.cardOverrides.path),
    );
    return studioGeneratedCardOverrideService.apply(
      applyPortalCatalogCardOverrides(cards, overrides.cards),
      manifest.contentVersion,
    );
  }
  return studioGeneratedCardOverrideService.apply(cards, manifest.contentVersion);
}

async function invalidateDesignCard(designId: string): Promise<boolean> {
  try {
    const manifest = await loadManifest();
    const bucket = portalCatalogCardBucketNumber(designId, manifest.cards.bucketCount);
    const path = resolvePortalCatalogPath(manifest.cards.pathTemplate, { bucket });
    materializedCardBuckets.delete(path);
    return cache.delete(path);
  } catch {
    return false;
  }
}

/**
 * The same public client-safe taxonomy snapshot Portal already publishes and consumes
 * (`generated/catalog-reference/manifest.json` + `client/**`) — reused as-is for Studio's Design
 * Library category dropdown and tag filter/narrowing, replacing the previously-unconditional
 * `categoryService.listCategories`/`catalogTagService.listTags` Firestore reads on every mount (see
 * the Wave C Plan amendment's taxonomy-read-gap correction). `id/name/aliases/status` cover every
 * field the Design Library's tag-picker/suggestion/search-lookup code actually reads;
 * server-only `preferredWhen` guidance text (never in this public snapshot) is intentionally not
 * matched by tag-modal search anymore — see the Plan amendment for the narrow, owner-approved
 * behavior note. This is unrelated to Studio's separate tag-management page (`TagManagementModal`),
 * which keeps its own Firestore path since it needs the full approved+archived taxonomy with
 * `preferredWhen` for editing — out of scope here.
 */
async function loadClientTaxonomy(): Promise<ClientCatalogReferenceSnapshot> {
  if (referenceCache && referenceCache.expiresAtMs > Date.now()) return referenceCache.value;
  if (referenceLoad) return referenceLoad;
  referenceLoad = (async () => {
    cache.delete(REFERENCE_MANIFEST_PATH);
    const manifest = parseAsset(
      REFERENCE_MANIFEST_PATH,
      await fetchJson(REFERENCE_MANIFEST_PATH),
      parseCatalogReferenceManifest,
      "shared-schema-parsing",
    );
    if (!manifest.clientPath) {
      traceStorageAssetComplete(
        assetClassForPath(REFERENCE_MANIFEST_PATH),
        { app: "studio", triggerReason: "route" },
        {
          errorCode: "taxonomy-client-path-missing",
          failureCode: "taxonomy-client-path-missing",
          failureStage: "manifest-path-resolution",
        },
      );
      throw new Error("Generated taxonomy client path is unavailable.");
    }
    const snapshot = parseAsset(
      manifest.clientPath,
      await fetchJson(manifest.clientPath),
      parseClientCatalogReferenceSnapshot,
      "shared-schema-parsing",
    );
    if (snapshot.contentVersion !== manifest.contentVersion) throw new Error("Stale taxonomy asset.");
    referenceCache = { value: snapshot, expiresAtMs: Date.now() + MANIFEST_TTL_MS };
    return snapshot;
  })();
  try {
    return await referenceLoad;
  } finally {
    referenceLoad = null;
  }
}

export const studioCatalogAssetService = {
  invalidateDesignCard,
  listReadyIndex,
  loadCards,
  loadClientTaxonomy,
};
