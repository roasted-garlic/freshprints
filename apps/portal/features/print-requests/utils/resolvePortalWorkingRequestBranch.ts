import { resolveAddDesignToRequestBranch } from "./resolveAddDesignToRequestBranch";

export type PortalWorkingRequestBranch =
  | { kind: "create" }
  | { kind: "single"; requestId: string }
  | { kind: "pick" }
  /** Multiple active editables with no unique Editing owner — do not open a picker. */
  | { kind: "conflict" };

/**
 * Resolves which Portal active-editable request mutations should target.
 *
 * Callers must pass **active editable** ids only (exclude parked drafts).
 * When an Editing request is uniquely present among actives, always target it
 * (no "Add to which request?" picker under the parking contract).
 */
export function resolvePortalWorkingRequestBranch(input: {
  activeEditableRequestIds: string[];
  /** Optional statuses keyed by request id for Editing preference. */
  activeEditableStatusesById?: Record<string, string>;
  pendingWorkingRequestId: string | null;
  selectedWorkingRequestId: string | null;
}): PortalWorkingRequestBranch {
  const knownIds =
    input.activeEditableRequestIds.length > 0
      ? input.activeEditableRequestIds
      : input.pendingWorkingRequestId
        ? [input.pendingWorkingRequestId]
        : [];

  if (
    input.selectedWorkingRequestId &&
    knownIds.includes(input.selectedWorkingRequestId)
  ) {
    return { kind: "single", requestId: input.selectedWorkingRequestId };
  }

  if (knownIds.length > 1 && input.activeEditableStatusesById) {
    const editingIds = knownIds.filter(
      (id) => input.activeEditableStatusesById?.[id] === "editing",
    );
    if (editingIds.length === 1 && editingIds[0]) {
      return { kind: "single", requestId: editingIds[0] };
    }
    if (editingIds.length > 1) {
      return { kind: "conflict" };
    }
  }

  const branch = resolveAddDesignToRequestBranch(knownIds);
  if (branch.kind === "pick") {
    // Under parking, multiple actives without a unique Editing owner is an invariant breach —
    // fail closed instead of asking the customer to choose a parked/corrupt pair.
    return { kind: "conflict" };
  }
  return branch;
}
