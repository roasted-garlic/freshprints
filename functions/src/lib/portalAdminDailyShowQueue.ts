import type {
  PortalAdminDailyShowQueueResponse,
  PortalAdminShowQueueItemOrigin,
  PortalAdminShowQueueItemSource,
  PortalAdminShowQueueRequestKind,
} from "../../../packages/shared/src/types/portal/getPortalAdminDailyShowQueue.types";
import type { ShowAllocationStatus } from "../../../packages/shared/src/types/showAllocation/showAllocation.enums";
import type { ShowProductionStatus, UpcomingShowStatus } from "../../../packages/shared/src/types/upcomingShow/upcomingShow.enums";
import { getOperationalDayWindow, SHOW_QUEUE_OPERATIONAL_TIME_ZONE } from "../../../packages/shared/src/utils/operationalDay";
import type { TeamUserProfile } from "../lib/types";
import { permissionDenied } from "../lib/errors";

export interface PortalAdminQueueDocument {
  id: string;
  data: Record<string, unknown>;
}

export function assertPortalAdminQueueCaller(caller: TeamUserProfile): void {
  if (!caller.isActive || (caller.role !== "owner" && caller.role !== "admin")) {
    throw permissionDenied("Only active owners and admins can view the Portal Show Queue.");
  }
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

function resolveAllocationStatus(value: unknown): ShowAllocationStatus {
  return typeof value === "string" && ALLOCATION_STATUSES.includes(value as ShowAllocationStatus)
    ? (value as ShowAllocationStatus)
    : "canceled";
}

function resolveSource(data: Record<string, unknown>): PortalAdminShowQueueItemSource {
  return data.sourceType === "customer_upload" || nonEmptyString(data.customerUploadId)
    ? "customer_upload"
    : "catalog_design";
}

function resolveOrigin(data: Record<string, unknown>): PortalAdminShowQueueItemOrigin {
  if (nonEmptyString(data.requeuedFromAllocationId)) {
    return "requeued";
  }
  if (nonEmptyString(data.movedFromAllocationId)) {
    return "moved";
  }
  return "standard";
}

function resolveIdentityLabel(data: Record<string, unknown>): string | undefined {
  const username =
    nonEmptyString(data.customerUsernameSnapshot) ??
    nonEmptyString(data.customerUsernameAtCreationSnapshot);
  if (username) {
    return username.startsWith("@") ? username : `@${username}`;
  }
  return nonEmptyString(data.customerDisplayNameSnapshot) ??
    nonEmptyString(data.customerDisplayNameAtCreationSnapshot);
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

interface InternalAllocation {
  id: string;
  showId: string;
  requestId: string;
  requestNameSnapshot: string;
  createdAtMs: number;
  quantity: number;
  status: ShowAllocationStatus;
  source: PortalAdminShowQueueItemSource;
  label: string;
  width?: number;
  height?: number;
  sizeLabel?: string;
  origin: PortalAdminShowQueueItemOrigin;
}

function mapAllocation(document: PortalAdminQueueDocument): InternalAllocation | null {
  const data = document.data;
  const showId = nonEmptyString(data.upcomingShowId);
  const requestId = nonEmptyString(data.printRequestId);
  if (!showId || !requestId) {
    return null;
  }
  const source = resolveSource(data);
  const status = resolveAllocationStatus(data.status);
  const createdAtMs = toMillis(data.createdAt) ?? 0;
  const requestNameSnapshot = nonEmptyString(data.requestNameSnapshot) ?? "Unnamed request";
  const width = toFiniteNumber(data.printWidthInches, Number.NaN);
  const height = toFiniteNumber(data.printHeightInches, Number.NaN);
  return {
    id: document.id,
    showId,
    requestId,
    requestNameSnapshot,
    createdAtMs,
    quantity: toQuantity(data.allocatedQuantity),
    status,
    source,
    label: source === "customer_upload" ? "Customer upload" : nonEmptyString(data.designTitleSnapshot) ?? "Catalog design",
    ...(Number.isFinite(width) ? { width } : {}),
    ...(Number.isFinite(height) ? { height } : {}),
    ...(nonEmptyString(data.sizeLabel) ? { sizeLabel: nonEmptyString(data.sizeLabel) } : {}),
    origin: resolveOrigin(data),
  };
}

export interface BuildPortalAdminDailyShowQueueInput {
  now: Date;
  projectId?: string;
  shows: PortalAdminQueueDocument[];
  allocations: PortalAdminQueueDocument[];
  requests: Map<string, Record<string, unknown>>;
}

/** Compose the minimal, identifier-free DTO used by the Portal admin queue. */
export function buildPortalAdminDailyShowQueueResponse(
  input: BuildPortalAdminDailyShowQueueInput,
): PortalAdminDailyShowQueueResponse {
  const day = getOperationalDayWindow(input.now, SHOW_QUEUE_OPERATIONAL_TIME_ZONE);
  const allowDevFixtures = input.projectId === "fresh-prints-dev";
  const allocationByShow = new Map<string, InternalAllocation[]>();

  for (const document of input.allocations) {
    const allocation = mapAllocation(document);
    if (!allocation) {
      continue;
    }
    const list = allocationByShow.get(allocation.showId) ?? [];
    list.push(allocation);
    allocationByShow.set(allocation.showId, list);
  }

  const shows = input.shows
    .flatMap((document) => {
      const data = document.data;
      const source = data.source;
      if (source !== "whatnot" && !(source === "dev_fixture" && allowDevFixtures)) {
        return [];
      }
      const scheduledStartAtMs = toMillis(data.scheduledStartAt);
      if (scheduledStartAtMs === null || scheduledStartAtMs < day.startMs || scheduledStartAtMs >= day.nextStartMs) {
        return [];
      }

      const allocations = allocationByShow.get(document.id) ?? [];
      const grouped = new Map<string, InternalAllocation[]>();
      for (const allocation of allocations) {
        const list = grouped.get(allocation.requestId) ?? [];
        list.push(allocation);
        grouped.set(allocation.requestId, list);
      }

      const requests = [...grouped.entries()]
        .map(([requestId, requestAllocations]) => {
          const requestData = input.requests.get(requestId);
          const kind = resolveRequestKind(requestData);
          const name = nonEmptyString(requestData?.name) ?? requestAllocations[0]?.requestNameSnapshot ?? "Unnamed request";
          const sortedItems = [...requestAllocations].sort(
            (left, right) => left.createdAtMs - right.createdAtMs || left.id.localeCompare(right.id),
          );
          const attachedQuantity = sortedItems.reduce((sum, item) => sum + item.quantity, 0);
          const activeWorkQuantity = sortedItems.reduce(
            (sum, item) => sum + (item.status === "canceled" ? 0 : item.quantity),
            0,
          );
          return {
            sortKey: Math.max(...sortedItems.map((item) => item.createdAtMs), 0),
            requestId,
            value: {
              name,
              kind,
              ...(kind === "customer" && resolveIdentityLabel(requestData ?? {})
                ? { customerIdentityLabel: resolveIdentityLabel(requestData ?? {}) }
                : {}),
              attachedQuantity,
              activeWorkQuantity,
              items: sortedItems.map((item) => ({
                label: item.label,
                source: item.source,
                status: item.status,
                quantity: item.quantity,
                ...(item.width !== undefined ? { printWidthInches: item.width } : {}),
                ...(item.height !== undefined ? { printHeightInches: item.height } : {}),
                ...(item.sizeLabel ? { sizeLabel: item.sizeLabel } : {}),
                origin: item.origin,
              })),
            },
          };
        })
        .sort((left, right) => right.sortKey - left.sortKey || left.requestId.localeCompare(right.requestId))
        .map((entry) => entry.value);

      const attachedQuantity = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      const activeWorkQuantity = allocations.reduce(
        (sum, allocation) => sum + (allocation.status === "canceled" ? 0 : allocation.quantity),
        0,
      );
      return [
        {
          sortKey: scheduledStartAtMs,
          id: document.id,
          value: {
            title: nonEmptyString(data.title) ?? "Untitled show",
            scheduledStartAtMs,
            showStatus: resolveShowStatus(data.status),
            productionStatus: resolveProductionStatus(data.productionStatus),
            isArchived: data.isArchived === true,
            attachedQuantity,
            activeWorkQuantity,
            requests,
          },
        },
      ];
    })
    .sort((left, right) => left.sortKey - right.sortKey || left.id.localeCompare(right.id))
    .map((entry) => entry.value);

  const totals = shows.reduce(
    (result, show) => ({
      showCount: result.showCount + 1,
      attachedQuantity: result.attachedQuantity + show.attachedQuantity,
      activeWorkQuantity: result.activeWorkQuantity + show.activeWorkQuantity,
    }),
    { showCount: 0, attachedQuantity: 0, activeWorkQuantity: 0 },
  );

  return {
    operationalDay: {
      dateKey: day.dateKey,
      timeZone: day.timeZone,
      generatedAtMs: input.now.getTime(),
    },
    totals,
    shows,
  };
}
