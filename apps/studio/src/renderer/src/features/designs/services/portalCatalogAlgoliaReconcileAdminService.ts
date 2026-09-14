import "./freshPrintsDevConsole.types";
import type {
  ReconcilePortalCatalogAlgoliaIndexRequest,
  ReconcilePortalCatalogAlgoliaIndexResponse,
} from "./freshPrintsDevConsole.types";
import { callTracedFunction } from "../../../config/tracedCallable";
import { firebaseConfig } from "../../../config/env";
import { isFirebaseDebugPanelEnabled } from "@fresh-prints/shared/utils/firebaseDebugPanelGate";
import {
  getStudioAlgoliaCatalogConfig,
  isStudioAlgoliaCatalogConfigured,
} from "./studioAlgoliaCatalogFlags";

export type {
  ReconcilePortalCatalogAlgoliaIndexRequest,
  ReconcilePortalCatalogAlgoliaIndexResponse,
} from "./freshPrintsDevConsole.types";

/** The reviewed production target for the owner/admin reconcile control. */
export const PORTAL_CATALOG_ALGOLIA_PRODUCTION_TARGET = {
  projectId: "fresh-prints-prod",
  appId: "Z1FVCM5QUX",
  indexName: "portal_catalog_ready_prod",
} as const;

export interface PortalCatalogAlgoliaReconcileTarget {
  projectId: string;
  appId: string;
  indexName: string;
  isProductionTarget: boolean;
  isSearchConfigured: boolean;
}

/**
 * Resolve the target identity from the Firebase/Algolia build inputs.
 * The production control is fail-closed unless all three reviewed identities match exactly.
 */
export function getPortalCatalogAlgoliaReconcileTarget(): PortalCatalogAlgoliaReconcileTarget {
  const projectId = typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId.trim() : "";
  const config = getStudioAlgoliaCatalogConfig();
  const appId = config?.appId ?? "";
  const indexName = config?.indexName ?? "";
  const reviewed = PORTAL_CATALOG_ALGOLIA_PRODUCTION_TARGET;

  return {
    projectId,
    appId,
    indexName,
    isProductionTarget:
      projectId === reviewed.projectId &&
      appId === reviewed.appId &&
      indexName === reviewed.indexName,
    isSearchConfigured: isStudioAlgoliaCatalogConfigured(),
  };
}

/**
 * Authenticated service for `reconcilePortalCatalogAlgoliaIndex`.
 * Uses the logged-in Studio Firebase Auth session (no pasted ID tokens).
 * Server enforces owner/admin + Secret Manager Algolia admin key. The optional DEV console bridge
 * below is separately gated and does not change this callable boundary.
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
