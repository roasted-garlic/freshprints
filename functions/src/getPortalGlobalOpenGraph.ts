import { onRequest } from "firebase-functions/v2/https";

import {
  PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE,
  PORTAL_OG_IMAGE_FIT_CONTAIN,
  pickLibraryOgRotatedIndex,
  resolvePortalSocialMetaSettings,
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  type PortalLibraryOgRotationInterval,
} from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import {
  BRAND_LOGO_SETTINGS_DOC_ID,
  resolveBrandLogoSettings,
} from "../../packages/shared/src/constants/brand/brandLogoSettings.constants";
import {
  parsePortalCatalogDiscoverSnapshot,
  parsePortalCatalogManifest,
} from "../../packages/shared/src/catalog-snapshots/catalogSnapshot.parsers";
import {
  resolvePortalCatalogPath,
  type PortalCatalogCard,
} from "../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import { adminDb, adminStorage } from "./lib/admin";
import {
  buildPortalOgShareImageFunctionUrl,
  normalizeStorageObjectPath,
  resolveFirebaseProjectId,
} from "./lib/portalOgUrls";

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PORTAL_GLOBAL_OPEN_GRAPH_CACHE_TTL_MS = 60 * 60 * 1000;
const PORTAL_CATALOG_MANIFEST_PATH = "generated/portal-catalog/manifest.json";

export interface PortalGlobalOpenGraphResponse {
  ogTitle: string;
  ogDescription: string;
  /** Absolute HTTPS image URL for crawlers, or null to use Portal brand logo. */
  imageUrl: string | null;
  letterboxOgImages: boolean;
  globalOgImageSource: "library" | "logo";
}

export interface PortalGlobalOpenGraphAccounting {
  cacheStatus: "hit" | "miss" | "in-flight-reuse";
  settingsDocumentsRead: number;
  designDocumentsReturned: number;
  totalFirestoreDocumentReads: number;
  sourceMode: "library" | "logo";
}

export function createPortalGlobalOpenGraphCache<T>(ttlMs = PORTAL_GLOBAL_OPEN_GRAPH_CACHE_TTL_MS) {
  let resolved: { expiresAtMs: number; value: T } | null = null;
  let inFlight: Promise<T> | null = null;
  return {
    clear(): void {
      resolved = null;
      inFlight = null;
    },
    async get(loader: () => Promise<T>): Promise<{
      status: PortalGlobalOpenGraphAccounting["cacheStatus"];
      value: T;
    }> {
      if (resolved && resolved.expiresAtMs > Date.now()) {
        return { status: "hit", value: resolved.value };
      }
      resolved = null;
      if (inFlight) {
        return { status: "in-flight-reuse", value: await inFlight };
      }
      inFlight = loader().then((value) => {
        resolved = { expiresAtMs: Date.now() + ttlMs, value };
        return value;
      });
      try {
        return { status: "miss", value: await inFlight };
      } finally {
        inFlight = null;
      }
    },
  };
}

const responseCache = createPortalGlobalOpenGraphCache<{
  payload: PortalGlobalOpenGraphResponse;
  settingsDocumentsRead: number;
  designDocumentsReturned: number;
  totalFirestoreDocumentReads: number;
}>();

export function buildPortalGlobalOpenGraphAccounting(
  cacheStatus: PortalGlobalOpenGraphAccounting["cacheStatus"],
  sourceMode: PortalGlobalOpenGraphAccounting["sourceMode"],
  missReads: { settingsDocumentsRead: number; totalFirestoreDocumentReads: number },
): PortalGlobalOpenGraphAccounting {
  const isMiss = cacheStatus === "miss";
  return {
    cacheStatus,
    settingsDocumentsRead: isMiss ? missReads.settingsDocumentsRead : 0,
    designDocumentsReturned: 0,
    totalFirestoreDocumentReads: isMiss ? missReads.totalFirestoreDocumentReads : 0,
    sourceMode,
  };
}

async function resolveSignedImageUrl(storagePath: string): Promise<string | null> {
  const objectPath = normalizeStorageObjectPath(storagePath);
  if (!objectPath) {
    return null;
  }

  try {
    const file = adminStorage.bucket().file(objectPath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_TTL_MS,
    });
    return url;
  } catch {
    return null;
  }
}

