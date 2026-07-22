/**
 * Portal guest catalog donations (#13 Addendum A).
 * Attribution sentinel — not a `customers/{id}` document and not Studio `customers.isGuest`.
 */
export const CUSTOMER_UPLOAD_GUEST_SENTINEL = "guest" as const;

export type CustomerUploadUploaderType = "customer" | "guest";

/** Stricter Central-day finalize-image cap for anonymous guest donations. */
export const CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT_DONATION_GUEST = 20;
