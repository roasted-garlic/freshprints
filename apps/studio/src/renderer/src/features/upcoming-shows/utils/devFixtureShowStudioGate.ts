import { isDevFixtureShowOperationAllowed } from "@fresh-prints/shared/utils/firebaseDevFixtureGate";

import { firebaseConfig } from "../../../config/env";

function getStudioFirebaseProjectId(): string {
  return typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
}

export function isDevFixtureShowOperationAllowedForStudio(): boolean {
  return isDevFixtureShowOperationAllowed({
    isDevelopmentBuild: import.meta.env.DEV,
    projectId: getStudioFirebaseProjectId(),
  });
}
