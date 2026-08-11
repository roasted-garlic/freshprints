import {
  CUSTOMER_UPLOAD_PURPOSES,
  type CustomerUploadPurpose,
} from "../types/customerUpload/customerUpload.enums";

/**
 * True when `purpose` is absent/blank on the document.
 * Firestore `where("purpose","==","print_request")` excludes these docs, but
 * {@link resolveCustomerUploadPurpose} treats them as print-request artwork (H-DM-2).
 */
export function isMissingCustomerUploadPurpose(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** Legacy docs without purpose are print-request artwork. */
export function resolveCustomerUploadPurpose(value: unknown): CustomerUploadPurpose {
  if (value === "catalog_donation") {
    return "catalog_donation";
  }
  return "print_request";
}

export function isCustomerUploadPurpose(value: unknown): value is CustomerUploadPurpose {
  return (
    typeof value === "string" &&
    (CUSTOMER_UPLOAD_PURPOSES as readonly string[]).includes(value)
  );
}

export function parseCustomerUploadPurpose(value: unknown): CustomerUploadPurpose {
  if (value === undefined || value === null || value === "") {
    return "print_request";
  }
  if (!isCustomerUploadPurpose(value)) {
    throw new Error('purpose must be "print_request" or "catalog_donation".');
  }
  return value;
}
