import { onCall } from "firebase-functions/v2/https";

import { buildPortalCustomerShowSchedulesFromAllocations } from "../../packages/shared/src/utils/portalCustomerShowSchedule";
import type {
  GetPortalPrintRequestShowSchedulesRequest,
  GetPortalPrintRequestShowSchedulesResponse,
  PortalPrintRequestShowScheduleEntry,
} from "../../packages/shared/src/types/portal/getPortalPrintRequestShowSchedules.types";
import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument, unauthenticated } from "./lib/errors";
import { validateGetPortalPrintRequestShowSchedulesRequest } from "./lib/getPortalPrintRequestShowSchedulesValidation";
import { requirePortalCustomer } from "./lib/portalCustomer";

const FIRESTORE_IN_QUERY_MAX = 30;

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to load print request schedules right now.");
}

function chunkArray<T>(items: readonly T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function resolveScheduledStartAtIso(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
}

interface AllocationRow {
  printRequestId: string;
  upcomingShowId: string;
  allocatedQuantity: number;
  status: string;
}

async function loadOwnedPrintRequestIds(
  printRequestIds: string[],
  customerId: string,
): Promise<string[]> {
  const requestSnaps = await Promise.all(
    printRequestIds.map((printRequestId) => adminDb.collection("printRequests").doc(printRequestId).get()),
  );

  for (const requestSnap of requestSnaps) {
    if (!requestSnap.exists) {
      throw failedPrecondition("You can only view schedules for your own print requests.");
    }

    if (requestSnap.data()?.customerId !== customerId) {
      throw failedPrecondition("You can only view schedules for your own print requests.");
    }
  }

  return printRequestIds;
}

async function loadAllocationsForPrintRequests(printRequestIds: string[]): Promise<AllocationRow[]> {
  if (printRequestIds.length === 0) {
    return [];
  }

  const allocationSnaps = await Promise.all(
    chunkArray(printRequestIds, FIRESTORE_IN_QUERY_MAX).map((chunk) =>
      adminDb.collection("showAllocations").where("printRequestId", "in", chunk).get(),
    ),
  );

  return allocationSnaps.flatMap((snapshot) =>
    snapshot.docs.flatMap((allocationDoc) => {
      const data = allocationDoc.data();
      const printRequestId =
        typeof data.printRequestId === "string" ? data.printRequestId.trim() : "";
      const upcomingShowId =
        typeof data.upcomingShowId === "string" ? data.upcomingShowId.trim() : "";
      const allocatedQuantity =
        typeof data.allocatedQuantity === "number" && Number.isFinite(data.allocatedQuantity)
          ? data.allocatedQuantity
          : 0;
      const status = typeof data.status === "string" ? data.status : "";

      if (!printRequestId || !upcomingShowId) {
        return [];
      }

      return [
        {
          printRequestId,
          upcomingShowId,
          allocatedQuantity,
          status,
        },
      ];
    }),
  );
}

async function buildScheduleByShowId(
  showIds: string[],
): Promise<Map<string, { scheduledStartAt: string | null; missingShow?: boolean }>> {
  const scheduleByShowId = new Map<string, { scheduledStartAt: string | null; missingShow?: boolean }>();

  if (showIds.length === 0) {
    return scheduleByShowId;
  }

  const showSnaps = await Promise.all(
    showIds.map((showId) => adminDb.collection("upcomingShows").doc(showId).get()),
  );

  for (const showSnap of showSnaps) {
    if (!showSnap.exists) {
      scheduleByShowId.set(showSnap.id, { scheduledStartAt: null, missingShow: true });
      continue;
    }

    scheduleByShowId.set(showSnap.id, {
      scheduledStartAt: resolveScheduledStartAtIso(showSnap.data()?.scheduledStartAt),
    });
  }

  return scheduleByShowId;
}

function buildResponseEntries(
  printRequestIds: string[],
  allocations: AllocationRow[],
  scheduleByShowId: ReadonlyMap<string, { scheduledStartAt: string | null; missingShow?: boolean }>,
): PortalPrintRequestShowScheduleEntry[] {
  const allocationsByRequestId = new Map<string, AllocationRow[]>();

  for (const allocation of allocations) {
    const existing = allocationsByRequestId.get(allocation.printRequestId) ?? [];
    existing.push(allocation);
    allocationsByRequestId.set(allocation.printRequestId, existing);
  }

  return printRequestIds.map((printRequestId) => {
    const requestAllocations = allocationsByRequestId.get(printRequestId) ?? [];
    const schedules = buildPortalCustomerShowSchedulesFromAllocations(
      requestAllocations.map((allocation) => ({
        upcomingShowId: allocation.upcomingShowId,
        allocatedQuantity: allocation.allocatedQuantity,
        status: allocation.status,
      })),
      scheduleByShowId,
    );

    return {
      printRequestId,
      shows: schedules.map((schedule) => ({
        upcomingShowId: schedule.upcomingShowId,
        scheduledStartAt: schedule.scheduledStartAt,
        ...(schedule.missingShow ? { missingShow: true as const } : {}),
      })),
    };
  });
}

export async function getPortalPrintRequestShowSchedulesHandler(
  userId: string,
  data: unknown,
): Promise<GetPortalPrintRequestShowSchedulesResponse> {
  const customer = await requirePortalCustomer(userId);
  const payload: GetPortalPrintRequestShowSchedulesRequest =
    validateGetPortalPrintRequestShowSchedulesRequest(data);

  const ownedPrintRequestIds = await loadOwnedPrintRequestIds(payload.printRequestIds, customer.customerId);
  const allocations = await loadAllocationsForPrintRequests(ownedPrintRequestIds);

  const uniqueShowIds = [
    ...new Set(
      allocations.flatMap((allocation) => {
        if (allocation.status === "canceled") {
          return [];
        }
        const qty =
          typeof allocation.allocatedQuantity === "number" && Number.isFinite(allocation.allocatedQuantity)
            ? Math.max(0, Math.floor(allocation.allocatedQuantity))
            : 0;
        if (qty <= 0) {
          return [];
        }
        return [allocation.upcomingShowId];
      }),
    ),
  ];

  const scheduleByShowId = await buildScheduleByShowId(uniqueShowIds);

  return {
    requests: buildResponseEntries(ownedPrintRequestIds, allocations, scheduleByShowId),
  };
}

export const getPortalPrintRequestShowSchedules = onCall(
  async (request): Promise<GetPortalPrintRequestShowSchedulesResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      return await getPortalPrintRequestShowSchedulesHandler(request.auth.uid, request.data);
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
