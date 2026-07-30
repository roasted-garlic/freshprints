/**
 * Pure reconciliation for a quantity edit's server response (Plan Section 20.2/20.4, Fix 2).
 *
 * Two distinct defects this closes:
 * 1. The client optimistically computed and committed its OWN clamped quantity, then discarded
 *    the server's actual accepted (authoritative, transaction-clamped) quantity entirely. The
 *    server can legitimately accept a different value than the client's optimistic guess (e.g.
 *    the client's `otherItemsPrintCount` was briefly stale). The UI's final value must always be
 *    the server-returned value, never the client's pre-flight guess.
 * 2. A `currentItem` lookup miss (item not found in current state at edit time) silently
 *    defaulted to the literal `1` — a real, submittable quantity guessed with no basis. A lookup
 *    miss must surface as an explicit failure instead.
 */

export type ResolveCurrentQuantityResult =
  | { ok: true; currentQuantity: number }
  | { ok: false; reason: 'item-not-found' };

/**
 * Resolve the "current quantity" an edit is based on. Replaces the old
 * `currentItem && Number.isFinite(currentItem.quantity) ? currentItem.quantity : 1` fallback,
 * which silently guessed `1` on a lookup miss or a non-finite quantity.
 */
export function resolveCurrentQuantityForEdit(
  currentItem: { quantity: number } | undefined,
): ResolveCurrentQuantityResult {
  if (!currentItem || !Number.isFinite(currentItem.quantity)) {
    return { ok: false, reason: 'item-not-found' };
  }
  return { ok: true, currentQuantity: currentItem.quantity };
}

/**
 * Given the server's authoritative response to a quantity-update callable, resolve the quantity
 * that must be committed to local/shared state. The server's returned `quantity` always wins —
 * this function exists so the "commit the server value, not the optimistic client value" rule is
 * a single, directly-testable decision point rather than inline logic duplicated at each call
 * site (this hook previously had two near-identical, independently-buggy copies of this logic).
 */
export function resolveServerAuthoritativeQuantity(serverResponse: { quantity: number }): number {
  return serverResponse.quantity;
}
