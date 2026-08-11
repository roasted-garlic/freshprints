/**
 * Legacy false-Pending print-request upload repair — pure safety guards (no I/O).
 *
 * Used by `functions/scripts/legacy-pending-false-pending-repair.mjs`.
 * Formal Review: allowlist-only; default dry-run; prod hard-pin; APPLY double-confirm;
 * live allocation = non-canceled + allocatedQuantity > 0; status-only patch.
 */

/* eslint-env node */

/** Only permitted Firebase project for this repair tooling. */
export const LEGACY_PENDING_REPAIR_ALLOWED_PROJECT_ID = "fresh-prints-prod";

/** Second APPLY confirm env (must equal "1" when APPLY=1). */
export const LEGACY_PENDING_REPAIR_CONFIRM_ENV = "CONFIRM_PROD_LEGACY_PENDING_REPAIR";

/**
 * Frozen production candidate allowlist (2026-08-11 read-only inventory).
 * Re-inventory may expand this list later; APPLY still re-checks predicates.
 */
export const LEGACY_PENDING_REPAIR_DEFAULT_ALLOWLIST = Object.freeze([
  "kkD1yLR9UNFsleK4Bg4Z",
  "sTN1ewGYYpK8fWg6nU0s",
]);

export const LEGACY_PENDING_REPAIR_TARGET_STATUS = "not_eligible";
export const LEGACY_PENDING_REPAIR_SOURCE_STATUS = "pending_staff_review";

/**
 * @param {string} projectId
 */
export function assertLegacyPendingRepairProjectId(projectId) {
  if (projectId !== LEGACY_PENDING_REPAIR_ALLOWED_PROJECT_ID) {
    throw new Error(
      `Refusing legacy Pending repair against project "${projectId}". ` +
        `Hard-pinned to "${LEGACY_PENDING_REPAIR_ALLOWED_PROJECT_ID}" only.`,
    );
  }
}

/**
 * APPLY requires APPLY=1 and CONFIRM_PROD_LEGACY_PENDING_REPAIR=1.
 * @param {{ apply?: string | undefined, confirm?: string | undefined }} env
 */
export function assertLegacyPendingRepairApplyConfirm(env = {}) {
  const apply = env.apply ?? process.env.APPLY;
  const confirm = env.confirm ?? process.env[LEGACY_PENDING_REPAIR_CONFIRM_ENV];
  if (apply !== "1") {
    throw new Error('APPLY mode requires APPLY=1 (default is dry-run).');
  }
  if (confirm !== "1") {
    throw new Error(
      `APPLY mode requires ${LEGACY_PENDING_REPAIR_CONFIRM_ENV}=1.`,
    );
  }
}

/**
 * Live allocation = non-canceled status AND allocatedQuantity > 0.
 * Canceled-only rows do NOT count as live.
 *
 * @param {{ status?: unknown, allocatedQuantity?: unknown }} allocation
 * @returns {boolean}
 */
export function isLiveShowAllocation(allocation) {
  if (!allocation || typeof allocation !== "object") {
    return false;
  }
  const status = typeof allocation.status === "string" ? allocation.status.trim() : "";
  if (status === "canceled") {
    return false;
  }
  const qty = Number(allocation.allocatedQuantity);
  return Number.isFinite(qty) && qty > 0;
}

/**
 * @param {Iterable<{ status?: unknown, allocatedQuantity?: unknown }>} allocations
 * @returns {boolean}
 */
