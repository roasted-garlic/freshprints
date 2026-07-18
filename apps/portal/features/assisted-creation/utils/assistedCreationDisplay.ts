import {
  type AssistedCreationStatus,
  type AssistedCreationTransitionActor,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type {
  AssistedCreationProof,
  AssistedCreationRevisionEntry,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import {
  ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE,
  buildAssistedCreationHistoryTitles,
  isAssistedCreationProofEmailSentEntry,
} from '@fresh-prints/shared/utils/assistedCreationHistory';

export function formatAssistedWhen(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
  }
  return '';
}

/** Firestore Timestamp / Date / millis → epoch ms for retention helpers. */
export function assistedCreationTimestampMillis(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    try {
      const ms = (value as { toMillis: () => number }).toMillis();
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      const ms = date?.getTime?.();
      return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

export function assistedCreationStatusTone(status: AssistedCreationStatus): string {
  switch (status) {
    case 'submitted':
      return 'is-submitted';
    case 'in_progress':
    case 'revision_requested':
      return 'is-progress';
    case 'proof_ready':
      return 'is-proof';
    case 'approved':
      return 'is-approved';
    case 'rejected':
    case 'cancelled':
      return 'is-closed';
    default:
      return '';
  }
}

function isBoilerplateHistoryNote(note: string): boolean {
  const trimmed = note.trim();
  if (!trimmed) {
    return true;
  }
  return (
    trimmed === 'Request submitted' ||
    /^Staff action:\s*/i.test(trimmed) ||
    trimmed === 'Started work' ||
    trimmed === 'Resumed work' ||
    trimmed === 'Rejected' ||
    trimmed === 'Cancelled' ||
    trimmed === 'Customer approved proof' ||
    trimmed === ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE ||
    /^Proof-ready email sent/i.test(trimmed)
  );
}

function revisionEntryMillis(value: unknown): number {
  return assistedCreationTimestampMillis(value) ?? 0;
}

/**
 * History notes tied to a proof’s window (this proof → next proof).
 * Excludes boilerplate, proof-ready email noise, and the proof’s own `note`
 * (shown once via notesForProof).
 */
export function relatedNotesForProof(
  proof: AssistedCreationProof,
  proofs: AssistedCreationProof[],
  history: AssistedCreationRevisionEntry[] | undefined,
): string[] {
  const start = revisionEntryMillis(proof.createdAt);
  const index = proofs.findIndex((entry) => entry.id === proof.id);
  const next = index >= 0 ? proofs[index + 1] : undefined;
  const end = next ? revisionEntryMillis(next.createdAt) : Number.POSITIVE_INFINITY;
  const proofNote = proof.note?.trim() ?? '';
  return (history ?? [])
    .filter((entry) => {
      const at = revisionEntryMillis(entry.at);
      if (at < start || at >= end) {
        return false;
      }
      if (isAssistedCreationProofEmailSentEntry(entry)) {
        return false;
      }
      const note = entry.note?.trim() ?? '';
      if (!note || isBoilerplateHistoryNote(note)) {
        return false;
      }
      // Same text as proof.note is already the staff proof note — don't double-list.
      if (proofNote && note === proofNote) {
        return false;
      }
      return true;
    })
    .map((entry) => {
      const when = formatAssistedWhen(entry.at);
      const who = assistedHistoryRoleLabel(entry.byRole ?? 'system');
      const note = entry.note?.trim() ?? '';
      return `${who}${when ? ` · ${when}` : ''}: ${note}`;
    });
}

function noteBodyDedupeKey(formattedLine: string): string {
  const separator = formattedLine.indexOf(': ');
  const body = separator >= 0 ? formattedLine.slice(separator + 2) : formattedLine;
  return body.trim().toLowerCase();
}

/**
 * Single Notes list for a proof: staff proof note (if any) + linked history notes.
 * Dedupes by note body so proof.note is not listed twice when history repeats it.
 */
export function notesForProof(
  proof: AssistedCreationProof,
  proofs: AssistedCreationProof[],
  history: AssistedCreationRevisionEntry[] | undefined,
): string[] {
  const notes: string[] = [];
  const seenBodies = new Set<string>();
  const staffNote = proof.note?.trim() ?? '';
  if (staffNote) {
    seenBodies.add(staffNote.toLowerCase());
    const when = formatAssistedWhen(proof.createdAt);
    notes.push(`Fresh Prints${when ? ` · ${when}` : ''}: ${staffNote}`);
  }
  for (const line of relatedNotesForProof(proof, proofs, history)) {
    const key = noteBodyDedupeKey(line);
    if (seenBodies.has(key)) {
      continue;
    }
    seenBodies.add(key);
    notes.push(line);
  }
  return notes;
}

export function assistedHistoryRoleLabel(actor: AssistedCreationTransitionActor): string {
  switch (actor) {
    case 'customer':
      return 'You';
    case 'staff':
      return 'Fresh Prints';
    case 'system':
      return 'System';
    default:
      return 'System';
  }
}

export interface AssistedHistoryDisplayEntry {
  key: string;
  title: string;
  when: string;
  note: string | null;
  actor: AssistedCreationTransitionActor;
  roleLabel: string;
}

/** Chronological (oldest → newest) for chat-style history. */
export function buildAssistedHistoryEntries(
  revisionHistory: AssistedCreationRevisionEntry[] | undefined,
): AssistedHistoryDisplayEntry[] {
  if (!revisionHistory?.length) {
    return [];
  }
  const titles = buildAssistedCreationHistoryTitles(revisionHistory);
  return revisionHistory.map((entry, index) => {
    const note = entry.note?.trim() ?? '';
    const showNote = note.length > 0 && !isBoilerplateHistoryNote(note);
    const actor = entry.byRole ?? 'system';
    return {
      key: `${entry.toStatus}-${index}`,
      title: titles[index] ?? '',
      when: formatAssistedWhen(entry.at),
      note: showNote ? note : null,
      actor,
      roleLabel: assistedHistoryRoleLabel(actor),
    };
  });
}
