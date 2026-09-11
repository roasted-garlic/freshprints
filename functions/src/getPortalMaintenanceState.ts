import { onCall } from "firebase-functions/v2/https";

import type { PortalMaintenancePublicState } from "../../packages/shared/src/constants/portal/portalMaintenance.constants";
import { loadPortalMaintenancePublicState } from "./lib/portalMaintenance";

/**
 * Public-safe runtime state. Callable responses are not cached by the Portal client or a CDN;
 * private audit fields never leave the trusted resolver.
 */
export const getPortalMaintenanceState = onCall(
  async (request): Promise<PortalMaintenancePublicState> =>
    loadPortalMaintenancePublicState(request.auth?.uid),
);
