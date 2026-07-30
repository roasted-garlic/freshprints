/**
 * Pure decision for PortalPrintRequestItemCard's prop-sync effect: whether an incoming
 * `item` prop (whose value signature differs from the last-saved one) represents a genuinely
 * newer external change, or a stale reload artifact that must NOT overwrite an
 * already-committed local save.
 *
 * Extracted as a pure/directly-testable function (mirrors itemMutationGeneration.ts's pattern)
 * rather than inline in the component, so the exact race this amendment fixes — a signature
 * mismatch alone is not sufficient proof of "newer" — has real behavior-level test coverage
 * instead of only a source-presence check (Plan Section 19.2 item 2 / 19.6).
 *
 * Root cause this guards against (Plan Section 19.1, second contributing cause): a component-
 * level reload elsewhere in the app (e.g. CurrentRequestDrawer's own reloadWorkingItems calls,
 * which are out of scope to remove) can still deliver a stale pre-save `item` prop to a mounted
 * PortalPrintRequestItemCard after this card already accepted a newer value. Both the stale prop
 * and a genuine newer edit produce a signature that differs from `lastSavedSignatureRef` — so
 * signature alone cannot distinguish them. Comparing against a monotonic "last accepted"
 * timestamp can.
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
}): boolean {
  const { incomingSignature, lastSavedSignature, incomingUpdatedAtMs, lastAcceptedUpdatedAtMs } =
    params;

  if (incomingSignature === lastSavedSignature) {
    // Nothing changed — accepting or rejecting is a no-op either way, but this mirrors the
    // pre-fix early-return so the ref bookkeeping above it is untouched in that case.
    return false;
  }

  // Without a timestamp on either side, fall back to the pre-fix signature-only behavior —
  // there is no sound basis to reject to compare against.
  if (incomingUpdatedAtMs === null || lastAcceptedUpdatedAtMs === null) {
    return true;
  }

  // A prop whose updatedAt is older than the newest one this card already accepted is a stale
  // reload artifact (or an out-of-order race), not a genuine newer external change — reject it.
  return incomingUpdatedAtMs >= lastAcceptedUpdatedAtMs;
}
