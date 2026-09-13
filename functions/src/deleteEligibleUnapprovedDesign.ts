import { onCall } from "firebase-functions/v2/https";

import type {
  DeleteEligibleUnapprovedDesignItemResult,
  DeleteEligibleUnapprovedDesignResponse,
} from "../../packages/shared/src/types/admin/deleteEligibleUnapprovedDesign.types";
import {
  getOriginalStoragePath,
  getPreviewStoragePath,
  getThumbnailStoragePath,
} from "../../packages/shared/src/constants/design/designStoragePaths";
import {
  isActiveAiPipelineStage,
  isDeleteEligibleUnapprovedDesignStatus,
  validateDeleteEligibleUnapprovedDesignRequest,
} from "../../packages/shared/src/utils/deleteEligibleUnapprovedDesignValidation";
import type { DeletionCallableWarmupResponse } from "../../packages/shared/src/types/deletion/deletionWarmup.types";
import { adminDb, adminStorage } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { deletionWarmupOk, isDeletionCallableWarmupRequest } from "./lib/deletionWarmup";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can permanently delete eligible unapproved designs.");
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

async function deleteDesignStorageAssets(designId: string): Promise<number> {
  const candidates = [
    toStorageObjectPath(getOriginalStoragePath(designId)),
    toStorageObjectPath(getThumbnailStoragePath(designId)),
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

async function collectReferenceBlockers(designId: string): Promise<string[]> {
  const blockers: string[] = [];

  const [printItems, showAllocations, companionLinks] = await Promise.all([
    adminDb.collection("printRequestItems").where("designId", "==", designId).limit(1).get(),
    adminDb.collection("showAllocations").where("designId", "==", designId).limit(1).get(),
    adminDb.collection("companionLinks").where("designIds", "array-contains", designId).limit(1).get(),
  ]);

  if (!printItems.empty) {
    blockers.push("Referenced by one or more print request items.");
  }

  if (!showAllocations.empty) {
    blockers.push("Referenced by one or more show allocations.");
  }

  if (!companionLinks.empty) {
    blockers.push("Linked in a companion relationship.");
  }

  return blockers;
}

function validationErrorMessage(
  error: NonNullable<ReturnType<typeof validateDeleteEligibleUnapprovedDesignRequest>["error"]>,
): string {
  switch (error) {
    case "design_ids_required":
      return "Select at least one unapproved design.";
    case "design_ids_too_many":
      return "You can permanently delete at most 25 designs at a time.";
    case "design_id_invalid":
      return "One or more design ids are invalid.";
    case "confirmation_required":
      return 'Type "DELETE UNAPPROVED DESIGNS" to confirm permanent delete.';
    case "confirmation_mismatch":
      return 'Confirmation phrase must be exactly "DELETE UNAPPROVED DESIGNS".';
    default:
      return "Invalid delete request.";
  }
}

async function deleteOneDesign(designId: string): Promise<DeleteEligibleUnapprovedDesignItemResult> {
  const designRef = adminDb.collection("designs").doc(designId);
  const snapshot = await designRef.get();

  if (!snapshot.exists) {
    return { designId, status: "skipped_already_deleted" };
  }

  const data = snapshot.data() ?? {};
  const title = typeof data.title === "string" ? data.title : undefined;
  const status = data.status;

  if (!isDeleteEligibleUnapprovedDesignStatus(status)) {
    return {
      designId,
      status: "failed",
      title,
      error:
        status === "ready"
          ? "Ready (catalog-approved) designs cannot be permanently deleted with this workflow."
          : `Status "${String(status)}" is not eligible for permanent unapproved delete.`,
    };
  }

  if (isActiveAiPipelineStage(data.aiProcessingStage)) {
    return {
      designId,
      status: "failed",
      title,
      error: "Design is actively mid AI pipeline and cannot be deleted until it settles.",
    };
  }

  const blockers = await collectReferenceBlockers(designId);

  if (typeof data.sourceCustomerUploadId === "string" && data.sourceCustomerUploadId.trim()) {
    blockers.push("Design was promoted from a customer upload (sourceCustomerUpload provenance).");
  }

  const companionIds = data.companionDesignIds;
  if (Array.isArray(companionIds) && companionIds.length > 0) {
    blockers.push("Design has companionDesignIds denorm links.");
  }

  if (typeof data.companionSetId === "string" && data.companionSetId.trim()) {
    blockers.push("Design is linked to a companion set.");
  }

  if (blockers.length > 0) {
    return {
      designId,
      status: "failed",
      title,
      error: blockers[0],
      blockers,
    };
  }

  // Storage first, then Firestore — idempotent retry: missing Storage objects ignored;
  // missing doc after Storage cleanup returns skipped_already_deleted.
  const storageFilesDeleted = await deleteDesignStorageAssets(designId);

  try {
    await designRef.delete();
  } catch (error) {
    return {
      designId,
      status: "failed",
      title,
      storageFilesDeleted,
      error:
        error instanceof Error
          ? `Storage cleaned but Firestore delete failed: ${error.message}. Retry to finish.`
          : "Storage cleaned but Firestore delete failed. Retry to finish.",
    };
  }

  return {
    designId,
    status: "deleted",
    title,
    storageFilesDeleted,
  };
}

export const deleteEligibleUnapprovedDesign = onCall(
  { timeoutSeconds: 300, memory: "512MiB" },
  async (
    request,
  ): Promise<DeleteEligibleUnapprovedDesignResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerCaller(caller);
    if (isDeletionCallableWarmupRequest(request.data)) {
      return deletionWarmupOk();
    }

    const validated = validateDeleteEligibleUnapprovedDesignRequest(request.data);
    if (!validated.ok || !validated.designIds) {
      throw invalidArgument(validationErrorMessage(validated.error ?? "request_required"));
    }

    const results: DeleteEligibleUnapprovedDesignItemResult[] = [];

    for (const designId of validated.designIds) {
      try {
        results.push(await deleteOneDesign(designId));
      } catch (error) {
        results.push({
          designId,
          status: "failed",
          error: error instanceof Error ? error.message : "Unable to delete design.",
        });
      }
    }

    return {
      results,
      deletedCount: results.filter((result) => result.status === "deleted").length,
      skippedCount: results.filter((result) => result.status === "skipped_already_deleted").length,
      failedCount: results.filter((result) => result.status === "failed").length,
    };
  },
);
