import { onCall } from "firebase-functions/v2/https";

import { normalizeArtworkBackgroundHex } from "../../packages/shared/src/constants/design/artworkBackground.constants";
import type {
  PortalAdminShowQueueDesignItem,
  PortalAdminShowQueueRequestDesignsResponse,
} from "../../packages/shared/src/types/portal/getPortalAdminShowQueueRequestDesigns.types";
import { adminDb, adminStorage } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { failedPrecondition, internal, permissionDenied, unauthenticated } from "./lib/errors";
import { assertPortalAdminQueueCaller } from "./lib/portalAdminDailyShowQueue";
import {
  PORTAL_ADMIN_SHOW_QUEUE_IMAGE_TTL_MS,
  validatePortalAdminShowQueueRequestDesignsRequest,
} from "./lib/portalAdminShowQueueRequestDesigns";
import {
  isPortalAdminUpcomingQueueShow,
  mapDesignItemLabel,
  nonEmptyStringExport,
  resolveAllocationStatus,
  resolveItemOrigin,
  resolveItemSource,
  toMillisExport,
} from "./lib/portalAdminUpcomingShowQueueDashboard";
import { storageObjectPath } from "./lib/storageObjectPath";

type ArtworkAsset = {
  storagePath: string | null;
  artworkBackgroundHex?: string;
};

type ArtworkPreview = {
  imageUrl?: string;
  artworkBackgroundHex?: string;
};

function resolveProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ""
  );
}

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to load Show Queue designs right now.");
}

async function signDerivativeUrl(storagePath: string, expiresAtMs: number): Promise<string> {
  const file = adminStorage.bucket().file(storageObjectPath(storagePath));
  const [existsResult, signedUrlResult] = await Promise.all([
    file.exists(),
    file.getSignedUrl({
      action: "read",
      expires: expiresAtMs,
    }),
  ]);
  const [exists] = existsResult;
  if (!exists) {
    throw failedPrecondition("Artwork preview is unavailable.");
  }
  const [url] = signedUrlResult;
  return url;
}

async function resolveCatalogArtworkAsset(designId: string): Promise<ArtworkAsset> {
  const snapshot = await adminDb.collection("designs").doc(designId).get();
  if (!snapshot.exists) {
    return { storagePath: null };
  }
  const data = snapshot.data() as Record<string, unknown>;
  // Prefer preview over thumbnail so lightbox/list match regular Portal size quality.
  const storagePath =
    nonEmptyStringExport(data.previewPath) ?? nonEmptyStringExport(data.thumbnailPath) ?? null;
  const artworkBackgroundHex = normalizeArtworkBackgroundHex(data.artworkBackgroundHex) ?? undefined;
  return { storagePath, ...(artworkBackgroundHex ? { artworkBackgroundHex } : {}) };
}

async function resolveUploadArtworkAsset(uploadId: string): Promise<ArtworkAsset> {
  const snapshot = await adminDb.collection("customerUploads").doc(uploadId).get();
  if (!snapshot.exists) {
    return { storagePath: null };
  }
  const data = snapshot.data() as Record<string, unknown>;
  const storagePath =
    nonEmptyStringExport(data.previewStoragePath) ??
    nonEmptyStringExport(data.thumbnailStoragePath) ??
    null;
  return { storagePath };
}

async function resolveArtworkPreview(
  data: Record<string, unknown>,
  source: "catalog_design" | "customer_upload" | "staff_artwork",
  expiresAtMs: number,
  artworkCache: Map<string, Promise<ArtworkAsset>>,
): Promise<ArtworkPreview> {
  try {
    if (source === "staff_artwork") {
      return {};
    }
    const objectId = nonEmptyStringExport(source === "catalog_design" ? data.designId : data.customerUploadId);
    if (!objectId) {
      return {};
    }
    let assetPromise = artworkCache.get(`${source}:${objectId}`);
    if (!assetPromise) {
      assetPromise =
        source === "catalog_design"
          ? resolveCatalogArtworkAsset(objectId)
          : resolveUploadArtworkAsset(objectId);
      artworkCache.set(`${source}:${objectId}`, assetPromise);
    }
    const asset = await assetPromise;
    if (!asset.storagePath) {
      return asset.artworkBackgroundHex ? { artworkBackgroundHex: asset.artworkBackgroundHex } : {};
    }
    const imageUrl = await signDerivativeUrl(asset.storagePath, expiresAtMs);
    return {
      imageUrl,
      ...(asset.artworkBackgroundHex ? { artworkBackgroundHex: asset.artworkBackgroundHex } : {}),
    };
  } catch {
    return {};
  }
}

export const getPortalAdminShowQueueRequestDesigns = onCall(
  async (request): Promise<PortalAdminShowQueueRequestDesignsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const input = validatePortalAdminShowQueueRequestDesignsRequest(request.data);
      const caller = await loadCallerProfile(request.auth.uid);
      assertPortalAdminQueueCaller(caller);

      const now = new Date();
      const showSnapshot = await adminDb.collection("upcomingShows").doc(input.showId).get();
      if (!showSnapshot.exists) {
        throw permissionDenied("Show Queue designs are not available for this show.");
      }
      const showData = showSnapshot.data() as Record<string, unknown>;
      if (!isPortalAdminUpcomingQueueShow(showData, now, resolveProjectId())) {
        throw permissionDenied("Show Queue designs are not available for this show.");
      }

      const allocationsSnapshot = await adminDb
        .collection("showAllocations")
        .where("upcomingShowId", "==", input.showId)
        .get();

      const allocations = allocationsSnapshot.docs
        .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
        .filter((doc) => nonEmptyStringExport(doc.data.printRequestId) === input.printRequestId);

      if (allocations.length === 0) {
        throw permissionDenied("This Print Request is not attached to the selected show.");
      }

      const activeAllocations = allocations
        .filter((doc) => resolveAllocationStatus(doc.data.status) !== "canceled")
        .sort((left, right) => {
          const leftMs = toMillisExport(left.data.createdAt) ?? 0;
          const rightMs = toMillisExport(right.data.createdAt) ?? 0;
          return leftMs - rightMs || left.id.localeCompare(right.id);
        });

      if (activeAllocations.length === 0) {
        throw permissionDenied("This Print Request has no active designs on the selected show.");
      }

      const requestSnapshot = await adminDb.collection("printRequests").doc(input.printRequestId).get();
      const requestName =
        nonEmptyStringExport(requestSnapshot.data()?.name) ??
        nonEmptyStringExport(activeAllocations[0]?.data.requestNameSnapshot) ??
        "Unnamed request";

      const imageExpiresAtMs = Date.now() + PORTAL_ADMIN_SHOW_QUEUE_IMAGE_TTL_MS;
      const artworkCache = new Map<string, Promise<ArtworkAsset>>();
      // Artwork metadata and signed URLs are independent per allocation. Resolve them concurrently
      // so a request with several designs is bounded by the slowest preview, not their sum.
      const items: PortalAdminShowQueueDesignItem[] = await Promise.all(
        activeAllocations.map(async (allocation) => {
          const data = allocation.data;
          const source = resolveItemSource(data);
          const width =
            typeof data.printWidthInches === "number" && Number.isFinite(data.printWidthInches)
              ? data.printWidthInches
              : undefined;
          const height =
            typeof data.printHeightInches === "number" && Number.isFinite(data.printHeightInches)
              ? data.printHeightInches
              : undefined;
          const quantity =
            typeof data.allocatedQuantity === "number" && Number.isFinite(data.allocatedQuantity)
              ? Math.max(0, data.allocatedQuantity)
              : 0;
          const preview = await resolveArtworkPreview(data, source, imageExpiresAtMs, artworkCache);

          return {
            label: mapDesignItemLabel(data),
            source,
            status: resolveAllocationStatus(data.status),
            quantity,
            ...(width !== undefined ? { printWidthInches: width } : {}),
            ...(height !== undefined ? { printHeightInches: height } : {}),
            ...(nonEmptyStringExport(data.sizeLabel)
              ? { sizeLabel: nonEmptyStringExport(data.sizeLabel) }
              : {}),
            origin: resolveItemOrigin(data),
            ...(preview.imageUrl ? { imageUrl: preview.imageUrl, imageExpiresAtMs } : {}),
            ...(preview.artworkBackgroundHex
              ? { artworkBackgroundHex: preview.artworkBackgroundHex }
              : {}),
          } satisfies PortalAdminShowQueueDesignItem;
        }),
      );

      return {
        showId: input.showId,
        printRequestId: input.printRequestId,
        requestName,
        generatedAtMs: now.getTime(),
        items,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export {
  PORTAL_ADMIN_SHOW_QUEUE_IMAGE_TTL_MS,
  validatePortalAdminShowQueueRequestDesignsRequest,
};
