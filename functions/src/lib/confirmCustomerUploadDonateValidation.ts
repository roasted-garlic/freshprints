import { CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH } from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import type { ConfirmCustomerUploadsForDonationRequest } from "../../../packages/shared/src/types/customerUpload/confirmCustomerUploadDonate.types";
import { CUSTOMER_UPLOAD_DONATE_TERMS_VERSION } from "../../../packages/shared/src/types/customerUpload/customerUpload.types";

export function validateConfirmCustomerUploadsForDonationRequest(
  data: unknown,
): ConfirmCustomerUploadsForDonationRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data must be an object.");
  }

  const record = data as Record<string, unknown>;
  const batchId = typeof record.batchId === "string" ? record.batchId.trim() : "";
  if (!batchId) {
    throw new Error("batchId is required.");
  }

  if (!Array.isArray(record.uploadIds) || record.uploadIds.length === 0) {
    throw new Error("uploadIds must be a non-empty array.");
  }
  if (record.uploadIds.length > CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH) {
    throw new Error(
      `At most ${CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH} uploads can be donated at once.`,
    );
  }

  const uploadIds = record.uploadIds.map((id, index) => {
    if (typeof id !== "string" || !id.trim()) {
      throw new Error(`uploadIds[${index}] is invalid.`);
    }
    return id.trim();
  });

  if (new Set(uploadIds).size !== uploadIds.length) {
    throw new Error("uploadIds must be unique.");
  }

  if (record.ownershipConfirmed !== true) {
    throw new Error("Ownership confirmation is required.");
  }
  if (record.catalogUseAcknowledged !== true) {
    throw new Error("Catalog donation consent is required.");
  }

  const termsVersion = typeof record.termsVersion === "string" ? record.termsVersion.trim() : "";
  if (termsVersion !== CUSTOMER_UPLOAD_DONATE_TERMS_VERSION) {
    throw new Error("Confirmation terms version is invalid or out of date.");
  }

  return {
    batchId,
    uploadIds,
    ownershipConfirmed: true,
    catalogUseAcknowledged: true,
    termsVersion: CUSTOMER_UPLOAD_DONATE_TERMS_VERSION,
  };
}
