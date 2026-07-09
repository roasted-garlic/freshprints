import {
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { isPrintRequestOrigin } from "@fresh-prints/shared/utils/printRequestOrigin";
import type {
  StaffInboxPortalAllocationSnapshot,
  StaffInboxPortalRequestSnapshot,
} from "@fresh-prints/shared/staffInbox/staffInbox.types";
import type { StaffInboxShowSnapshot } from "@fresh-prints/shared/staffInbox/staffInboxShowSnapshots";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

export interface StaffInboxSubscribedShow {
  snapshot: StaffInboxShowSnapshot;
  title: string;
}

export interface StaffInboxSubscriptionSnapshot {
  portalRequests: StaffInboxPortalRequestSnapshot[];
  portalAllocations: StaffInboxPortalAllocationSnapshot[];
  shows: StaffInboxSubscribedShow[];
}

export interface StaffInboxSubscriptionState {
  snapshot: StaffInboxSubscriptionSnapshot;
  requestError: string | null;
  allocationError: string | null;
  showError: string | null;
}

function mapPortalRequestSnapshot(
  printRequestId: string,
  data: DocumentData,
): StaffInboxPortalRequestSnapshot | null {
  if (
    typeof data.name !== "string" ||
    typeof data.itemCount !== "number" ||
    !isPrintRequestOrigin(data.requestOrigin) ||
    data.requestOrigin !== "portal_customer"
  ) {
    return null;
  }

  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  return {
    id: printRequestId,
    name: data.name,
    itemCount: data.itemCount,
    customerDisplayNameSnapshot:
      typeof data.customerDisplayNameSnapshot === "string"
        ? data.customerDisplayNameSnapshot
        : undefined,
    updatedAtMillis: updatedAt?.toMillis() ?? 0,
  };
}

function mapPortalAllocationSnapshot(
  data: DocumentData,
): StaffInboxPortalAllocationSnapshot | null {
  if (
    typeof data.printRequestId !== "string" ||
    typeof data.upcomingShowId !== "string" ||
    typeof data.requestNameSnapshot !== "string" ||
    typeof data.status !== "string" ||
    !isPrintRequestOrigin(data.requestOriginSnapshot) ||
    data.requestOriginSnapshot !== "portal_customer"
  ) {
    return null;
  }

  const createdAt = mapFirestoreTimestamp(data.createdAt);

  return {
    printRequestId: data.printRequestId,
    upcomingShowId: data.upcomingShowId,
    requestNameSnapshot: data.requestNameSnapshot,
    status: data.status,
    createdAtMillis: createdAt?.toMillis() ?? 0,
  };
}

function mapRequestSnapshot(querySnapshot: QuerySnapshot<DocumentData>): StaffInboxPortalRequestSnapshot[] {
  const requests: StaffInboxPortalRequestSnapshot[] = [];

  for (const document of querySnapshot.docs) {
    const mapped = mapPortalRequestSnapshot(document.id, document.data());

    if (mapped) {
      requests.push(mapped);
    }
  }

  return requests.sort((left, right) => right.updatedAtMillis - left.updatedAtMillis);
}

function mapAllocationSnapshot(
  querySnapshot: QuerySnapshot<DocumentData>,
): StaffInboxPortalAllocationSnapshot[] {
  const allocations: StaffInboxPortalAllocationSnapshot[] = [];

  for (const document of querySnapshot.docs) {
    const mapped = mapPortalAllocationSnapshot(document.data());

    if (mapped) {
      allocations.push(mapped);
    }
  }

  return allocations.sort((left, right) => right.createdAtMillis - left.createdAtMillis);
}

function mapSubscribedShow(
  showId: string,
  data: DocumentData,
): StaffInboxSubscribedShow | null {
  if (data.isArchived === true) {
    return null;
  }

  if (typeof data.allocatedQuantity !== "number" || typeof data.productionStatus !== "string") {
    return null;
  }

  const updatedAt = mapFirestoreTimestamp(data.updatedAt);
  const whatnotShowId = typeof data.whatnotShowId === "string" ? data.whatnotShowId : "";
  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : whatnotShowId
        ? `Whatnot show ${whatnotShowId}`
        : "Upcoming show";

  return {
    title,
    snapshot: {
      id: showId,
      productionStatus: data.productionStatus,
      maxTotalQuantity: typeof data.maxTotalQuantity === "number" ? data.maxTotalQuantity : undefined,
      allocatedQuantity: data.allocatedQuantity,
      updatedAtMillis: updatedAt?.toMillis() ?? 0,
    },
  };
}

function mapShowSnapshot(querySnapshot: QuerySnapshot<DocumentData>): StaffInboxSubscribedShow[] {
  const shows: StaffInboxSubscribedShow[] = [];

  for (const document of querySnapshot.docs) {
    const mapped = mapSubscribedShow(document.id, document.data());

    if (mapped) {
      shows.push(mapped);
    }
  }

  return shows.sort((left, right) => right.snapshot.updatedAtMillis - left.snapshot.updatedAtMillis);
}

export const staffInboxSubscriptionService = {
  subscribe(onStateChange: (state: StaffInboxSubscriptionState) => void): Unsubscribe {
    let portalRequests: StaffInboxPortalRequestSnapshot[] = [];
    let portalAllocations: StaffInboxPortalAllocationSnapshot[] = [];
    let shows: StaffInboxSubscribedShow[] = [];
    let requestError: string | null = null;
    let allocationError: string | null = null;
    let showError: string | null = null;
    let hasRequestSnapshot = false;
    let hasAllocationSnapshot = false;
    let hasShowSnapshot = false;

    const emit = () => {
      if (!hasRequestSnapshot && !hasAllocationSnapshot && !hasShowSnapshot) {
        return;
      }

      onStateChange({
        snapshot: { portalRequests, portalAllocations, shows },
        requestError,
        allocationError,
        showError,
      });
    };

    const requestsQuery = query(
      firestoreCollectionService.getPrintRequestsCollection(),
      where("requestOrigin", "==", "portal_customer"),
    );

    const allocationsQuery = query(
      firestoreCollectionService.getShowAllocationsCollection(),
      where("requestOriginSnapshot", "==", "portal_customer"),
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (querySnapshot) => {
        portalRequests = mapRequestSnapshot(querySnapshot);
        requestError = null;
        hasRequestSnapshot = true;
        emit();
      },
      (error) => {
        requestError = error.message;
        hasRequestSnapshot = true;
        emit();
      },
    );

    const unsubscribeAllocations = onSnapshot(
      allocationsQuery,
      (querySnapshot) => {
        portalAllocations = mapAllocationSnapshot(querySnapshot);
        allocationError = null;
        hasAllocationSnapshot = true;
        emit();
      },
      (error) => {
        allocationError = error.message;
        hasAllocationSnapshot = true;
        emit();
      },
    );

    const showsQuery = firestoreCollectionService.getUpcomingShowsCollection();

    const unsubscribeShows = onSnapshot(
      showsQuery,
      (querySnapshot) => {
        shows = mapShowSnapshot(querySnapshot);
        showError = null;
        hasShowSnapshot = true;
        emit();
      },
      (error) => {
        showError = error.message;
        hasShowSnapshot = true;
        emit();
      },
    );

    return () => {
      unsubscribeRequests();
      unsubscribeAllocations();
      unsubscribeShows();
    };
  },
};
