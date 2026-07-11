import type { PortalPrintRequestListTab } from "./portalPrintRequestListTabs";

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
