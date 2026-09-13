import { onCall } from "firebase-functions/v2/https";

import {
  parsePortalMaintenanceSettingsInput,
  type PortalMaintenanceSettings,
} from "../../packages/shared/src/constants/portal/portalMaintenance.constants";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { savePortalMaintenanceState } from "./lib/portalMaintenance";

/** Owner/admin runtime brake control. Helpers and customers never reach the write. */
export const updatePortalMaintenanceState = onCall(
  async (request): Promise<PortalMaintenanceSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
      throw permissionDenied("Only active owners and admins can update Portal maintenance mode.");
    }

    const parsed = parsePortalMaintenanceSettingsInput(request.data);
    if (!parsed) {
      throw invalidArgument(
        "Maintenance mode requires a boolean enabled value and valid heading/message.",
      );
    }

    return savePortalMaintenanceState(parsed, request.auth.uid);
  },
);
