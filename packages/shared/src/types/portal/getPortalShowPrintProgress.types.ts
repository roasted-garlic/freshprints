import type { ShowProductionStatus } from "../upcomingShow/upcomingShow.enums";

/** Customer-safe show print timer snapshot for a show linked to the caller's print request. */
export interface PortalShowPrintProgress {
  showId: string;
  productionStatus: ShowProductionStatus;
  accumulatedPrintMs: number;
  activePrintStartedAtMs: number | null;
  printPausedAtMs: number | null;
  printFinishedAtMs: number | null;
}

export interface GetPortalShowPrintProgressRequest {
  printRequestId: string;
}

export interface GetPortalShowPrintProgressResponse {
  shows: PortalShowPrintProgress[];
}
