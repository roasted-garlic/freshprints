import { onCall } from "firebase-functions/v2/https";

import type { ApplyShowQueueDefaultMaxToEligibleShowsResponse } from "../../packages/shared/src/types/upcomingShow/applyShowQueueDefaultMax.types";

import { adminDb } from "./lib/admin";
import {
  applyShowQueueDefaultMaxToEligibleShowsCore,
  parseApplyShowQueueDefaultMaxRequest,
} from "./lib/applyShowQueueDefaultMaxToEligibleShowsCore";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { permissionDenied, unauthenticated } from "./lib/errors";

export const applyShowQueueDefaultMaxToEligibleShows = onCall(
  async (request): Promise<ApplyShowQueueDefaultMaxToEligibleShowsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    if (caller.role !== "owner" && caller.role !== "admin") {
      throw permissionDenied("Only owners and admins can manage Show Queue settings.");
    }

    const parsed = parseApplyShowQueueDefaultMaxRequest(request.data);

    return applyShowQueueDefaultMaxToEligibleShowsCore({
      db: adminDb,
      callerUid: request.auth.uid,
      defaultMaxTotalQuantity: parsed.defaultMaxTotalQuantity,
    });
  },
);
