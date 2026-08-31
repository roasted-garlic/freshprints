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
 * - `maxQuantityPerPrintRequest` — max total quantity in one working print request.
 * - `maxQuantityPerShowPerCustomer` — max cumulative quantity one customer may allocate to one show.
 * - When `linkPrintRequestAndCustomerShowLimits` is true (default), both numeric limits stay equal.
 *
 * `dailyDesignsAddedToRequestsLimit` is legacy Cap A: mirrored from the request limit on save for
 * one-release rollback compatibility. Do not read or enforce it for Portal limits.
 */
export interface PrintRequestLimitSettings {
  /**
   * Legacy Cap A field. Write-only mirror of the request limit for one release.
   * Not used for enforcement.
   */
  dailyDesignsAddedToRequestsLimit: number;
  /** Max prints contained in one working print request. */
  maxQuantityPerPrintRequest: number;
  /** Max prints one customer may place into one show (sum across their requests). */
  maxQuantityPerShowPerCustomer: number;
  /**
   * When true, both numeric limits are kept equal. Absent in Firestore → treated as linked.
   */
  linkPrintRequestAndCustomerShowLimits: boolean;
  /**
   * When true, Portal customers see the interactive upscale toggle on print request items.
   * Staff Studio upscale is unaffected. Defaults to false until explicitly enabled.
   */
  portalInteractiveUpscaleEnabled: boolean;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS: Readonly<PrintRequestLimitSettings> = {
  dailyDesignsAddedToRequestsLimit: PRINT_REQUEST_DAILY_DESIGNS_ADDED_LIMIT,
  maxQuantityPerPrintRequest: PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
  maxQuantityPerShowPerCustomer: PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER,
  linkPrintRequestAndCustomerShowLimits: true,
  portalInteractiveUpscaleEnabled: false,
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

function resolveLinkPreference(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  // Absent / invalid → linked (backward compatible with sole-L installs).
  return true;
}

function resolvePortalInteractiveUpscaleEnabled(value: unknown): boolean {
  return value === true;
}

/**
 * Resolve settings from Firestore.
 * - Missing `maxQuantityPerPrintRequest` falls back to `maxQuantityPerShowPerCustomer`.
 * - Missing link preference is treated as linked.
 * - Legacy Cap A is resolved for display/compat but must not drive Portal gates.
 */
export function resolvePrintRequestLimitSettings(value: unknown): PrintRequestLimitSettings {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const defaults = DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS;

  const maxQuantityPerShowPerCustomer = resolvePrintRequestLimitField(
    data.maxQuantityPerShowPerCustomer,
    defaults.maxQuantityPerShowPerCustomer,
  );

  const maxQuantityPerPrintRequest = resolvePrintRequestLimitField(
    data.maxQuantityPerPrintRequest,
    maxQuantityPerShowPerCustomer,
  );

  const linkPrintRequestAndCustomerShowLimits = resolveLinkPreference(
    data.linkPrintRequestAndCustomerShowLimits,
  );

  // Prefer stored Cap A if present (compat), else mirror request limit so callers always see a number.
  const dailyDesignsAddedToRequestsLimit = resolvePrintRequestLimitField(
    data.dailyDesignsAddedToRequestsLimit,
    maxQuantityPerPrintRequest,
  );

  const settings: PrintRequestLimitSettings = {
    dailyDesignsAddedToRequestsLimit,
    maxQuantityPerPrintRequest,
    maxQuantityPerShowPerCustomer,
    linkPrintRequestAndCustomerShowLimits,
    portalInteractiveUpscaleEnabled: resolvePortalInteractiveUpscaleEnabled(
      data.portalInteractiveUpscaleEnabled,
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

export interface PrintRequestLimitSettingsInput {
  maxQuantityPerPrintRequest: number;
  maxQuantityPerShowPerCustomer: number;
  linkPrintRequestAndCustomerShowLimits: boolean;
  portalInteractiveUpscaleEnabled?: boolean;
}

/**
 * Strict validation for owner save payloads.
 * When linked, both numeric fields must be equal; Cap A mirrors the request limit.
 * Returns null when invalid.
 */
export function parsePrintRequestLimitSettingsInput(
  value: unknown,
): PrintRequestLimitSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;

  // Legacy sole-L save shape: only customer-show field present → treat as linked equal values.
  const hasRequestField = isPositiveIntInRange(data.maxQuantityPerPrintRequest, PRINT_REQUEST_LIMIT_BOUND_MAX);
  const hasCustomerShowField = isPositiveIntInRange(
    data.maxQuantityPerShowPerCustomer,
    PRINT_REQUEST_LIMIT_BOUND_MAX,
  );

  if (!hasCustomerShowField && !hasRequestField) {
    return null;
  }

  const linkPrintRequestAndCustomerShowLimits =
    typeof data.linkPrintRequestAndCustomerShowLimits === "boolean"
      ? data.linkPrintRequestAndCustomerShowLimits
      : true;

  let maxQuantityPerPrintRequest: number;
  let maxQuantityPerShowPerCustomer: number;

  if (linkPrintRequestAndCustomerShowLimits) {
    // Linked saves always persist equal numerics. Prefer explicit request field, else customer-show.
    const linkedValue = hasRequestField
      ? (data.maxQuantityPerPrintRequest as number)
      : (data.maxQuantityPerShowPerCustomer as number);
    maxQuantityPerPrintRequest = linkedValue;
    maxQuantityPerShowPerCustomer = linkedValue;
  } else {
    if (!hasRequestField || !hasCustomerShowField) {
      return null;
    }
    maxQuantityPerPrintRequest = data.maxQuantityPerPrintRequest as number;
    maxQuantityPerShowPerCustomer = data.maxQuantityPerShowPerCustomer as number;
  }

  return {
    maxQuantityPerPrintRequest,
    maxQuantityPerShowPerCustomer,
    linkPrintRequestAndCustomerShowLimits,
    dailyDesignsAddedToRequestsLimit: maxQuantityPerPrintRequest,
    portalInteractiveUpscaleEnabled: resolvePortalInteractiveUpscaleEnabled(
      data.portalInteractiveUpscaleEnabled,
    ),
  };
}

export function portalInteractiveUpscaleUiEnabled(settings: PrintRequestLimitSettings): boolean {
  return settings.portalInteractiveUpscaleEnabled === true;
}

/** @deprecated Prefer `printRequestLimitPerRequest` / `printRequestLimitPerCustomerPerShow`. */
export function printRequestLimitL(settings: PrintRequestLimitSettings): number {
  return settings.maxQuantityPerShowPerCustomer;
}

export function printRequestLimitPerRequest(settings: PrintRequestLimitSettings): number {
  return settings.maxQuantityPerPrintRequest;
}

export function printRequestLimitPerCustomerPerShow(settings: PrintRequestLimitSettings): number {
  return settings.maxQuantityPerShowPerCustomer;
}
