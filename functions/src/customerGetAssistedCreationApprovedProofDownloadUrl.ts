import { onCall } from "firebase-functions/v2/https";

import type {
  CustomerGetAssistedCreationApprovedProofDownloadUrlRequest,
  CustomerGetAssistedCreationApprovedProofDownloadUrlResponse,
} from "../../packages/shared/src/types/assistedCreation/assistedCreationActions.types";

import {
  approvedProofStorageFile,
  resolveAssistedCreationApprovedProofDownload,
} from "./lib/assistedCreationApprovedProofDownload";
import { internal, invalidArgument, unauthenticated } from "./lib/errors";

/** Short-lived signed URL TTL — kept for legacy callers; prefer HTTP download stream. */
const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

/**
 * @deprecated Prefer `customerDownloadAssistedCreationApprovedProof` (HTTP stream).
 * Browsers often display GCS signed PNG URLs in-tab despite Content-Disposition.
 */
export const customerGetAssistedCreationApprovedProofDownloadUrl = onCall(
  async (request): Promise<CustomerGetAssistedCreationApprovedProofDownloadUrlResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const data = (request.data ?? {}) as CustomerGetAssistedCreationApprovedProofDownloadUrlRequest;
    const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
    if (!requestId) {
      throw invalidArgument("Request id is required.");
    }

    const resolved = await resolveAssistedCreationApprovedProofDownload({
      uid: request.auth.uid,
      requestId,
    });

    const file = approvedProofStorageFile(resolved.storagePath);
    const urlExpiresAtMillis = Date.now() + SIGNED_URL_TTL_MS;
    try {
      const [downloadUrl] = await file.getSignedUrl({
        action: "read",
        expires: urlExpiresAtMillis,
        responseDisposition: `attachment; filename="${resolved.fileName}"`,
        responseType: resolved.contentType,
      });
      return {
        downloadUrl,
        fileName: resolved.fileName,
        contentType: resolved.contentType,
        urlExpiresAtMillis,
        downloadExpiresAtMillis: resolved.downloadExpiresAtMillis,
      };
    } catch (error) {
      console.error("[customerGetAssistedCreationApprovedProofDownloadUrl] sign failed", {
        requestId,
        error,
      });
      throw internal("Unable to prepare the download right now.");
    }
  },
);
