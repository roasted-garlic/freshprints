import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type {
  GetCustomerUploadCatalogPermissionFollowUpResponse,
} from "../../packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types";

import { adminDb, adminStorage } from "./lib/admin";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { storageObjectPath } from "./lib/storageObjectPath";

const PREVIEW_URL_TTL_MS = 10 * 60 * 1000;

function parseToken(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("Permission request token is required.");
  }
  const token = (data as Record<string, unknown>).requestToken;
  if (typeof token !== "string" || token.trim().length < 20 || token.trim().length > 128) {
    throw new Error("Permission request token is invalid.");
  }
  return token.trim();
}

function resolveStatus(value: unknown): GetCustomerUploadCatalogPermissionFollowUpResponse["status"] {
  return value === "requested" || value === "approved" || value === "declined" ? value : "not_requested";
}

export const getCustomerUploadCatalogPermissionFollowUp = onCall(
  async (request): Promise<GetCustomerUploadCatalogPermissionFollowUpResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    await requirePortalCustomer(request.auth.uid);

    let requestToken: string;
    try {
      requestToken = parseToken(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const snapshot = await adminDb
      .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
      .where("catalogPermissionFollowUpRequestToken", "==", requestToken)
      .limit(1)
      .get();
    if (snapshot.empty) {
      throw permissionDenied("This permission request is no longer available.");
    }

    const uploadSnap = snapshot.docs[0]!;
    const upload = uploadSnap.data() ?? {};
    if (upload.customerUid !== request.auth.uid) {
      throw permissionDenied("You can only view your own permission requests.");
    }

    const printRequestId = typeof upload.printRequestId === "string" ? upload.printRequestId.trim() : "";
    if (!printRequestId) {
      throw permissionDenied("This permission request is not linked to a Print Request.");
    }

    const requestSnap = await adminDb.collection("printRequests").doc(printRequestId).get();
    const printRequestName =
      typeof requestSnap.data()?.name === "string" ? requestSnap.data()?.name.trim() : null;
    const previewPath =
      typeof upload.previewStoragePath === "string" && upload.previewStoragePath.trim()
        ? upload.previewStoragePath.trim()
        : typeof upload.thumbnailStoragePath === "string" && upload.thumbnailStoragePath.trim()
          ? upload.thumbnailStoragePath.trim()
          : null;

    let previewUrl: string | null = null;
    if (previewPath) {
      try {
        const [signedUrl] = await adminStorage.bucket().file(storageObjectPath(previewPath)).getSignedUrl({
          action: "read",
          expires: Date.now() + PREVIEW_URL_TTL_MS,
        });
        previewUrl = signedUrl ?? null;
      } catch (error) {
        console.warn("[getCustomerUploadCatalogPermissionFollowUp] preview signing failed", {
          uploadId: uploadSnap.id,
          error,
        });
      }
    }

    return {
      status: resolveStatus(upload.catalogPermissionFollowUpStatus),
      originalFilename:
        typeof upload.originalFilename === "string" && upload.originalFilename.trim()
          ? upload.originalFilename.trim()
          : "Uploaded artwork",
      previewUrl,
      printRequestName,
      printRequestId,
    };
  },
);
