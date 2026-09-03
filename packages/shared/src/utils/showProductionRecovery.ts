import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";
import type {
  PreviewShowProductionRecoveryResponse,
  ShowProductionRecoveryAction,
  ShowProductionRecoveryOutcome,
} from "../types/showProductionRecovery/showProductionRecovery.types";
import { PRODUCTION_OVERRIDE_REASON_MAX_LENGTH } from "../types/showProductionRecovery/showProductionRecovery.types";
import { isFinishableShowAllocationStatus } from "./showFinishAllocationStatuses";
import {
  SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS,
  buildRequeueLines,
  buildShowProductionRecoveryPreviewChecksum,
  buildShowProductionRequeueTargetShow,
  collectRequeueEligibleAllocations,
  computeRequeueCapacityProjection,
  type RequeueAllocationSnapshot,
  type RequeueTargetShowInput,
  sumRequeueEligibleQuantity,
  validateRequeueTargetShow,
} from "./showProductionRecoveryRequeue";
import {
  isPastScheduledShow,
  type ShowWithId,
  type ShowWithProductionSource,
  type ShowWithScheduledStart,
} from "./showScheduleGrouping";

export const TERMINAL_WHATNOT_PRODUCTION_STATUSES: readonly ShowProductionStatus[] = [
  "completed",
  "fully_printed",
  "archived",
  "canceled",
];

export type WhatnotShowQueueTab = "upcoming" | "needs_attention" | "past";

export type ShowNeedsAttentionReason =
  | "stale_printing"
  | "queued_work_attached"
  | "no_production_completion"
  | "empty_show"
  | "inconsistent_state";

export interface ShowAllocationRecoverySnapshot {
  id?: string;
  status: string;
  allocatedQuantity: number;
  upcomingShowId?: string;
  printRequestId?: string;
  requestNameSnapshot?: string;
}

export function isTerminalWhatnotProductionStatus(
  productionStatus: ShowProductionStatus | string | null | undefined,
): boolean {
  return TERMINAL_WHATNOT_PRODUCTION_STATUSES.includes(
    productionStatus as ShowProductionStatus,
  );
}

/** Show Queue lifecycle (Upcoming / Needs Attention / Past) — not external Whatnot sync. */
export function isShowQueueProductionRecoveryEligible(
  show: ShowWithProductionSource,
): boolean {
  return show.source === "whatnot" || show.source === "dev_fixture";
}

export function isProvablyEmptyWhatnotShow(show: { allocatedQuantity?: number }): boolean {
  return (show.allocatedQuantity ?? 0) === 0;
}

/** Past queue-surface shows with no attached print work skip Needs Attention. */
export function shouldSkipNeedsAttentionForEmptyPastShow(
  show: ShowWithProductionSource,
  now: Date,
): boolean {
  return (
    isShowQueueProductionRecoveryEligible(show) &&
    isPastScheduledShow(show, now) &&
    show.productionStatus !== "printing" &&
    isProvablyEmptyWhatnotShow(show)
  );
}

/** Non-terminal empty past shows are auto-closed to Past + EMPTY (empty_closure). */
export function isEmptyPastShowNeedingAutoClose(
  show: ShowWithProductionSource,
  now: Date,
): boolean {
  return (
    shouldSkipNeedsAttentionForEmptyPastShow(show, now) &&
    !isTerminalWhatnotProductionStatus(show.productionStatus)
  );
}

export function isUnresolvedPastWhatnotShow(
  show: ShowWithProductionSource,
  now: Date,
): boolean {
  if (shouldSkipNeedsAttentionForEmptyPastShow(show, now)) {
    return false;
  }

  return (
    isShowQueueProductionRecoveryEligible(show) &&
    isPastScheduledShow(show, now) &&
    !isTerminalWhatnotProductionStatus(show.productionStatus)
  );
}

/** Terminal Past tab / read-only queue detail — excludes unresolved Needs Attention shows. */
export function isShowQueuePastReadOnlyShow(
  show: ShowWithProductionSource,
  now: Date,
): boolean {
  if (isShowQueueProductionRecoveryEligible(show)) {
    return getWhatnotShowQueueTab(show, now) === "past";
  }
  return isPastScheduledShow(show, now);
}

export function getWhatnotShowQueueTab(
  show: ShowWithProductionSource,
  now: Date,
): WhatnotShowQueueTab {
  if (!isShowQueueProductionRecoveryEligible(show)) {
    return getShowScheduleTabFallback(show, now);
  }
  if (!isPastScheduledShow(show, now)) {
    return "upcoming";
  }
  return isUnresolvedPastWhatnotShow(show, now) ? "needs_attention" : "past";
}

