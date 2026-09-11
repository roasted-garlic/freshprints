export const CUSTOMER_NOTIFICATIONS_COLLECTION = "customerNotifications" as const;

export const CUSTOMER_NOTIFICATION_KINDS = [
  "assisted_proof_ready",
  "assisted_catalog_share_ready",
  "assisted_staff_message",
  "customer_upload_catalog_permission_follow_up",
] as const;

export type CustomerNotificationKind = (typeof CUSTOMER_NOTIFICATION_KINDS)[number];

export interface CustomerNotificationRecord {
  id: string;
  customerId: string;
  customerUid: string;
  kind: CustomerNotificationKind;
  title: string;
  body: string;
  href: string;
  requestId: string;
  proofId?: string;
  /** Opaque action handle; never an upload ID or Storage path. */
  actionToken?: string;
  createdAt?: unknown;
  readAt?: unknown | null;
  /** Soft-hide from Notification history; open permission follow-ups are never cleared. */
  clearedFromHistoryAt?: unknown | null;
}

export function isCustomerNotificationKind(value: unknown): value is CustomerNotificationKind {
  return (
    typeof value === "string" &&
    (CUSTOMER_NOTIFICATION_KINDS as readonly string[]).includes(value)
  );
}
