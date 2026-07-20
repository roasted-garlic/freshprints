import {
  CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT,
  CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT,
  CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
} from "./customerUploadLimits.constants";

export const CUSTOMER_UPLOAD_QUOTA_SETTINGS_DOC_ID = "customerUploadQuotas";

export const CUSTOMER_UPLOAD_QUOTA_BOUND_MIN = 1;
export const CUSTOMER_UPLOAD_QUOTA_BOUND_MAX = 10_000;
export const CUSTOMER_UPLOAD_QUOTA_ZIP_BOUND_MAX = 500;

export interface CustomerUploadQuotaSettings {
  printRequestCreateBatchLimit: number;
  printRequestFinalizeImageLimit: number;
  printRequestFinalizeZipLimit: number;
  donationCreateBatchLimit: number;
  donationFinalizeImageLimit: number;
  donationFinalizeZipLimit: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS: Readonly<CustomerUploadQuotaSettings> = {
  printRequestCreateBatchLimit: CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT,
  printRequestFinalizeImageLimit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT,
  printRequestFinalizeZipLimit: CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT,
  donationCreateBatchLimit: CUSTOMER_UPLOAD_DAILY_CREATE_BATCH_LIMIT_DONATION,
  donationFinalizeImageLimit: CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION,
  donationFinalizeZipLimit: CUSTOMER_UPLOAD_DAILY_FINALIZE_ZIP_LIMIT_DONATION,
};

const QUOTA_FIELDS = [
  "printRequestCreateBatchLimit",
  "printRequestFinalizeImageLimit",
  "printRequestFinalizeZipLimit",
  "donationCreateBatchLimit",
  "donationFinalizeImageLimit",
  "donationFinalizeZipLimit",
] as const;

type QuotaField = (typeof QUOTA_FIELDS)[number];

function maxForField(field: QuotaField): number {
  return field.endsWith("ZipLimit")
    ? CUSTOMER_UPLOAD_QUOTA_ZIP_BOUND_MAX
    : CUSTOMER_UPLOAD_QUOTA_BOUND_MAX;
}

function isPositiveIntInRange(value: unknown, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= CUSTOMER_UPLOAD_QUOTA_BOUND_MIN &&
    value <= max
  );
}

/** Coerce a stored/unknown field to a safe default when missing or out of bounds. */
export function resolveQuotaField(
  value: unknown,
  fallback: number,
  max: number = CUSTOMER_UPLOAD_QUOTA_BOUND_MAX,
): number {
  return isPositiveIntInRange(value, max) ? value : fallback;
}

export function resolveCustomerUploadQuotaSettings(value: unknown): CustomerUploadQuotaSettings {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const defaults = DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS;

  const settings: CustomerUploadQuotaSettings = {
    printRequestCreateBatchLimit: resolveQuotaField(
      data.printRequestCreateBatchLimit,
      defaults.printRequestCreateBatchLimit,
    ),
    printRequestFinalizeImageLimit: resolveQuotaField(
      data.printRequestFinalizeImageLimit,
      defaults.printRequestFinalizeImageLimit,
    ),
    printRequestFinalizeZipLimit: resolveQuotaField(
      data.printRequestFinalizeZipLimit,
      defaults.printRequestFinalizeZipLimit,
      CUSTOMER_UPLOAD_QUOTA_ZIP_BOUND_MAX,
    ),
    donationCreateBatchLimit: resolveQuotaField(
      data.donationCreateBatchLimit,
      defaults.donationCreateBatchLimit,
    ),
    donationFinalizeImageLimit: resolveQuotaField(
      data.donationFinalizeImageLimit,
      defaults.donationFinalizeImageLimit,
    ),
    donationFinalizeZipLimit: resolveQuotaField(
      data.donationFinalizeZipLimit,
      defaults.donationFinalizeZipLimit,
      CUSTOMER_UPLOAD_QUOTA_ZIP_BOUND_MAX,
    ),
  };

  if (data.updatedAt !== undefined) {
    settings.updatedAt = data.updatedAt;
  }
  if (typeof data.updatedBy === "string") {
    settings.updatedBy = data.updatedBy;
  }

  return settings;
}

/**
 * Strict validation for owner save payloads. Returns null when invalid.
 */
export function parseCustomerUploadQuotaSettingsInput(
  value: unknown,
): CustomerUploadQuotaSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  const parsed: Partial<CustomerUploadQuotaSettings> = {};

  for (const field of QUOTA_FIELDS) {
    const max = maxForField(field);
    if (!isPositiveIntInRange(data[field], max)) {
      return null;
    }
    parsed[field] = data[field];
  }

  return parsed as CustomerUploadQuotaSettings;
}
