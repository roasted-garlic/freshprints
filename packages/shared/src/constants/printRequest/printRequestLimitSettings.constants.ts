import {
  PRINT_REQUEST_DAILY_DESIGNS_ADDED_LIMIT,
  PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
} from "./printRequestLimitDefaults.constants";

export const PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID = "printRequestLimits";

export const PRINT_REQUEST_LIMIT_BOUND_MIN = 1;
export const PRINT_REQUEST_LIMIT_BOUND_MAX = 10_000;

/**
 * Portal print-request limit settings.
 *
 * Sole enforced limit `L` = `maxQuantityPerShowPerCustomer`
 * (max prints on Current Request = max per customer per show).
 *
 * `dailyDesignsAddedToRequestsLimit` is legacy Cap A: mirrored = `L` on save for one-release
 * rollback compatibility. Do not read or enforce it for Portal limits.
 */
export interface PrintRequestLimitSettings {
  /**
   * Legacy Cap A field. Write-only mirror of `L` for one release.
   * Not used for enforcement.
   */
  dailyDesignsAddedToRequestsLimit: number;
  /** Sole limit `L`: max Current Request prints and max per customer per show. */
  maxQuantityPerShowPerCustomer: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS: Readonly<PrintRequestLimitSettings> = {
  dailyDesignsAddedToRequestsLimit: PRINT_REQUEST_DAILY_DESIGNS_ADDED_LIMIT,
  maxQuantityPerShowPerCustomer: PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
};

function isPositiveIntInRange(value: unknown, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= PRINT_REQUEST_LIMIT_BOUND_MIN &&
    value <= max
  );
}

export function resolvePrintRequestLimitField(
  value: unknown,
  fallback: number,
  max: number = PRINT_REQUEST_LIMIT_BOUND_MAX,
): number {
  return isPositiveIntInRange(value, max) ? value : fallback;
}

/**
 * Resolve settings from Firestore. Enforcement uses only `maxQuantityPerShowPerCustomer` (`L`).
 * Legacy Cap A is resolved for display/compat but must not drive Portal gates.
 */
export function resolvePrintRequestLimitSettings(value: unknown): PrintRequestLimitSettings {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const defaults = DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS;

  const maxQuantityPerShowPerCustomer = resolvePrintRequestLimitField(
    data.maxQuantityPerShowPerCustomer,
    defaults.maxQuantityPerShowPerCustomer,
  );

  // Prefer stored Cap A if present (compat), else mirror L so callers always see a number.
  const dailyDesignsAddedToRequestsLimit = resolvePrintRequestLimitField(
    data.dailyDesignsAddedToRequestsLimit,
    maxQuantityPerShowPerCustomer,
  );

  const settings: PrintRequestLimitSettings = {
    dailyDesignsAddedToRequestsLimit,
    maxQuantityPerShowPerCustomer,
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
 * Strict validation for owner save payloads. Requires only `L`
 * (`maxQuantityPerShowPerCustomer`). Mirrors `L` into legacy Cap A for one-release rollback.
 * Returns null when invalid.
 */
export function parsePrintRequestLimitSettingsInput(
  value: unknown,
): PrintRequestLimitSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;

  // Accept either single-field `{ maxQuantityPerShowPerCustomer }` or legacy both-fields
  // (when both present, L wins; Cap A is ignored for the value).
  if (!isPositiveIntInRange(data.maxQuantityPerShowPerCustomer, PRINT_REQUEST_LIMIT_BOUND_MAX)) {
    return null;
  }

  const L = data.maxQuantityPerShowPerCustomer as number;
  return {
    maxQuantityPerShowPerCustomer: L,
    // Mirror L into legacy Cap A for one-release rollback compatibility.
    dailyDesignsAddedToRequestsLimit: L,
  };
}

/** Sole enforced Portal print limit `L` from resolved settings. */
export function printRequestLimitL(settings: PrintRequestLimitSettings): number {
  return settings.maxQuantityPerShowPerCustomer;
}
