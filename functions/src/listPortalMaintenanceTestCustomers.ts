import { onCall } from "firebase-functions/v2/https";

import type { PortalMaintenanceTestCustomerOption } from "../../packages/shared/src/constants/portal/portalMaintenance.constants";
import { listActiveLinkedMaintenanceTestCustomers } from "./lib/portalMaintenance";
import { loadCallerProfile } from "./lib/caller";
import { permissionDenied, unauthenticated } from "./lib/errors";

/** Owner/admin-only read of safe, currently eligible maintenance tester options. */
export const listPortalMaintenanceTestCustomers = onCall(
  async (request): Promise<PortalMaintenanceTestCustomerOption[]> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
      throw permissionDenied("Only active owners and admins can list maintenance test customers.");
    }

    return listActiveLinkedMaintenanceTestCustomers();
  },
);
