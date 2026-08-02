import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";
import {
  buildStaffInboxItemId,
  buildStaffInboxQueuedGroupKey,
} from "./staffInboxItemIds";
import {
  isStaffInboxShowQueueFull,
  showHasPortalAllocations,
  type StaffInboxShowSnapshot,
} from "./staffInboxShowSnapshots";
import type {
  StaffInboxBadgeCounts,
  StaffInboxItem,
  StaffInboxPortalAllocationSnapshot,
  StaffInboxPortalRequestSnapshot,
} from "./staffInbox.types";
import { compareStaffInboxItemsForDisplay } from "./staffInboxAlertOrdering";

const ACTIVE_ALLOCATION_STATUSES = new Set<ShowAllocationStatus>([
  "pending",
  "queued",
  "in_progress",
]);

export interface DeriveStaffInboxItemsInput {
  portalAllocations: StaffInboxPortalAllocationSnapshot[];
  acknowledgedItemIds: ReadonlySet<string>;
  showTitleById: Readonly<Record<string, string>>;
  shows: StaffInboxShowSnapshot[];
  /** Retained for subscription compatibility; working-tab alerts are no longer derived. */
  portalRequests?: StaffInboxPortalRequestSnapshot[];
}

function groupQueuedAllocations(portalAllocations: StaffInboxPortalAllocationSnapshot[]) {
  const groups = new Map<
    string,
    {
      printRequestId: string;
      upcomingShowId: string;
      requestNameSnapshot: string;
      createdAtMillis: number;
    }
  >();

  for (const allocation of portalAllocations) {
    if (!ACTIVE_ALLOCATION_STATUSES.has(allocation.status as ShowAllocationStatus)) {
      continue;
    }

    const groupKey = buildStaffInboxQueuedGroupKey(allocation.printRequestId, allocation.upcomingShowId);
    const existing = groups.get(groupKey);

    if (!existing || allocation.createdAtMillis < existing.createdAtMillis) {
      groups.set(groupKey, {
        printRequestId: allocation.printRequestId,
        upcomingShowId: allocation.upcomingShowId,
        requestNameSnapshot: allocation.requestNameSnapshot,
        createdAtMillis: allocation.createdAtMillis,
      });
    }
  }

  return [...groups.values()];
}

function getLatestPortalAllocationMillisForShow(
  upcomingShowId: string,
  portalAllocations: StaffInboxPortalAllocationSnapshot[],
): number {
  let latest = 0;

  for (const allocation of portalAllocations) {
    if (
      allocation.upcomingShowId !== upcomingShowId ||
      !ACTIVE_ALLOCATION_STATUSES.has(allocation.status as ShowAllocationStatus)
    ) {
      continue;
    }

    latest = Math.max(latest, allocation.createdAtMillis);
  }

  return latest;
}

export function deriveStaffInboxItems(input: DeriveStaffInboxItemsInput): StaffInboxItem[] {
  const items: StaffInboxItem[] = [];

  for (const group of groupQueuedAllocations(input.portalAllocations)) {
    const id = buildStaffInboxItemId("portal_queued", group.printRequestId, group.upcomingShowId);

    if (input.acknowledgedItemIds.has(id)) {
      continue;
    }

    const showTitle =
      input.showTitleById[group.upcomingShowId]?.trim() ||
      group.requestNameSnapshot ||
      "Upcoming show";

    items.push({
      id,
      kind: "portal_queued",
      printRequestId: group.printRequestId,
      upcomingShowId: group.upcomingShowId,
      title: group.requestNameSnapshot,
      subtitle: `Queued to ${showTitle} — check Queued tab and Show Queue.`,
      printRequestTab: "queued",
      occurredAtMillis: group.createdAtMillis,
    });
  }

  for (const show of input.shows) {
    if (!showHasPortalAllocations(show.id, input.portalAllocations)) {
      continue;
    }

    if (!isStaffInboxShowQueueFull(show)) {
      continue;
    }

    const id = buildStaffInboxItemId("show_queue_full", show.id);

    if (input.acknowledgedItemIds.has(id)) {
      continue;
    }

    const showTitle = input.showTitleById[show.id]?.trim() || "Upcoming show";
    const latestAllocationMillis = getLatestPortalAllocationMillisForShow(show.id, input.portalAllocations);

    items.push({
      id,
      kind: "show_queue_full",
      upcomingShowId: show.id,
      title: showTitle,
      subtitle: "Show queue is full — review allocations in Show Queue.",
      occurredAtMillis: Math.max(show.updatedAtMillis, latestAllocationMillis),
    });
  }

  return items.sort(compareStaffInboxItemsForDisplay);
}

export function deriveStaffInboxBadgeCounts(items: StaffInboxItem[]): StaffInboxBadgeCounts {
  const showIds = new Set<string>();

  for (const item of items) {
    if (item.upcomingShowId) {
      showIds.add(item.upcomingShowId);
    }
  }

  return {
    printRequests: items.length,
    showQueue: showIds.size,
    designReports: items.filter((item) => item.kind === "design_issue_report").length,
  };
}

export function listQueuedGroupKeys(allocations: StaffInboxPortalAllocationSnapshot[]): string[] {
  return groupQueuedAllocations(allocations).map((group) =>
    buildStaffInboxQueuedGroupKey(group.printRequestId, group.upcomingShowId),
  );
}
