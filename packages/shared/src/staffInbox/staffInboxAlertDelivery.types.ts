/**
 * Persistent team-wide sound delivery for inbox alerts.
 * Separate from Done acknowledgements (`staffInboxAcks`).
 */

export type StaffInboxAlertDeliveryKind = "portal_queued" | "show_queue_full";

export interface StaffInboxAlertDelivery {
  itemId: string;
  kind: StaffInboxAlertDeliveryKind;
  occurredAtMillis: number;
  soundPlayedAtMillis: number;
  /** Who triggered the sound (optional on legacy rows). */
  deliveredByUserId?: string;
}

export function buildStaffInboxAlertDeliveryDocId(itemId: string): string {
  return itemId.replace(/:/g, "_");
}

export function isLegacyStaffInboxAlertDeliveryDocId(docId: string, itemId: string): boolean {
  const canonicalId = buildStaffInboxAlertDeliveryDocId(itemId);
  return docId !== canonicalId && docId.endsWith(`__${canonicalId}`);
}
