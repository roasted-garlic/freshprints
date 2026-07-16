import {
  CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX,
  CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN,
  type ConfirmCustomerUploadsAndAttachToRequestRequest,
} from "../../../packages/shared/src/types/customerUpload/confirmCustomerUploadAttach.types";
import { CUSTOMER_UPLOAD_TERMS_VERSION } from "../../../packages/shared/src/types/customerUpload/customerUpload.types";
import { CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH } from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";

export function validateConfirmCustomerUploadsAndAttachRequest(
  data: unknown,
): ConfirmCustomerUploadsAndAttachToRequestRequest {
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
    throw new Error(`At most ${CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH} uploads can be attached at once.`);
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
  if (typeof record.catalogUseAcknowledged !== "boolean") {
    throw new Error("Catalog-use acknowledgement must be true or false.");
  }

  const termsVersion = typeof record.termsVersion === "string" ? record.termsVersion.trim() : "";
  if (termsVersion !== CUSTOMER_UPLOAD_TERMS_VERSION) {
    throw new Error("Confirmation terms version is invalid or out of date.");
  }

  let defaultQuantity = 1;
  if (record.defaultQuantity !== undefined) {
    const qty = Number(record.defaultQuantity);
    if (!Number.isInteger(qty) || qty < CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN || qty > CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX) {
      throw new Error(
        `defaultQuantity must be an integer from ${CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN} to ${CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX}.`,
      );
    }
    defaultQuantity = qty;
  }

  return {
    batchId,
    uploadIds,
    ownershipConfirmed: true,
    catalogUseAcknowledged: record.catalogUseAcknowledged,
    termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
    defaultQuantity,
  };
}
