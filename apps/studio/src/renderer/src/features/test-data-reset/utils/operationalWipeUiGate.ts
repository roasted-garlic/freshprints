import {
  OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS,
  isOperationalWipeAllowedProjectId,
} from "@fresh-prints/shared/types/admin/wipeOperationalTestData.types";

import { firebaseConfig } from "../../../config/env";

export function getStudioFirebaseProjectId(): string {
  return typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
}

export function isOperationalWipeUiEnabled(): boolean {
  return isOperationalWipeAllowedProjectId(getStudioFirebaseProjectId());
}

export { OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS };
