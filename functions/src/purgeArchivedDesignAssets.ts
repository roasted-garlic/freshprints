import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import type {
  PurgeArchivedDesignAssetsItemResult,
  PurgeArchivedDesignAssetsResponse,
} from "../../packages/shared/src/types/admin/purgeArchivedDesignAssets.types";
import {
  getOriginalStoragePath,
  getPreviewStoragePath,
} from "../../packages/shared/src/constants/design/designStoragePaths";
import {
  isDesignAssetsPurged,
  validatePurgeArchivedDesignAssetsRequest,
} from "../../packages/shared/src/utils/purgeArchivedDesignAssetsValidation";
import { adminDb, adminStorage } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

const ACTIVE_ALLOCATION_STATUSES = new Set(["pending", "queued", "in_progress"]);

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can delete archived design images.");
  }
}

function toStorageObjectPath(canonicalPath: string): string {
  return canonicalPath.replace(/^\//, "");
}

async function deleteStorageObject(objectPath: string): Promise<boolean> {
  try {
    await adminStorage.bucket().file(objectPath).delete({ ignoreNotFound: true });
    return true;
  } catch {
    return false;
  }
}

async function deleteLargeDesignAssets(designId: string): Promise<number> {
  // Keep /thumbnails/ for print-request / show-queue history reference.
  const candidates = [
    toStorageObjectPath(getOriginalStoragePath(designId)),
    toStorageObjectPath(getPreviewStoragePath(designId)),
  ];

  let deleted = 0;
  for (const objectPath of candidates) {
    if (await deleteStorageObject(objectPath)) {
      deleted += 1;
    }
  }

  return deleted;
}

async function designHasActiveShowAllocation(designId: string): Promise<boolean> {
  const snapshot = await adminDb
    .collection("showAllocations")
    .where("designId", "==", designId)
    .limit(25)
    .get();

  return snapshot.docs.some((document) => {
    const status = document.data()?.status;
    return typeof status === "string" && ACTIVE_ALLOCATION_STATUSES.has(status);
  });
}

function validationErrorMessage(
  error: NonNullable<ReturnType<typeof validatePurgeArchivedDesignAssetsRequest>["error"]>,
): string {
  switch (error) {
    case "design_ids_required":
      return "Select at least one archived design.";
    case "design_ids_too_many":
      return "You can delete images for at most 25 designs at a time.";
    case "design_id_invalid":
      return "One or more design ids are invalid.";
    case "bulk_confirmation_required":
      return 'Type "DELETE IMAGES" to confirm bulk delete.';
    case "bulk_confirmation_mismatch":
      return 'Confirmation phrase must be exactly "DELETE IMAGES".';
    default:
      return "Invalid purge request.";
  }
}

async function purgeOneDesign(
  designId: string,
  ownerUid: string,
  confirmActiveQueue: boolean,
): Promise<PurgeArchivedDesignAssetsItemResult> {
  const designRef = adminDb.collection("designs").doc(designId);
  const snapshot = await designRef.get();

  if (!snapshot.exists) {
    return { designId, status: "failed", error: "Design not found." };
  }

  const data = snapshot.data() ?? {};
  const title = typeof data.title === "string" ? data.title : undefined;

  if (data.status !== "archived") {
    return {
      designId,
      status: "failed",
      title,
      error: "Design must be archived before images can be deleted.",
    };
  }

  if (isDesignAssetsPurged(data)) {
    return { designId, status: "skipped_already_purged", title };
  }

  const hadActiveQueue = await designHasActiveShowAllocation(designId);
  if (hadActiveQueue && !confirmActiveQueue) {
    return {
      designId,
      status: "failed",
      title,
      hadActiveQueue: true,
      error: "Design is on an active show queue. Confirm to continue.",
    };
  }

  const storageFilesDeleted = await deleteLargeDesignAssets(designId);

  await designRef.update({
    assetsPurgedAt: FieldValue.serverTimestamp(),
    assetsPurgedBy: ownerUid,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: ownerUid,
  });

  return {
    designId,
    status: "purged",
    title,
    storageFilesDeleted,
    hadActiveQueue,
  };
}

export const purgeArchivedDesignAssets = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (request): Promise<PurgeArchivedDesignAssetsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerCaller(caller);

    const validated = validatePurgeArchivedDesignAssetsRequest(request.data);
    if (!validated.ok || !validated.designIds) {
      throw invalidArgument(validationErrorMessage(validated.error ?? "request_required"));
    }

    const results: PurgeArchivedDesignAssetsItemResult[] = [];

    for (const designId of validated.designIds) {
      try {
        results.push(
          await purgeOneDesign(designId, request.auth.uid, validated.confirmActiveQueue === true),
        );
      } catch (error) {
        results.push({
          designId,
          status: "failed",
          error: error instanceof Error ? error.message : "Unable to purge design assets.",
        });
      }
    }

    const activeQueueBlocked = results.filter(
      (result) => result.status === "failed" && result.hadActiveQueue === true,
    );
    if (
      activeQueueBlocked.length > 0 &&
      results.every((result) => result.status === "failed") &&
      validated.confirmActiveQueue !== true
    ) {
      throw failedPrecondition(
        "One or more designs are on an active show queue. Confirm to continue.",
      );
    }

    return {
      results,
      purgedCount: results.filter((result) => result.status === "purged").length,
      skippedCount: results.filter((result) => result.status === "skipped_already_purged").length,
      failedCount: results.filter((result) => result.status === "failed").length,
    };
  },
);
