import { onCall } from "firebase-functions/v2/https";

import type {
  CustomerGetAssistedCreationApprovedProofFileRequest,
  CustomerGetAssistedCreationApprovedProofFileResponse,
} from "../../packages/shared/src/types/assistedCreation/assistedCreationActions.types";

import {
  approvedProofStorageFile,
  resolveAssistedCreationApprovedProofDownload,
} from "./lib/assistedCreationApprovedProofDownload";
import { failedPrecondition, invalidArgument, unauthenticated } from "./lib/errors";

/** Keep callable JSON payload comfortable for Portal (design proofs are typically small). */
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Returns approved proof bytes as base64 for Portal blob download.
 *
 * Why not GCS signed URL + navigate: browsers often display PNGs in-tab.
 * Why not raw HTTPS fetch from Portal: Gen2 CORS / URL / deploy issues surface as
 * TypeError "Failed to fetch". Callables reuse Firebase SDK CORS + auth.
 */
export const customerGetAssistedCreationApprovedProofFile = onCall(
  {
    // Proof PNGs can be a few MB; default callable timeout is enough.
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request): Promise<CustomerGetAssistedCreationApprovedProofFileResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const data = (request.data ?? {}) as CustomerGetAssistedCreationApprovedProofFileRequest;
    const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
    if (!requestId) {
      throw invalidArgument("Request id is required.");
    }

    const resolved = await resolveAssistedCreationApprovedProofDownload({
      uid: request.auth.uid,
      requestId,
    });

    const file = approvedProofStorageFile(resolved.storagePath);
    let buffer: Buffer;
    try {
      [buffer] = await file.download();
    } catch (error) {
      console.error("[customerGetAssistedCreationApprovedProofFile] download failed", {
        requestId,
        error,
      });
      throw failedPrecondition("Unable to download the proof right now.");
    }

    if (buffer.length > MAX_DOWNLOAD_BYTES) {
      throw failedPrecondition(
        "This file is too large to download here. Please contact Fresh Prints for a copy.",
      );
    }

    return {
      fileName: resolved.fileName,
      contentType: resolved.contentType,
      contentBase64: buffer.toString("base64"),
      downloadExpiresAtMillis: resolved.downloadExpiresAtMillis,
    };
  },
);
