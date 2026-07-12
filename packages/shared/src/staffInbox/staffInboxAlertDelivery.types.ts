/**
 * Persistent per-staff sound delivery for inbox alerts.
 * Separate from Done acknowledgements (`staffInboxAcks`).
 */

export type StaffInboxAlertDeliveryKind = "portal_queued" | "show_queue_full";

export interface StaffInboxAlertDelivery {
  userId: string;
  itemId: string;
  kind: StaffInboxAlertDeliveryKind;
  occurredAtMillis: number;
  soundPlayedAtMillis: number;
}

export function buildStaffInboxAlertDeliveryDocId(userId: string, itemId: string): string {
  return `${userId}__${itemId.replace(/:/g, "_")}`;
}
