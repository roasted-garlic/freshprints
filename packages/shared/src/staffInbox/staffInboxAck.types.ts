import type { PrintRequestListTab } from "../utils/printRequestListGrouping";
import type { StaffInboxItemKind } from "./staffInbox.types";

/** Firestore `staffInboxAcks` document (shared team Done state). */
export interface StaffInboxAckDocument {
  itemId: string;
  kind: StaffInboxItemKind;
  title: string;
  subtitle: string;
  printRequestId?: string;
  upcomingShowId?: string;
  printRequestTab?: PrintRequestListTab;
  /** Original alert time (millis). */
  occurredAtMillis: number;
  /** Staff member who marked Done. */
  acknowledgedByUserId: string;
  acknowledgedByDisplayName?: string;
}

/**
 * Deterministic doc id: `{itemId with ':' → '_'}`.
 * `itemId` is also stored on the document for exact matching.
 *
 * Legacy per-user ids (`{userId}__{encodedItemId}`) are migrated away on read.
 */
export function buildStaffInboxAckDocId(itemId: string): string {
  return itemId.split(":").join("_");
}

export function isLegacyStaffInboxAckDocId(docId: string, itemId: string): boolean {
  const canonicalId = buildStaffInboxAckDocId(itemId);
  return docId !== canonicalId && docId.endsWith(`__${canonicalId}`);
}
