import { onRequest } from "firebase-functions/v2/https";

import {
  PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE,
  PORTAL_OG_IMAGE_FIT_CONTAIN,
  pickLibraryOgRotatedIndex,
  resolvePortalSocialMetaSettings,
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  type PortalGlobalOgImageSource,
  type PortalLibraryOgRotationInterval,
} from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import {
  BRAND_LOGO_SETTINGS_DOC_ID,
  resolveBrandLogoSettings,
} from "../../packages/shared/src/constants/brand/brandLogoSettings.constants";
import { adminDb, adminStorage } from "./lib/admin";
import {
  buildPortalOgShareImageFunctionUrl,
  normalizeStorageObjectPath,
  resolveFirebaseProjectId,
} from "./lib/portalOgUrls";
import { resolveStaticOgImageUrl } from "./portalStaticOgImage";

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Short TTL so multi-instance Functions converge after Save without hour-long sticky stale meta. */
export const PORTAL_GLOBAL_OPEN_GRAPH_CACHE_TTL_MS = 60 * 1000;

export interface PortalGlobalOpenGraphResponse {
  ogTitle: string;
  ogDescription: string;
  /** Absolute HTTPS image URL for crawlers, or null to use Portal brand logo. */
  imageUrl: string | null;
  letterboxOgImages: boolean;
  globalOgImageSource: PortalGlobalOgImageSource;
  /** Settings `updatedAt` millis when available — Portal cache-bust / version key. */
  updatedAtMs: number | null;
}

export interface PortalGlobalOpenGraphAccounting {
  cacheStatus: "hit" | "miss" | "in-flight-reuse";
  settingsDocumentsRead: number;
  designDocumentsReturned: number;
  totalFirestoreDocumentReads: number;
  sourceMode: PortalGlobalOgImageSource;
}

export interface PortalOgLibraryDesignCandidate {
  id: string;
  readyAtMs: number | null;
  createdAtMs: number | null;
  previewPath?: string;
  thumbnailPath?: string;
  artworkBackgroundHex?: string;
  /** When true, must never be used for generic/non-design OG imagery. */
  isExplicitContent?: boolean;
}

/**
 * Generic Portal surfaces must never rotate Explicit Content artwork into social previews.
 * Direct design share OG is handled separately and may use real artwork intentionally.
 */
export function filterPortalOgLibraryCandidatesExcludingExplicit(
  candidates: readonly PortalOgLibraryDesignCandidate[],
): PortalOgLibraryDesignCandidate[] {
  return candidates.filter((candidate) => candidate.isExplicitContent !== true);
}

type CachedGlobalOpenGraph = {
  payload: PortalGlobalOpenGraphResponse;
  settingsDocumentsRead: number;
  designDocumentsReturned: number;
  totalFirestoreDocumentReads: number;
  settingsUpdatedAtMs: number | null;
};

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

const responseCache = createPortalGlobalOpenGraphCache<CachedGlobalOpenGraph>();

/** Clear in-process Global OG cache after settings Save (same Cloud Function instance). */
export function invalidatePortalGlobalOpenGraphCache(): void {
  responseCache.clear();
}

export function buildPortalGlobalOpenGraphAccounting(
  cacheStatus: PortalGlobalOpenGraphAccounting["cacheStatus"],
  sourceMode: PortalGlobalOpenGraphAccounting["sourceMode"],
  missReads: {
    settingsDocumentsRead: number;
    designDocumentsReturned: number;
    totalFirestoreDocumentReads: number;
  },
): PortalGlobalOpenGraphAccounting {
  const isMiss = cacheStatus === "miss";
  return {
    cacheStatus,
    settingsDocumentsRead: isMiss ? missReads.settingsDocumentsRead : 0,
    designDocumentsReturned: isMiss ? missReads.designDocumentsReturned : 0,
    totalFirestoreDocumentReads: isMiss ? missReads.totalFirestoreDocumentReads : 0,
    sourceMode,
  };
}

