import { onCall } from "firebase-functions/v2/https";

import type { PortalDevCustomerAccessSettings } from "../../packages/shared/src/constants/portal/portalDevCustomerAccess.constants";
import { loadCallerProfile } from "./lib/caller";
import { permissionDenied, unauthenticated } from "./lib/errors";
import { loadPortalDevCustomerAccessSettings } from "./lib/portalDevCustomerAccess";

/** Owner/admin read of DEV customer email allowlist settings. */
export const getPortalDevCustomerAccessSettings = onCall(
  async (request): Promise<PortalDevCustomerAccessSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
      throw permissionDenied(
        "Only active owners and admins can view Portal DEV customer access settings.",
      );
    }

    return loadPortalDevCustomerAccessSettings();
  },
);
