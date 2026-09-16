import { onCall } from "firebase-functions/v2/https";

import {
  parsePortalDevCustomerAccessSettingsInput,
  type PortalDevCustomerAccessSettings,
} from "../../packages/shared/src/constants/portal/portalDevCustomerAccess.constants";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { savePortalDevCustomerAccessSettings } from "./lib/portalDevCustomerAccess";

/** Owner/admin write of DEV customer email allowlist. Helpers never reach this. */
export const updatePortalDevCustomerAccessSettings = onCall(
  async (request): Promise<PortalDevCustomerAccessSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
      throw permissionDenied(
        "Only active owners and admins can update Portal DEV customer access settings.",
      );
    }

    const parsed = parsePortalDevCustomerAccessSettingsInput(request.data);
    if (!parsed) {
      throw invalidArgument(
        "DEV customer access requires an approvedEmails array of valid email strings.",
      );
    }

    return savePortalDevCustomerAccessSettings(parsed, request.auth.uid);
  },
);
