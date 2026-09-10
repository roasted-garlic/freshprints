import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type { PrintRequestLifecycleEvent } from "@fresh-prints/shared/types/printRequest/printRequestLifecycle.types";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import { getPrintRequestOriginBadgeLabel } from "@fresh-prints/shared/utils/printRequestOrigin";

import { buildPrintRequestNavigationDeepLinkPath } from "../../print-requests/constants/printRequestRoutes";
import { buildShowQueueDeepLinkPath } from "../../upcoming-shows/utils/buildShowQueueDeepLinkPath";
import {
  formatUpcomingShowTimestampLabel,
  formatUpcomingShowTitle,
} from "../../upcoming-shows/utils/upcomingShowDisplay";
import type {
  PrintRequestHistoryCardSummary,
  PrintRequestHistoryDetailEvent,
  PrintRequestHistoryMergedAttribution,
  PrintRequestHistoryShowContext,
} from "../types/customerPrintRequestHistory.types";
import { PRINT_REQUEST_DETAIL_EVENT_LIMIT } from "../types/customerPrintRequestHistory.types";
import { getAuditTimestampMillis } from "./auditTrailUtils";
import { resolveLogicalCustomerIds } from "./resolveLogicalCustomerIds";

const ACTIVE_ALLOCATION_STATUSES = new Set<ShowAllocation["status"]>([
  "pending",
  "queued",
  "in_progress",
  "printed",
  "done",
]);

const ALLOCATION_STATUS_PRIORITY: Record<ShowAllocation["status"], number> = {
  in_progress: 5,
  printed: 4,
  done: 4,
  queued: 3,
  pending: 2,
  canceled: 0,
};

function compareAllocationsForShowContext(
  left: ShowAllocation,
  right: ShowAllocation,
): number {
  const priorityDiff = ALLOCATION_STATUS_PRIORITY[right.status] - ALLOCATION_STATUS_PRIORITY[left.status];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return getAuditTimestampMillis(right.updatedAt) - getAuditTimestampMillis(left.updatedAt);
}

