import { randomBytes } from "node:crypto";

import { onCall } from "firebase-functions/v2/https";

import { resolveGangSheetSectionPricingFromSettings } from "../../packages/shared/src/constants/gangSheetSectionPricingSettings.constants";
import type { PortalAdminUpcomingShowQueueDashboardResponse } from "../../packages/shared/src/types/portal/getPortalAdminUpcomingShowQueueDashboard.types";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { internal, unauthenticated } from "./lib/errors";
import {
  assertPortalAdminQueueCaller,
  buildPortalAdminUpcomingShowQueueDashboard,
  type PortalAdminQueueDocument,
  validatePortalAdminUpcomingShowQueueDashboardRequest,
} from "./lib/portalAdminUpcomingShowQueueDashboard";

const REQUEST_GET_ALL_CHUNK_SIZE = 100;
const PRINT_REQUEST_ITEM_REQUEST_ID_CHUNK_SIZE = 30;

function resolveProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ""
  );
}

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to load the Show Queue dashboard right now.");
}

export const getPortalAdminUpcomingShowQueueDashboard = onCall(
  async (request): Promise<PortalAdminUpcomingShowQueueDashboardResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const input = validatePortalAdminUpcomingShowQueueDashboardRequest(request.data);
      const caller = await loadCallerProfile(request.auth.uid);
      assertPortalAdminQueueCaller(caller);

      const now = new Date();
      const customerGroupKeySalt = randomBytes(16).toString("hex");
      const pricingSettingsSnapshot = await adminDb.collection("settings").doc("showQueue").get();
      const pricing = resolveGangSheetSectionPricingFromSettings(pricingSettingsSnapshot.data() ?? {});
      const showsSnapshot = await adminDb.collection("upcomingShows").get();
      const showDocuments = showsSnapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data() as Record<string, unknown>,
      }));

      const provisional = buildPortalAdminUpcomingShowQueueDashboard({
        now,
        projectId: resolveProjectId(),
        requestedShowId: input.showId,
        shows: showDocuments,
        selectedShowAllocations: [],
        requests: new Map(),
        customerGroupKeySalt,
        pricing,
      });

      const selectedShowId = provisional.selectedShowId;
      let selectedShowAllocations: Array<{ id: string; data: Record<string, unknown> }> = [];
      const requestMap = new Map<string, Record<string, unknown>>();
      const customerMap = new Map<string, Record<string, unknown>>();
      const requestItems = new Map<string, PortalAdminQueueDocument[]>();

      if (selectedShowId) {
        const allocationsSnapshot = await adminDb
          .collection("showAllocations")
          .where("upcomingShowId", "==", selectedShowId)
          .get();
        selectedShowAllocations = allocationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data() as Record<string, unknown>,
        }));

        const requestIds = [
          ...new Set(
            selectedShowAllocations
              .map((doc) => doc.data.printRequestId)
              .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
          ),
        ];
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

        for (
          let index = 0;
          index < requestIds.length;
          index += PRINT_REQUEST_ITEM_REQUEST_ID_CHUNK_SIZE
        ) {
          const requestIdChunk = requestIds.slice(index, index + PRINT_REQUEST_ITEM_REQUEST_ID_CHUNK_SIZE);
          const itemSnapshot = await adminDb
            .collection("printRequestItems")
            .where("printRequestId", "in", requestIdChunk)
            .get();
          itemSnapshot.docs.forEach((snapshot) => {
            const data = snapshot.data() as Record<string, unknown>;
            const printRequestId = typeof data.printRequestId === "string" ? data.printRequestId.trim() : "";
            if (!printRequestId || !requestIds.includes(printRequestId)) {
              return;
            }
            const list = requestItems.get(printRequestId) ?? [];
            list.push({ id: snapshot.id, data });
            requestItems.set(printRequestId, list);
          });
        }

        const customerIds = [
          ...new Set(
            [
              ...Array.from(requestMap.values()).map((data) => data.customerId),
              ...selectedShowAllocations.map((doc) => doc.data.customerId),
            ].filter((id): id is string => typeof id === "string" && id.trim().length > 0),
          ),
        ];
        for (let index = 0; index < customerIds.length; index += REQUEST_GET_ALL_CHUNK_SIZE) {
          const refs = customerIds
            .slice(index, index + REQUEST_GET_ALL_CHUNK_SIZE)
            .map((customerId) => adminDb.collection("customers").doc(customerId));
          const snapshots = await adminDb.getAll(...refs);
          snapshots.forEach((snapshot) => {
            if (snapshot.exists) {
              customerMap.set(snapshot.id, snapshot.data() as Record<string, unknown>);
            }
          });
        }
      }

      return buildPortalAdminUpcomingShowQueueDashboard({
        now,
        projectId: resolveProjectId(),
        requestedShowId: input.showId,
        shows: showDocuments,
        selectedShowAllocations,
        requests: requestMap,
        customers: customerMap,
        requestItems,
        pricing,
        customerGroupKeySalt,
      });
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export { validatePortalAdminUpcomingShowQueueDashboardRequest };
