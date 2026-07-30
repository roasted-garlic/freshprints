/**
 * Pure reconciliation for PortalPrintRequestItemCard's `saveDraft` success path (Plan Section
 * 21.1/21.4, Fix 1).
 *
 * Root cause this closes: on a successful save, the card previously trusted the LOCALLY TYPED
 * (requested) quantity for its own bookkeeping (`quantityInput`, `lastSavedSignatureRef`), never
 * the server's actual accepted value. When the server clamps an over-cap request down (e.g. 7 ->
 * 5), the field stayed stuck on the rejected `7` until a full remount reset the card's refs — the
 * corrected `item` prop arriving afterward was rejected as "stale" by `itemPropSyncGuard`, because
 * this same success path also unconditionally stamped `lastAcceptedUpdatedAtMsRef` with
 * `Date.now()` (newer than the corrected prop's real, older `updatedAt`).
 *
 * This function is the single decision point for what the card must do with the ACCEPTED value
 * (now threaded back from `usePrintRequestDetail.updateItem` through
 * `PrintRequestDetailView.handleUpdateItem` through the `onUpdate` prop) once a save succeeds:
 * apply it directly and synchronously to local state, so the correction never depends on the
 * async prop-sync effect for the card's OWN in-flight edit at all. The prop-sync effect/guard
 * remains untouched and still governs genuinely external changes (another tab, the drawer).
 */
export interface SavedDraftReconciliation {
  /** What `quantityInput` must become — only updated when it differs from the accepted value. */
  quantityInput: string;
  /** Signature to store in `lastSavedSignatureRef`, built from the ACCEPTED (not typed) value. */
  lastSavedSignature: string;
}

export function resolveSavedDraftReconciliation(params: {
  /** The server-accepted quantity, returned by `onUpdate` (threaded from the callable). */
  acceptedQuantity: number;
  /** The width/height actually sent in this save request (unaffected by the quantity clamp). */
  printWidthInches: number;
  printHeightInches: number;
  /** What the field currently shows, before reconciliation. */
  currentQuantityInput: string;
  buildSignature: (quantity: number, width: number, height: number) => string;
}): SavedDraftReconciliation {
  const {
    acceptedQuantity,
    printWidthInches,
    printHeightInches,
    currentQuantityInput,
    buildSignature,
  } = params;

  const acceptedQuantityInput = String(acceptedQuantity);

  return {
    quantityInput:
      currentQuantityInput === acceptedQuantityInput
        ? currentQuantityInput
        : acceptedQuantityInput,
    lastSavedSignature: buildSignature(acceptedQuantity, printWidthInches, printHeightInches),
  };
}
