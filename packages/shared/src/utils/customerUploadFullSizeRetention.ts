export const CUSTOMER_UPLOAD_FULL_SIZE_IDLE_AFTER_DAYS = 14;

export const ACTIVE_SHOW_ALLOCATION_STATUSES = ["pending", "queued", "in_progress"] as const;

export const TERMINAL_SHOW_ALLOCATION_STATUSES = ["printed", "done", "canceled"] as const;

export const WORKING_PRINT_REQUEST_STATUSES = ["draft", "active", "editing"] as const;

export const SHOW_PRODUCTION_STATUSES_ALLOWING_UPLOAD_PURGE = [
  "completed",
  "canceled",
  "archived",
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CustomerUploadFullSizeRetentionReason =
  | "not_print_request"
  | "not_ready"
  | "already_purged"
  | "active_allocation"
  | "working_print_request"
  | "show_not_finished"
  | "idle_not_elapsed"
  | "eligible_after_show"
  | "eligible_idle";

export interface CustomerUploadFullSizeRetentionInput {
  purpose?: string | null;
  technicalStatus: string;
  fullSizePurgedAtMillis?: number | null;
  /** True when upload is attached to a draft/active/editing print request. */
  onWorkingPrintRequest: boolean;
  /** Any allocation in pending|queued|in_progress. */
  hasActiveAllocation: boolean;
  /** True when at least one allocation exists (any status). */
  hasAnyAllocation: boolean;
  /**
   * When hasAnyAllocation: true iff every linked show is completed|canceled|archived
   * (or the show doc is missing). Ignored when hasAnyAllocation is false.
   */
  allLinkedShowsAllowPurge: boolean;
  updatedAtMillis?: number | null;
  createdAtMillis?: number | null;
  nowMs: number;
  idleAfterDays?: number;
}

export interface CustomerUploadFullSizeRetentionResult {
  eligible: boolean;
  reason: CustomerUploadFullSizeRetentionReason;
}

function resolveIdleClockMillis(input: CustomerUploadFullSizeRetentionInput): number | null {
  if (typeof input.updatedAtMillis === "number" && Number.isFinite(input.updatedAtMillis)) {
    return input.updatedAtMillis;
  }
  if (typeof input.createdAtMillis === "number" && Number.isFinite(input.createdAtMillis)) {
    return input.createdAtMillis;
  }
  return null;
}

export function isActiveShowAllocationStatus(status: string): boolean {
  return (ACTIVE_SHOW_ALLOCATION_STATUSES as readonly string[]).includes(status);
}

export function isShowProductionStatusAllowingUploadPurge(status: string): boolean {
  return (SHOW_PRODUCTION_STATUSES_ALLOWING_UPLOAD_PURGE as readonly string[]).includes(status);
}

export function isWorkingPrintRequestStatus(status: string): boolean {
  return (WORKING_PRINT_REQUEST_STATUSES as readonly string[]).includes(status);
}

/**
 * Pure eligibility for ADR-FP-086 §3 request-upload full-size purge.
 * Donations are never eligible here.
 */
export function evaluateCustomerUploadFullSizeRetention(
  input: CustomerUploadFullSizeRetentionInput,
): CustomerUploadFullSizeRetentionResult {
  const purpose = input.purpose?.trim() || "print_request";
  if (purpose !== "print_request") {
    return { eligible: false, reason: "not_print_request" };
  }

  if (input.technicalStatus !== "ready") {
    return { eligible: false, reason: "not_ready" };
  }

  if (input.fullSizePurgedAtMillis != null) {
    return { eligible: false, reason: "already_purged" };
  }

  if (input.hasActiveAllocation) {
    return { eligible: false, reason: "active_allocation" };
  }

  if (input.onWorkingPrintRequest) {
    return { eligible: false, reason: "working_print_request" };
  }

  if (input.hasAnyAllocation) {
    if (!input.allLinkedShowsAllowPurge) {
      return { eligible: false, reason: "show_not_finished" };
    }
    return { eligible: true, reason: "eligible_after_show" };
  }

  const idleDays = input.idleAfterDays ?? CUSTOMER_UPLOAD_FULL_SIZE_IDLE_AFTER_DAYS;
  const clock = resolveIdleClockMillis(input);
  if (clock == null) {
    return { eligible: false, reason: "idle_not_elapsed" };
  }

  const cutoffMs = input.nowMs - idleDays * MS_PER_DAY;
  if (clock > cutoffMs) {
    return { eligible: false, reason: "idle_not_elapsed" };
  }

  return { eligible: true, reason: "eligible_idle" };
}
