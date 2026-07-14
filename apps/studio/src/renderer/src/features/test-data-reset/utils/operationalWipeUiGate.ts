import {
  OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS,
  isOperationalWipeAllowedProjectId,
} from "@fresh-prints/shared/types/admin/wipeOperationalTestData.types";

import { firebaseConfig } from "../../../config/env";

export function getStudioFirebaseProjectId(): string {
  return typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
}

export function isOperationalWipeUiEnabled(): boolean {
  // Production Studio builds must not expose wipe UI even if pointed at fresh-prints-dev.
  // Server still enforces project allowlist + owner role as a hard backstop.
  return import.meta.env.DEV && isOperationalWipeAllowedProjectId(getStudioFirebaseProjectId());
}

export { OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS };
