import { Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  buildCatalogImageStorageInventoryReport,
  type CatalogImageStorageDesignRecord,
  type CatalogImageStorageInventoryReport,
  type CatalogImageStorageObjectMetadata,
  type CatalogImageStoragePathFamily,
  type CatalogImageStoragePromotionRecord,
} from "../../packages/shared/src/utils/catalogImageStorageInventory";
import { DESIGN_STORAGE_ROOTS } from "../../packages/shared/src/constants/design/designStoragePaths";
import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";

import { adminDb, adminStorage } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { permissionDenied, unauthenticated } from "./lib/errors";

const DESIGN_SCAN_LIMIT = 500;
const PROMOTION_SCAN_LIMIT = 200;
const GENERATED_ASSET_PREFIXES = ["generated/catalog-reference", "generated/portal-catalog"];

function assertOwnerAdmin(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can inventory catalog image Storage.");
  }
}

function timestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return null;
}

function designIdFromObjectName(name: string): string {
  const fileName = name.split("/").pop() ?? "";
  return fileName.replace(/\.(png|webp)$/i, "");
}

/**
 * Metadata-only listing (no bytes downloaded) for one path-family prefix. Bounded per-invocation —
 * this repo's catalog is small enough (~80 designs at time of writing) that one page per family is
 * expected to be sufficient; a `pageToken`-based follow-up call is supported for future growth.
 */
async function listFamilyObjects(
  family: CatalogImageStoragePathFamily,
  prefix: string,
  pageToken: string | undefined,
): Promise<{ objects: CatalogImageStorageObjectMetadata[]; nextPageToken: string | undefined }> {
  const bucket = adminStorage.bucket();
  const [files, nextQuery] = await bucket.getFiles({
    prefix: `${prefix}/`,
    autoPaginate: false,
    maxResults: 1000,
    pageToken,
  });

  const objects: CatalogImageStorageObjectMetadata[] = files.map((file) => ({
    path: file.name,
    family,
    designId: designIdFromObjectName(file.name),
    sizeBytes: Number(file.metadata.size ?? 0),
    timeCreated: file.metadata.timeCreated ?? null,
    updated: file.metadata.updated ?? null,
  }));

  const nextPageToken =
    nextQuery && typeof nextQuery === "object" && "pageToken" in nextQuery
      ? ((nextQuery as { pageToken?: string }).pageToken ?? undefined)
      : undefined;

  return { objects, nextPageToken };
}

export interface InventoryCatalogImageStorageResponse {
  dryRun: true;
  scannedFamilies: CatalogImageStoragePathFamily[];
  designsScanned: number;
  promotionsScanned: number;
  report: CatalogImageStorageInventoryReport;
  /** Present when any family's listing was truncated at the per-invocation page size. */
  truncatedFamilies: CatalogImageStoragePathFamily[];
}

/**
 * Dry-run-only Storage inventory for catalog design images (Goal #12). Never deletes or modifies
 * any Storage object or Firestore document — lists object metadata, cross-references it against
 * `designs` and `customerUploads` (for promotion cool-off detection), and returns the classified
 * report from the pure `buildCatalogImageStorageInventoryReport` function. No delete mode exists
 * in this callable; building one is explicitly out of scope for this checkpoint.
 */
