import type { EvaluatePortalPrintRequestUnqueueResult } from '@fresh-prints/shared/utils/portalPrintRequestUnqueue';
import type { PortalPrintRequestListTab } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

export function resolveCanShowUnqueueFromShowCta(input: {
  isEditable: boolean;
  unqueueEligibility: Pick<EvaluatePortalPrintRequestUnqueueResult, 'eligible'>;
  hasPrimaryScheduledShow: boolean;
}): boolean {
  return (
    !input.isEditable && input.unqueueEligibility.eligible && input.hasPrimaryScheduledShow
  );
}

/**
 * Auto-heal only for truly stuck `active` requests with no show linkage left.
 * Must not run right after queue (or whenever schedules/allocations still exist),
 * or the optional-show-id heal path surfaces "Show id is required."
 */
export function resolveStuckActiveNeedsEditingHeal(input: {
  isEditable: boolean;
  requestStatus: string | undefined;
  listTab: PortalPrintRequestListTab;
  isPortalCustomerOrigin: boolean;
  hasOtherPortalEditableContinuableRequest: boolean;
  hasScheduledShows: boolean;
  hasActiveAllocations: boolean;
}): boolean {
  return (
    !input.isEditable &&
    input.requestStatus === 'active' &&
    input.listTab === 'working' &&
    input.isPortalCustomerOrigin &&
    !input.hasOtherPortalEditableContinuableRequest &&
    !input.hasScheduledShows &&
    !input.hasActiveAllocations
  );
}
