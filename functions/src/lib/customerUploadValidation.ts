import {
  CUSTOMER_UPLOAD_MAX_BATCH_UNCOMPRESSED_BYTES,
  CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH,
  CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
  CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import { parseCustomerUploadPurpose } from "../../../packages/shared/src/utils/customerUploadPurpose";

export type CustomerUploadBatchMode = "direct_images" | "zip";

export interface CreateCustomerUploadBatchRequest {
  mode: CustomerUploadBatchMode;
  clientRequestId: string;
  /** Defaults to print_request when omitted. */
  purpose: "print_request" | "catalog_donation";
  files?: Array<{ originalFilename: string; declaredSizeBytes: number }>;
  declaredZipSizeBytes?: number;
  /** When set (direct_images only), append files to this open batch instead of creating a new one. */
  existingBatchId?: string;
}

export interface FinalizeCustomerUploadRequest {
  uploadId: string;
  batchId: string;
}

export interface FinalizeCustomerUploadZipRequest {
  batchId: string;
}

const CLIENT_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export function validateCreateCustomerUploadBatchRequest(
  data: unknown,
): CreateCustomerUploadBatchRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data must be an object.");
  }

  const record = data as Record<string, unknown>;
  const mode = record.mode;
  if (mode !== "direct_images" && mode !== "zip") {
    throw new Error('mode must be "direct_images" or "zip".');
  }

  const clientRequestId =
    typeof record.clientRequestId === "string" ? record.clientRequestId.trim() : "";
  if (!CLIENT_REQUEST_ID_PATTERN.test(clientRequestId)) {
    throw new Error("clientRequestId must be 8–128 characters of letters, numbers, _ or -.");
  }

  let purpose: CreateCustomerUploadBatchRequest["purpose"] = "print_request";
  try {
    purpose = parseCustomerUploadPurpose(record.purpose);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid purpose.");
  }

  if (mode === "direct_images") {
    if (!Array.isArray(record.files) || record.files.length === 0) {
      throw new Error("files must be a non-empty array for direct_images.");
    }
    if (record.files.length > CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH) {
      throw new Error(`A batch may include at most ${CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH} files.`);
    }

    let total = 0;
    const files = record.files.map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`files[${index}] must be an object.`);
      }
      const file = entry as Record<string, unknown>;
      const originalFilename =
        typeof file.originalFilename === "string" ? file.originalFilename.trim() : "";
      if (!originalFilename || originalFilename.length > 255) {
        throw new Error(`files[${index}].originalFilename is invalid.`);
      }
      const declaredSizeBytes = Number(file.declaredSizeBytes);
      if (!Number.isFinite(declaredSizeBytes) || declaredSizeBytes <= 0) {
        throw new Error(`files[${index}].declaredSizeBytes must be a positive number.`);
      }
      if (declaredSizeBytes > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES) {
        throw new Error(`files[${index}] exceeds the ${CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES} byte limit.`);
      }
      total += declaredSizeBytes;
      return { originalFilename, declaredSizeBytes };
    });

    if (total > CUSTOMER_UPLOAD_MAX_BATCH_UNCOMPRESSED_BYTES) {
      throw new Error("Total declared batch size exceeds the allowed limit.");
    }

    const existingBatchId =
      typeof record.existingBatchId === "string" ? record.existingBatchId.trim() : "";
    if (existingBatchId && existingBatchId.length > 128) {
      throw new Error("existingBatchId is invalid.");
    }

    return {
      mode,
      clientRequestId,
      purpose,
      files,
      existingBatchId: existingBatchId || undefined,
    };
  }

  const declaredZipSizeBytes = Number(record.declaredZipSizeBytes);
  if (!Number.isFinite(declaredZipSizeBytes) || declaredZipSizeBytes <= 0) {
    throw new Error("declaredZipSizeBytes must be a positive number.");
  }
  if (declaredZipSizeBytes > CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES) {
    throw new Error("ZIP exceeds the maximum compressed size.");
  }

  return { mode, clientRequestId, purpose, declaredZipSizeBytes };
}

export function validateFinalizeCustomerUploadRequest(
  data: unknown,
): FinalizeCustomerUploadRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data must be an object.");
  }
  const record = data as Record<string, unknown>;
  const uploadId = typeof record.uploadId === "string" ? record.uploadId.trim() : "";
  const batchId = typeof record.batchId === "string" ? record.batchId.trim() : "";
  if (!uploadId || !batchId) {
    throw new Error("uploadId and batchId are required.");
  }
  return { uploadId, batchId };
}

export function validateFinalizeCustomerUploadZipRequest(
  data: unknown,
): FinalizeCustomerUploadZipRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data must be an object.");
  }
  const record = data as Record<string, unknown>;
  const batchId = typeof record.batchId === "string" ? record.batchId.trim() : "";
  if (!batchId) {
    throw new Error("batchId is required.");
  }
  return { batchId };
}

export function sanitizeDisplayFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "file";
  return base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 255) || "file";
}
