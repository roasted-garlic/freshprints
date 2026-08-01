import type { PortalShowPrintProgress } from '@fresh-prints/shared/types/portal/getPortalShowPrintProgress.types';

export function buildPortalShowPrintProgressSignature(shows: PortalShowPrintProgress[]): string {
  return JSON.stringify(
    shows.map((show) => [
      show.showId,
      show.productionStatus,
      show.accumulatedPrintMs,
      show.activePrintStartedAtMs,
      show.printPausedAtMs,
      show.scheduledStartAt,
    ]),
  );
}
