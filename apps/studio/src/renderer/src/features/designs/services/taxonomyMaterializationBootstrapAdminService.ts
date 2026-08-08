import "./freshPrintsDevConsole.types";
import type { RebuildTaxonomyMaterializationResponse } from "./freshPrintsDevConsole.types";
import { callTracedFunction } from "../../../config/tracedCallable";
import { firebaseConfig } from "../../../config/env";
import { isFirebaseDebugPanelEnabled } from "@fresh-prints/shared/utils/firebaseDebugPanelGate";

export type { RebuildTaxonomyMaterializationResponse } from "./freshPrintsDevConsole.types";

/**
 * Development-only console bridge for the already-deployed
 * `rebuildTaxonomyMaterializationCallable` (taxonomy-read-spike-elimination bootstrap).
 *
 * Uses the logged-in Studio Firebase Auth session via `callTracedFunction` (no Admin SDK,
 * no custom tokens, no pasted ID tokens). Server enforces owner/admin.
 *
 * Client timeout 540s matches the Amendment 5 long-callable client pattern.
 */
export async function rebuildTaxonomyMaterialization(): Promise<RebuildTaxonomyMaterializationResponse> {
  return callTracedFunction<Record<string, never>, RebuildTaxonomyMaterializationResponse>(
    "rebuildTaxonomyMaterializationCallable",
    {
      source: "taxonomyMaterializationBootstrapAdminService.rebuildTaxonomyMaterialization",
      action: "Rebuild taxonomy materialization",
    },
    undefined,
    { timeout: 540_000 },
  )({});
}

function getStudioFirebaseProjectId(): string {
  return typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
}

export function isTaxonomyMaterializationBootstrapConsoleEnabled(): boolean {
  return isFirebaseDebugPanelEnabled({
    isDevelopmentBuild: import.meta.env.DEV,
    projectId: getStudioFirebaseProjectId(),
  });
}

export function installTaxonomyMaterializationBootstrapAdminConsole(): () => void {
  if (!isTaxonomyMaterializationBootstrapConsoleEnabled()) {
    return () => undefined;
  }
  window.freshPrintsDev = {
    ...window.freshPrintsDev,
    rebuildTaxonomyMaterialization,
  };
  return () => {
    if (window.freshPrintsDev) {
      delete window.freshPrintsDev.rebuildTaxonomyMaterialization;
    }
  };
}
