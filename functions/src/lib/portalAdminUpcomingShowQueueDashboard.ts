import { formatCustomerIdentityLabel } from "../../../packages/shared/src/utils/formatCustomerIdentityLabel";
import type {
  GetPortalAdminUpcomingShowQueueDashboardRequest,
  PortalAdminShowCapacityDto,
  PortalAdminSelectedShowDashboard,
  PortalAdminShowRequestSummary,
  PortalAdminUpcomingShowListItem,
  PortalAdminUpcomingShowQueueDashboardResponse,
  PortalAdminShowQueueItemOrigin,
  PortalAdminShowQueueItemSource,
  PortalAdminShowQueueRequestKind,
} from "../../../packages/shared/src/types/portal/getPortalAdminUpcomingShowQueueDashboard.types";
import type { ShowAllocationStatus } from "../../../packages/shared/src/types/showAllocation/showAllocation.enums";
import type { ShowProductionStatus, UpcomingShowStatus } from "../../../packages/shared/src/types/upcomingShow/upcomingShow.enums";
import { isWhatnotQueueSurfaceShow } from "../../../packages/shared/src/types/upcomingShow/upcomingShow.types";
import { SHOW_QUEUE_OPERATIONAL_TIME_ZONE } from "../../../packages/shared/src/utils/operationalDay";
import {
  countPortalAdminDesignQty,
  countPortalAdminPrQty,
  sumPortalAdminPrintQty,
  type PortalAdminMetricAllocation,
} from "../../../packages/shared/src/utils/portalAdminShowQueueMetrics";
import { assessShowCapacity } from "../../../packages/shared/src/utils/showCapacity";
import {
  formatCapacityUsedLabel,
  getShowCapacityPercent,
} from "../../../packages/shared/src/utils/showCapacityDisplay";
import { getShowScheduleTab } from "../../../packages/shared/src/utils/showScheduleGrouping";
import { invalidArgument } from "../lib/errors";
import {
  assertPortalAdminQueueCaller,
  type PortalAdminQueueDocument,
} from "./portalAdminDailyShowQueue";

export { assertPortalAdminQueueCaller };
export type { PortalAdminQueueDocument };

export function validatePortalAdminUpcomingShowQueueDashboardRequest(
  data: unknown,
): GetPortalAdminUpcomingShowQueueDashboardRequest {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw invalidArgument("Invalid dashboard request.");
  }
  const record = data as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => key !== "showId")) {
    throw invalidArgument("This action only accepts an optional showId.");
  }
  if (!("showId" in record)) {
    return {};
  }
  if (typeof record.showId !== "string" || !record.showId.trim()) {
    throw invalidArgument("showId must be a non-empty string when provided.");
  }
  return { showId: record.showId.trim() };
}

const ALLOCATION_STATUSES: readonly ShowAllocationStatus[] = [
  "pending",
  "queued",
  "in_progress",
  "printed",
  "done",
  "canceled",
];
const SHOW_STATUSES: readonly UpcomingShowStatus[] = [
  "scheduled",
  "rescheduled",
  "live",
  "completed",
  "canceled",
  "missing_upstream",
  "archived",
];
const PRODUCTION_STATUSES: readonly ShowProductionStatus[] = [
  "open",
  "full",
  "printing",
  "fully_printed",
  "completed",
  "archived",
  "canceled",
];

function toFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toQuantity(value: unknown): number {
  return Math.max(0, toFiniteNumber(value));
}

