import { callTracedFunction } from "../../../config/tracedCallable";
// The `Window.freshPrintsDev` global type is declared once, centrally, in
// `freshPrintsDevConsole.types.ts` and augmented there as new dev-only console methods are added —
// TypeScript's `declare global` requires every declaration of the same interface across files to
// be structurally identical, so a single source of truth avoids that conflict entirely.
import "./freshPrintsDevConsole.types";

export interface CatalogSnapshotPublicationResult {
  reference: { contentVersion: string; generation: number };
  portal: { contentVersion: string; generation: number };
}

export async function rebuildCatalogSnapshots(): Promise<CatalogSnapshotPublicationResult> {
  return callTracedFunction<Record<string, never>, CatalogSnapshotPublicationResult>(
    "rebuildCatalogSnapshots",
    {
      source: "catalogSnapshotAdminService.rebuildCatalogSnapshots",
      action: "Rebuild catalog snapshots",
    },
  )({});
}

export function installCatalogSnapshotAdminConsole(): () => void {
  if (!import.meta.env.DEV) return () => undefined;
  window.freshPrintsDev = { ...window.freshPrintsDev, rebuildCatalogSnapshots };
  return () => {
    if (window.freshPrintsDev) {
      delete window.freshPrintsDev.rebuildCatalogSnapshots;
    }
  };
}
