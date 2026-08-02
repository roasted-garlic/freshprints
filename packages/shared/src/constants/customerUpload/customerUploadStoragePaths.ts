export const CUSTOMER_UPLOAD_STORAGE_ROOT = "customer-uploads" as const;

/**
 * Authoritative manifest of every upload-owned Storage path persisted by the current
 * `CustomerUpload` schema. Permanent deletion must use this manifest and fail closed if a new
 * persisted `*StoragePath` field is introduced without being reviewed here.
 */
export const CUSTOMER_UPLOAD_OWNED_STORAGE_PATH_FIELDS = [
  "sourceStoragePath",
  "productionStoragePath",
  "previewStoragePath",
  "thumbnailStoragePath",
] as const;

export type CustomerUploadOwnedStoragePathField =
  (typeof CUSTOMER_UPLOAD_OWNED_STORAGE_PATH_FIELDS)[number];

const PRODUCTION_NAME = "production.png";
const PREVIEW_NAME = "preview.webp";
const THUMBNAIL_NAME = "thumbnail.webp";
const SOURCE_NAME = "source";
const ARCHIVE_NAME = "archive.zip";

function assertNonEmptyId(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

/** `/customer-uploads/{customerUid}/{uploadId}/source` */
export function getCustomerUploadSourceStoragePath(
  customerUid: string,
  uploadId: string,
): string {
  const uid = assertNonEmptyId(customerUid, "customerUid");
  const id = assertNonEmptyId(uploadId, "uploadId");
  return `/${CUSTOMER_UPLOAD_STORAGE_ROOT}/${uid}/${id}/${SOURCE_NAME}`;
}

/** `/customer-uploads/{customerUid}/{uploadId}/production.png` */
export function getCustomerUploadProductionStoragePath(
  customerUid: string,
  uploadId: string,
): string {
  const uid = assertNonEmptyId(customerUid, "customerUid");
  const id = assertNonEmptyId(uploadId, "uploadId");
  return `/${CUSTOMER_UPLOAD_STORAGE_ROOT}/${uid}/${id}/${PRODUCTION_NAME}`;
}

/** `/customer-uploads/{customerUid}/{uploadId}/preview.webp` */
export function getCustomerUploadPreviewStoragePath(
  customerUid: string,
  uploadId: string,
): string {
  const uid = assertNonEmptyId(customerUid, "customerUid");
  const id = assertNonEmptyId(uploadId, "uploadId");
  return `/${CUSTOMER_UPLOAD_STORAGE_ROOT}/${uid}/${id}/${PREVIEW_NAME}`;
}

/** `/customer-uploads/{customerUid}/{uploadId}/thumbnail.webp` */
export function getCustomerUploadThumbnailStoragePath(
  customerUid: string,
  uploadId: string,
): string {
  const uid = assertNonEmptyId(customerUid, "customerUid");
  const id = assertNonEmptyId(uploadId, "uploadId");
  return `/${CUSTOMER_UPLOAD_STORAGE_ROOT}/${uid}/${id}/${THUMBNAIL_NAME}`;
}

/** `/customer-uploads/{customerUid}/batches/{batchId}/archive.zip` */
export function getCustomerUploadBatchZipStoragePath(
  customerUid: string,
  batchId: string,
): string {
  const uid = assertNonEmptyId(customerUid, "customerUid");
  const id = assertNonEmptyId(batchId, "batchId");
  return `/${CUSTOMER_UPLOAD_STORAGE_ROOT}/${uid}/batches/${id}/${ARCHIVE_NAME}`;
}

const UPLOAD_OBJECT_PATTERN =
  /^\/customer-uploads\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/(source|production\.png|preview\.webp|thumbnail\.webp)$/;

const BATCH_ZIP_PATTERN =
  /^\/customer-uploads\/([A-Za-z0-9_-]+)\/batches\/([A-Za-z0-9_-]+)\/archive\.zip$/;

export function isCanonicalCustomerUploadSourcePath(
  path: string,
  customerUid: string,
  uploadId: string,
): boolean {
  const expected = getCustomerUploadSourceStoragePath(customerUid, uploadId);
  return path === expected;
}

export function isCanonicalCustomerUploadObjectPath(path: string): boolean {
  return UPLOAD_OBJECT_PATTERN.test(path) || BATCH_ZIP_PATTERN.test(path);
}

export function parseCustomerUploadObjectPath(path: string): {
  kind: "upload_object" | "batch_zip";
  customerUid: string;
  uploadId?: string;
  batchId?: string;
  fileName: string;
} | null {
  const uploadMatch = UPLOAD_OBJECT_PATTERN.exec(path);
  if (uploadMatch) {
    return {
      kind: "upload_object",
      customerUid: uploadMatch[1],
      uploadId: uploadMatch[2],
      fileName: uploadMatch[3],
    };
  }

  const zipMatch = BATCH_ZIP_PATTERN.exec(path);
  if (zipMatch) {
    return {
      kind: "batch_zip",
      customerUid: zipMatch[1],
      batchId: zipMatch[2],
      fileName: ARCHIVE_NAME,
    };
  }

  return null;
}
