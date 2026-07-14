import { httpsCallable } from "firebase/functions";

import { functions } from "../../../config/firebase";

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallbackMessage;
}

export interface ArchiveStaleRejectedDesignsResponse {
  dryRun: boolean;
  staleAfterDays: number;
  cutoffIso: string;
  scanned: number;
  archivedCount: number;
  designIds: string[];
}

export interface PurgeIdleCustomerUploadFullSizeResponse {
  dryRun: boolean;
  idleAfterDays: number;
  scanned: number;
  eligibleCount: number;
  purgedCount: number;
  results: Array<{
    uploadId: string;
    reason: string;
    purged: boolean;
    storageFilesDeleted?: number;
  }>;
}

export async function runArchiveStaleRejectedDesigns(
  dryRun: boolean,
): Promise<ArchiveStaleRejectedDesignsResponse> {
  try {
    const callable = httpsCallable<{ dryRun?: boolean }, ArchiveStaleRejectedDesignsResponse>(
      functions,
      "archiveStaleRejectedDesigns",
    );
    const response = await callable({ dryRun });
    return response.data;
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, "Unable to run reject auto-archive. Please try again."),
    );
  }
}

export async function runPurgeIdleCustomerUploadFullSize(
  dryRun: boolean,
): Promise<PurgeIdleCustomerUploadFullSizeResponse> {
  try {
    const callable = httpsCallable<{ dryRun?: boolean }, PurgeIdleCustomerUploadFullSizeResponse>(
      functions,
      "purgeIdleCustomerUploadFullSize",
    );
    const response = await callable({ dryRun });
    return response.data;
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, "Unable to run customer-upload full-size purge. Please try again."),
    );
  }
}

export interface PurgePromotedDonationFullSizeResponse {
  dryRun: boolean;
  coolOffDays: number;
  scanned: number;
  purgedCount: number;
  results: Array<{
    uploadId: string;
    reason: string;
    purged: boolean;
    storageFilesDeleted?: number;
  }>;
}

export async function runPurgePromotedDonationFullSize(
  dryRun: boolean,
): Promise<PurgePromotedDonationFullSizeResponse> {
  try {
    const callable = httpsCallable<{ dryRun?: boolean }, PurgePromotedDonationFullSizeResponse>(
      functions,
      "purgePromotedDonationFullSize",
    );
    const response = await callable({ dryRun });
    return response.data;
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, "Unable to run promoted-donation full-size purge. Please try again."),
    );
  }
}
