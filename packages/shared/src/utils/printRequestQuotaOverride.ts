/**
 * Customer-specific temporary overrides for Portal print-request limits.
 * Global defaults live on `settings/printRequestLimits`; this policy is optional on
 * `customers/{customerId}.printRequestQuotaOverride`.
 */

import {
  PRINT_REQUEST_LIMIT_BOUND_MAX,
  PRINT_REQUEST_LIMIT_BOUND_MIN,
  resolvePrintRequestLimitField,
  type PrintRequestLimitSettings,
} from "../constants/printRequest/printRequestLimitSettings.constants";
import type { PrintRequestQuotaOverride } from "../types/customer/printRequestQuotaOverride.types";

export type { PrintRequestQuotaOverride };

export type PrintRequestQuotaOverrideStatus = "none" | "active" | "expired";

export interface EffectivePrintRequestLimits {
  globalMaxQuantityPerPrintRequest: number;
  globalMaxQuantityPerShowPerCustomer: number;
  effectiveMaxQuantityPerPrintRequest: number;
  effectiveMaxQuantityPerShowPerCustomer: number;
  /** True when at least one dimension is actively overridden (not expired). */
  overrideActive: boolean;
  status: PrintRequestQuotaOverrideStatus;
  /** Active (non-expired) override values; null means that dimension uses global. */
  activeMaxQuantityPerPrintRequest: number | null;
  activeMaxQuantityPerShowPerCustomer: number | null;
  expiresAtMs: number | null;
  storedOverride: PrintRequestQuotaOverride | null;
}

function isPositiveIntInRange(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= PRINT_REQUEST_LIMIT_BOUND_MIN &&
    value <= PRINT_REQUEST_LIMIT_BOUND_MAX
  );
}

/** Resolve Firestore Timestamp / Date / millis to epoch ms, or null. */
export function resolveQuotaOverrideExpiresAtMs(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  if (typeof value === "object") {
    const maybe = value as { toMillis?: unknown; toDate?: unknown };
    if (typeof maybe.toMillis === "function") {
      const ms = (maybe.toMillis as () => number)();
      return Number.isFinite(ms) ? Math.floor(ms) : null;
    }
    if (typeof maybe.toDate === "function") {
      const date = (maybe.toDate as () => Date)();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
    }
  }
  return null;
}

function readOptionalOverrideLimit(value: unknown): number | null {
  return isPositiveIntInRange(value) ? value : null;
}

/**
 * Normalize raw Firestore customer field into a stored override shape, or null if absent/empty.
 */
export function resolvePrintRequestQuotaOverride(value: unknown): PrintRequestQuotaOverride | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  const maxQuantityPerPrintRequest = readOptionalOverrideLimit(data.maxQuantityPerPrintRequest);
  const maxQuantityPerShowPerCustomer = readOptionalOverrideLimit(data.maxQuantityPerShowPerCustomer);
  const expiresAtMs = resolveQuotaOverrideExpiresAtMs(data.expiresAt);
  const hasDimension = maxQuantityPerPrintRequest != null || maxQuantityPerShowPerCustomer != null;
  // Keep expired/empty shells only when audit fields or expiresAt exist so Studio can show Expired.
  const hasShell =
    hasDimension ||
    expiresAtMs != null ||
    data.expiresAt === null ||
    typeof data.updatedBy === "string" ||
    data.updatedAt != null;

  if (!hasShell) {
    return null;
  }

  const override: PrintRequestQuotaOverride = {};
  if ("maxQuantityPerPrintRequest" in data) {
    override.maxQuantityPerPrintRequest =
      data.maxQuantityPerPrintRequest === null ? null : maxQuantityPerPrintRequest;
  }
  if ("maxQuantityPerShowPerCustomer" in data) {
    override.maxQuantityPerShowPerCustomer =
      data.maxQuantityPerShowPerCustomer === null ? null : maxQuantityPerShowPerCustomer;
  }
  if ("expiresAt" in data) {
    override.expiresAt = data.expiresAt === null ? null : data.expiresAt;
  }
  if (data.updatedAt !== undefined) {
    override.updatedAt = data.updatedAt;
  }
  if (typeof data.updatedBy === "string") {
    override.updatedBy = data.updatedBy;
  }
  return override;
}

function dimensionOverrideValue(override: PrintRequestQuotaOverride | null, key: keyof PrintRequestQuotaOverride): number | null {
  if (!override) {
    return null;
  }
  const value = override[key];
  return readOptionalOverrideLimit(value);
}

/**
 * Authoritative effective limits for one customer at `nowMs`.
 * Expired overrides are inactive even if stale fields remain stored.
 */