function getShowScheduleTabFallback(show: ShowWithScheduledStart, now: Date): WhatnotShowQueueTab {
  return isPastScheduledShow(show, now) ? "past" : "upcoming";
}

export function partitionWhatnotShowsByQueueTab<T extends ShowWithProductionSource>(
  shows: readonly T[],
  now: Date,
): Record<WhatnotShowQueueTab, T[]> {
  const result: Record<WhatnotShowQueueTab, T[]> = {
    upcoming: [],
    needs_attention: [],
    past: [],
  };

  for (const show of shows) {
    if (!isShowQueueProductionRecoveryEligible(show)) {
      continue;
    }
    result[getWhatnotShowQueueTab(show, now)].push(show);
  }

  return result;
}

/**
 * When a selected show's queue tab classification changes (e.g. remediation completes),
 * return the tab it now belongs to so the UI can follow the selection.
 */
export function resolveWhatnotQueueTabForStillExistingSelection<
  T extends ShowWithId & ShowWithProductionSource,
>(
  shows: readonly T[],
  selectedShowId: string | null,
  activeQueueTab: WhatnotShowQueueTab,
  now: Date,
): WhatnotShowQueueTab | null {
  if (!selectedShowId) {
    return null;
  }
  const stillExistingShow = shows.find((show) => show.id === selectedShowId);
  if (!stillExistingShow || !isShowQueueProductionRecoveryEligible(stillExistingShow)) {
    return null;
  }
  const showTab = getWhatnotShowQueueTab(stillExistingShow, now);
  return showTab !== activeQueueTab ? showTab : null;
}

export function countActiveShowAllocations(
  allocations: readonly ShowAllocationRecoverySnapshot[],
  upcomingShowId: string,
): { activeCount: number; finishableCount: number; activeQuantity: number } {
  let activeCount = 0;
  let finishableCount = 0;
  let activeQuantity = 0;

  for (const allocation of allocations) {
    if (allocation.upcomingShowId !== undefined && allocation.upcomingShowId !== upcomingShowId) {
      continue;
    }
    if (allocation.status === "canceled") {
      continue;
    }
    activeCount += 1;
    activeQuantity += allocation.allocatedQuantity;
    if (isFinishableShowAllocationStatus(allocation.status as never)) {
      finishableCount += 1;
    }
  }

  return { activeCount, finishableCount, activeQuantity };
}

export function deriveShowNeedsAttentionReason(input: {
  show: ShowWithProductionSource;
  now: Date;
  activeAllocationCount: number;
  finishableAllocationCount: number;
  printStartedAtPresent: boolean;
}): ShowNeedsAttentionReason {
  const { show, now, activeAllocationCount, finishableAllocationCount, printStartedAtPresent } =
    input;

  if (!isUnresolvedPastWhatnotShow(show, now)) {
    return "inconsistent_state";
  }

  if (show.productionStatus === "printing") {
    return "stale_printing";
  }

  if (finishableAllocationCount > 0) {
    return "queued_work_attached";
  }

  if (activeAllocationCount === 0) {
    return "empty_show";
  }

  if (!printStartedAtPresent && (show.productionStatus === "open" || show.productionStatus === "full")) {
    return "no_production_completion";
  }

  return "inconsistent_state";
}

export function formatShowNeedsAttentionReasonLabel(reason: ShowNeedsAttentionReason): string {
  switch (reason) {
    case "stale_printing":
      return "Stale printing — reconciliation pending";
    case "queued_work_attached":
      return "Queued work still attached";
    case "no_production_completion":
      return "Production completion not recorded";
    case "empty_show":
      return "Nothing to print — close show";
    case "inconsistent_state":
      return "Inconsistent production state";
    default:
      return "Needs attention";
  }
}

export function validateProductionOverrideReason(reason: string | undefined | null): string | null {
  const trimmed = typeof reason === "string" ? reason.trim() : "";
  if (!trimmed) {
    return "Owner override reason is required.";
  }
  if (trimmed.length > PRODUCTION_OVERRIDE_REASON_MAX_LENGTH) {
    return `Owner override reason must be ${PRODUCTION_OVERRIDE_REASON_MAX_LENGTH} characters or fewer.`;
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(trimmed)) {
    return "Owner override reason contains invalid control characters.";
  }
  return null;
}

