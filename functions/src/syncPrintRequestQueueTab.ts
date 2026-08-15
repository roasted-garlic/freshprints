import { onCall } from "firebase-functions/v2/https";

import { loadCallerProfile } from "./lib/caller";
import { recomputeAndPersistQueueTab } from "./lib/printRequestQueueTab";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

/**
 * Staff-callable: force-sync `printRequests/{id}.queueTab` after Studio allocates to or
 * removes from a show / Internal Gangsheet so the Print Requests list updates promptly.
 */
export const syncPrintRequestQueueTab = onCall(async (request): Promise<{ queueTab: string | null }> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }

  const caller = await loadCallerProfile(request.auth.uid);
  if (caller.role !== "owner" && caller.role !== "admin" && caller.role !== "helper") {
    throw permissionDenied("Only Studio staff can sync print request queue tabs.");
  }

  const printRequestId =
    typeof request.data?.printRequestId === "string" ? request.data.printRequestId.trim() : "";
  if (!printRequestId) {
    throw invalidArgument("A print request ID is required.");
  }

  const queueTab = await recomputeAndPersistQueueTab(printRequestId);
  return { queueTab };
});
