import { getDocs, query, where, type DocumentData } from "firebase/firestore";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocationStatus } from "@fresh-prints/shared/types/showAllocation/showAllocation.enums";
import { getPrintRequestOriginBadgeLabel } from "@fresh-prints/shared/utils/printRequestOrigin";
import { isPrintRequestOrigin } from "@fresh-prints/shared/utils/printRequestOrigin";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";
import { permissionService } from "../../permissions/services/permissionService";
import { printRequestService } from "../../print-requests/services/printRequestService";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import { formatUpcomingShowTitle } from "../../upcoming-shows/utils/upcomingShowDisplay";
import type { User } from "../types/user.types";
import type { AuditTrailEntry } from "../types/auditTrail.types";
import {
  getAuditTimestampMillis,
  isAuditTimestampAfter,
} from "../utils/auditTrailUtils";

const ACTIVE_ALLOCATION_STATUSES = new Set<ShowAllocationStatus>([
  "pending",
  "queued",
  "in_progress",
  "printed",
  "done",
]);

const PRINT_REQUEST_ACTIVITY_LIMIT = 20;
const DESIGN_ACTIVITY_LIMIT = 15;

interface PrintRequestActivitySnapshot {
  id: string;
  name: string;
  status: string;
  itemCount: number;
  requestOrigin?: PrintRequest["requestOrigin"];
  isInternal: boolean;
  createdBy: string;
  updatedBy: string;
  createdAtMillis: number;
  updatedAtMillis: number;
}

function mapPrintRequestActivitySnapshot(
  printRequestId: string,
  data: DocumentData,
): PrintRequestActivitySnapshot | null {
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  if (
    typeof data.name !== "string" ||
    typeof data.status !== "string" ||
    typeof data.itemCount !== "number" ||
    typeof data.createdBy !== "string" ||
    typeof data.updatedBy !== "string" ||
    createdAt === undefined ||
    updatedAt === undefined
  ) {
    return null;
  }

  return {
    id: printRequestId,
    name: data.name,
    status: data.status,
    itemCount: data.itemCount,
    requestOrigin: isPrintRequestOrigin(data.requestOrigin) ? data.requestOrigin : undefined,
    isInternal: data.isInternal === true,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAtMillis: createdAt.toMillis(),
    updatedAtMillis: updatedAt.toMillis(),
  };
}

function buildPrintRequestActivityEntries(requests: PrintRequestActivitySnapshot[]): AuditTrailEntry[] {
  const entries: AuditTrailEntry[] = [];

  for (const request of requests) {
    entries.push({
      id: `print-request:${request.id}:created`,
      label: "Print request created",
      detail: `${request.name} · ${request.itemCount} design(s) · ${getPrintRequestOriginBadgeLabel(request)}`,
      occurredAtMillis: request.createdAtMillis,
      actorUserId: request.createdBy,
    });

    if (isAuditTimestampAfter(request.updatedAtMillis, request.createdAtMillis)) {
      entries.push({
        id: `print-request:${request.id}:updated`,
        label: "Print request updated",
        detail: `${request.name} · Status ${request.status}`,
        occurredAtMillis: request.updatedAtMillis,
        actorUserId: request.updatedBy,
      });
    }
  }

  return entries;
}

function buildPrintRequestActivityEntriesFromModels(requests: PrintRequest[]): AuditTrailEntry[] {
  return buildPrintRequestActivityEntries(
    requests.map((request) => ({
      id: request.id,
      name: request.name,
      status: request.status,
      itemCount: request.itemCount,
      requestOrigin: request.requestOrigin,
      isInternal: request.isInternal,
      createdBy: request.createdBy,
      updatedBy: request.updatedBy,
      createdAtMillis: getAuditTimestampMillis(request.createdAt),
      updatedAtMillis: getAuditTimestampMillis(request.updatedAt),
    })),
  );
}

async function listPrintRequestSnapshotsByCreatedBy(
  caller: User,
  createdBy: string,
): Promise<PrintRequestActivitySnapshot[]> {
  if (!permissionService.canViewPrintRequests(caller)) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      firestoreCollectionService.getPrintRequestsCollection(),
      where("createdBy", "==", createdBy),
    ),
  );

  return snapshot.docs
    .map((requestDoc) => mapPrintRequestActivitySnapshot(requestDoc.id, requestDoc.data()))
    .filter((request): request is PrintRequestActivitySnapshot => request !== null)
    .sort((left, right) => right.updatedAtMillis - left.updatedAtMillis)
    .slice(0, PRINT_REQUEST_ACTIVITY_LIMIT);
}