async function resolveUploadedPortalLogoUrl(): Promise<string | null> {
  try {
    const snap = await adminDb.collection("settings").doc(BRAND_LOGO_SETTINGS_DOC_ID).get();
    const settings = resolveBrandLogoSettings(snap.data());
    const url = settings.portalFull?.downloadUrl?.trim();
    return url && url.startsWith("https://") ? url : null;
  } catch {
    return null;
  }
}

async function loadJsonStorageAsset(path: string): Promise<unknown> {
  const [bytes] = await adminStorage.bucket().file(path).download();
  return JSON.parse(bytes.toString("utf8")) as unknown;
}

async function resolveLibraryImageUrl(
  letterbox: boolean,
  rotationSalt: number,
  interval: PortalLibraryOgRotationInterval,
): Promise<string | null> {
  const manifest = parsePortalCatalogManifest(
    await loadJsonStorageAsset(PORTAL_CATALOG_MANIFEST_PATH),
  );
  if (manifest.recent.pageCount === 0) {
    return null;
  }
  const recentPath = resolvePortalCatalogPath(manifest.recent.pathTemplate, { page: 0 });
  const recent = parsePortalCatalogDiscoverSnapshot(await loadJsonStorageAsset(recentPath));
  const candidates = recent.designs.slice(0, PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE);
  const index = pickLibraryOgRotatedIndex(candidates.length, Date.now(), rotationSalt, interval);
  const data: PortalCatalogCard | undefined = candidates[index];
  const designId = data?.id ?? "";
  if (!designId) {
    return null;
  }

  if (letterbox) {
    const projectId = resolveFirebaseProjectId();
    if (!projectId) {
      return null;
    }
    return buildPortalOgShareImageFunctionUrl({
      projectId,
      designId,
      fit: PORTAL_OG_IMAGE_FIT_CONTAIN,
      backgroundHex: data?.artworkBackgroundHex,
    });
  }

  const imagePath =
    (typeof data?.previewPath === "string" && data.previewPath.trim()) ||
    (typeof data?.thumbnailPath === "string" && data.thumbnailPath.trim()) ||
    "";
  return imagePath ? resolveSignedImageUrl(imagePath) : null;
}

/**
 * Public GET for Portal non-design Open Graph (home, login, etc.).
 * Prefer this from Portal metadata so crawlers do not depend on App Hosting Admin ADC.
 */
export const getPortalGlobalOpenGraph = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "GET") {
      response.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const startedAtMs = Date.now();
    let accounting: PortalGlobalOpenGraphAccounting = {
      cacheStatus: "miss",
      settingsDocumentsRead: 0,
      designDocumentsReturned: 0,
      totalFirestoreDocumentReads: 0,
      sourceMode: "library",
    };
    try {
      const cached = await responseCache.get(async () => {
      const settingsSnap = await adminDb
        .collection("settings")
        .doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID)
        .get();
      const settings = resolvePortalSocialMetaSettings(settingsSnap.data());

      let imageUrl: string | null = null;
      if (settings.globalOgImageSource === "library") {
        imageUrl = await resolveLibraryImageUrl(
          settings.letterboxOgImages,
          settings.libraryOgRotationSalt,
          settings.libraryOgRotationInterval,
        );
      } else {
        imageUrl = await resolveUploadedPortalLogoUrl();
      }

      const payload: PortalGlobalOpenGraphResponse = {
        ogTitle: settings.ogTitle,
        ogDescription: settings.ogDescription,
        imageUrl,
        letterboxOgImages: settings.letterboxOgImages,
        globalOgImageSource: settings.globalOgImageSource,
      };
      const settingsDocumentsRead =
        1 + (settings.globalOgImageSource === "logo" ? 1 : 0);
      return {
        payload,
        settingsDocumentsRead,
        designDocumentsReturned: 0,
        totalFirestoreDocumentReads: settingsDocumentsRead,
      };
      });
      accounting = buildPortalGlobalOpenGraphAccounting(
        cached.status,
        cached.value.payload.globalOgImageSource,
        cached.value,
      );

      response.set("Cache-Control", "public, max-age=300");
      response.status(200).json(cached.value.payload);
      if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
        console.info("portal-global-open-graph-accounting", {
          ...accounting,
          durationMs: Date.now() - startedAtMs,
          outcome: "success",
        });
      }
    } catch (error) {
      if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
        console.info("portal-global-open-graph-accounting", {
          ...accounting,
          durationMs: Date.now() - startedAtMs,
          outcome: "failure",
          failureCode: error instanceof SyntaxError ? "asset-json-invalid" : "load-failed",
        });
      }
      response.status(500).json({ error: "internal" });
    }
  },
);
