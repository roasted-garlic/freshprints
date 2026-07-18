import { Timestamp } from "firebase-admin/firestore";

import { ASSISTED_CREATION_COLLECTION } from "../../../packages/shared/src/constants/assistedCreation/assistedCreation.constants";
import type { AssistedCreationProof } from "../../../packages/shared/src/types/assistedCreation/assistedCreation.types";
import { evaluateAssistedCreationApprovedProofDownload } from "../../../packages/shared/src/utils/assistedCreationApprovedProofRetention";
import { buildAssistedCreationCustomerDownloadFileName } from "../../../packages/shared/src/utils/assistedCreationProofFileName";

import { adminDb, adminStorage } from "./admin";
import {
  proofsToRetentionViews,
  timestampMillis,
} from "./assistedCreationProofPurge";
import {
  failedPrecondition,
  invalidArgument,
  notFound,
  permissionDenied,
} from "./errors";
import { requirePortalCustomer } from "./etsy/requirePortalCustomer";
import { storageObjectPath } from "./storageObjectPath";

export function escapeContentDispositionFileName(fileName: string): string {
  return fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180) || "assisted-proof.png";
}

export interface ResolvedApprovedProofDownload {
  requestId: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  /** Epoch ms when the 14-day retention download window ends; null for legacy. */
  downloadExpiresAtMillis: number | null;
}

/**
 * AuthZ + eligibility for Portal approved-proof download.
 * Caller must already ensure the uid is authenticated.
 */
export async function resolveAssistedCreationApprovedProofDownload(input: {
  uid: string;
  requestId: string;
}): Promise<ResolvedApprovedProofDownload> {
  const requestId = input.requestId.trim();
  if (!requestId) {
    throw invalidArgument("Request id is required.");
  }

  const portalCustomer = await requirePortalCustomer(input.uid);
  const snap = await adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId).get();
  if (!snap.exists) {
    throw notFound("Assisted creation request not found.");
  }

  const current = snap.data() ?? {};
  if (current.customerUid !== portalCustomer.customerUid) {
    throw permissionDenied("You can only download your own approved proof.");
  }

  const proofs = Array.isArray(current.proofs)
    ? (current.proofs as AssistedCreationProof[])
    : [];
  const status = typeof current.status === "string" ? current.status : "";
  const approvedAtMillis =
    timestampMillis(current.approvedAt) ??
    (current.approvedAt instanceof Timestamp ? current.approvedAt.toMillis() : null);

  const eligibility = evaluateAssistedCreationApprovedProofDownload({
    status,
    approvedProofId:
      typeof current.approvedProofId === "string" ? current.approvedProofId : null,
    approvedAtMillis,
    proofs: proofsToRetentionViews(proofs),
    nowMs: Date.now(),
  });

  if (!eligibility.eligible || !eligibility.proof) {
    if (
      eligibility.reason === "expired" ||
      eligibility.reason === "full_size_purged"
    ) {
      throw failedPrecondition("This download is no longer available.");
    }
    if (eligibility.reason === "not_approved") {
      throw failedPrecondition("This request is not approved for download.");
    }
    throw failedPrecondition("A full-resolution download is not available for this request.");
  }

  const storagePath = eligibility.proof.storagePath?.trim() || "";
  if (!storagePath) {
    throw failedPrecondition("This download is no longer available.");
  }

  const proofIndex = proofs.findIndex((entry) => entry.id === eligibility.proof?.id);
  const fileName = escapeContentDispositionFileName(
    buildAssistedCreationCustomerDownloadFileName({
      proofNumber: proofIndex >= 0 ? proofIndex + 1 : 1,
      fileName: eligibility.proof.fileName,
      contentType: eligibility.proof.contentType,
    }),
  );
  const contentType =
    (eligibility.proof.contentType ?? "").trim() || "application/octet-stream";

  const file = adminStorage.bucket().file(storageObjectPath(storagePath));
  const [exists] = await file.exists();
  if (!exists) {
    throw failedPrecondition("This download is no longer available.");
  }

  return {
    requestId,
    storagePath,
    fileName,
    contentType,
    downloadExpiresAtMillis: eligibility.expiresAtMillis,
  };
}

export function approvedProofStorageFile(storagePath: string) {
  return adminStorage.bucket().file(storageObjectPath(storagePath));
}