export function resolveEffectivePrintRequestLimits(input: {
  settings: PrintRequestLimitSettings;
  override?: unknown;
  nowMs?: number;
}): EffectivePrintRequestLimits {
  const globalMaxQuantityPerPrintRequest = resolvePrintRequestLimitField(
    input.settings.maxQuantityPerPrintRequest,
    input.settings.maxQuantityPerShowPerCustomer,
  );
  const globalMaxQuantityPerShowPerCustomer = resolvePrintRequestLimitField(
    input.settings.maxQuantityPerShowPerCustomer,
    globalMaxQuantityPerPrintRequest,
  );

  const storedOverride = resolvePrintRequestQuotaOverride(input.override);
  const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs) ? input.nowMs : Date.now();
  const expiresAtMs = storedOverride ? resolveQuotaOverrideExpiresAtMs(storedOverride.expiresAt) : null;
  const isExpired = expiresAtMs != null && nowMs >= expiresAtMs;

  const storedPr = dimensionOverrideValue(storedOverride, "maxQuantityPerPrintRequest");
  const storedShow = dimensionOverrideValue(storedOverride, "maxQuantityPerShowPerCustomer");
  const hasStoredDimension = storedPr != null || storedShow != null;

  let status: PrintRequestQuotaOverrideStatus = "none";
  if (storedOverride && hasStoredDimension) {
    status = isExpired ? "expired" : "active";
  } else if (storedOverride && isExpired) {
    status = "expired";
  }

  const overrideActive = status === "active";
  const activeMaxQuantityPerPrintRequest = overrideActive ? storedPr : null;
  const activeMaxQuantityPerShowPerCustomer = overrideActive ? storedShow : null;

  return {
    globalMaxQuantityPerPrintRequest,
    globalMaxQuantityPerShowPerCustomer,
    effectiveMaxQuantityPerPrintRequest:
      activeMaxQuantityPerPrintRequest ?? globalMaxQuantityPerPrintRequest,
    effectiveMaxQuantityPerShowPerCustomer:
      activeMaxQuantityPerShowPerCustomer ?? globalMaxQuantityPerShowPerCustomer,
    overrideActive,
    status,
    activeMaxQuantityPerPrintRequest,
    activeMaxQuantityPerShowPerCustomer,
    expiresAtMs,
    storedOverride,
  };
}

/** Compact Users-list badge when clock-aware status is active. */
export function hasActivePrintRequestQuotaOverride(
  override: unknown,
  nowMs: number = Date.now(),
): boolean {
  return (
    resolveEffectivePrintRequestLimits({
      settings: {
        dailyDesignsAddedToRequestsLimit: 20,
        maxQuantityPerPrintRequest: 20,
        maxQuantityPerShowPerCustomer: 20,
        linkPrintRequestAndCustomerShowLimits: true,
        portalInteractiveUpscaleEnabled: false,
      },
      override,
      nowMs,
    }).status === "active"
  );
}

export interface ParsePrintRequestQuotaOverrideInputResult {
  maxQuantityPerPrintRequest: number | null;
  maxQuantityPerShowPerCustomer: number | null;
  expiresAtMs: number | null;
  clearAll: boolean;
}

/**
 * Strict validation for owner Save/Clear payloads.
 * - Limits: positive ints in global bounds, or null (use global).
 * - expiresAtMs: future millis, or null (no expiration). Reject past times.
 * - clearAll: remove entire override map.
 */
export function parsePrintRequestQuotaOverrideInput(
  value: unknown,
  nowMs: number = Date.now(),
): ParsePrintRequestQuotaOverrideInputResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;

  if (data.clearAll === true) {
    return {
      maxQuantityPerPrintRequest: null,
      maxQuantityPerShowPerCustomer: null,
      expiresAtMs: null,
      clearAll: true,
    };
  }

  const hasPrKey = "maxQuantityPerPrintRequest" in data;
  const hasShowKey = "maxQuantityPerShowPerCustomer" in data;
  if (!hasPrKey || !hasShowKey) {
    return null;
  }

  let maxQuantityPerPrintRequest: number | null;
  let maxQuantityPerShowPerCustomer: number | null;

  if (data.maxQuantityPerPrintRequest === null) {
    maxQuantityPerPrintRequest = null;
  } else if (isPositiveIntInRange(data.maxQuantityPerPrintRequest)) {
    maxQuantityPerPrintRequest = data.maxQuantityPerPrintRequest;
  } else {
    return null;
  }

  if (data.maxQuantityPerShowPerCustomer === null) {
    maxQuantityPerShowPerCustomer = null;
  } else if (isPositiveIntInRange(data.maxQuantityPerShowPerCustomer)) {
    maxQuantityPerShowPerCustomer = data.maxQuantityPerShowPerCustomer;
  } else {
    return null;
  }

  let expiresAtMs: number | null = null;
  if ("expiresAtMs" in data) {
    if (data.expiresAtMs === null) {
      expiresAtMs = null;
    } else if (typeof data.expiresAtMs === "number" && Number.isFinite(data.expiresAtMs)) {
      const ms = Math.floor(data.expiresAtMs);
      if (ms <= nowMs) {
        return null;
      }
      expiresAtMs = ms;
    } else {
      return null;
    }
  } else if ("expiresAtIso" in data) {
    if (data.expiresAtIso === null) {
      expiresAtMs = null;
    } else if (typeof data.expiresAtIso === "string") {
      const parsed = Date.parse(data.expiresAtIso);
      if (!Number.isFinite(parsed) || parsed <= nowMs) {
        return null;
      }
      expiresAtMs = parsed;
    } else {
      return null;
    }
  }

  return {
    maxQuantityPerPrintRequest,
    maxQuantityPerShowPerCustomer,
    expiresAtMs,
    clearAll: false,
  };
}