export function resolveProductionRecoveryPreviewOutcome(
  action: ShowProductionRecoveryAction,
  input: {
    productionStatus: ShowProductionStatus | string | null | undefined;
    isPast: boolean;
    /** True for Show Queue surface shows (`whatnot` + `dev_fixture`), not import/sync eligibility. */
    isWhatnot: boolean;
    activeAllocationCount: number;
    finishableAllocationCount: number;
    overrideReason?: string;
    targetUpcomingShowId?: string;
    requeueTargetValid?: boolean;
    requeueCapacityValid?: boolean;
  },
): ShowProductionRecoveryOutcome {
  if (!input.isWhatnot) {
    return "invalid_action";
  }
  if (!input.isPast) {
    return "blocked";
  }
  if (isTerminalWhatnotProductionStatus(input.productionStatus)) {
    return "already_terminal";
  }

  if (action === "force_completed") {
    const reasonError = validateProductionOverrideReason(input.overrideReason);
    if (reasonError) {
      return "blocked";
    }
    return "applied";
  }

  if (action === "close_empty") {
    return input.activeAllocationCount === 0 ? "applied" : "blocked";
  }

  if (action === "mark_fulfilled") {
    return input.finishableAllocationCount > 0 ? "applied" : "blocked";
  }

  if (action === "release_unfulfilled") {
    return input.activeAllocationCount > 0 ? "applied" : "blocked";
  }

  if (action === "requeue_unfulfilled") {
    if (!input.targetUpcomingShowId?.trim()) {
      return "blocked";
    }
    if (input.finishableAllocationCount === 0) {
      return "blocked";
    }
    if (input.finishableAllocationCount > SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS) {
      return "blocked";
    }
    if (input.requeueTargetValid === false || input.requeueCapacityValid === false) {
      return "blocked";
    }
    return "applied";
  }

  return "invalid_action";
}

/**
 * ADR-FP-071: only transition `active → editing` when no other Portal-continuable request exists.
 * For recovery, when other is a draft, we WANT to allow transition and park.
 * Only block when another editing exists.
 */
export function shouldTransitionActiveRequestToEditing(input: {
  requestStatus: string;
  hasActiveAllocationsGlobally: boolean;
  /** True when another ACTIVE editable Continuable that isn't a parkable single draft exists */
  hasOtherContinuableRequest: boolean;
  isInternal: boolean;
}): boolean {
  if (input.requestStatus !== "active") {
    return false;
  }
  if (input.hasActiveAllocationsGlobally) {
    return false;
  }
  if (input.isInternal) {
    return true;
  }
  return !input.hasOtherContinuableRequest;
}

export function resolveProductionResolutionKindForAction(
  action: ShowProductionRecoveryAction,
): "empty_closure" | "fulfilled_confirmed" | "unfulfilled_release" | "unfulfilled_requeue" | "owner_override" {
  switch (action) {
    case "close_empty":
      return "empty_closure";
    case "mark_fulfilled":
      return "fulfilled_confirmed";
    case "release_unfulfilled":
      return "unfulfilled_release";
    case "requeue_unfulfilled":
      return "unfulfilled_requeue";
    case "force_completed":
      return "owner_override";
    default:
      return "owner_override";
  }
}

export function computeShowAllocatedQuantityFromAllocations(
  allocations: readonly ShowAllocationRecoverySnapshot[],
  upcomingShowId: string,
): number {
  return allocations
    .filter(
      (allocation) =>
        allocation.upcomingShowId === upcomingShowId && allocation.status !== "canceled",
    )
    .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
}

function buildRecoveryPreviewNotes(
  action: ShowProductionRecoveryAction,
  outcome: ShowProductionRecoveryOutcome,
): string[] {
  if (outcome !== "applied" && outcome !== "already_terminal") {
    return [];
  }
  switch (action) {
    case "close_empty":
      return ["Completes the show without changing Print Requests or allocations."];
    case "mark_fulfilled":
      return ["Marks show allocations done and reconciles Print Request completion globally."];
    case "release_unfulfilled":
      return ["Cancels this show's allocations and reconciles each Print Request globally."];
    case "requeue_unfulfilled":
      return [
        "Cancels finishable allocations on the missed show, creates replacements on the target show, and completes the source as Did Not Print.",
      ];
    case "force_completed":
      return ["Owner override — reconciles allocations and requests before completing the show."];
    default:
      return [];
  }
}