export const inventoryCatalogImageStorage = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (request): Promise<InventoryCatalogImageStorageResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdmin(caller);

    const families: Array<{ family: CatalogImageStoragePathFamily; prefix: string }> = [
      { family: "originals", prefix: DESIGN_STORAGE_ROOTS.originals },
      { family: "thumbnails", prefix: DESIGN_STORAGE_ROOTS.thumbnails },
      { family: "previews", prefix: DESIGN_STORAGE_ROOTS.previews },
      { family: "display", prefix: DESIGN_STORAGE_ROOTS.display },
    ];

    const allObjects: CatalogImageStorageObjectMetadata[] = [];
    const truncatedFamilies: CatalogImageStoragePathFamily[] = [];

    for (const { family, prefix } of families) {
      const { objects, nextPageToken } = await listFamilyObjects(family, prefix, undefined);
      allObjects.push(...objects);
      if (nextPageToken) {
        truncatedFamilies.push(family);
      }
    }

    // Generated JSON manifests are whole-catalog assets, not per-design objects — metadata-only,
    // counted and totaled by prefix but not run through the per-design classifier (see
    // `CatalogImageStorageGeneratedAssetTotals`'s doc comment for why).
    const generatedAssets: Array<{ prefix: string; sizeBytes: number }> = [];
    for (const prefix of GENERATED_ASSET_PREFIXES) {
      const bucket = adminStorage.bucket();
      const [files] = await bucket.getFiles({ prefix: `${prefix}/`, autoPaginate: true, maxResults: 1000 });
      for (const file of files) {
        generatedAssets.push({ prefix, sizeBytes: Number(file.metadata.size ?? 0) });
      }
    }

    const designsSnap = await adminDb.collection("designs").limit(DESIGN_SCAN_LIMIT).get();
    const designs: CatalogImageStorageDesignRecord[] = designsSnap.docs.map((doc) => {
      const data = doc.data() ?? {};
      return {
        designId: doc.id,
        status:
          typeof data.status === "string"
            ? (data.status as CatalogImageStorageDesignRecord["status"])
            : "imported",
        originalPath: typeof data.originalPath === "string" ? data.originalPath : null,
        thumbnailPath: typeof data.thumbnailPath === "string" ? data.thumbnailPath : null,
        previewPath: typeof data.previewPath === "string" ? data.previewPath : null,
        displayPath: typeof data.displayPath === "string" ? data.displayPath : null,
        assetsPurgedAt: data.assetsPurgedAt ?? null,
        sourceCustomerUploadId:
          typeof data.sourceCustomerUploadId === "string" ? data.sourceCustomerUploadId : null,
      };
    });

    // Mirrors purgePromotedDonationFullSize.ts's exact query pattern (equality filter on a known
    // status value) rather than a `!=` filter on `promotedDesignId` — no code in this repository
    // queries that field with a Firestore filter today, and `!=` queries silently exclude
    // documents where the field is absent entirely (as opposed to explicitly `null`), which would
    // make the scan quietly incomplete. Reading in application code (`typeof === "string"`) is
    // this codebase's established pattern for this exact field, confirmed via
    // `promoteCustomerUploadToAiReview.ts`, `excludeCustomerUploadFromCatalog.ts`,
    // `restoreCustomerUploadCatalogEligibility.ts`.
    const promotedSnap = await adminDb
      .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
      .where("catalogReviewStatus", "==", "sent_to_ai_review")
      .limit(PROMOTION_SCAN_LIMIT)
      .get();
    const promotions: CatalogImageStoragePromotionRecord[] = promotedSnap.docs
      .map((doc) => {
        const data = doc.data() ?? {};
        const promotedDesignId =
          typeof data.promotedDesignId === "string" && data.promotedDesignId.trim()
            ? data.promotedDesignId.trim()
            : null;
        if (!promotedDesignId) {
          return null;
        }
        return {
          uploadId: doc.id,
          promotedDesignId,
          promotedAtMillis: timestampMillis(data.promotedAt),
          fullSizePurgedAt: data.fullSizePurgedAt ?? null,
        };
      })
      .filter((entry): entry is CatalogImageStoragePromotionRecord => entry !== null);

    const report = buildCatalogImageStorageInventoryReport({
      objects: allObjects,
      designs,
      promotions,
      nowMs: Date.now(),
      generatedAssets,
    });

    return {
      dryRun: true,
      scannedFamilies: families.map((f) => f.family),
      designsScanned: designs.length,
      promotionsScanned: promotions.length,
      report,
      truncatedFamilies,
    };
  },
);
