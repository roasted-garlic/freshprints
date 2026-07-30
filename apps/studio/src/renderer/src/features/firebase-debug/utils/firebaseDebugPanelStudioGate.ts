import { isFirebaseDebugPanelEnabled } from "@fresh-prints/shared/utils/firebaseDebugPanelGate";

import { firebaseConfig } from "../../../config/env";

function getStudioFirebaseProjectId(): string {
  return typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
}

export function isFirebaseDebugPanelEnabledForStudio(): boolean {
  return isFirebaseDebugPanelEnabled({
    isDevelopmentBuild: import.meta.env.DEV,
    projectId: getStudioFirebaseProjectId(),
  });
}
