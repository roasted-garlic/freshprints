import { onCall } from "firebase-functions/v2/https";

import type { PortalMaintenancePublicState } from "../../packages/shared/src/constants/portal/portalMaintenance.constants";
import { loadPortalMaintenancePublicState } from "./lib/portalMaintenance";

/**
 * Public-safe runtime state. Callable responses are not cached by the Portal client or a CDN;
 * private audit fields never leave the trusted resolver.
 *
 * `invoker: "public"` is required for Gen2 callable CORS preflight (OPTIONS has no
 * Authorization header). Without allUsers run.invoker, Cloud Run returns 403 and
 * signed-out Portal clients fail closed into the maintenance wall.
 */
export const getPortalMaintenanceState = onCall(
  { invoker: "public" },
  async (request): Promise<PortalMaintenancePublicState> =>
    loadPortalMaintenancePublicState(request.auth?.uid),
);
