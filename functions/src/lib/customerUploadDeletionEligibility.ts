import type { DeletionBlocker } from "../../../packages/shared/src/types/deletion/deletion.types";
import {
  CUSTOMER_UPLOAD_OWNED_STORAGE_PATH_FIELDS,
  parseCustomerUploadObjectPath,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";

export function resolveCustomerUploadDeletionBlockers(input: {
  printRequestItemCount: number;
  promotedDesignId: unknown;
  promotedDesignReferenceCount?: number;
}): DeletionBlocker[] {
  if (input.printRequestItemCount > 0) {
    return [
      {
        code: "attached_to_print_request",
        message: `This upload is still used by ${input.printRequestItemCount} print request item(s) and cannot be deleted.`,
        count: input.printRequestItemCount,
        navigateHint: "Print Requests",
      },
    ];
  }

  if (
    (typeof input.promotedDesignId === "string" && input.promotedDesignId.trim()) ||
    Number(input.promotedDesignReferenceCount ?? 0) > 0
  ) {
    return [
      {
        code: "promoted_to_design",
        message:
          "This upload has already been promoted to the Design Library and cannot be deleted here.",
        navigateHint: "Design Library",
      },
    ];
  }

  return [];
}

export interface CustomerUploadAssetManifest {
  paths: string[];
  blocker: DeletionBlocker | null;
}

export function resolveCustomerUploadAssetManifest(
  data: Record<string, unknown>,
  customerUploadId: string,
): CustomerUploadAssetManifest {
  const customerUid = typeof data.customerUid === "string" ? data.customerUid.trim() : "";
  if (!customerUid || !customerUploadId.trim()) {
    return invalidManifest("Upload ownership could not be verified safely.");
  }

  const approvedFields = new Set<string>(CUSTOMER_UPLOAD_OWNED_STORAGE_PATH_FIELDS);
  const unexpectedPathField = Object.keys(data).find(
    (key) => key.endsWith("StoragePath") && !approvedFields.has(key) && data[key] != null,
  );
  if (unexpectedPathField) {
    return invalidManifest("The upload has an unrecognized stored asset and cannot be deleted safely.");
  }

  const paths = new Set<string>();
  for (const field of CUSTOMER_UPLOAD_OWNED_STORAGE_PATH_FIELDS) {
    const raw = data[field];
    if (raw == null || raw === "") {
      continue;
    }
    if (typeof raw !== "string") {
      return invalidManifest("The upload asset manifest is invalid and cannot be deleted safely.");
    }
    const path = raw.trim();
    const parsed = parseCustomerUploadObjectPath(path);
    if (
      !parsed ||
      parsed.kind !== "upload_object" ||
      parsed.customerUid !== customerUid ||
      parsed.uploadId !== customerUploadId
    ) {
      return invalidManifest("An upload asset path could not be verified as owned by this upload.");
    }
    paths.add(path);
  }
  return { paths: [...paths], blocker: null };
}

function invalidManifest(message: string): CustomerUploadAssetManifest {
  return {
    paths: [],
    blocker: {
      code: "invalid_asset_manifest",
      message,
    },
  };
}

export function buildCustomerUploadBatchDeletionPatch(
  batchData: Record<string, unknown>,
  customerUploadId: string,
  technicalStatus: unknown,
): Record<string, unknown> {
  const manifest = Array.isArray(batchData.zipManifest) ? batchData.zipManifest : null;
  const nextManifest = manifest?.filter(
    (entry) =>
      !entry ||
      typeof entry !== "object" ||
      (entry as Record<string, unknown>).uploadId !== customerUploadId,
  );
  const removedManifestEntry = Boolean(manifest && nextManifest?.length !== manifest.length);
  const patch: Record<string, unknown> = {
    fileCount: Math.max(0, Number(batchData.fileCount ?? 0) - 1),
  };
  if (removedManifestEntry) {
    patch.zipManifest = nextManifest;
  }
  if (technicalStatus === "ready") {
    patch.readyCount = Math.max(0, Number(batchData.readyCount ?? 0) - 1);
  } else if (technicalStatus === "failed") {
    patch.failedCount = Math.max(0, Number(batchData.failedCount ?? 0) - 1);
  }
  return patch;
}
