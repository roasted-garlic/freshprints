import {
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { isPrintRequestOrigin } from "@fresh-prints/shared/utils/printRequestOrigin";
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
  type FirestoreTraceMetadata,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";
import type {
  StaffInboxPortalAllocationSnapshot,
  StaffInboxPortalRequestSnapshot,
} from "@fresh-prints/shared/staffInbox/staffInbox.types";
import type { DesignIssueReport } from "@fresh-prints/shared/designIssueReports/designIssueReport.types";
import { DESIGN_ISSUE_REPORT_OPEN_LIMIT } from "@fresh-prints/shared/designIssueReports/designIssueReport.constants";
import type { StaffInboxShowSnapshot } from "@fresh-prints/shared/staffInbox/staffInboxShowSnapshots";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

const STAFF_INBOX_REQUEST_LIMIT = 200;
const STAFF_INBOX_ALLOCATION_LIMIT = 400;
const STAFF_INBOX_SHOW_LIMIT = 100;

export interface StaffInboxSubscribedShow {
  snapshot: StaffInboxShowSnapshot;
  title: string;
}

export interface StaffInboxSubscriptionSnapshot {
  portalRequests: StaffInboxPortalRequestSnapshot[];
  portalAllocations: StaffInboxPortalAllocationSnapshot[];
  shows: StaffInboxSubscribedShow[];
  designIssueReports: DesignIssueReport[];
}

export interface StaffInboxSubscriptionState {
  snapshot: StaffInboxSubscriptionSnapshot;
  requestError: string | null;
  allocationError: string | null;
  showError: string | null;
  designIssueReportError: string | null;
}

function mapDesignIssueReport(id: string, data: DocumentData): DesignIssueReport | null {
  if (data.status !== "open" || typeof data.designId !== "string" || typeof data.description !== "string" || typeof data.designTitleSnapshot !== "string") return null;
  const createdAt = mapFirestoreTimestamp(data.createdAt)?.toMillis() ?? 0;
  const updatedAt = mapFirestoreTimestamp(data.updatedAt)?.toMillis() ?? createdAt;
  return { id, designId: data.designId, customerUid: typeof data.customerUid === "string" ? data.customerUid : "", customerId: typeof data.customerId === "string" ? data.customerId : "", customerDisplayNameSnapshot: typeof data.customerDisplayNameSnapshot === "string" ? data.customerDisplayNameSnapshot : "Customer", customerUsernameSnapshot: typeof data.customerUsernameSnapshot === "string" ? data.customerUsernameSnapshot : "", description: data.description, status: "open", designTitleSnapshot: data.designTitleSnapshot, designThumbnailPathSnapshot: typeof data.designThumbnailPathSnapshot === "string" ? data.designThumbnailPathSnapshot : undefined, createdAtMillis: createdAt, updatedAtMillis: updatedAt };
}

const REQUESTS_TRACE: FirestoreTraceMetadata = {
  app: "studio",
  collection: "printRequests",
  constraints: ["requestOrigin==portal_customer"],
  limit: STAFF_INBOX_REQUEST_LIMIT,
  orderBy: ["updatedAt desc"],
  source: "staffInboxSubscriptionService.requests",
  triggerReason: "authentication",
};

const ALLOCATIONS_TRACE: FirestoreTraceMetadata = {
  app: "studio",
  collection: "showAllocations",
  constraints: ["requestOriginSnapshot==portal_customer"],
  limit: STAFF_INBOX_ALLOCATION_LIMIT,
  orderBy: ["updatedAt desc"],
  source: "staffInboxSubscriptionService.allocations",
  triggerReason: "authentication",
};

const SHOWS_TRACE: FirestoreTraceMetadata = {
  app: "studio",
  collection: "upcomingShows",
  limit: STAFF_INBOX_SHOW_LIMIT,
  orderBy: ["updatedAt desc"],
  source: "staffInboxSubscriptionService.shows",
  triggerReason: "authentication",
};
const DESIGN_REPORTS_TRACE: FirestoreTraceMetadata = { app: "studio", collection: "designIssueReports", constraints: ["status==open"], limit: DESIGN_ISSUE_REPORT_OPEN_LIMIT, orderBy: ["createdAt desc"], source: "staffInboxSubscriptionService.designIssueReports", triggerReason: "authentication" };

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
    let designIssueReports: DesignIssueReport[] = [];
    let requestError: string | null = null;
    let allocationError: string | null = null;
    let showError: string | null = null;
    let designIssueReportError: string | null = null;
    let hasRequestSnapshot = false;
    let hasAllocationSnapshot = false;
    let hasShowSnapshot = false;

    const emit = () => {
      if (!hasRequestSnapshot && !hasAllocationSnapshot && !hasShowSnapshot) {
        return;
      }

      onStateChange({
        snapshot: { portalRequests, portalAllocations, shows, designIssueReports },
        requestError,
        allocationError,
        showError,
        designIssueReportError,
      });
    };

    const requestsQuery = query(
      firestoreCollectionService.getPrintRequestsCollection(),
      where("requestOrigin", "==", "portal_customer"),
      orderBy("updatedAt", "desc"),
      limit(STAFF_INBOX_REQUEST_LIMIT),
    );

    const allocationsQuery = query(
      firestoreCollectionService.getShowAllocationsCollection(),
      where("requestOriginSnapshot", "==", "portal_customer"),
      orderBy("updatedAt", "desc"),
      limit(STAFF_INBOX_ALLOCATION_LIMIT),
    );

    traceFirestoreListenerAttach(REQUESTS_TRACE);
    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (querySnapshot) => {
        traceFirestoreListenerEmission(REQUESTS_TRACE, querySnapshot.size);
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

    traceFirestoreListenerAttach(ALLOCATIONS_TRACE);
    const unsubscribeAllocations = onSnapshot(
      allocationsQuery,
      (querySnapshot) => {
        traceFirestoreListenerEmission(ALLOCATIONS_TRACE, querySnapshot.size);
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

    const showsQuery = query(
      firestoreCollectionService.getUpcomingShowsCollection(),
      orderBy("updatedAt", "desc"),
      limit(STAFF_INBOX_SHOW_LIMIT),
    );

    traceFirestoreListenerAttach(SHOWS_TRACE);
    const unsubscribeShows = onSnapshot(
      showsQuery,
      (querySnapshot) => {
        traceFirestoreListenerEmission(SHOWS_TRACE, querySnapshot.size);
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

    const tracedUnsubscribeRequests = traceWrappedUnsubscribe(
      REQUESTS_TRACE,
      unsubscribeRequests,
    );
    const tracedUnsubscribeAllocations = traceWrappedUnsubscribe(
      ALLOCATIONS_TRACE,
      unsubscribeAllocations,
    );
    const tracedUnsubscribeShows = traceWrappedUnsubscribe(SHOWS_TRACE, unsubscribeShows);
    const reportsQuery = query(firestoreCollectionService.getDesignIssueReportsCollection(), where("status", "==", "open"), orderBy("createdAt", "desc"), limit(DESIGN_ISSUE_REPORT_OPEN_LIMIT));
    traceFirestoreListenerAttach(DESIGN_REPORTS_TRACE);
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => { traceFirestoreListenerEmission(DESIGN_REPORTS_TRACE, snapshot.size); designIssueReports = snapshot.docs.flatMap((entry) => { const mapped = mapDesignIssueReport(entry.id, entry.data()); return mapped ? [mapped] : []; }); designIssueReportError = null; emit(); }, (error) => { designIssueReportError = error.message; emit(); });
    const tracedUnsubscribeReports = traceWrappedUnsubscribe(DESIGN_REPORTS_TRACE, unsubscribeReports);

    return () => {
      tracedUnsubscribeRequests();
      tracedUnsubscribeAllocations();
      tracedUnsubscribeShows();
      tracedUnsubscribeReports();
    };
  },
};
