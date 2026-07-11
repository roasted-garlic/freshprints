export type AddDesignToRequestBranch =
  | { kind: 'create' }
  | { kind: 'single'; requestId: string }
  | { kind: 'pick' };

/**
 * Resolves how a browse-mode "Add to request" action should choose a target request.
 * Continuable = draft or editing print requests owned by the customer.
 */
export function resolveAddDesignToRequestBranch(
  continuableRequestIds: readonly string[],
): AddDesignToRequestBranch {
  if (continuableRequestIds.length === 0) {
    return { kind: 'create' };
  }

  if (continuableRequestIds.length === 1) {
    const requestId = continuableRequestIds[0];
    if (!requestId) {
      return { kind: 'create' };
    }

    return { kind: 'single', requestId };
  }

  return { kind: 'pick' };
}
