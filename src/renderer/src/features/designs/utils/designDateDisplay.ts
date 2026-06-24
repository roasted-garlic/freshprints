import type { Timestamp } from "firebase/firestore";

export function formatDesignTimestamp(timestamp: Timestamp | undefined): string {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "—";
  }

  return timestamp.toDate().toLocaleString();
}