export function hasLiveShowAllocation(allocations) {
  for (const row of allocations ?? []) {
    if (isLiveShowAllocation(row)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {unknown} purpose
 * @returns {"print_request" | "donation" | "missing" | "other"}
 */
export function classifyCustomerUploadPurpose(purpose) {
  if (purpose == null || purpose === "") {
    return "missing";
  }
  if (typeof purpose !== "string") {
    return "other";
  }
  const normalized = purpose.trim();
  if (normalized === "print_request") {
    return "print_request";
  }
  if (normalized === "donation") {
    return "donation";
  }
  return "other";
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function hasBiddingAcknowledgment(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.keys(value).length > 0;
}

/**
 * Normalize allowlist from env CSV or default frozen set.
 * @param {string | undefined} csv
 * @returns {readonly string[]}
 */
export function resolveLegacyPendingRepairAllowlist(csv = process.env.LEGACY_PENDING_REPAIR_ALLOWLIST) {
  if (typeof csv === "string" && csv.trim()) {
    const ids = csv
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return Object.freeze([...new Set(ids)]);
  }
  return LEGACY_PENDING_REPAIR_DEFAULT_ALLOWLIST;
}

/**
 * Classify one candidate without I/O.
 *
 * @param {{
 *   uploadId: string,
 *   allowlist: ReadonlySet<string> | readonly string[],
 *   upload: Record<string, unknown> | null | undefined,
 *   request: Record<string, unknown> | null | undefined,
 *   allocations: readonly Record<string, unknown>[],
 * }} input
 * @returns {{
 *   decision: "would_patch" | "noop_already_repaired" | "skip",
 *   reason: string,
 *   repairPatch: { catalogReviewStatus: string } | null,
 * }}
 */
export function classifyLegacyPendingFalsePendingCandidate(input) {
  const allowlist = input.allowlist instanceof Set ? input.allowlist : new Set(input.allowlist);
  const uploadId = typeof input.uploadId === "string" ? input.uploadId.trim() : "";

  if (!uploadId || !allowlist.has(uploadId)) {
    return {
      decision: "skip",
      reason: "not_allowlisted",
      repairPatch: null,
    };
  }

  const upload = input.upload;
  if (!upload || typeof upload !== "object") {
    return {
      decision: "skip",
      reason: "upload_missing",
      repairPatch: null,
    };
  }

  const purposeClass = classifyCustomerUploadPurpose(upload.purpose);
  if (purposeClass === "donation") {
    return { decision: "skip", reason: "purpose_donation", repairPatch: null };
  }
  if (purposeClass === "other") {
    return { decision: "skip", reason: "purpose_incompatible", repairPatch: null };
  }
  // print_request or missing (legacy) are eligible for classification.

  const catalogReviewStatus =
    typeof upload.catalogReviewStatus === "string" ? upload.catalogReviewStatus.trim() : "";

  if (catalogReviewStatus === LEGACY_PENDING_REPAIR_TARGET_STATUS) {
    return {
      decision: "noop_already_repaired",
      reason: "already_not_eligible",
      repairPatch: null,
    };
  }

  if (catalogReviewStatus !== LEGACY_PENDING_REPAIR_SOURCE_STATUS) {
    return {
      decision: "skip",
      reason:
        catalogReviewStatus === "excluded" ||
        catalogReviewStatus === "sent_to_ai_review" ||
        catalogReviewStatus === "promoted" ||
        catalogReviewStatus === "approved" ||
        catalogReviewStatus === "rejected"
          ? "incompatible_lifecycle"
          : "status_changed",
      repairPatch: null,
    };
  }

  const technicalStatus =
    typeof upload.technicalStatus === "string" ? upload.technicalStatus.trim() : "";
  if (technicalStatus !== "ready") {
    return { decision: "skip", reason: "technical_not_ready", repairPatch: null };
  }

  const printRequestId =
    typeof upload.printRequestId === "string" ? upload.printRequestId.trim() : "";
  if (!printRequestId) {
    return { decision: "skip", reason: "missing_print_request_id", repairPatch: null };
  }

  const request = input.request;
  if (!request || typeof request !== "object") {
    return { decision: "skip", reason: "missing_linked_request", repairPatch: null };
  }

  const requestStatus = typeof request.status === "string" ? request.status.trim() : "";
  if (requestStatus === "active") {
    return { decision: "skip", reason: "request_active", repairPatch: null };
  }
  if (requestStatus === "editing") {
    return { decision: "skip", reason: "request_editing", repairPatch: null };
  }
  if (requestStatus !== "draft") {
    return { decision: "skip", reason: "request_status_ambiguous", repairPatch: null };
  }

  if (hasBiddingAcknowledgment(request.showQueueBiddingAcknowledgment)) {
    return { decision: "skip", reason: "bidding_ack_present", repairPatch: null };
  }

  if (hasLiveShowAllocation(input.allocations ?? [])) {
    return { decision: "skip", reason: "live_allocation_present", repairPatch: null };
  }

  return {
    decision: "would_patch",
    reason: "proven_false_pending",
    repairPatch: {
      catalogReviewStatus: LEGACY_PENDING_REPAIR_TARGET_STATUS,
    },
  };
}

/**
 * @param {object} params
 * @param {string} params.projectId
 * @param {boolean} params.apply
 * @param {readonly string[]} [params.allowlist]
 * @param {readonly object[]} params.results
 */
export function buildLegacyPendingRepairDryRunRecord({ projectId, apply, allowlist, results }) {
  const summary = {
    would_patch: 0,
    noop_already_repaired: 0,
    skip: 0,
    patched: 0,
  };
  for (const row of results) {
    const key = row.decision;
    if (key in summary) {
      summary[key] += 1;
    }
  }
  return {
    tool: "legacy-pending-false-pending-repair",
    projectId,
    mode: apply ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    allowlist: [...(allowlist ?? LEGACY_PENDING_REPAIR_DEFAULT_ALLOWLIST)],
    liveAllocationDefinition:
      "non-canceled showAllocations row with allocatedQuantity > 0 (canceled-only does not count)",
    repairFields: ["catalogReviewStatus", "updatedAt"],
    summary,
    results,
  };
}