function buildRecoveryPreviewBlockers(
  outcome: ShowProductionRecoveryOutcome,
  action: ShowProductionRecoveryAction,
  counts: { activeAllocationCount: number; finishableAllocationCount: number },
  options?: {
    overrideReason?: string;
    targetValidation?: ReturnType<typeof validateRequeueTargetShow>;
    capacityBlocker?: PreviewShowProductionRecoveryResponse["capacityBlocker"];
  },
): PreviewShowProductionRecoveryResponse["blockers"] {
  if (outcome === "already_terminal") {
    return [{ code: "already_terminal", message: "This show is already in a terminal production state." }];
  }
  if (outcome === "invalid_action") {
    return [{ code: "invalid_action", message: "This action is not valid for this show." }];
  }
  if (outcome === "blocked" && action === "force_completed") {
    const reasonError = validateProductionOverrideReason(options?.overrideReason);
    if (reasonError) {
      return [{ code: "override_reason_required", message: reasonError }];
    }
  }
  if (outcome === "blocked" && action === "close_empty" && counts.activeAllocationCount > 0) {
    return [
      {
        code: "has_allocations",
        message: "Close Empty Show requires zero active allocations on this show.",
      },
    ];
  }
  if (outcome === "blocked" && action === "mark_fulfilled" && counts.finishableAllocationCount === 0) {
    return [
      {
        code: "no_finishable_allocations",
        message: "Mark as Fulfilled requires finishable allocations on this show.",
      },
    ];
  }
  if (outcome === "blocked" && action === "release_unfulfilled" && counts.activeAllocationCount === 0) {
    return [
      {
        code: "no_active_allocations",
        message: "Release requires active allocations on this show.",
      },
    ];
  }
  if (outcome === "blocked" && action === "requeue_unfulfilled") {
    if (!options?.targetValidation || options.targetValidation.valid === false) {
      const validation = options?.targetValidation;
      if (validation && !validation.valid) {
        return [{ code: validation.code, message: validation.message }];
      }
      return [
        {
          code: "target_required",
          message: "Select an upcoming show to move unprinted requests to.",
        },
      ];
    }
    if (counts.finishableAllocationCount === 0) {
      return [
        {
          code: "no_finishable_allocations",
          message: "Requeue requires finishable allocations on this show. Use Mark Fulfilled if work was already printed.",
        },
      ];
    }
    if (counts.finishableAllocationCount > SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS) {
      return [
        {
          code: "too_many_allocations",
          message: `Requeue supports at most ${SHOW_REQUEUE_MAX_TRANSACTION_ALLOCATIONS} finishable allocations per apply.`,
        },
      ];
    }
    if (options?.capacityBlocker) {
      return [
        {
          code: options.capacityBlocker.code,
          message: options.capacityBlocker.message,
        },
      ];
    }
  }
  if (outcome === "blocked") {
    return [{ code: "blocked", message: "This action cannot be applied to the current show state." }];
  }
  return [];
}

/**
 * Studio fallback when recovery callables are not deployed or fail — uses already-loaded show data.
 * Apply still requires server callables; this is preview-only.
 */
