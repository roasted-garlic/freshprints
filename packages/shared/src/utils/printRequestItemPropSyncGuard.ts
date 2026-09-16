/**
 * Pure decision for Print Request item-card prop-sync: whether an incoming `item` prop
 * (whose value signature differs from the last-saved one) represents a genuinely newer
 * external change that should overwrite local inputs.
 *
 * Guards against:
 * 1. Stale reload / out-of-order snapshot carrying an older `updatedAt` than this card already
 *    accepted (Portal Section 19 / live-sync follow-up).
 * 2. Remote snapshots applying while the user still has a pending local edit (dirty draft,
 *    debounce, or in-flight/queued save) — remote wins only on fields that are not dirty.
 */
export function shouldAcceptIncomingItemProp(params: {
  /** Signature built from the incoming prop's quantity/width/height. */
  incomingSignature: string;
  /** Signature this card last saved/accepted. */
  lastSavedSignature: string;
  /** `item.updatedAt` (ms) on the incoming prop, or null if unavailable (e.g. optimistic rows). */
  incomingUpdatedAtMs: number | null;
  /** Newest updatedAt (ms) this card has already accepted, or null if none recorded yet. */
  lastAcceptedUpdatedAtMs: number | null;
  /**
   * When true, local draft differs from last saved and/or a save is pending — hold remote apply
   * until the local edit settles (dirty-local / remote-elsewhere policy).
   */
  hasPendingLocalEdit?: boolean;
}): boolean {
  const {
    incomingSignature,
    lastSavedSignature,
    incomingUpdatedAtMs,
    lastAcceptedUpdatedAtMs,
    hasPendingLocalEdit = false,
  } = params;

  if (incomingSignature === lastSavedSignature) {
    return false;
  }

  if (hasPendingLocalEdit) {
    return false;
  }

  // Without a timestamp on either side, fall back to signature-only behavior when the local
  // draft is clean — there is no sound basis to reject by time.
  if (incomingUpdatedAtMs === null || lastAcceptedUpdatedAtMs === null) {
    return true;
  }

  return incomingUpdatedAtMs >= lastAcceptedUpdatedAtMs;
}
