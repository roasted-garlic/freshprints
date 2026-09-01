import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PortalPrintRequestListTab } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

interface ResolvePortalPrintRequestCardLabelInput {
  listTab: PortalPrintRequestListTab;
  requestStatus: PrintRequest['status'];
  progressLabel: string;
}

/** Working is a grouping; expose the restored editable lifecycle state on the request itself. */
export function resolvePortalPrintRequestCardLabel(
  input: ResolvePortalPrintRequestCardLabelInput,
): string {
  if (input.listTab === 'working' && input.requestStatus === 'editing') {
    return 'Editing';
  }

  return input.progressLabel;
}

