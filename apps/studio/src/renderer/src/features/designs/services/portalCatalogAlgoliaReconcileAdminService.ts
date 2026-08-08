import "./freshPrintsDevConsole.types";
import type {
  ReconcilePortalCatalogAlgoliaIndexRequest,
  ReconcilePortalCatalogAlgoliaIndexResponse,
} from "./freshPrintsDevConsole.types";
import { callTracedFunction } from "../../../config/tracedCallable";
import { firebaseConfig } from "../../../config/env";
import { isFirebaseDebugPanelEnabled } from "@fresh-prints/shared/utils/firebaseDebugPanelGate";

export type {
  ReconcilePortalCatalogAlgoliaIndexRequest,
  ReconcilePortalCatalogAlgoliaIndexResponse,
} from "./freshPrintsDevConsole.types";

/**
 * Development-only console bridge for `reconcilePortalCatalogAlgoliaIndex`.
 * Uses the logged-in Studio Firebase Auth session (no pasted ID tokens).
 * Server enforces owner/admin + Secret Manager Algolia admin key.
 *
 * Client timeout 540s matches the Function `timeoutSeconds` (Amendment 5 pattern).
 */
export async function reconcilePortalCatalogAlgoliaIndex(
  payload: ReconcilePortalCatalogAlgoliaIndexRequest = {},
): Promise<ReconcilePortalCatalogAlgoliaIndexResponse> {
  return callTracedFunction<
    ReconcilePortalCatalogAlgoliaIndexRequest,
    ReconcilePortalCatalogAlgoliaIndexResponse
  >(
    "reconcilePortalCatalogAlgoliaIndex",
    {
      source: "portalCatalogAlgoliaReconcileAdminService.reconcilePortalCatalogAlgoliaIndex",
      action: "Reconcile portal catalog Algolia index",
    },
    undefined,
    { timeout: 540_000 },
  )(payload);
}

function getStudioFirebaseProjectId(): string {
  return typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
}

export function isPortalCatalogAlgoliaReconcileConsoleEnabled(): boolean {
  return isFirebaseDebugPanelEnabled({
    isDevelopmentBuild: import.meta.env.DEV,
    projectId: getStudioFirebaseProjectId(),
  });
}

export function installPortalCatalogAlgoliaReconcileAdminConsole(): () => void {
  if (!isPortalCatalogAlgoliaReconcileConsoleEnabled()) {
    return () => undefined;
  }
  window.freshPrintsDev = {
    ...window.freshPrintsDev,
    reconcilePortalCatalogAlgoliaIndex,
  };
  return () => {
    if (window.freshPrintsDev) {
      delete window.freshPrintsDev.reconcilePortalCatalogAlgoliaIndex;
    }
  };
}
