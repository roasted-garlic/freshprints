import {
  DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  resolvePortalQueueCutoffHours,
} from "../../../packages/shared/src/utils/showQueueCutoff";

import { adminDb } from "./admin";

/** Reads Portal queue cutoff hours from `settings/showQueue` (default 5). */
export async function loadPortalQueueCutoffHours(): Promise<number> {
  try {
    const snap = await adminDb.collection("settings").doc("showQueue").get();
    if (!snap.exists) {
      return DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START;
    }
    return resolvePortalQueueCutoffHours(snap.data()?.portalQueueCutoffHoursBeforeStart);
  } catch {
    return DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START;
  }
}
