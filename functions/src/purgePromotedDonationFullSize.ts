import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  evaluatePromotedDonationFullSizeRetention,
  PROMOTED_DONATION_FULL_SIZE_COOL_OFF_DAYS,
} from "../../packages/shared/src/utils/promotedDonationFullSizeRetention";

import { adminDb, adminStorage } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { storageObjectPath } from "./lib/storageObjectPath";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

const SCAN_LIMIT = 100;
const PURGE_CAP = 50;

export interface PurgePromotedDonationFullSizeRequest {
  dryRun?: boolean;
}

export interface PurgePromotedDonationFullSizeItemResult {
  uploadId: string;
  reason: string;
  purged: boolean;
  storageFilesDeleted?: number;
}

export interface PurgePromotedDonationFullSizeResponse {
  dryRun: boolean;
  coolOffDays: number;
  scanned: number;
  purgedCount: number;
  results: PurgePromotedDonationFullSizeItemResult[];
}

function assertOwnerAdmin(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can purge promoted donation full-size files.");
  }
}

function parseRequest(data: unknown): PurgePromotedDonationFullSizeRequest {
  if (data == null) {
    return { dryRun: false };
  }
  if (typeof data !== "object") {
    throw invalidArgument("Request data must be an object.");
  }
  return { dryRun: Boolean((data as { dryRun?: unknown }).dryRun) };
}

function timestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return null;
}

async function deleteStorageIfPresent(path: string | null | undefined): Promise<boolean> {
  if (typeof path !== "string" || !path.trim()) {
    return false;
  }
  try {
    await adminStorage.bucket().file(storageObjectPath(path)).delete({ ignoreNotFound: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Purges donation upload source+production 14 days after promote (ADR-FP-086 §4).
 * Catalog assets already live on design Storage paths.
 */
export const purgePromotedDonationFullSize = onCall(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (request): Promise<PurgePromotedDonationFullSizeResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdmin(caller);

    const payload = parseRequest(request.data);
    const dryRun = payload.dryRun === true;
    const nowMs = Date.now();

    const snapshot = await adminDb
      .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
      .where("purpose", "==", "catalog_donation")
      .where("catalogReviewStatus", "==", "sent_to_ai_review")
      .limit(SCAN_LIMIT)
      .get();

    const results: PurgePromotedDonationFullSizeItemResult[] = [];
    let scanned = 0;
    let purgedCount = 0;

    for (const docSnap of snapshot.docs) {
      if (purgedCount >= PURGE_CAP) {
        break;
      }

      scanned += 1;
      const data = docSnap.data() ?? {};

      const evaluation = evaluatePromotedDonationFullSizeRetention({
        purpose: typeof data.purpose === "string" ? data.purpose : null,
        catalogReviewStatus:
          typeof data.catalogReviewStatus === "string" ? data.catalogReviewStatus : null,
        promotedDesignId:
          typeof data.promotedDesignId === "string" ? data.promotedDesignId : null,
        fullSizePurgedAtMillis: timestampMillis(data.fullSizePurgedAt),
        promotedAtMillis: timestampMillis(data.promotedAt),
        updatedAtMillis: timestampMillis(data.updatedAt),
        nowMs,
      });

      if (!evaluation.eligible) {
        results.push({ uploadId: docSnap.id, reason: evaluation.reason, purged: false });
        continue;
      }

      if (dryRun) {
        results.push({ uploadId: docSnap.id, reason: evaluation.reason, purged: true });
        purgedCount += 1;
        continue;
      }

      let storageFilesDeleted = 0;
      if (await deleteStorageIfPresent(typeof data.sourceStoragePath === "string" ? data.sourceStoragePath : null)) {
        storageFilesDeleted += 1;
      }
      if (
        await deleteStorageIfPresent(
          typeof data.productionStoragePath === "string" ? data.productionStoragePath : null,
        )
      ) {
        storageFilesDeleted += 1;
      }

      await docSnap.ref.update({
        sourceStoragePath: null,
        productionStoragePath: null,
        fullSizePurgedAt: FieldValue.serverTimestamp(),
        fullSizePurgedBy: caller.id,
        updatedAt: FieldValue.serverTimestamp(),
      });

      results.push({
        uploadId: docSnap.id,
        reason: evaluation.reason,
        purged: true,
        storageFilesDeleted,
      });
      purgedCount += 1;
    }

    return {
      dryRun,
      coolOffDays: PROMOTED_DONATION_FULL_SIZE_COOL_OFF_DAYS,
      scanned,
      purgedCount,
      results,
    };
  },
);
