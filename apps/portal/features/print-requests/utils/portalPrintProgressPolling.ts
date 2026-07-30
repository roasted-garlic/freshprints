import type { ShowProductionStatus } from '@fresh-prints/shared/types/upcomingShow/upcomingShow.enums';

export const PORTAL_PRINT_PROGRESS_BASE_POLL_MS = 5_000;
export const PORTAL_PRINT_PROGRESS_MAX_POLL_MS = 10_000;

export function shouldPollPortalPrintProgress(options: {
  enabled: boolean;
  isDocumentVisible: boolean;
  printRequestId?: string;
  productionStatus?: ShowProductionStatus;
}): boolean {
  return Boolean(
    options.enabled &&
      options.isDocumentVisible &&
      options.printRequestId &&
      options.productionStatus !== 'completed' &&
      options.productionStatus !== 'fully_printed',
  );
}

export function portalPrintProgressPollDelay(unchangedPolls: number): number {
  return Math.min(
    PORTAL_PRINT_PROGRESS_BASE_POLL_MS * 2 ** Math.min(Math.max(unchangedPolls, 0), 1),
    PORTAL_PRINT_PROGRESS_MAX_POLL_MS,
  );
}
