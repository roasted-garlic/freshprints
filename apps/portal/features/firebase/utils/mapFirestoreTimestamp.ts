import type { Timestamp } from 'firebase/firestore';

export function mapFirestoreTimestamp(value: unknown): Timestamp | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as Timestamp).toDate === 'function'
  ) {
    return value as Timestamp;
  }

  return undefined;
}
