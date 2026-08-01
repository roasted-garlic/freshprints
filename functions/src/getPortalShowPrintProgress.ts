import { onCall } from "firebase-functions/v2/https";

import type {
  GetPortalShowPrintProgressRequest,
  GetPortalShowPrintProgressResponse,
  PortalShowPrintProgress,
} from "../../packages/shared/src/types/portal/getPortalShowPrintProgress.types";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";
import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to load print progress right now.");
}

function resolveProductionStatus(value: unknown): ShowProductionStatus {
  const allowed: ShowProductionStatus[] = [
    "open",
    "full",
    "printing",
    "fully_printed",
    "completed",
    "archived",
    "canceled",
  ];

  if (typeof value === "string" && allowed.includes(value as ShowProductionStatus)) {
    return value as ShowProductionStatus;
  }

  return "open";
}

function toMillis(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return null;
}

function validateRequest(data: unknown): GetPortalShowPrintProgressRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("A print request id is required.");
  }

  const printRequestId =
    typeof (data as { printRequestId?: unknown }).printRequestId === "string"
      ? (data as { printRequestId: string }).printRequestId.trim()
      : "";

  if (!printRequestId) {
    throw invalidArgument("A print request id is required.");
  }

  return { printRequestId };
}

export const getPortalShowPrintProgress = onCall(
  async (request): Promise<GetPortalShowPrintProgressResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const customer = await requirePortalCustomer(request.auth.uid);
      const payload = validateRequest(request.data);

      const requestSnap = await adminDb.collection("printRequests").doc(payload.printRequestId).get();

      if (!requestSnap.exists) {
        throw invalidArgument("Print request not found.");
      }

      const requestData = requestSnap.data()!;

      if (requestData.customerId !== customer.customerId) {
        throw failedPrecondition("You can only view progress for your own print requests.");
      }

      const allocationsSnap = await adminDb
        .collection("showAllocations")
        .where("printRequestId", "==", payload.printRequestId)
        .get();

      const showIds = [
        ...new Set(
          allocationsSnap.docs.flatMap((allocationDoc) => {
            const data = allocationDoc.data();
            if (data.status === "canceled") {
              return [];
            }
            if (typeof data.upcomingShowId !== "string" || !data.upcomingShowId.trim()) {
              return [];
            }
            return [data.upcomingShowId.trim()];
          }),
        ),
      ];

      if (showIds.length === 0) {
        return { shows: [] };
      }

      const showSnaps = await Promise.all(
        showIds.map((showId) => adminDb.collection("upcomingShows").doc(showId).get()),
      );

      const shows: PortalShowPrintProgress[] = showSnaps.flatMap((showSnap) => {
        if (!showSnap.exists) {
          return [];
        }

        const data = showSnap.data()!;
        const accumulatedPrintMs =
          typeof data.accumulatedPrintMs === "number" && data.accumulatedPrintMs >= 0
            ? data.accumulatedPrintMs
            : 0;

        const scheduledStartAt =
          data.scheduledStartAt &&
          typeof data.scheduledStartAt === "object" &&
          "toDate" in data.scheduledStartAt &&
          typeof (data.scheduledStartAt as { toDate: unknown }).toDate === "function"
            ? (data.scheduledStartAt as { toDate: () => Date }).toDate().toISOString()
            : null;

        return [
          {
            showId: showSnap.id,
            productionStatus: resolveProductionStatus(data.productionStatus),
            accumulatedPrintMs,
            activePrintStartedAtMs: toMillis(data.activePrintStartedAt),
            printPausedAtMs: toMillis(data.printPausedAt),
            printFinishedAtMs: toMillis(data.printFinishedAt),
            scheduledStartAt,
          },
        ];
      });

      return { shows };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
