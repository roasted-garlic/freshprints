/**
 * Studio editing convenience for customer print-request quota overrides.
 * Does not change persisted independent override semantics or global
 * `linkPrintRequestAndCustomerShowLimits`.
 */

export type CustomerQuotaOverrideEditMode = "linked" | "independent";

export interface StoredQuotaDimensionSnapshot {
  maxQuantityPerPrintRequest: number | null;
  maxQuantityPerShowPerCustomer: number | null;
}

/** Initial edit mode from stored override dimensions. */
export function resolveInitialCustomerQuotaOverrideEditMode(
  snapshot: StoredQuotaDimensionSnapshot,
): CustomerQuotaOverrideEditMode {
  const { maxQuantityPerPrintRequest: pr, maxQuantityPerShowPerCustomer: show } = snapshot;
  const hasPr = pr != null;
  const hasShow = show != null;
  if (!hasPr && !hasShow) {
    return "linked";
  }
  if (hasPr && hasShow && pr === show) {
    return "linked";
  }
  return "independent";
}

export function resolveLinkedSeedValue(snapshot: StoredQuotaDimensionSnapshot): string {
  const { maxQuantityPerPrintRequest: pr, maxQuantityPerShowPerCustomer: show } = snapshot;
  if (pr != null && show != null && pr === show) {
    return String(pr);
  }
  return "";
}

/**
 * When leaving independent mode for linked with unequal dimensions, do not pick a winner.
 * Clear the shared field so the owner must enter an explicit linked value before save.
 */
export function resolveLinkedValueAfterLeavingIndependent(input: {
  pr: number | null;
  show: number | null;
}): { linkedValue: string; requiresExplicitLinkedValue: boolean } {
  if (input.pr != null && input.show != null && input.pr === input.show) {
    return { linkedValue: String(input.pr), requiresExplicitLinkedValue: false };
  }
  if (input.pr == null && input.show == null) {
    return { linkedValue: "", requiresExplicitLinkedValue: false };
  }
  return { linkedValue: "", requiresExplicitLinkedValue: true };
}

export function buildQuotaOverrideSavePayload(input: {
  mode: CustomerQuotaOverrideEditMode;
  useGlobalLinked: boolean;
  linkedValue: string;
  useGlobalPr: boolean;
  useGlobalShow: boolean;
  prOverrideInput: string;
  showOverrideInput: string;
}):
  | { ok: true; maxQuantityPerPrintRequest: number | null; maxQuantityPerShowPerCustomer: number | null }
  | { ok: false; error: string } {
  if (input.mode === "linked") {
    if (input.useGlobalLinked) {
      return {
        ok: true,
        maxQuantityPerPrintRequest: null,
        maxQuantityPerShowPerCustomer: null,
      };
    }
    const parsed = Number(input.linkedValue);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) {
      return {
        ok: false,
        error: "Temporary quota must be an integer from 1 to 10000.",
      };
    }
    return {
      ok: true,
      maxQuantityPerPrintRequest: parsed,
      maxQuantityPerShowPerCustomer: parsed,
    };
  }

  let maxQuantityPerPrintRequest: number | null = null;
  let maxQuantityPerShowPerCustomer: number | null = null;

  if (!input.useGlobalPr) {
    const parsed = Number(input.prOverrideInput);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) {
      return {
        ok: false,
        error: "Print Request override must be an integer from 1 to 10000.",
      };
    }
    maxQuantityPerPrintRequest = parsed;
  }
  if (!input.useGlobalShow) {
    const parsed = Number(input.showOverrideInput);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10_000) {
      return {
        ok: false,
        error: "Customer Show override must be an integer from 1 to 10000.",
      };
    }
    maxQuantityPerShowPerCustomer = parsed;
  }

  return { ok: true, maxQuantityPerPrintRequest, maxQuantityPerShowPerCustomer };
}
