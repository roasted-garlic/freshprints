import type { PortalPrintRequestListTab } from "./portalPrintRequestListTabs";
import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";

export type PortalPrintProgressStage = "queued" | "printing" | "done";

/**
 * Maps the portal list tab to the 3-step customer progress rail.
 * Working requests have no rail (still building the request).
 */
export function resolvePortalPrintProgressStage(
  tab: PortalPrintRequestListTab,
): PortalPrintProgressStage | null {
  switch (tab) {
    case "queued":
      return "queued";
    case "printing":
      return "printing";
    case "printed":
      return "done";
    case "working":
      return null;
  }
}

export function getPortalPrintProgressStageLabel(stage: PortalPrintProgressStage): string {
  switch (stage) {
    case "queued":
      return "Queued";
    case "printing":
      return "Printing";
    case "done":
      return "Done";
  }
}

const STAGE_RANK: Record<PortalPrintProgressStage, number> = {
  queued: 0,
  printing: 1,
  done: 2,
};

export function resolveLiveShowProgressStage(
  productionStatus: ShowProductionStatus | undefined,
): PortalPrintProgressStage | null {
  if (productionStatus === "completed" || productionStatus === "fully_printed") return "done";
  if (productionStatus === "printing") return "printing";
  return null;
}

/** Per-request monotonic watermark: lagging persisted/live payloads cannot regress progress. */
export function advancePortalPrintProgressStage(
  previous: PortalPrintProgressStage | null,
  persisted: PortalPrintProgressStage | null,
  liveProductionStatus?: ShowProductionStatus,
): PortalPrintProgressStage | null {
  const candidates = [
    previous,
    persisted,
    resolveLiveShowProgressStage(liveProductionStatus),
  ].filter((stage): stage is PortalPrintProgressStage => stage !== null);
  return candidates.reduce<PortalPrintProgressStage | null>(
    (highest, stage) => !highest || STAGE_RANK[stage] > STAGE_RANK[highest] ? stage : highest,
    null,
  );
}

export function resolvePortalMountedProgressAuthority(
  previous: PortalPrintProgressStage | null,
  persisted: PortalPrintProgressStage | null,
  liveProductionStatus?: ShowProductionStatus | null,
): { stage: PortalPrintProgressStage | null; pollingEnabled: boolean } {
  const stage = advancePortalPrintProgressStage(
    previous,
    persisted,
    liveProductionStatus ?? undefined,
  );
  return { stage, pollingEnabled: stage !== null && stage !== "done" };
}
