import type { AssistedCreationRevisionEntry } from "../types/assistedCreation/assistedCreation.types";
import { formatAssistedCreationStatus } from "../constants/assistedCreation/assistedCreation.constants";

export const ASSISTED_CREATION_UPDATE_ACKS_COLLECTION = "assistedCreationUpdateAcks" as const;

export const ASSISTED_CREATION_REQUEST_UPDATED_NOTE = "Request updated" as const;
export const ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE = "Proof-ready email sent" as const;
export const ASSISTED_CREATION_CUSTOMER_MESSAGE_TITLE = "Message" as const;
export const ASSISTED_CREATION_STAFF_MESSAGE_TITLE = "Message" as const;

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

/** Customer brief updates and structurally marked messages that staff can acknowledge. */
export function isAssistedCreationCustomerUpdateEntry(
  entry: Pick<AssistedCreationRevisionEntry, "fromStatus" | "toStatus" | "byRole" | "note" | "kind">,
): boolean {
  if (entry.kind === "customer_message") {
    return (
      entry.byRole === "customer" &&
      entry.fromStatus === entry.toStatus &&
      entry.fromStatus != null
    );
  }
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

/** Staff chat messages appended via `staffSendAssistedCreationMessage`. */
export function isAssistedCreationStaffMessageEntry(
  entry: Pick<AssistedCreationRevisionEntry, "fromStatus" | "toStatus" | "byRole" | "kind">,
): boolean {
  return (
    entry.kind === "staff_message" &&
    entry.byRole === "staff" &&
    entry.fromStatus === entry.toStatus &&
    entry.fromStatus != null
  );
}

/**
 * Builds display titles in chronological order. Proof and revision counters are independent and
 * assigned before an app chooses newest-first or oldest-first presentation.
 */
export function buildAssistedCreationHistoryTitles(
  history: readonly AssistedCreationRevisionEntry[] | undefined,
): string[] {
  if (!history?.length) {
    return [];
  }

  let proofNumber = 0;
  let revisionRequestNumber = 0;

  return history.map((entry) => {
    if (isAssistedCreationCustomerUpdateEntry(entry)) {
      return entry.kind === "customer_message" ? ASSISTED_CREATION_CUSTOMER_MESSAGE_TITLE : "Updated";
    }
    if (isAssistedCreationStaffMessageEntry(entry)) {
      return ASSISTED_CREATION_STAFF_MESSAGE_TITLE;
    }
    if (isAssistedCreationProofEmailSentEntry(entry)) {
      return "Email sent";
    }
    if (entry.toStatus === "proof_ready") {
      proofNumber += 1;
      return `Proof ${proofNumber}`;
    }
    if (entry.toStatus === "revision_requested") {
      revisionRequestNumber += 1;
      return `Revision request ${revisionRequestNumber}`;
    }
    return formatAssistedCreationStatus(entry.toStatus);
  });
}

/** True when a customer-update history entry is still after the staff read-through cursor. */
export function isAssistedCreationCustomerUpdateUnread(
  entry: Pick<
    AssistedCreationRevisionEntry,
    "fromStatus" | "toStatus" | "byRole" | "note" | "kind" | "at"
  >,
  readThroughAtMs: number | null | undefined,
): boolean {
  if (!isAssistedCreationCustomerUpdateEntry(entry)) {
    return false;
  }
  const threshold = readThroughAtMs ?? null;
  const at = revisionAtMillis(entry.at);
  if (at == null) {
    return threshold == null;
  }
  return threshold == null || at > threshold;
}

export function countUnreadAssistedCreationCustomerUpdates(
  history: readonly AssistedCreationRevisionEntry[] | undefined,
  readThroughAtMs: number | null | undefined,
): number {
  if (!history?.length) {
    return 0;
  }
  let count = 0;
  for (const entry of history) {
    if (isAssistedCreationCustomerUpdateUnread(entry, readThroughAtMs)) {
      count += 1;
    }
  }
  return count;
}

/** Cap for Studio Message history modal (aggregated across requests). */
export const ASSISTED_MESSAGES_HISTORY_LIMIT = 50 as const;

/** Unread customer-update entries newest-first for Studio Messages inbox previews. */
export function listUnreadAssistedCreationCustomerUpdates(
  history: readonly AssistedCreationRevisionEntry[] | undefined,
  readThroughAtMs: number | null | undefined,
): AssistedCreationRevisionEntry[] {
  if (!history?.length) {
    return [];
  }
  const unread = history.filter((entry) =>
    isAssistedCreationCustomerUpdateUnread(entry, readThroughAtMs),
  );
  return unread.sort((a, b) => {
    const aAt = revisionAtMillis(a.at) ?? 0;
    const bAt = revisionAtMillis(b.at) ?? 0;
    return bAt - aAt;
  });
}

/**
 * Already-acked customer-update entries newest-first for Studio Message history.
 * Requires a read-through cursor; with no ack, nothing is considered read.
 */
export function listReadAssistedCreationCustomerUpdates(
  history: readonly AssistedCreationRevisionEntry[] | undefined,
  readThroughAtMs: number | null | undefined,
): AssistedCreationRevisionEntry[] {
  if (!history?.length || readThroughAtMs == null) {
    return [];
  }
  const read = history.filter((entry) => {
    if (!isAssistedCreationCustomerUpdateEntry(entry)) {
      return false;
    }
    return !isAssistedCreationCustomerUpdateUnread(entry, readThroughAtMs);
  });
  return read.sort((a, b) => {
    const aAt = revisionAtMillis(a.at) ?? 0;
    const bAt = revisionAtMillis(b.at) ?? 0;
    return bAt - aAt;
  });
}

export function truncateAssistedCreationMessagePreview(
  note: string | null | undefined,
  maxLength = 96,
): string {
  const trimmed = typeof note === "string" ? note.trim() : "";
  if (!trimmed) {
    return "New customer message";
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function assistedCreationRevisionAtMillis(value: unknown): number | null {
  return revisionAtMillis(value);
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
