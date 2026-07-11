import type { PrintRequestListTab } from "../utils/printRequestListGrouping";
import type { StaffInboxItemKind } from "./staffInbox.types";

/** Firestore `staffInboxAcks` document (per staff user Done history). */
export interface StaffInboxAckDocument {
  userId: string;
  itemId: string;
  kind: StaffInboxItemKind;
  title: string;
  subtitle: string;
  printRequestId?: string;
  upcomingShowId?: string;
  printRequestTab?: PrintRequestListTab;
  /** Original alert time (millis). */
  occurredAtMillis: number;
}

/**
 * Deterministic doc id: `{userId}__{itemId with ':' → '_'}`.
 * `itemId` is also stored on the document for exact matching.
 */
export function buildStaffInboxAckDocId(userId: string, itemId: string): string {
  return `${userId}__${itemId.split(":").join("_")}`;
}
