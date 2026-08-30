import { resolveAddDesignToRequestBranch } from "./resolveAddDesignToRequestBranch";

export type PortalWorkingRequestBranch =
  | { kind: "create" }
  | { kind: "single"; requestId: string }
  | { kind: "pick" };

/**
 * Resolves which Portal-editable working request mutations should target.
 * When the customer has explicitly selected a request, all controls use that id.
 */
export function resolvePortalWorkingRequestBranch(input: {
  portalEditableRequestIds: string[];
  pendingWorkingRequestId: string | null;
  selectedWorkingRequestId: string | null;
}): PortalWorkingRequestBranch {
  const knownIds =
    input.portalEditableRequestIds.length > 0
      ? input.portalEditableRequestIds
      : input.pendingWorkingRequestId
        ? [input.pendingWorkingRequestId]
        : [];

  if (
    input.selectedWorkingRequestId &&
    knownIds.includes(input.selectedWorkingRequestId)
  ) {
    return { kind: "single", requestId: input.selectedWorkingRequestId };
  }

  return resolveAddDesignToRequestBranch(knownIds);
}
