import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
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

function formatAuditDateLabel(millis: number): string {
  if (!millis) {
    return "Unknown date";
  }

  return new Date(millis).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAuditDateTimeLabel(millis: number): string {
  if (!millis) {
    return "Unknown time";
  }

  return new Date(millis).toLocaleString();
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
    updatedAtMillis: getAuditTimestampMillis(request.updatedAt),
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
    if (!existing || getAuditTimestampMillis(request.updatedAt) > getAuditTimestampMillis(existing.updatedAt)) {
      byId.set(request.id, request);
    }
  }

  return [...byId.values()].sort(comparePrintRequestRecency);
}

export function comparePrintRequestRecency(left: PrintRequest, right: PrintRequest): number {
  const updatedDiff =
    getAuditTimestampMillis(right.updatedAt) - getAuditTimestampMillis(left.updatedAt);
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  const createdDiff =
    getAuditTimestampMillis(right.createdAt) - getAuditTimestampMillis(left.createdAt);
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return right.id.localeCompare(left.id);
}

export function comparePrintRequestHistorySummaries(
  left: PrintRequestHistoryCardSummary,
  right: PrintRequestHistoryCardSummary,
): number {
  const updatedDiff = right.updatedAtMillis - left.updatedAtMillis;
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  const createdDiff = right.createdAtMillis - left.createdAtMillis;
  if (createdDiff !== 0) {
    return createdDiff;
  }

  return right.printRequestId.localeCompare(left.printRequestId);
}

export function sortPrintRequestHistorySummaries(
  summaries: readonly PrintRequestHistoryCardSummary[],
): PrintRequestHistoryCardSummary[] {
  return [...summaries].sort(comparePrintRequestHistorySummaries);
}

type AllocationDetailEventKind = "moved" | "missed" | "canceled" | "queued";

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
    derivation: "reconstructed" as const,
  }));
}

export function buildPrintRequestHistoryDetailEvents(input: {
  summary: PrintRequestHistoryCardSummary;
  request: PrintRequest;
  allocations: readonly ShowAllocation[];
  showsById: ReadonlyMap<string, UpcomingShow>;
  limit?: number;
}): { events: PrintRequestHistoryDetailEvent[]; totalEventCount: number; hasMoreEvents: boolean } {
  const limit = input.limit ?? PRINT_REQUEST_DETAIL_EVENT_LIMIT;
  const events: PrintRequestHistoryDetailEvent[] = [];

  events.push({
    id: `${input.request.id}:created`,
    label: "Print request created",
    detail: `${input.summary.name} · ${input.summary.itemCount} design${input.summary.itemCount === 1 ? "" : "s"}`,
    occurredAtMillis: input.summary.createdAtMillis,
    derivation: "persisted",
  });

  if (input.summary.updatedAtMillis > input.summary.createdAtMillis) {
    events.push({
      id: `${input.request.id}:updated`,
      label: "Last updated",
      detail: `Status ${input.summary.lifecycleLabel}`,
      occurredAtMillis: input.summary.updatedAtMillis,
      derivation: "persisted",
    });
  }

  events.push(
    ...buildGroupedAllocationDetailEvents({
      requestId: input.request.id,
      allocations: input.allocations,
      showsById: input.showsById,
    }),
  );

  if (input.summary.conversion) {
    events.push({
      id: `${input.request.id}:converted`,
      label: "Converted to Internal Request",
      detail: input.summary.conversion.internalRequestName
        ? `→ ${input.summary.conversion.internalRequestName}`
        : `→ ${input.summary.conversion.internalRequestId}`,
      occurredAtMillis:
        input.summary.conversion.convertedAtMillis ?? input.summary.updatedAtMillis,
      derivation: "persisted",
    });
  }

  if (input.summary.mergedSourceAttribution) {
    events.push({
      id: `${input.request.id}:merge-attribution`,
      label: "Merged account attribution",
      detail: input.summary.mergedSourceAttribution.label,
      occurredAtMillis: input.summary.createdAtMillis,
      derivation: "reconstructed",
    });
  }

  const sorted = events.sort((left, right) => right.occurredAtMillis - left.occurredAtMillis);

  return {
    events: sorted.slice(0, limit),
    totalEventCount: sorted.length,
    hasMoreEvents: sorted.length > limit,
  };
}

export function formatPrintRequestCardCreatedLabel(millis: number): string {
  return `Created ${formatAuditDateLabel(millis)}`;
}

export function formatPrintRequestCardDesignCountLabel(itemCount: number): string {
  return `${itemCount} design${itemCount === 1 ? "" : "s"}`;
}

export function formatPrintRequestCardLastUpdatedLabel(millis: number): string {
  return `Last updated ${formatAuditDateLabel(millis)}`;
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
