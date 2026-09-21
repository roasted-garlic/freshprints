export interface StaffInboxPageReconciliationState<T> {
  records: Map<string, T>;
  windowDocumentIds: Set<string>;
  hasMore: boolean;
  revision: number;
}

/**
 * Reconciles a bounded live page without losing records that were already
 * reached before a newer insert shifted the page window.
 */
export function reconcileStaffInboxPage<T>(
  state: StaffInboxPageReconciliationState<T>,
  nextWindowRecords: ReadonlyMap<string, T>,
  nextWindowDocumentIds: ReadonlySet<string>,
  hasMore: boolean,
): string[] {
  const evictedDocumentIds = [...state.records.keys()].filter(
    (documentId) => !nextWindowDocumentIds.has(documentId),
  );

  for (const documentId of nextWindowDocumentIds) {
    if (!nextWindowRecords.has(documentId)) {
      state.records.delete(documentId);
    }
  }

  for (const [documentId, record] of nextWindowRecords) {
    state.records.set(documentId, record);
  }

  state.windowDocumentIds = new Set(nextWindowDocumentIds);
  state.hasMore = hasMore;
  state.revision += 1;

  return evictedDocumentIds;
}

/**
 * Applies the bounded source lookup for rows that left a live page window.
 * Existing rows are refreshed; missing or filter-excluded rows are removed.
 */
export function applyStaffInboxPageVerification<T>(
  state: StaffInboxPageReconciliationState<T>,
  documentIds: readonly string[],
  verifiedRecords: ReadonlyMap<string, T>,
): void {
  for (const documentId of documentIds) {
    const verifiedRecord = verifiedRecords.get(documentId);
    if (verifiedRecord) {
      state.records.set(documentId, verifiedRecord);
    } else {
      state.records.delete(documentId);
    }
  }
}