async function listCustomerShowAllocationActivity(
  caller: User,
  customerId: string,
): Promise<AuditTrailEntry[]> {
  if (!permissionService.canViewUpcomingShows(caller)) {
    return [];
  }

  const allocationsSnapshot = await getDocs(
    query(
      firestoreCollectionService.getShowAllocationsCollection(),
      where("customerId", "==", customerId),
    ),
  );

  const groups = new Map<
    string,
    {
      printRequestId: string;
      upcomingShowId: string;
      requestNameSnapshot: string;
      createdAtMillis: number;
    }
  >();

  for (const allocationDoc of allocationsSnapshot.docs) {
    const data = allocationDoc.data();
    const status = typeof data.status === "string" ? data.status : "";

    if (!ACTIVE_ALLOCATION_STATUSES.has(status as ShowAllocationStatus)) {
      continue;
    }

    const printRequestId = typeof data.printRequestId === "string" ? data.printRequestId : "";
    const upcomingShowId = typeof data.upcomingShowId === "string" ? data.upcomingShowId : "";
    const requestNameSnapshot =
      typeof data.requestNameSnapshot === "string" ? data.requestNameSnapshot : "Print request";
    const createdAt = mapFirestoreTimestamp(data.createdAt);
    const createdAtMillis = createdAt?.toMillis() ?? 0;

    if (!printRequestId || !upcomingShowId) {
      continue;
    }

    const groupKey = `${printRequestId}:${upcomingShowId}`;
    const existing = groups.get(groupKey);

    if (!existing || createdAtMillis < existing.createdAtMillis) {
      groups.set(groupKey, {
        printRequestId,
        upcomingShowId,
        requestNameSnapshot,
        createdAtMillis,
      });
    }
  }

  const shows = await upcomingShowService.listUpcomingShows(caller);
  const showTitleById = new Map(
    shows.map((show) => [show.id, formatUpcomingShowTitle(show)]),
  );

  return [...groups.values()].map((group) => ({
    id: `show-allocation:${group.printRequestId}:${group.upcomingShowId}`,
    label: "Queued to show print run",
    detail: `${group.requestNameSnapshot} · ${showTitleById.get(group.upcomingShowId) ?? "Upcoming show"}`,
    occurredAtMillis: group.createdAtMillis,
  }));
}

async function listDesignUploadActivity(caller: User, uploadedBy: string): Promise<AuditTrailEntry[]> {
  if (!permissionService.canViewDesigns(caller)) {
    return [];
  }

  const snapshot = await getDocs(
    query(firestoreCollectionService.getDesignsCollection(), where("uploadedBy", "==", uploadedBy)),
  );

  const entries: AuditTrailEntry[] = [];
  for (const designDoc of snapshot.docs) {
    const data = designDoc.data();
    const createdAt = mapFirestoreTimestamp(data.createdAt);
    if (!createdAt) {
      continue;
    }

    const title = typeof data.title === "string" ? data.title : "Untitled design";
    const status = typeof data.status === "string" ? data.status : "unknown";
    entries.push({
      id: `design:${designDoc.id}:uploaded`,
      label: "Design uploaded",
      detail: `${title} · ${status}`,
      occurredAtMillis: createdAt.toMillis(),
      actorUserId: uploadedBy,
    });
  }

  return entries
    .sort((left, right) => right.occurredAtMillis - left.occurredAtMillis)
    .slice(0, DESIGN_ACTIVITY_LIMIT);
}

export const userAuditTrailActivityService = {
  async listCustomerActivityEntries(caller: User, customer: Customer): Promise<AuditTrailEntry[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return listCustomerShowAllocationActivity(caller, customer.id);
    }

    const requests = await printRequestService.listPrintRequestsByCustomer(caller, customer.id);

    const sortedRequests = [...requests]
      .sort(
        (left, right) =>
          getAuditTimestampMillis(right.updatedAt) - getAuditTimestampMillis(left.updatedAt),
      )
      .slice(0, PRINT_REQUEST_ACTIVITY_LIMIT);

    const [printRequestEntries, showAllocationEntries] = await Promise.all([
      Promise.resolve(buildPrintRequestActivityEntriesFromModels(sortedRequests)),
      listCustomerShowAllocationActivity(caller, customer.id),
    ]);

    return [...printRequestEntries, ...showAllocationEntries];
  },

  async listTeamUserActivityEntries(caller: User, user: User): Promise<AuditTrailEntry[]> {
    const [printRequestSnapshots, designEntries] = await Promise.all([
      listPrintRequestSnapshotsByCreatedBy(caller, user.id),
      listDesignUploadActivity(caller, user.id),
    ]);

    return [...buildPrintRequestActivityEntries(printRequestSnapshots), ...designEntries];
  },
};
