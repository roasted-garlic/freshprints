import {
  CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX,
  CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN,
  type AttachExistingCustomerUploadsToPrintRequestRequest,
} from "../../../packages/shared/src/types/customerUpload/attachExistingCustomerUpload.types";
import { CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH } from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";

export function validateAttachExistingCustomerUploadsToPrintRequest(
  data: unknown,
): AttachExistingCustomerUploadsToPrintRequestRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data must be an object.");
  }

  const record = data as Record<string, unknown>;

  if (!Array.isArray(record.uploadIds) || record.uploadIds.length === 0) {
    throw new Error("uploadIds must be a non-empty array.");
  }
  if (record.uploadIds.length > CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH) {
    throw new Error(
      `At most ${CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH} uploads can be attached at once.`,
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

  let printRequestId: string | undefined;
  if (record.printRequestId !== undefined && record.printRequestId !== null) {
    if (typeof record.printRequestId !== "string" || !record.printRequestId.trim()) {
      throw new Error("printRequestId must be a non-empty string when provided.");
    }
    printRequestId = record.printRequestId.trim();
  }

  let defaultQuantity = 1;
  if (record.defaultQuantity !== undefined) {
    const qty = Number(record.defaultQuantity);
    if (
      !Number.isInteger(qty) ||
      qty < CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN ||
      qty > CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX
    ) {
      throw new Error(
        `defaultQuantity must be an integer from ${CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN} to ${CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX}.`,
      );
    }
    defaultQuantity = qty;
  }

  return {
    uploadIds,
    ...(printRequestId ? { printRequestId } : {}),
    defaultQuantity,
  };
}