export function buildClientShowProductionRecoveryPreview(input: {
  upcomingShowId: string;
  action: ShowProductionRecoveryAction;
  show: ShowWithProductionSource & ShowWithId & { title?: string; printStartedAt?: unknown };
  allocations: readonly ShowAllocationRecoverySnapshot[];
  now: Date;
  overrideReason?: string;
  targetUpcomingShowId?: string;
  targetShow?: RequeueTargetShowInput | null;
}): PreviewShowProductionRecoveryResponse {
  const requeueSnapshots: RequeueAllocationSnapshot[] = input.allocations.map((allocation, index) => ({
    id: allocation.id ?? `allocation-${index}`,
    upcomingShowId: allocation.upcomingShowId ?? input.upcomingShowId,
    printRequestId: allocation.printRequestId ?? "",
    requestNameSnapshot: allocation.requestNameSnapshot,
    allocatedQuantity: allocation.allocatedQuantity,
    status: allocation.status,
  }));

  const eligibleRequeueAllocations =
    input.action === "requeue_unfulfilled"
      ? collectRequeueEligibleAllocations(requeueSnapshots, input.upcomingShowId)
      : [];

  const requeueLines =
    input.action === "requeue_unfulfilled"
      ? buildRequeueLines(eligibleRequeueAllocations, input.allocations, input.upcomingShowId)
      : undefined;

  const totalRequeueQuantity =
    input.action === "requeue_unfulfilled"
      ? sumRequeueEligibleQuantity(requeueSnapshots, input.upcomingShowId)
      : undefined;

  const targetValidation =
    input.action === "requeue_unfulfilled"
      ? validateRequeueTargetShow(
          input.upcomingShowId,
          input.targetUpcomingShowId,
          input.targetShow,
          input.now,
        )
      : undefined;

  const capacityProjection =
    input.action === "requeue_unfulfilled" && input.targetShow && totalRequeueQuantity != null
      ? computeRequeueCapacityProjection({
          targetShow: input.targetShow,
          totalRequeueQuantity,
        })
      : undefined;

  const counts = countActiveShowAllocations(input.allocations, input.upcomingShowId);
  const isPast = isPastScheduledShow(input.show, input.now);
  const isWhatnot = isShowQueueProductionRecoveryEligible(input.show);
  const outcome = resolveProductionRecoveryPreviewOutcome(input.action, {
    productionStatus: input.show.productionStatus,
    isPast,
    isWhatnot,
    activeAllocationCount: counts.activeCount,
    finishableAllocationCount: counts.finishableCount,
    overrideReason: input.overrideReason,
    targetUpcomingShowId: input.targetUpcomingShowId,
    requeueTargetValid: targetValidation?.valid,
    requeueCapacityValid: capacityProjection?.capacityBlocker == null,
  });

  const predictedResolutionKind =
    outcome === "applied" || outcome === "already_terminal"
      ? resolveProductionResolutionKindForAction(input.action)
      : null;

  const targetShowSummary =
    input.action === "requeue_unfulfilled" && input.targetShow && totalRequeueQuantity != null
      ? buildShowProductionRequeueTargetShow(input.targetShow, totalRequeueQuantity)
      : undefined;

  const previewChecksum =
    input.action === "requeue_unfulfilled" &&
    outcome === "applied" &&
    input.targetUpcomingShowId?.trim() &&
    predictedResolutionKind
      ? buildShowProductionRecoveryPreviewChecksum({
          upcomingShowId: input.upcomingShowId,
          action: input.action,
          targetUpcomingShowId: input.targetUpcomingShowId.trim(),
          sourceProductionStatus:
            typeof input.show.productionStatus === "string" ? input.show.productionStatus : "open",
          predictedResolutionKind,
          sourceAllocations: eligibleRequeueAllocations,
          targetShow: {
            id: input.targetShow?.id ?? input.targetUpcomingShowId.trim(),
            maxTotalQuantity: input.targetShow?.maxTotalQuantity,
            allocatedQuantity: input.targetShow?.allocatedQuantity ?? 0,
          },
        })
      : undefined;

  const printRequestIds = [
    ...new Set(
      input.allocations
        .filter((allocation) => allocation.status !== "canceled")
        .map((allocation) => allocation.printRequestId)
        .filter(Boolean),
    ),
  ] as string[];

  const requestEffects: PreviewShowProductionRecoveryResponse["requestEffects"] = printRequestIds.map(
    (printRequestId) => {
      const snapshot = input.allocations.find(
        (allocation) => allocation.printRequestId === printRequestId,
      );
      return {
        printRequestId,
        requestNameSnapshot: snapshot?.requestNameSnapshot?.trim() || printRequestId,
        currentPersistedStatus: "—",
        predictedPersistedStatus: "—",
        predictedQueueTab: null,
        otherShowAllocationCount: 0,
        otherShowAllocationQuantity: 0,
      };
    },
  );

  const title =
    typeof input.show.title === "string" && input.show.title.trim()
      ? input.show.title.trim()
      : "Show";

  return {
    outcome,
    action: input.action,
    upcomingShowId: input.upcomingShowId,
    showLabel: title,
    productionStatus:
      typeof input.show.productionStatus === "string" ? input.show.productionStatus : "open",
    blockers: buildRecoveryPreviewBlockers(outcome, input.action, {
      activeAllocationCount: counts.activeCount,
      finishableAllocationCount: counts.finishableCount,
    }, {
      overrideReason: input.overrideReason,
      targetValidation,
      capacityBlocker: capacityProjection?.capacityBlocker ?? undefined,
    }),
    notes: buildRecoveryPreviewNotes(input.action, outcome),
    activeAllocationCount: counts.activeCount,
    finishableAllocationCount: counts.finishableCount,
    activeAllocationQuantity: counts.activeQuantity,
    affectedPrintRequestCount: printRequestIds.length,
    productionStarted: input.show.printStartedAt != null,
    otherShowAllocationWarning: requeueLines?.some((line) => line.otherShowAllocationQuantity > 0) ?? false,
    requestEffects,
    predictedResolutionKind,
    previewChecksum,
    targetShow: targetShowSummary,
    requeueLines,
    totalRequeueQuantity,
    capacityBlocker: capacityProjection?.capacityBlocker ?? undefined,
  };
}
