import {
  formatAssistedCreationStatus,
  type AssistedCreationStatus,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationRevisionEntry } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

export function formatAssistedWhen(value: unknown): string {
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
    trimmed === 'Customer approved proof'
  );
}

export interface AssistedHistoryDisplayEntry {
  key: string;
  title: string;
  when: string;
  note: string | null;
}

export function buildAssistedHistoryEntries(
  revisionHistory: AssistedCreationRevisionEntry[] | undefined,
): AssistedHistoryDisplayEntry[] {
  if (!revisionHistory?.length) {
    return [];
  }
  return revisionHistory
    .slice()
    .reverse()
    .map((entry, index) => {
      const note = entry.note?.trim() ?? '';
      const showNote = note.length > 0 && !isBoilerplateHistoryNote(note);
      const isCustomerUpdate =
        entry.fromStatus === entry.toStatus &&
        entry.toStatus === 'submitted' &&
        /^Customer updated request/i.test(note);
      return {
        key: `${entry.toStatus}-${index}`,
        title: isCustomerUpdate ? 'Updated' : formatAssistedCreationStatus(entry.toStatus),
        when: formatAssistedWhen(entry.at),
        note: showNote ? note : null,
      };
    });
}
