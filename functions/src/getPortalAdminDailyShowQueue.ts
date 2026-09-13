import { Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import type {
  GetPortalAdminDailyShowQueueRequest,
  PortalAdminDailyShowQueueResponse,
} from "../../packages/shared/src/types/portal/getPortalAdminDailyShowQueue.types";
import { getOperationalDayWindow, SHOW_QUEUE_OPERATIONAL_TIME_ZONE } from "../../packages/shared/src/utils/operationalDay";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { internal, invalidArgument, unauthenticated } from "./lib/errors";
import {
  assertPortalAdminQueueCaller,
  buildPortalAdminDailyShowQueueResponse,
} from "./lib/portalAdminDailyShowQueue";

const ALLOCATION_IN_CHUNK_SIZE = 30;
const REQUEST_GET_ALL_CHUNK_SIZE = 100;

function resolveProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ""
  );
}

function validateRequest(data: unknown): GetPortalAdminDailyShowQueueRequest {
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length !== 0) {
    throw invalidArgument("This action does not accept request parameters.");
  }
  return {};
}

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to load the Show Queue right now.");
}

export const getPortalAdminDailyShowQueue = onCall(
  async (request): Promise<PortalAdminDailyShowQueueResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      validateRequest(request.data);
      const caller = await loadCallerProfile(request.auth.uid);
      assertPortalAdminQueueCaller(caller);

      const now = new Date();
      const operationalDay = getOperationalDayWindow(now, SHOW_QUEUE_OPERATIONAL_TIME_ZONE);
      const showsSnapshot = await adminDb
        .collection("upcomingShows")
        .where("scheduledStartAt", ">=", Timestamp.fromMillis(operationalDay.startMs))
        .where("scheduledStartAt", "<", Timestamp.fromMillis(operationalDay.nextStartMs))
        .get();
      const showDocuments = showsSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }));
      const eligibleShowIds = showDocuments
        .filter((doc) => doc.data.source === "whatnot" || (doc.data.source === "dev_fixture" && resolveProjectId() === "fresh-prints-dev"))
        .map((doc) => doc.id);
      const allocationDocuments = [] as Array<{ id: string; data: Record<string, unknown> }>;
      for (let index = 0; index < eligibleShowIds.length; index += ALLOCATION_IN_CHUNK_SIZE) {
        const chunk = eligibleShowIds.slice(index, index + ALLOCATION_IN_CHUNK_SIZE);
        const snapshot = await adminDb.collection("showAllocations").where("upcomingShowId", "in", chunk).get();
        allocationDocuments.push(...snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> })));
      }

      const requestIds = [...new Set(allocationDocuments.map((doc) => doc.data.printRequestId).filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
      const requestMap = new Map<string, Record<string, unknown>>();
      for (let index = 0; index < requestIds.length; index += REQUEST_GET_ALL_CHUNK_SIZE) {
        const refs = requestIds
          .slice(index, index + REQUEST_GET_ALL_CHUNK_SIZE)
          .map((requestId) => adminDb.collection("printRequests").doc(requestId));
        const snapshots = await adminDb.getAll(...refs);
        snapshots.forEach((snapshot) => {
          if (snapshot.exists) {
            requestMap.set(snapshot.id, snapshot.data() as Record<string, unknown>);
          }
        });
      }

      return buildPortalAdminDailyShowQueueResponse({
        now,
        projectId: resolveProjectId(),
        shows: showDocuments,
        allocations: allocationDocuments,
        requests: requestMap,
      });
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export { validateRequest as validatePortalAdminDailyShowQueueRequest };
