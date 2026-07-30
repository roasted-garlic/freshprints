import type {
  BackfillPrintRequestQueueTabRequest,
  BackfillPrintRequestQueueTabResponse,
} from "@fresh-prints/shared/types/admin/backfillPrintRequestQueueTab.types";

import "../../designs/services/freshPrintsDevConsole.types";
import { callTracedFunction } from "../../../config/tracedCallable";
import { firebaseConfig } from "../../../config/env";
import { isFirebaseDebugPanelEnabled } from "@fresh-prints/shared/utils/firebaseDebugPanelGate";

/**
 * Development-only console bridge for the already-deployed `backfillPrintRequestQueueTab`
 * callable (Wave C hydration remediation, 2026-07-25) — mirrors
 * `catalogSnapshotAdminService.rebuildCatalogSnapshots`'s exact pattern: the callable runs through
 * the authenticated Studio Firebase client, so the current owner's Firebase Auth ID token is
 * attached automatically by the SDK. No ADC file, no Firebase CLI token extraction, no raw token
 * handling here — this only ever forwards a typed payload through `httpsCallable`. All
 * authorization (owner role, `fresh-prints-dev`-only, confirmation phrase, dry-run behavior,
 * production block) is enforced server-side by the deployed Function, unchanged by this bridge.
 */
export async function backfillPrintRequestQueueTab(
  payload: BackfillPrintRequestQueueTabRequest,
): Promise<BackfillPrintRequestQueueTabResponse> {
  return callTracedFunction<BackfillPrintRequestQueueTabRequest, BackfillPrintRequestQueueTabResponse>(
    "backfillPrintRequestQueueTab",
    {
      source: "printRequestQueueTabBackfillAdminService.backfillPrintRequestQueueTab",
      action: "Backfill print request queueTab",
    },
  )(payload);
}

function getStudioFirebaseProjectId(): string {
  return typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
}

/**
 * Reuses the same development-only + `fresh-prints-dev`-only gate already established for the
 * Firebase Debug panel (`firebaseDebugPanelGate.ts`) rather than inventing a second gate — same
 * security boundary, same allowed-project allowlist, unavailable in packaged/production builds.
 */
export function isPrintRequestQueueTabBackfillConsoleEnabled(): boolean {
  return isFirebaseDebugPanelEnabled({
    isDevelopmentBuild: import.meta.env.DEV,
    projectId: getStudioFirebaseProjectId(),
  });
}

export function installPrintRequestQueueTabBackfillAdminConsole(): () => void {
  if (!isPrintRequestQueueTabBackfillConsoleEnabled()) {
    return () => undefined;
  }
  window.freshPrintsDev = {
    ...window.freshPrintsDev,
    backfillPrintRequestQueueTab,
  };
  return () => {
    if (window.freshPrintsDev) {
      delete window.freshPrintsDev.backfillPrintRequestQueueTab;
    }
  };
}
