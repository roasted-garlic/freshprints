import type { StaffInboxItemKind } from "./staffInbox.types";

export function buildStaffInboxItemId(
  kind: StaffInboxItemKind,
  primaryId: string,
  upcomingShowId?: string,
): string {
  if (kind === "portal_queued") {
    if (!upcomingShowId?.trim()) {
      throw new Error("A show id is required for queued inbox items.");
    }

    return `portal_queued:${primaryId}:${upcomingShowId}`;
  }

  return `show_queue_full:${primaryId}`;
}

export function buildStaffInboxQueuedGroupKey(printRequestId: string, upcomingShowId: string): string {
  return `${printRequestId}:${upcomingShowId}`;
}

export function getStaffInboxKindLabel(kind: StaffInboxItemKind): string {
  if (kind === "portal_queued") {
    return "Queued";
  }

  return "Full";
}
