import { Timestamp } from "firebase/firestore";

/** Formats a Firestore Timestamp as a value usable by `<input type="datetime-local">`. */
export function formatTimestampForDateTimeInput(value: Timestamp | undefined): string {
  if (!value) {
    return "";
  }

  const date = value.toDate();
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses a `<input type="datetime-local">` value into a Firestore Timestamp, or undefined if blank/invalid. */
export function parseDateTimeInputToTimestamp(value: string): Timestamp | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return Timestamp.fromDate(date);
}