function toMillis(value: unknown): number | null {
  if (value && typeof value === "object") {
    if ("toMillis" in value && typeof (value as { toMillis: unknown }).toMillis === "function") {
      return (value as { toMillis: () => number }).toMillis();
    }
    if ("toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate().getTime();
    }
  }
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveShowStatus(value: unknown): UpcomingShowStatus {
  return typeof value === "string" && SHOW_STATUSES.includes(value as UpcomingShowStatus)
    ? (value as UpcomingShowStatus)
    : "scheduled";
}

function resolveProductionStatus(value: unknown): ShowProductionStatus {
  return typeof value === "string" && PRODUCTION_STATUSES.includes(value as ShowProductionStatus)
    ? (value as ShowProductionStatus)
    : "open";
}

export function resolveAllocationStatus(value: unknown): ShowAllocationStatus {
  return typeof value === "string" && ALLOCATION_STATUSES.includes(value as ShowAllocationStatus)
    ? (value as ShowAllocationStatus)
    : "canceled";
}

export function resolveItemSource(data: Record<string, unknown>): PortalAdminShowQueueItemSource {
  return data.sourceType === "customer_upload" || nonEmptyString(data.customerUploadId)
    ? "customer_upload"
    : "catalog_design";
}

export function resolveItemOrigin(data: Record<string, unknown>): PortalAdminShowQueueItemOrigin {
  if (nonEmptyString(data.requeuedFromAllocationId)) {
    return "requeued";
  }
  if (nonEmptyString(data.movedFromAllocationId)) {
    return "moved";
  }
  return "standard";
}

function firstNonEmptyString(
  sources: Array<Record<string, unknown> | undefined>,
  keys: readonly string[],
): string | undefined {
  for (const data of sources) {
    if (!data) {
      continue;
    }
    for (const key of keys) {
      const value = nonEmptyString(data[key]);
      if (value) {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Match Studio Print Request list identity: display name when known, plus @username.
 * Snapshots on the request/allocation win; live `customers/{id}` fills gaps.
 */
function resolveIdentityLabel(
  requestData: Record<string, unknown> | undefined,
  allocationData: Record<string, unknown> | undefined,
  customerData: Record<string, unknown> | undefined,
): string | undefined {
  const snapshotSources = [requestData, allocationData];
  const currentDisplayName =
    firstNonEmptyString(snapshotSources, [
      "customerDisplayNameSnapshot",
      "customerDisplayNameAtCreationSnapshot",
    ]) ?? nonEmptyString(customerData?.displayName);
  const currentUsername =
    firstNonEmptyString(snapshotSources, ["customerUsernameSnapshot", "customerUsernameAtCreationSnapshot"]) ??
    nonEmptyString(customerData?.username);
  const displayNameAtCreation = firstNonEmptyString(snapshotSources, [
    "customerDisplayNameAtCreationSnapshot",
  ]);
  const usernameAtCreation = firstNonEmptyString(snapshotSources, ["customerUsernameAtCreationSnapshot"]);

  if (!currentDisplayName && !currentUsername) {
    return undefined;
  }

  const label = formatCustomerIdentityLabel({
    currentDisplayName,
    displayNameAtCreation,
    currentUsername,
    usernameAtCreation,
  });
  return label === "Unknown customer" ? undefined : label;
}

function resolveCustomerId(
  requestData: Record<string, unknown> | undefined,
  allocationData: Record<string, unknown> | undefined,
): string | undefined {
  return firstNonEmptyString([requestData, allocationData], ["customerId"]);
}

function resolveRequestKind(data: Record<string, unknown> | undefined): PortalAdminShowQueueRequestKind {
  if (!data) {
    return "unknown";
  }
  if (data.isInternal === true) {
    return "internal";
  }
  if (data.isInternal === false) {
    return "customer";
  }
  return "unknown";
}

function scheduledStartAdapter(data: Record<string, unknown>): {
  scheduledStartAt?: { toDate: () => Date } | null;
} {
  const millis = toMillis(data.scheduledStartAt);
  if (millis === null) {
    return { scheduledStartAt: null };
  }
  return {
    scheduledStartAt: {
      toDate: () => new Date(millis),
    },
  };
}

export function isPortalAdminUpcomingQueueShow(
  data: Record<string, unknown>,
  now: Date,
  projectId: string,
): boolean {
  const source = data.source;
  if (source !== "whatnot" && source !== "dev_fixture") {
    return false;
  }
  if (source === "dev_fixture" && projectId !== "fresh-prints-dev") {
    return false;
  }
  if (!isWhatnotQueueSurfaceShow({ source: source as "whatnot" | "dev_fixture" })) {
    return false;
  }
  return getShowScheduleTab(scheduledStartAdapter(data), now) === "upcoming";
}

function sortUpcomingShowDocuments(shows: PortalAdminQueueDocument[]): PortalAdminQueueDocument[] {
  return [...shows].sort((left, right) => {
    const leftMs = toMillis(left.data.scheduledStartAt);
    const rightMs = toMillis(right.data.scheduledStartAt);
    if (leftMs === null && rightMs === null) {
      return left.id.localeCompare(right.id);
    }
    if (leftMs === null) {
      return 1;
    }
    if (rightMs === null) {
      return -1;
    }
    return leftMs - rightMs || left.id.localeCompare(right.id);
  });
}

function toMetricAllocation(document: PortalAdminQueueDocument): PortalAdminMetricAllocation | null {
  const printRequestId = nonEmptyString(document.data.printRequestId);
  if (!printRequestId) {
    return null;
  }
  return {
    allocationId: document.id,
    status: resolveAllocationStatus(document.data.status),
    allocatedQuantity: toQuantity(document.data.allocatedQuantity),
    printRequestId,
    sourceType: nonEmptyString(document.data.sourceType),
    designId: nonEmptyString(document.data.designId),
    customerUploadId: nonEmptyString(document.data.customerUploadId),
  };
}

function buildStatusSummary(allocations: PortalAdminQueueDocument[]): string {
  const counts = new Map<string, number>();
  for (const document of allocations) {
    const status = resolveAllocationStatus(document.data.status);
    if (status === "canceled") {
      continue;
    }
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  if (counts.size === 0) {
    return "No active allocations";
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${count} ${status.replace(/_/g, " ")}`)
    .join(" · ");
}

function buildCapacityDto(maxTotalQuantity: unknown, printQty: number): PortalAdminShowCapacityDto {
  const max =
    typeof maxTotalQuantity === "number" && Number.isFinite(maxTotalQuantity)
      ? maxTotalQuantity
      : undefined;
  const assessed = assessShowCapacity({
    maxTotalQuantity: max,
    allocatedQuantity: printQty,
  });
  const percentUsed = getShowCapacityPercent(assessed);
  return {
    ...(assessed.maxTotalQuantity !== undefined ? { maxTotalQuantity: assessed.maxTotalQuantity } : {}),
    allocatedQuantity: assessed.allocatedQuantity,
    ...(assessed.remainingQuantity !== undefined ? { remainingQuantity: assessed.remainingQuantity } : {}),
    isFull: assessed.isFull,
    isOverCapacity: assessed.isOverCapacity,
    ...(percentUsed !== undefined ? { percentUsed } : {}),
    usedLabel: formatCapacityUsedLabel(assessed),
  };
}

function buildRequestSummaries(
  allocations: PortalAdminQueueDocument[],
  requests: Map<string, Record<string, unknown>>,
  customers: Map<string, Record<string, unknown>> = new Map(),
): PortalAdminShowRequestSummary[] {
  const grouped = new Map<string, PortalAdminQueueDocument[]>();
  for (const document of allocations) {
    const requestId = nonEmptyString(document.data.printRequestId);
    if (!requestId) {
      continue;
    }
    const list = grouped.get(requestId) ?? [];
    list.push(document);
    grouped.set(requestId, list);
  }

  return [...grouped.entries()]
    .flatMap(([printRequestId, requestAllocations]) => {
      const metrics = requestAllocations
        .map((document) => toMetricAllocation(document))
        .filter((value): value is PortalAdminMetricAllocation => value !== null);
      const printQty = sumPortalAdminPrintQty(metrics);
      const designQty = countPortalAdminDesignQty(metrics);
      if (printQty === 0 && designQty === 0) {
        return [];
      }
      const requestData = requests.get(printRequestId);
      const allocationData = requestAllocations[0]?.data;
      const kind = resolveRequestKind(requestData);
      const name =
        nonEmptyString(requestData?.name) ??
        nonEmptyString(allocationData?.requestNameSnapshot) ??
        "Unnamed request";
      const sortKey = Math.max(
        ...requestAllocations.map((document) => toMillis(document.data.createdAt) ?? 0),
        0,
      );
      const customerId = resolveCustomerId(requestData, allocationData);
      const identityLabel = resolveIdentityLabel(
        requestData,
        allocationData,
        customerId ? customers.get(customerId) : undefined,
      );
      return [
        {
          sortKey,
          printRequestId,
          value: {
            printRequestId,
            name,
            kind,
            ...(kind === "customer" && identityLabel ? { customerIdentityLabel: identityLabel } : {}),
            designQty,
            printQty,
            statusSummary: buildStatusSummary(requestAllocations),
          } satisfies PortalAdminShowRequestSummary,
        },
      ];
    })
    .sort((left, right) => right.sortKey - left.sortKey || left.printRequestId.localeCompare(right.printRequestId))
    .map((entry) => entry.value);
}

function buildSelectedDashboard(
  show: PortalAdminQueueDocument,
  allocations: PortalAdminQueueDocument[],
  requests: Map<string, Record<string, unknown>>,
  customers: Map<string, Record<string, unknown>> = new Map(),
): PortalAdminSelectedShowDashboard {
  const metrics = allocations
    .map((document) => toMetricAllocation(document))
    .filter((value): value is PortalAdminMetricAllocation => value !== null);
  const printQty = sumPortalAdminPrintQty(metrics);
  return {
    showId: show.id,
    title: nonEmptyString(show.data.title) ?? "Untitled show",
    scheduledStartAtMs: toMillis(show.data.scheduledStartAt),
    showStatus: resolveShowStatus(show.data.status),
    productionStatus: resolveProductionStatus(show.data.productionStatus),
    isArchived: show.data.isArchived === true,
    designQty: countPortalAdminDesignQty(metrics),
    printQty,
    prQty: countPortalAdminPrQty(metrics),
    capacity: buildCapacityDto(show.data.maxTotalQuantity, printQty),
    requests: buildRequestSummaries(allocations, requests, customers),
  };
}

export interface BuildPortalAdminUpcomingDashboardInput {
  now: Date;
  projectId: string;
  requestedShowId?: string;
  shows: PortalAdminQueueDocument[];
  selectedShowAllocations: PortalAdminQueueDocument[];
  requests: Map<string, Record<string, unknown>>;
  customers?: Map<string, Record<string, unknown>>;
}

export function buildPortalAdminUpcomingShowQueueDashboard(
  input: BuildPortalAdminUpcomingDashboardInput,
): PortalAdminUpcomingShowQueueDashboardResponse {
  const upcoming = sortUpcomingShowDocuments(
    input.shows.filter((document) => isPortalAdminUpcomingQueueShow(document.data, input.now, input.projectId)),
  );

  const list: PortalAdminUpcomingShowListItem[] = upcoming.map((document) => ({
    showId: document.id,
    title: nonEmptyString(document.data.title) ?? "Untitled show",
    scheduledStartAtMs: toMillis(document.data.scheduledStartAt),
    showStatus: resolveShowStatus(document.data.status),
    productionStatus: resolveProductionStatus(document.data.productionStatus),
    isArchived: document.data.isArchived === true,
  }));

  const requested =
    input.requestedShowId && list.some((show) => show.showId === input.requestedShowId)
      ? input.requestedShowId
      : null;
  const selectedShowId = requested ?? list[0]?.showId ?? null;
  const selectedShow = selectedShowId
    ? upcoming.find((document) => document.id === selectedShowId) ?? null
    : null;

  return {
    generatedAtMs: input.now.getTime(),
    timeZone: SHOW_QUEUE_OPERATIONAL_TIME_ZONE,
    shows: list,
    selectedShowId,
    selected: selectedShow
      ? buildSelectedDashboard(
          selectedShow,
          input.selectedShowAllocations,
          input.requests,
          input.customers ?? new Map(),
        )
      : null,
  };
}

export function mapDesignItemLabel(data: Record<string, unknown>): string {
  const source = resolveItemSource(data);
  return source === "customer_upload" ? "Uploaded" : "Design Library";
}

export function toMillisExport(value: unknown): number | null {
  return toMillis(value);
}

export function nonEmptyStringExport(value: unknown): string | undefined {
  return nonEmptyString(value);
}
