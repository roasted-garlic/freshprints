import type { AssistedCreationRevisionEntry } from "../types/assistedCreation/assistedCreation.types";

export const ASSISTED_CREATION_UPDATE_ACKS_COLLECTION = "assistedCreationUpdateAcks" as const;

export const ASSISTED_CREATION_REQUEST_UPDATED_NOTE = "Request updated" as const;
export const ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE = "Proof-ready email sent" as const;

export function buildAssistedCreationUpdateAckDocId(userId: string, requestId: string): string {
  return `${userId}__${requestId}`;
}

export function formatAssistedCreationRequestUpdatedNote(updateNote?: string | null): string {
  const trimmed = typeof updateNote === "string" ? updateNote.trim() : "";
  return trimmed
    ? `${ASSISTED_CREATION_REQUEST_UPDATED_NOTE} — ${trimmed}`
    : ASSISTED_CREATION_REQUEST_UPDATED_NOTE;
}

function revisionAtMillis(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object") {
    const record = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
    if (typeof record.toMillis === "function") {
      const millis = record.toMillis();
      return Number.isFinite(millis) ? millis : null;
    }
    if (typeof record.toDate === "function") {
      const millis = record.toDate().getTime();
      return Number.isFinite(millis) ? millis : null;
    }
    if (typeof record.seconds === "number" && Number.isFinite(record.seconds)) {
      return Math.floor(record.seconds * 1000);
    }
  }
  return null;
}

/** Customer same-status updates while the request is still `submitted`. */
export function isAssistedCreationCustomerUpdateEntry(
  entry: Pick<AssistedCreationRevisionEntry, "fromStatus" | "toStatus" | "byRole" | "note">,
): boolean {
  if (entry.fromStatus !== entry.toStatus || entry.toStatus !== "submitted") {
    return false;
  }
  if (entry.byRole === "customer") {
    return true;
  }
  const note = entry.note?.trim() ?? "";
  return /^Request updated/i.test(note) || /^Customer updated request/i.test(note);
}

export function isAssistedCreationProofEmailSentEntry(
  entry: Pick<AssistedCreationRevisionEntry, "byRole" | "note">,
): boolean {
  const note = entry.note?.trim() ?? "";
  return (
    note === ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE ||
    (entry.byRole === "system" && /^Proof-ready email sent/i.test(note))
  );
}

export function countUnreadAssistedCreationCustomerUpdates(
  history: readonly AssistedCreationRevisionEntry[] | undefined,
  readThroughAtMs: number | null | undefined,
): number {
  if (!history?.length) {
    return 0;
  }
  const threshold = readThroughAtMs ?? null;
  let count = 0;
  for (const entry of history) {
    if (!isAssistedCreationCustomerUpdateEntry(entry)) {
      continue;
    }
    const at = revisionAtMillis(entry.at);
    if (at == null) {
      if (threshold == null) {
        count += 1;
      }
      continue;
    }
    if (threshold == null || at > threshold) {
      count += 1;
    }
  }
  return count;
}

export function latestAssistedCreationCustomerUpdateAtMs(
  history: readonly AssistedCreationRevisionEntry[] | undefined,
): number | null {
  if (!history?.length) {
    return null;
  }
  let latest: number | null = null;
  for (const entry of history) {
    if (!isAssistedCreationCustomerUpdateEntry(entry)) {
      continue;
    }
    const at = revisionAtMillis(entry.at);
    if (at == null) {
      continue;
    }
    if (latest == null || at > latest) {
      latest = at;
    }
  }
  return latest;
}

/** Missing / non-boolean preference means opted in (opt-out model). */
export function isAssistedProofEmailOptedIn(value: unknown): boolean {
  return value !== false;
}
