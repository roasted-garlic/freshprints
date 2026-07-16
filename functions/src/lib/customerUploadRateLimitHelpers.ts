import { Timestamp } from "firebase-admin/firestore";

/** UTC calendar day key `yyyyMMdd`. */
export function utcDayKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function utcDayLabel(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function rateLimitDocId(customerUid: string, dayKey: string = utcDayKey()): string {
  return `${customerUid}_${dayKey}`;
}

export function isLeaseExpired(expiresAt: Timestamp | Date, now: Date = new Date()): boolean {
  const millis =
    expiresAt instanceof Timestamp ? expiresAt.toMillis() : expiresAt.getTime();
  return millis <= now.getTime();
}
