import type { Timestamp } from "firebase/firestore";

import type { AuditTrailEntry } from "../types/auditTrail.types";

export function getAuditTimestampMillis(
  value: Timestamp | { toMillis?: () => number; toDate?: () => Date } | undefined,
): number {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  return 0;
}

export function isAuditTimestampAfter(laterMillis: number, earlierMillis: number): boolean {
  return laterMillis > earlierMillis + 1000;
}

export const AUDIT_TRAIL_MAX_ENTRIES = 40;

export function mergeAuditTrailEntries(...groups: AuditTrailEntry[][]): AuditTrailEntry[] {
  return groups
    .flat()
    .sort((left, right) => right.occurredAtMillis - left.occurredAtMillis)
    .slice(0, AUDIT_TRAIL_MAX_ENTRIES);
}