function formatLifecycleLabel(status: PrintRequest["status"]): string {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatAuditDateTimeLabel(millis: number): string {
  if (!millis) {
    return "Unknown time";
  }

  return formatShowDateTimeLabel(new Date(millis));
}

const HISTORICAL_LIFECYCLE_PRECEDENCE = {
  created: 10,
  queued: 20,
  canceled: 30,
  completed: 70,
  converted: 90,
} as const;

export function resolveHistoricalLifecycleActivity(input: {
  request: PrintRequest;
  allocations: readonly ShowAllocation[];
}): { millis: number; precedence: number; eventId: string } {
  const candidates: Array<{ millis: number; precedence: number; eventId: string }> = [
    {
      millis: getAuditTimestampMillis(input.request.createdAt),
      precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.created,
      eventId: input.request.id + ":created",
    },
  ];

  if (input.request.convertedAt) {
    candidates.push({
      millis: getAuditTimestampMillis(input.request.convertedAt),
      precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.converted,
      eventId: input.request.id + ":converted",
    });
  }
  if (input.request.needsStaffRequeueAt) {
    candidates.push({
      millis: getAuditTimestampMillis(input.request.needsStaffRequeueAt),
      precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.queued,
      eventId: input.request.id + ":released-for-requeue",
    });
  }

  for (const allocation of input.allocations) {
    if (allocation.printRequestId !== input.request.id) {
      continue;
    }
    const timestampCandidates = [
      { value: allocation.completedAt, precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.completed, suffix: "completed" },
      { value: allocation.printedAt, precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.completed, suffix: "printed" },
      { value: allocation.canceledAt, precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.canceled, suffix: "canceled" },
      { value: allocation.queuedAt, precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.queued, suffix: "queued" },
      { value: allocation.createdAt, precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.queued, suffix: "created" },
    ];
    for (const candidate of timestampCandidates) {
      if (candidate.value) {
        candidates.push({
          millis: getAuditTimestampMillis(candidate.value),
          precedence: candidate.precedence,
          eventId: input.request.id + ":allocation:" + allocation.id + ":" + candidate.suffix,
        });
      }
    }
  }

  return candidates.reduce((latest, candidate) => {
    if (candidate.millis !== latest.millis) {
      return candidate.millis > latest.millis ? candidate : latest;
    }
    if (candidate.precedence !== latest.precedence) {
      return candidate.precedence > latest.precedence ? candidate : latest;
    }
    return candidate.eventId.localeCompare(latest.eventId) > 0 ? candidate : latest;
  });
}

function resolveSummaryLifecycleActivity(input: {
  request: PrintRequest;
  allocations: readonly ShowAllocation[];
}): { millis: number; precedence: number; eventId: string } {
  if (input.request.lastLifecycleActivityAt) {
    return {
      millis: getAuditTimestampMillis(input.request.lastLifecycleActivityAt),
      precedence: input.request.lastLifecycleActivityPrecedence ?? HISTORICAL_LIFECYCLE_PRECEDENCE.created,
      eventId: input.request.lastLifecycleActivityEventId ?? input.request.id,
    };
  }
  return resolveHistoricalLifecycleActivity(input);
}

export function buildPrintRequestDeepLinkForRequest(
  request: PrintRequest,
  convertedInternalRequest?: Pick<
    PrintRequest,
    "queueTab" | "itemCount" | "updatedAt" | "needsStaffRequeueAt"
  > | null,
): string {
  return buildPrintRequestNavigationDeepLinkPath({
    id: request.id,
    isInternal: request.isInternal,
    closureKind: request.closureKind,
    convertedToInternalRequestId: request.convertedToInternalRequestId,
    queueTab: request.queueTab,
    itemCount: request.itemCount,
    updatedAtMillis: getAuditTimestampMillis(request.updatedAt),
    needsStaffRequeueAt: request.needsStaffRequeueAt,
    convertedInternalRequest: convertedInternalRequest
      ? {
          queueTab: convertedInternalRequest.queueTab,
          itemCount: convertedInternalRequest.itemCount,
          updatedAtMillis: getAuditTimestampMillis(convertedInternalRequest.updatedAt),
          needsStaffRequeueAt: convertedInternalRequest.needsStaffRequeueAt,
        }
      : null,
  }).path;
}

export function buildMergedSourceAttribution(
  request: PrintRequest,
  currentCustomer: Customer,
): PrintRequestHistoryMergedAttribution | undefined {
  const logicalCustomerIds = resolveLogicalCustomerIds(currentCustomer);
  const requestCustomerId = request.customerId?.trim();
  const usernameAtCreation =
    request.customerUsernameAtCreationSnapshot?.trim() || request.customerUsernameSnapshot?.trim();

  if (
    requestCustomerId &&
    requestCustomerId !== currentCustomer.id &&
    logicalCustomerIds.includes(requestCustomerId)
  ) {
    return {
      customerId: requestCustomerId,
      usernameAtCreation,
      label: usernameAtCreation
        ? `Originally associated with merged account @${usernameAtCreation}`
        : `Originally associated with merged account (${requestCustomerId})`,
    };
  }

  if (
    usernameAtCreation &&
    currentCustomer.username &&
    usernameAtCreation !== currentCustomer.username &&
    requestCustomerId === currentCustomer.id
  ) {
    return {
      customerId: currentCustomer.id,
      usernameAtCreation,
      label: `Originally associated with merged account @${usernameAtCreation}`,
    };
  }

  return undefined;
}

export function buildShowContextForRequest(
  request: PrintRequest,
  allocations: readonly ShowAllocation[],
  showsById: ReadonlyMap<string, UpcomingShow>,
): PrintRequestHistoryShowContext | undefined {
  const requestAllocations = allocations
    .filter(
      (allocation) =>
        allocation.printRequestId === request.id && ACTIVE_ALLOCATION_STATUSES.has(allocation.status),
    )
    .sort(compareAllocationsForShowContext);

  if (requestAllocations.length === 0) {
    return undefined;
  }

  const primaryAllocation = requestAllocations[0];
  const show = showsById.get(primaryAllocation.upcomingShowId);
  const scheduledStartAtMillis = show ? getAuditTimestampMillis(show.scheduledStartAt) : null;

  return {
    showId: primaryAllocation.upcomingShowId,
    showTitle: show ? formatUpcomingShowTitle(show) : `Show ${primaryAllocation.upcomingShowId}`,
    scheduledStartAtMillis,
    scheduledLabel: show
      ? formatUpcomingShowTimestampLabel(show.scheduledStartAt)
      : "Schedule unavailable",
    queuedToShowAtMillis: getAuditTimestampMillis(primaryAllocation.createdAt),
    queuedToShowLabel: formatAuditDateTimeLabel(getAuditTimestampMillis(primaryAllocation.createdAt)),
    showDeepLinkPath: buildShowQueueDeepLinkPath({
      showId: primaryAllocation.upcomingShowId,
      printRequestId: request.id,
      show,
      scheduledStartAtMillis,
    }),
  };
}

export function buildMissedShowContextForRequest(
  request: PrintRequest,
  allocations: readonly ShowAllocation[],
  showsById: ReadonlyMap<string, UpcomingShow>,
): PrintRequestHistoryShowContext | undefined {
  const requestAllocations = allocations.filter((allocation) => allocation.printRequestId === request.id);
  const requeuedFromSourceIds = new Set(
    requestAllocations
      .map((allocation) => allocation.requeuedFromAllocationId?.trim())
      .filter((value): value is string => Boolean(value)),
  );

  const missedAllocation = requestAllocations
    .filter((allocation) => {
      if (allocation.status !== "canceled") {
        return false;
      }

      const show = showsById.get(allocation.upcomingShowId);
      return (
        requeuedFromSourceIds.has(allocation.id) ||
        show?.productionResolutionKind === "unfulfilled_requeue" ||
        show?.productionResolutionKind === "unfulfilled_release"
      );
    })
    .sort(
      (left, right) => getAuditTimestampMillis(right.updatedAt) - getAuditTimestampMillis(left.updatedAt),
    )[0];

  if (!missedAllocation) {
    return undefined;
  }

  const show = showsById.get(missedAllocation.upcomingShowId);
  const scheduledStartAtMillis = show ? getAuditTimestampMillis(show.scheduledStartAt) : null;

  return {
    showId: missedAllocation.upcomingShowId,
    showTitle: show ? formatUpcomingShowTitle(show) : `Show ${missedAllocation.upcomingShowId}`,
    scheduledStartAtMillis,
    scheduledLabel: show
      ? formatUpcomingShowTimestampLabel(show.scheduledStartAt)
      : "Schedule unavailable",
    queuedToShowAtMillis: getAuditTimestampMillis(missedAllocation.createdAt),
    queuedToShowLabel: formatAuditDateTimeLabel(getAuditTimestampMillis(missedAllocation.createdAt)),
    showDeepLinkPath: buildShowQueueDeepLinkPath({
      showId: missedAllocation.upcomingShowId,
      printRequestId: request.id,
      show,
      scheduledStartAtMillis,
    }),
  };
}

export function buildPrintRequestHistoryCardSummary(input: {
  request: PrintRequest;
  customer: Customer;
  allocations: readonly ShowAllocation[];
  showsById: ReadonlyMap<string, UpcomingShow>;
  relatedRequestNamesById: ReadonlyMap<string, string>;
  relatedRequestsById?: ReadonlyMap<string, PrintRequest>;
}): PrintRequestHistoryCardSummary {
  const { request, customer, allocations, showsById, relatedRequestNamesById, relatedRequestsById } =
    input;
  const showContext = buildShowContextForRequest(request, allocations, showsById);
  const missedShowContext = buildMissedShowContextForRequest(request, allocations, showsById);
  const mergedSourceAttribution = buildMergedSourceAttribution(request, customer);
  const lifecycleActivity = resolveSummaryLifecycleActivity({ request, allocations });

  const conversion =
    request.closureKind === "converted_to_internal" && request.convertedToInternalRequestId
      ? {
          closureKind: request.closureKind,
          internalRequestId: request.convertedToInternalRequestId,
          internalRequestName: relatedRequestNamesById.get(request.convertedToInternalRequestId),
          convertedAtMillis: request.convertedAt
            ? getAuditTimestampMillis(request.convertedAt)
            : undefined,
        }
      : undefined;

  const convertedFrom = request.convertedFromCustomerRequestId
    ? {
        customerRequestId: request.convertedFromCustomerRequestId,
        customerRequestName: relatedRequestNamesById.get(request.convertedFromCustomerRequestId),
      }
    : undefined;

  const convertedInternalRequest =
    conversion?.internalRequestId && relatedRequestsById
      ? relatedRequestsById.get(conversion.internalRequestId)
      : undefined;

  const navigationLinks = buildPrintRequestNavigationDeepLinkPath({
    id: request.id,
    isInternal: request.isInternal,
    closureKind: request.closureKind,
    convertedToInternalRequestId: request.convertedToInternalRequestId,
    queueTab: request.queueTab,
    itemCount: request.itemCount,
    updatedAtMillis: getAuditTimestampMillis(request.updatedAt),
    needsStaffRequeueAt: request.needsStaffRequeueAt,
    convertedInternalRequest: convertedInternalRequest
      ? {
          queueTab: convertedInternalRequest.queueTab,
          itemCount: convertedInternalRequest.itemCount,
          updatedAtMillis: getAuditTimestampMillis(convertedInternalRequest.updatedAt),
          needsStaffRequeueAt: convertedInternalRequest.needsStaffRequeueAt,
        }
      : null,
  });

  const deepLinkPath = navigationLinks.path;
  const archivedCustomerDeepLinkPath = navigationLinks.archivedCustomerPath;
  const internalDeepLinkPath = conversion?.internalRequestId ? deepLinkPath : undefined;

  const customerDeepLinkPath = convertedFrom?.customerRequestId
    ? buildPrintRequestNavigationDeepLinkPath({
        id: convertedFrom.customerRequestId,
        isInternal: false,
      }).path
    : archivedCustomerDeepLinkPath;

  return {
    printRequestId: request.id,
    name: request.name,
    status: request.status,
    originLabel: getPrintRequestOriginBadgeLabel(request),
    lifecycleLabel: formatLifecycleLabel(request.status),
    queueTab: request.queueTab,
    createdAtMillis: getAuditTimestampMillis(request.createdAt),
    lastLifecycleActivityAtMillis: lifecycleActivity.millis,
    lastLifecycleActivityPrecedence: lifecycleActivity.precedence,
    lastLifecycleActivityEventId: lifecycleActivity.eventId,
    itemCount: request.itemCount,
    showContext,
    missedShowContext,
    conversion,
    convertedFrom,
    deepLinkPath,
    internalDeepLinkPath,
    customerDeepLinkPath,
    archivedCustomerDeepLinkPath,
    mergedSourceAttribution,
  };
}

export function dedupePrintRequestsById(requests: readonly PrintRequest[]): PrintRequest[] {
  const byId = new Map<string, PrintRequest>();

  for (const request of requests) {
    const existing = byId.get(request.id);
    const requestLifecycleMillis = request.lastLifecycleActivityAt
      ? getAuditTimestampMillis(request.lastLifecycleActivityAt)
      : getAuditTimestampMillis(request.createdAt);
    const existingLifecycleMillis = existing?.lastLifecycleActivityAt
      ? getAuditTimestampMillis(existing.lastLifecycleActivityAt)
      : existing
        ? getAuditTimestampMillis(existing.createdAt)
        : -1;
    if (
      !existing ||
      requestLifecycleMillis > existingLifecycleMillis ||
      (requestLifecycleMillis === existingLifecycleMillis &&
        (request.lastLifecycleActivityPrecedence ?? 0) >
          (existing.lastLifecycleActivityPrecedence ?? 0))
    ) {
      byId.set(request.id, request);
    }
  }

  return [...byId.values()].sort((left, right) => {
    const leftMillis = left.lastLifecycleActivityAt
      ? getAuditTimestampMillis(left.lastLifecycleActivityAt)
      : getAuditTimestampMillis(left.createdAt);
    const rightMillis = right.lastLifecycleActivityAt
      ? getAuditTimestampMillis(right.lastLifecycleActivityAt)
      : getAuditTimestampMillis(right.createdAt);
    return (
      rightMillis - leftMillis ||
      (right.lastLifecycleActivityPrecedence ?? 0) - (left.lastLifecycleActivityPrecedence ?? 0) ||
      right.id.localeCompare(left.id)
    );
  });
}

export function comparePrintRequestRecency(left: PrintRequest, right: PrintRequest): number {
  const leftMillis = left.lastLifecycleActivityAt
    ? getAuditTimestampMillis(left.lastLifecycleActivityAt)
    : getAuditTimestampMillis(left.createdAt);
  const rightMillis = right.lastLifecycleActivityAt
    ? getAuditTimestampMillis(right.lastLifecycleActivityAt)
    : getAuditTimestampMillis(right.createdAt);
  return (
    rightMillis - leftMillis ||
    (right.lastLifecycleActivityPrecedence ?? 0) - (left.lastLifecycleActivityPrecedence ?? 0) ||
    right.id.localeCompare(left.id)
  );
}

export function comparePrintRequestHistorySummaries(
  left: PrintRequestHistoryCardSummary,
  right: PrintRequestHistoryCardSummary,
): number {
  const lifecycleDiff = right.lastLifecycleActivityAtMillis - left.lastLifecycleActivityAtMillis;
  if (lifecycleDiff !== 0) {
    return lifecycleDiff;
  }

  const precedenceDiff = right.lastLifecycleActivityPrecedence - left.lastLifecycleActivityPrecedence;
  if (precedenceDiff !== 0) {
    return precedenceDiff;
  }

  const createdDiff = right.createdAtMillis - left.createdAtMillis;
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return right.lastLifecycleActivityEventId.localeCompare(left.lastLifecycleActivityEventId);
}

export function sortPrintRequestHistorySummaries(
  summaries: readonly PrintRequestHistoryCardSummary[],
): PrintRequestHistoryCardSummary[] {
  return [...summaries].sort(comparePrintRequestHistorySummaries);
}

type AllocationDetailEventKind = "moved" | "missed" | "canceled" | "queued";

const RECONSTRUCTED_PRECEDENCE: Record<AllocationDetailEventKind, number> = {
  moved: 50,
  missed: 30,
  canceled: 30,
  queued: 20,
};

function resolveAllocationDetailEventKind(input: {
  allocation: ShowAllocation;
  requeuedFromSourceIds: ReadonlySet<string>;
  show: UpcomingShow | undefined;
}): AllocationDetailEventKind {
  if (
    input.allocation.requeuedFromAllocationId?.trim() ||
    input.allocation.movedFromAllocationId?.trim()
  ) {
    return "moved";
  }

  if (input.allocation.status === "canceled") {
    const didNotPrint =
      input.requeuedFromSourceIds.has(input.allocation.id) ||
      input.show?.productionResolutionKind === "unfulfilled_requeue" ||
      input.show?.productionResolutionKind === "unfulfilled_release";

    return didNotPrint ? "missed" : "canceled";
  }

  return "queued";
}

function buildAllocationDetailEventLabel(kind: AllocationDetailEventKind): string {
  switch (kind) {
    case "moved":
      return "Moved to another show";
    case "missed":
      return "Originally queued to show · Did not print";
    case "canceled":
      return "Originally queued to show";
    case "queued":
    default:
      return "Queued to show";
  }
}

function buildGroupedAllocationDetailEvents(input: {
  requestId: string;
  allocations: readonly ShowAllocation[];
  showsById: ReadonlyMap<string, UpcomingShow>;
}): PrintRequestHistoryDetailEvent[] {
  const requestAllocations = input.allocations
    .filter((allocation) => allocation.printRequestId === input.requestId)
    .sort(
      (left, right) => getAuditTimestampMillis(left.createdAt) - getAuditTimestampMillis(right.createdAt),
    );

  const requeuedFromSourceIds = new Set(
    requestAllocations
      .map((allocation) => allocation.requeuedFromAllocationId?.trim())
      .filter((value): value is string => Boolean(value)),
  );

  const grouped = new Map<
    string,
    {
      kind: AllocationDetailEventKind;
      showId: string;
      occurredAtMillis: number;
      scheduleDetail: string;
    }
  >();

  for (const allocation of requestAllocations) {
    const show = input.showsById.get(allocation.upcomingShowId);
    const showTitle = show ? formatUpcomingShowTitle(show) : `Show ${allocation.upcomingShowId}`;
    const scheduledLabel = show
      ? formatUpcomingShowTimestampLabel(show.scheduledStartAt)
      : "Schedule unavailable";
    const kind = resolveAllocationDetailEventKind({
      allocation,
      requeuedFromSourceIds,
      show,
    });
    const groupKey = `${allocation.upcomingShowId}:${kind}`;
    const occurredAtMillis = getAuditTimestampMillis(allocation.createdAt);
    const existing = grouped.get(groupKey);

    if (!existing || occurredAtMillis < existing.occurredAtMillis) {
      grouped.set(groupKey, {
        kind,
        showId: allocation.upcomingShowId,
        occurredAtMillis,
        scheduleDetail: `${showTitle} · Scheduled ${scheduledLabel}`,
      });
    }
  }

  return [...grouped.values()].map((entry) => ({
    id: `${input.requestId}:allocation-show:${entry.showId}:${entry.kind}`,
    label: buildAllocationDetailEventLabel(entry.kind),
    detail: entry.scheduleDetail,
    occurredAtMillis: entry.occurredAtMillis,
    precedence: RECONSTRUCTED_PRECEDENCE[entry.kind],
    showId: entry.showId,
    derivation: "reconstructed" as const,
  }));
}

function getLifecycleEventLabel(
  event: PrintRequestLifecycleEvent,
  forwardEvents: readonly PrintRequestLifecycleEvent[],
): string {
  const editingStarted = forwardEvents.some((candidate) => candidate.type === "editing_started");

  switch (event.type) {
    case "request_created":
      return "Print request created";
    case "added_to_show":
      return editingStarted ? "Re-added to show" : "Added to show";
    case "removed_from_show":
      return editingStarted ? "Removed from show for editing" : "Removed from show";
    case "editing_started":
      return "Editing started";
    case "moved_from_show":
      return "Moved from another show";
    case "moved_to_show":
      return "Moved to another show";
    case "did_not_print_requeued":
      return "Did Not Print · Re-queued to another show";
    case "released_for_requeue":
      return "Released for re-queue";
    case "production_started":
      return "Production started";
    case "allocation_printed":
      return "Printing completed";
    case "allocation_completed":
      return "Allocation completed";
    case "request_completed":
      return "Print request completed";
    case "converted_to_internal":
      return "Converted to Internal Request";
    case "archived":
      return "Archived";
    default:
      return "Lifecycle activity";
  }
}

const COALESCED_ALLOCATION_EVENT_TYPES = new Set<PrintRequestLifecycleEvent["type"]>([
  "added_to_show",
  "removed_from_show",
  "moved_from_show",
  "moved_to_show",
  "did_not_print_requeued",
  "production_started",
  "allocation_printed",
  "allocation_completed",
]);

function coalesceForwardLifecycleEvents(
  events: readonly PrintRequestLifecycleEvent[],
): PrintRequestLifecycleEvent[] {
  const coalesced = new Map<string, PrintRequestLifecycleEvent>();
  for (const event of events) {
    if (!COALESCED_ALLOCATION_EVENT_TYPES.has(event.type)) {
      coalesced.set(event.id, event);
      continue;
    }
    const key = `${event.type}:${event.upcomingShowId ?? "<unknown-show>"}`;
    const existing = coalesced.get(key);
    if (
      !existing ||
      getAuditTimestampMillis(event.occurredAt) > getAuditTimestampMillis(existing.occurredAt) ||
      (getAuditTimestampMillis(event.occurredAt) === getAuditTimestampMillis(existing.occurredAt) &&
        event.id.localeCompare(existing.id) > 0)
    ) {
      coalesced.set(key, event);
    }
  }
  return [...coalesced.values()];
}

function buildLifecycleEventDetail(event: PrintRequestLifecycleEvent): string | undefined {
  const showLabel = event.showTitleSnapshot ?? event.upcomingShowId;
  const scheduleMillis = event.showScheduledStartAt
    ? getAuditTimestampMillis(event.showScheduledStartAt)
    : null;
  const showDetail = showLabel
    ? `${showLabel}${scheduleMillis ? ` · Scheduled ${formatShowDateTimeLabel(new Date(scheduleMillis))}` : ""}`
    : undefined;

  if (showDetail && event.detail) {
    return `${showDetail} · ${event.detail}`;
  }
  return showDetail ?? event.detail;
}

function mapLifecycleEventToDetailEvent(
  event: PrintRequestLifecycleEvent,
  forwardEvents: readonly PrintRequestLifecycleEvent[],
): PrintRequestHistoryDetailEvent {
  return {
    id: event.id,
    label: getLifecycleEventLabel(event, forwardEvents),
    detail: buildLifecycleEventDetail(event),
    occurredAtMillis: getAuditTimestampMillis(event.occurredAt),
    precedence: event.precedence,
    ...(event.upcomingShowId ? { showId: event.upcomingShowId } : {}),
    ...(event.showTitleSnapshot ? { showTitle: event.showTitleSnapshot } : {}),
    showScheduledStartAtMillis: event.showScheduledStartAt
      ? getAuditTimestampMillis(event.showScheduledStartAt)
      : null,
    derivation: "persisted",
  };
}

export function buildPrintRequestHistoryDetailEvents(input: {
  summary: PrintRequestHistoryCardSummary;
  request: PrintRequest;
  allocations: readonly ShowAllocation[];
  showsById: ReadonlyMap<string, UpcomingShow>;
  lifecycleEvents?: readonly PrintRequestLifecycleEvent[];
  limit?: number;
}): { events: PrintRequestHistoryDetailEvent[]; totalEventCount: number; hasMoreEvents: boolean } {
  const limit = input.limit ?? PRINT_REQUEST_DETAIL_EVENT_LIMIT;
  const forwardEvents = coalesceForwardLifecycleEvents(input.lifecycleEvents ?? []);
  const events: PrintRequestHistoryDetailEvent[] = forwardEvents.map((event) =>
    mapLifecycleEventToDetailEvent(event, forwardEvents),
  );

  const hasCreatedEvent = forwardEvents.some((event) => event.type === "request_created");
  if (!hasCreatedEvent) {
    events.push({
      id: `${input.request.id}:created`,
      label: "Print request created",
      detail: `${input.summary.name} · ${input.summary.itemCount} design${input.summary.itemCount === 1 ? "" : "s"}`,
      occurredAtMillis: input.summary.createdAtMillis,
      precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.created,
      derivation: "reconstructed",
    });
  }

  const reconstructedAllocationEvents = buildGroupedAllocationDetailEvents({
    requestId: input.request.id,
    allocations: input.allocations,
    showsById: input.showsById,
  });
  for (const reconstructed of reconstructedAllocationEvents) {
    const duplicateForward = forwardEvents.some((event) => {
      if (!event.upcomingShowId || event.upcomingShowId !== reconstructed.showId) {
        return false;
      }
      const eventMillis = getAuditTimestampMillis(event.occurredAt);
      if (eventMillis !== reconstructed.occurredAtMillis) {
        return false;
      }
      return [
        "added_to_show",
        "removed_from_show",
        "moved_from_show",
        "moved_to_show",
        "did_not_print_requeued",
      ].includes(event.type);
    });
    if (!duplicateForward) {
      events.push(reconstructed);
    }
  }

  if (input.summary.conversion && !forwardEvents.some((event) => event.type === "converted_to_internal")) {
    events.push({
      id: `${input.request.id}:converted`,
      label: "Converted to Internal Request",
      detail: input.summary.conversion.internalRequestName
        ? `→ ${input.summary.conversion.internalRequestName}`
        : `→ ${input.summary.conversion.internalRequestId}`,
      occurredAtMillis: input.summary.conversion.convertedAtMillis ?? input.summary.createdAtMillis,
      precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.converted,
      derivation: "reconstructed",
    });
  }

  if (input.summary.mergedSourceAttribution) {
    events.push({
      id: `${input.request.id}:merge-attribution`,
      label: "Merged account attribution",
      detail: input.summary.mergedSourceAttribution.label,
      occurredAtMillis: input.summary.createdAtMillis,
      precedence: HISTORICAL_LIFECYCLE_PRECEDENCE.created,
      derivation: "reconstructed",
    });
  }

  const sorted = events.sort(
    (left, right) =>
      right.occurredAtMillis - left.occurredAtMillis ||
      right.precedence - left.precedence ||
      left.id.localeCompare(right.id),
  );

  return {
    events: sorted.slice(0, limit),
    totalEventCount: sorted.length,
    hasMoreEvents: sorted.length > limit,
  };
}

export function formatPrintRequestCardCreatedLabel(millis: number): string {
  return `Created ${formatAuditDateTimeLabel(millis)}`;
}

export function formatPrintRequestCardDesignCountLabel(itemCount: number): string {
  return `${itemCount} design${itemCount === 1 ? "" : "s"}`;
}

export function formatPrintRequestCardLastUpdatedLabel(millis: number): string {
  return `Last updated ${formatAuditDateTimeLabel(millis)}`;
}

export function countDistinctQueuedPrintRequests(allocations: readonly ShowAllocation[]): number {
  const requestIds = new Set<string>();

  for (const allocation of allocations) {
    if (ACTIVE_ALLOCATION_STATUSES.has(allocation.status) && allocation.printRequestId) {
      requestIds.add(allocation.printRequestId);
    }
  }

  return requestIds.size;
}
