import type { StaffInboxItem, StaffInboxItemKind } from "./staffInbox.types";

export type StaffInboxAlertSoundKind = "request_queued_to_show" | "show_queue_full";

const ITEM_KIND_PLAY_ORDER: Record<StaffInboxItemKind, number> = {
  portal_queued: 0,
  show_queue_full: 1,
  design_issue_report: 2,
};

const SOUND_KIND_PLAY_ORDER: Record<StaffInboxAlertSoundKind, number> = {
  request_queued_to_show: 0,
  show_queue_full: 1,
};

export function compareStaffInboxAlertSoundKinds(
  left: StaffInboxAlertSoundKind,
  right: StaffInboxAlertSoundKind,
): number {
  return SOUND_KIND_PLAY_ORDER[left] - SOUND_KIND_PLAY_ORDER[right];
}

export function compareStaffInboxAlertKinds(left: StaffInboxItemKind, right: StaffInboxItemKind): number {
  return ITEM_KIND_PLAY_ORDER[left] - ITEM_KIND_PLAY_ORDER[right];
}

export function compareStaffInboxItemsForDisplay(left: StaffInboxItem, right: StaffInboxItem): number {
  const timeDiff = left.occurredAtMillis - right.occurredAtMillis;

  if (timeDiff !== 0) {
    return timeDiff;
  }

  const kindPriority = (kind: StaffInboxItemKind) => (kind === "show_queue_full" ? 1 : 0);

  return kindPriority(left.kind) - kindPriority(right.kind);
}
