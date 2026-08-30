import { firebaseConfig } from "../../../config/env";
import { callTracedFunction } from "../../../config/tracedCallable";
import {
  ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE,
  resolveCatalogAutonomousLiveEnabled,
  resolveCatalogWorkflowMode,
  type CatalogWorkflowMode,
} from "@fresh-prints/shared/constants/catalogWorkflowMode.constants";

export { ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE };

export function resolveStudioFirebaseEnvironment(): {
  projectId: string;
  environmentLabel: "DEV" | "PRODUCTION";
  isProduction: boolean;
} {
  const projectId = firebaseConfig.projectId?.trim() || "unknown";
  const isProduction = projectId === "fresh-prints-prod";
  return {
    projectId,
    environmentLabel: isProduction ? "PRODUCTION" : "DEV",
    isProduction,
  };
}

export const catalogWorkflowModeService = {
  async updateMode(input: {
    catalogWorkflowMode: CatalogWorkflowMode;
    catalogAutonomousLiveEnabled?: boolean;
    confirmationPhrase?: string;
  }): Promise<{
    catalogWorkflowMode: CatalogWorkflowMode;
    catalogAutonomousLiveEnabled: boolean;
  }> {
    const response = await callTracedFunction<
      {
        catalogWorkflowMode: CatalogWorkflowMode;
        catalogAutonomousLiveEnabled?: boolean;
        confirmationPhrase?: string;
      },
      {
        catalogWorkflowMode: string;
        catalogAutonomousLiveEnabled: boolean;
      }
    >("updateCatalogWorkflowMode", {
      source: "catalogWorkflowModeService.updateMode",
    })(input);

    return {
      catalogWorkflowMode: resolveCatalogWorkflowMode(response.catalogWorkflowMode),
      catalogAutonomousLiveEnabled: resolveCatalogAutonomousLiveEnabled(
        response.catalogAutonomousLiveEnabled,
      ),
    };
  },
};
