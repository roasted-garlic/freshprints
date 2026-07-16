import {
  CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT,
  CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import type { CustomerUploadPurpose } from "../../../packages/shared/src/types/customerUpload/customerUpload.enums";

export type CustomerUploadQuotaKind = "createBatch" | "finalizeImage" | "finalizeZip";

/**
 * Firestore field + limit for a purpose-scoped daily quota.
 * Print-request keeps legacy field names for backward compatibility.
 */
export function resolveDailyQuotaTarget(
  kind: CustomerUploadQuotaKind,
  purpose: CustomerUploadPurpose,
): { field: string; limit: number } {
  if (purpose === "catalog_donation") {
    switch (kind) {
      case "createBatch":
        return {
          field: "createBatchCountDonation",
          limit: CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
        };
      case "finalizeImage":
        return {
          field: "finalizeImageCountDonation",
          limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
        };
      case "finalizeZip":
        return {
          field: "finalizeZipCountDonation",
          limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
        };
      default: {
        const exhaustive: never = kind;
        return exhaustive;
      }
    }
  }

  switch (kind) {
    case "createBatch":
      return { field: "createBatchCount", limit: CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT };
    case "finalizeImage":
      return { field: "finalizeImageCount", limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT };
    case "finalizeZip":
      return { field: "finalizeZipCount", limit: CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT };
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function quotaExhaustedMessage(
  kind: CustomerUploadQuotaKind,
  limit: number,
  purpose: CustomerUploadPurpose,
): string {
  const purposeLabel = purpose === "catalog_donation" ? "donated designs" : "uploaded designs";
  switch (kind) {
    case "createBatch":
      return `You have reached today's limit of ${limit} ${purposeLabel} upload sessions. Please try again tomorrow.`;
    case "finalizeImage":
      return `You have reached today's limit of ${limit} ${purposeLabel}. Please try again tomorrow.`;
    case "finalizeZip":
      return `You have reached today's limit of ${limit} ${purposeLabel} ZIP uploads. Please try again tomorrow.`;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
