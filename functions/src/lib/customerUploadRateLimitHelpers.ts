import { Timestamp } from "firebase-admin/firestore";

/** Donate / upload daily quota calendar boundary (CST/CDT). */
export const CUSTOMER_UPLOAD_QUOTA_TIME_ZONE = "America/Chicago";

function chicagoDateParts(date: Date): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CUSTOMER_UPLOAD_QUOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return { year, month, day };
}

/**
 * America/Chicago calendar day key `yyyyMMdd` (CST/CDT).
 * Name kept as `utcDayKey` for call-site compatibility; value is Central, not UTC.
 */
export function utcDayKey(date: Date = new Date()): string {
  const { year, month, day } = chicagoDateParts(date);
  return `${year}${month}${day}`;
}

/** America/Chicago calendar day label `yyyy-MM-dd` (stored on rate-limit docs as `utcDay`). */
export function utcDayLabel(date: Date = new Date()): string {
  const { year, month, day } = chicagoDateParts(date);
  return `${year}-${month}-${day}`;
}

export function rateLimitDocId(customerUid: string, dayKey: string = utcDayKey()): string {
  return `${customerUid}_${dayKey}`;
}

export function isLeaseExpired(expiresAt: Timestamp | Date, now: Date = new Date()): boolean {
  const millis =
    expiresAt instanceof Timestamp ? expiresAt.toMillis() : expiresAt.getTime();
  return millis <= now.getTime();
}
