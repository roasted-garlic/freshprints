import type { CustomerUploadQuotaSettings } from "../../../packages/shared/src/constants/customerUpload/customerUploadQuotaSettings.constants";
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

export type CustomerUploadQuotaLimits = Pick<
  CustomerUploadQuotaSettings,
  | "printRequestCreateBatchLimit"
  | "printRequestFinalizeImageLimit"
  | "printRequestFinalizeZipLimit"
  | "donationCreateBatchLimit"
  | "donationFinalizeImageLimit"
  | "donationFinalizeZipLimit"
>;

const CODE_DEFAULT_LIMITS: CustomerUploadQuotaLimits = {
  printRequestCreateBatchLimit: CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT,
  printRequestFinalizeImageLimit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
  printRequestFinalizeZipLimit: CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT,
  donationCreateBatchLimit: CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
  donationFinalizeImageLimit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
  donationFinalizeZipLimit: CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
};

/**
 * Which daily counters still charge / block Portal customers.
 * - Print-request uploads are capped by Current Request room (L), not Central day buckets.
 * - Donations keep images/day only; upload starts and ZIP day caps are not charged.
 * Studio Settings fields remain configurable for ops / future use.
 */
export function shouldChargeDailyQuota(
  kind: CustomerUploadQuotaKind,
  purpose: CustomerUploadPurpose,
): boolean {
  if (purpose === "print_request") {
    return false;
  }
  return kind === "finalizeImage";
}

/**
 * Firestore field + limit for a purpose-scoped daily quota.
 * Print-request keeps legacy field names for backward compatibility.
 */
export function resolveDailyQuotaTarget(
  kind: CustomerUploadQuotaKind,
  purpose: CustomerUploadPurpose,
  limits: CustomerUploadQuotaLimits = CODE_DEFAULT_LIMITS,
): { field: string; limit: number } {
  if (purpose === "catalog_donation") {
    switch (kind) {
      case "createBatch":
        return {
          field: "createBatchCountDonation",
          limit: limits.donationCreateBatchLimit,
        };
      case "finalizeImage":
        return {
          field: "finalizeImageCountDonation",
          limit: limits.donationFinalizeImageLimit,
        };
      case "finalizeZip":
        return {
          field: "finalizeZipCountDonation",
          limit: limits.donationFinalizeZipLimit,
        };
      default: {
        const exhaustive: never = kind;
        return exhaustive;
      }
    }
  }

  switch (kind) {
    case "createBatch":
      return { field: "createBatchCount", limit: limits.printRequestCreateBatchLimit };
    case "finalizeImage":
      return { field: "finalizeImageCount", limit: limits.printRequestFinalizeImageLimit };
    case "finalizeZip":
      return { field: "finalizeZipCount", limit: limits.printRequestFinalizeZipLimit };
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
      return `You have reached today's limit of ${limit} ${purposeLabel} upload starts. Please try again tomorrow.`;
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
