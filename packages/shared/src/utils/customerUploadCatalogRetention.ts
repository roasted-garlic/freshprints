/** Staff “Do not add to catalog” Excluded retention episode length. */
export const CUSTOMER_UPLOAD_STAFF_EXCLUDED_RETENTION_DAYS = 14 as const;

/** Don’t-allow / personal-bucket retention episode length (B1 still blocks hard delete). */
export const CUSTOMER_UPLOAD_PERSONAL_PERMISSION_DENIED_RETENTION_DAYS = 30 as const;

/** Unpromoted catalog donation shelf life (same window as personal Don’t-allow). */
export const CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_DAYS =
  CUSTOMER_UPLOAD_PERSONAL_PERMISSION_DENIED_RETENTION_DAYS;

export const CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_REASON = "unpromoted_donation" as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveCustomerUploadCatalogRetentionDays(reason: unknown): number | null {
  if (reason === "staff_review") {
    return CUSTOMER_UPLOAD_STAFF_EXCLUDED_RETENTION_DAYS;
  }
  if (reason === "customer_permission_denied") {
    return CUSTOMER_UPLOAD_PERSONAL_PERMISSION_DENIED_RETENTION_DAYS;
  }
  if (reason === CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_REASON) {
    return CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_DAYS;
  }
  return null;
}

/**
 * Query cutoff uses the shortest clock (staff 14d) so Excluded rows are scanned on time.
 * Per-row age still applies the reason-specific window (personal Don’t-allow = 30d).
 */
export function resolveCustomerUploadCatalogRetentionQueryCutoffDays(): number {
  return Math.min(
    CUSTOMER_UPLOAD_STAFF_EXCLUDED_RETENTION_DAYS,
    CUSTOMER_UPLOAD_PERSONAL_PERMISSION_DENIED_RETENTION_DAYS,
  );
}

export function isCustomerUploadCatalogRetentionEpisodeDue(input: {
  catalogExclusionReason?: unknown;
  catalogRetentionStartedAtMs: number | null;
  nowMs: number;
}): boolean {
  const days = resolveCustomerUploadCatalogRetentionDays(input.catalogExclusionReason);
  if (days == null || input.catalogRetentionStartedAtMs == null) {
    return false;
  }
  return input.catalogRetentionStartedAtMs <= input.nowMs - days * MS_PER_DAY;
}
