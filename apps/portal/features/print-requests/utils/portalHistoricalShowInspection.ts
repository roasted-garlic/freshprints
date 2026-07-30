import type { PortalAllocatableShow } from "@fresh-prints/shared/types/portal/listPortalAllocatableShows.types";

export function resolvePortalShowInspectionActivation(show: PortalAllocatableShow) {
  return {
    inspectedShowId: show.id,
    destinationShowId: show.isAllocatable === true ? show.id : null,
    clearSubmissionState: show.isAllocatable !== true,
  };
}

export function canSubmitPortalShowDestination(
  show: PortalAllocatableShow | null,
  fitAllowsSubmission: boolean,
): boolean {
  return show?.isAllocatable === true && fitAllowsSubmission;
}