function toMillis(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function rankingTimestampMs(candidate: PortalOgLibraryDesignCandidate): number {
  return candidate.readyAtMs ?? candidate.createdAtMs ?? 0;
}

/**
 * Merge dual ready-design query pages by id, then rank by (readyAt ?? createdAt) desc, id desc.
 * Pure helper for tests.
 */
export function mergeAndRankPortalOgLibraryCandidates(
  pages: readonly PortalOgLibraryDesignCandidate[][],
  limit = PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE,
): PortalOgLibraryDesignCandidate[] {
  const byId = new Map<string, PortalOgLibraryDesignCandidate>();
  for (const page of pages) {
    for (const candidate of page) {
      if (!candidate.id) continue;
      const existing = byId.get(candidate.id);
      if (!existing) {
        byId.set(candidate.id, candidate);
        continue;
      }
      // Prefer the copy with the richer ranking timestamp if both pages returned the same id.
      if (rankingTimestampMs(candidate) > rankingTimestampMs(existing)) {
        byId.set(candidate.id, candidate);
      }
    }
  }

  return [...byId.values()]
    .sort((a, b) => {
      const rankDiff = rankingTimestampMs(b) - rankingTimestampMs(a);
      if (rankDiff !== 0) return rankDiff;
      return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
    })
    .slice(0, limit);
}

function mapDesignDocToCandidate(
  id: string,
  data: Record<string, unknown>,
): PortalOgLibraryDesignCandidate {
  const previewPath =
    typeof data.previewPath === "string" && data.previewPath.trim()
      ? data.previewPath.trim()
      : undefined;
  const thumbnailPath =
    typeof data.thumbnailPath === "string" && data.thumbnailPath.trim()
      ? data.thumbnailPath.trim()
      : undefined;
  const artworkBackgroundHex =
    typeof data.artworkBackgroundHex === "string" && data.artworkBackgroundHex.trim()
      ? data.artworkBackgroundHex.trim()
      : undefined;

  return {
    id,
    readyAtMs: toMillis(data.readyAt),
    createdAtMs: toMillis(data.createdAt),
    ...(previewPath ? { previewPath } : {}),
    ...(thumbnailPath ? { thumbnailPath } : {}),
    ...(artworkBackgroundHex ? { artworkBackgroundHex } : {}),
    ...(data.isExplicitContent === true ? { isExplicitContent: true } : {}),
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

async function loadReadyDesignCandidatesForOg(): Promise<{
  candidates: PortalOgLibraryDesignCandidate[];
  designDocumentsReturned: number;
}> {
  const designs = adminDb.collection("designs");
  const [readyAtPage, createdAtPage] = await Promise.all([
    designs
      .where("status", "==", "ready")
      .orderBy("readyAt", "desc")
      .limit(PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE)
      .get(),
    designs
      .where("status", "==", "ready")
      .orderBy("createdAt", "desc")
      .limit(PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE)
      .get(),
  ]);

  const readyAtCandidates = readyAtPage.docs.map((doc) =>
    mapDesignDocToCandidate(doc.id, doc.data() as Record<string, unknown>),
  );
  const createdAtCandidates = createdAtPage.docs.map((doc) =>
    mapDesignDocToCandidate(doc.id, doc.data() as Record<string, unknown>),
  );

  return {
    candidates: filterPortalOgLibraryCandidatesExcludingExplicit(
      mergeAndRankPortalOgLibraryCandidates([readyAtCandidates, createdAtCandidates]),
    ),
    designDocumentsReturned: readyAtPage.size + createdAtPage.size,
  };
}

async function resolveLibraryImageUrl(
  letterbox: boolean,
  rotationSalt: number,
  interval: PortalLibraryOgRotationInterval,
): Promise<{ imageUrl: string | null; designDocumentsReturned: number }> {
  const { candidates, designDocumentsReturned } = await loadReadyDesignCandidatesForOg();
  if (candidates.length === 0) {
    return { imageUrl: null, designDocumentsReturned };
  }

  const index = pickLibraryOgRotatedIndex(
    candidates.length,
    Date.now(),
    rotationSalt,
    interval,
  );
  const data = candidates[index];
  const designId = data?.id ?? "";
  if (!designId) {
    return { imageUrl: null, designDocumentsReturned };
  }

  if (letterbox) {
    const projectId = resolveFirebaseProjectId();
    if (!projectId) {
      return { imageUrl: null, designDocumentsReturned };
    }
    return {
      imageUrl: buildPortalOgShareImageFunctionUrl({
        projectId,
        designId,
        fit: PORTAL_OG_IMAGE_FIT_CONTAIN,
        backgroundHex: data?.artworkBackgroundHex,
      }),
      designDocumentsReturned,
    };
  }

  const imagePath =
    (typeof data?.previewPath === "string" && data.previewPath.trim()) ||
    (typeof data?.thumbnailPath === "string" && data.thumbnailPath.trim()) ||
    "";
  return {
    imageUrl: imagePath ? await resolveSignedImageUrl(imagePath) : null,
    designDocumentsReturned,
  };
}

function parseClientCacheBustVersion(raw: unknown): number | null {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw.trim());
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  return null;
}

async function loadCachedGlobalOpenGraph(): Promise<CachedGlobalOpenGraph> {
  const settingsSnap = await adminDb
    .collection("settings")
    .doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID)
    .get();
  const settings = resolvePortalSocialMetaSettings(settingsSnap.data());
  const settingsUpdatedAtMs = toMillis(settings.updatedAt) ?? toMillis(settingsSnap.updateTime);

  let imageUrl: string | null = null;
  let designDocumentsReturned = 0;
  let brandLogoSettingsRead = 0;

  if (settings.globalOgImageSource === "library") {
    const library = await resolveLibraryImageUrl(
      settings.letterboxOgImages,
      settings.libraryOgRotationSalt,
      settings.libraryOgRotationInterval,
    );
    imageUrl = library.imageUrl;
    designDocumentsReturned = library.designDocumentsReturned;
  } else if (settings.globalOgImageSource === "static") {
    imageUrl = await resolveStaticOgImageUrl(settings.staticOgImage);
    if (!imageUrl) {
      // Fail-safe: missing static asset → brand logo, then null (Portal bundled logo).
      imageUrl = await resolveUploadedPortalLogoUrl();
      brandLogoSettingsRead = 1;
    }
  } else {
    imageUrl = await resolveUploadedPortalLogoUrl();
    brandLogoSettingsRead = 1;
  }

  const payload: PortalGlobalOpenGraphResponse = {
    ogTitle: settings.ogTitle,
    ogDescription: settings.ogDescription,
    imageUrl,
    letterboxOgImages: settings.letterboxOgImages,
    globalOgImageSource: settings.globalOgImageSource,
    updatedAtMs: settingsUpdatedAtMs,
  };
  const settingsDocumentsRead = 1 + brandLogoSettingsRead;
  return {
    payload,
    settingsDocumentsRead,
    designDocumentsReturned,
    totalFirestoreDocumentReads: settingsDocumentsRead + designDocumentsReturned,
    settingsUpdatedAtMs,
  };
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
      const clientVersion = parseClientCacheBustVersion(request.query.v);
      let cached = await responseCache.get(loadCachedGlobalOpenGraph);

      // Portal passes settings updatedAt as ?v= — bust sticky in-process cache across instances.
      if (
        clientVersion !== null &&
        cached.value.settingsUpdatedAtMs !== null &&
        clientVersion !== cached.value.settingsUpdatedAtMs &&
        cached.status === "hit"
      ) {
        invalidatePortalGlobalOpenGraphCache();
        cached = await responseCache.get(loadCachedGlobalOpenGraph);
      }

      accounting = buildPortalGlobalOpenGraphAccounting(
        cached.status,
        cached.value.payload.globalOgImageSource,
        cached.value,
      );

      response.set("Cache-Control", "public, max-age=60");
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
