import { SHOW_CAPACITY_BAR_ANIMATION_MS } from "@fresh-prints/show-picker";

/**
 * Staff Inbox hears Firestore allocation writes as soon as the queue TX commits, which is
 * before Portal/Studio finish “Adding…” and the capacity-bar success celebration.
 * Hold sound/toast long enough to cover callable return jitter + celebration.
 */
export const STAFF_INBOX_QUEUE_ALERT_SETTLE_MS = SHOW_CAPACITY_BAR_ANIMATION_MS + 1_200;

/** Existing coalesce window for queue-add + show-full into one sound. */
export const STAFF_INBOX_ALERT_BATCH_WINDOW_MS = 750;

export const STAFF_INBOX_QUEUE_ALERT_HOLD_CHANGED_EVENT =
  "fresh-prints:staff-inbox-queue-alert-hold-changed";

const heldQueuedGroupKeys = new Set<string>();

export function notifyStaffInboxQueueAlertHoldChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(STAFF_INBOX_QUEUE_ALERT_HOLD_CHANGED_EVENT));
}

/** Studio Add-to-Show in flight: suppress inbox queue alerts for these request:show keys. */
export function holdStaffInboxQueuedAlertGroup(groupKey: string): void {
  const trimmed = groupKey.trim();
  if (!trimmed || heldQueuedGroupKeys.has(trimmed)) {
    return;
  }
  heldQueuedGroupKeys.add(trimmed);
  notifyStaffInboxQueueAlertHoldChanged();
}

export function releaseStaffInboxQueuedAlertGroup(groupKey: string): void {
  const trimmed = groupKey.trim();
  if (!trimmed || !heldQueuedGroupKeys.delete(trimmed)) {
    return;
  }
  notifyStaffInboxQueueAlertHoldChanged();
}

export function releaseAllStaffInboxQueuedAlertGroups(groupKeys: Iterable<string>): void {
  let changed = false;
  for (const key of groupKeys) {
    const trimmed = key.trim();
    if (trimmed && heldQueuedGroupKeys.delete(trimmed)) {
      changed = true;
    }
  }
  if (changed) {
    notifyStaffInboxQueueAlertHoldChanged();
  }
}

export function isStaffInboxQueuedAlertGroupHeld(groupKey: string): boolean {
  return heldQueuedGroupKeys.has(groupKey.trim());
}
