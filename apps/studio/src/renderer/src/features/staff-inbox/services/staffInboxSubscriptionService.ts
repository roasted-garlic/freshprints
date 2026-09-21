import {
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type CollectionReference,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
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
import {
  applyStaffInboxPageVerification,
  reconcileStaffInboxPage,
} from "./staffInboxPageReconciliation";

export const STAFF_INBOX_REQUEST_PAGE_SIZE = 200;
export const STAFF_INBOX_ALLOCATION_PAGE_SIZE = 400;
export const STAFF_INBOX_SHOW_PAGE_SIZE = 100;
const STAFF_INBOX_DESIGN_REPORT_PAGE_SIZE = DESIGN_ISSUE_REPORT_OPEN_LIMIT;
const REQUEST_HYDRATION_CHUNK_SIZE = 30;

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

export interface StaffInboxLoadedCounts {
  portalRequests: number;
  portalAllocations: number;
  shows: number;
  designIssueReports: number;
}

export interface StaffInboxSubscriptionPagination {
  hasMore: boolean;
  isLoadingMore: boolean;
  loadedCounts: StaffInboxLoadedCounts;
}

export interface StaffInboxSubscriptionState {
  snapshot: StaffInboxSubscriptionSnapshot;
  pagination: StaffInboxSubscriptionPagination;
  requestError: string | null;
  allocationError: string | null;
  showError: string | null;
  designIssueReportError: string | null;
}

export interface StaffInboxSubscriptionController {
  loadMore: () => Promise<void>;
  unsubscribe: Unsubscribe;
}

type StaffInboxSourceKey = "requests" | "allocations" | "shows" | "designIssueReports";

interface StaffInboxSourcePage<T> {
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  docs: Map<string, T>;
  hasMore: boolean;
  rawDocumentIds: Set<string>;
  unsubscribe: Unsubscribe | null;
  hasEmitted: boolean;
  revision: number;
}

interface StaffInboxPagedSource<T> {
  collection: CollectionReference<DocumentData>;
  key: StaffInboxSourceKey;
  orderField: string;
  pageSize: number;
  baseConstraints: QueryConstraint[];
  mapDocument: (id: string, data: DocumentData) => T | null;
  trace: FirestoreTraceMetadata;
  pages: StaffInboxSourcePage<T>[];
  records: Map<string, T>;
  hydratedRecords: Map<string, T>;
  error: string | null;
}

function mapDesignIssueReportFields(id: string, data: DocumentData): Omit<DesignIssueReport, "status"> | null {
  if (typeof data.designId !== "string" || typeof data.description !== "string" || typeof data.designTitleSnapshot !== "string") return null;
  const createdAt = mapFirestoreTimestamp(data.createdAt)?.toMillis() ?? 0;
  const updatedAt = mapFirestoreTimestamp(data.updatedAt)?.toMillis() ?? createdAt;
  const resolvedAt = mapFirestoreTimestamp(data.resolvedAt)?.toMillis();
  return {
    id,
    designId: data.designId,
    customerUid: typeof data.customerUid === "string" ? data.customerUid : "",
    customerId: typeof data.customerId === "string" ? data.customerId : "",
    customerDisplayNameSnapshot: typeof data.customerDisplayNameSnapshot === "string" ? data.customerDisplayNameSnapshot : "",
    customerUsernameSnapshot: typeof data.customerUsernameSnapshot === "string" ? data.customerUsernameSnapshot : "",
    description: data.description,
    designTitleSnapshot: data.designTitleSnapshot,
    designThumbnailPathSnapshot: typeof data.designThumbnailPathSnapshot === "string" ? data.designThumbnailPathSnapshot : undefined,
    createdAtMillis: createdAt,
    updatedAtMillis: updatedAt,
    ...(resolvedAt ? { resolvedAtMillis: resolvedAt } : {}),
    ...(typeof data.resolvedByUid === "string" ? { resolvedByUid: data.resolvedByUid } : {}),
  };
}

function mapDesignIssueReport(id: string, data: DocumentData): DesignIssueReport | null {
  if (data.status !== "open") return null;
  const mapped = mapDesignIssueReportFields(id, data);
  return mapped ? { ...mapped, status: "open" } : null;
}

export function mapResolvedDesignIssueReport(id: string, data: DocumentData): DesignIssueReport | null {
  if (data.status !== "resolved") return null;
  const mapped = mapDesignIssueReportFields(id, data);
  return mapped ? { ...mapped, status: "resolved" } : null;
}

const REQUESTS_TRACE: FirestoreTraceMetadata = {
  app: "studio",
  collection: "printRequests",
  constraints: ["requestOrigin==portal_customer"],
  limit: STAFF_INBOX_REQUEST_PAGE_SIZE + 1,
  orderBy: ["updatedAt desc", "__name__ desc"],
  source: "staffInboxSubscriptionService.requests",
  triggerReason: "authentication",
};

const ALLOCATIONS_TRACE: FirestoreTraceMetadata = {
  app: "studio",
  collection: "showAllocations",
  constraints: ["requestOriginSnapshot==portal_customer"],
  limit: STAFF_INBOX_ALLOCATION_PAGE_SIZE + 1,
  orderBy: ["updatedAt desc", "__name__ desc"],
  source: "staffInboxSubscriptionService.allocations",
  triggerReason: "authentication",
};

const SHOWS_TRACE: FirestoreTraceMetadata = {
  app: "studio",
  collection: "upcomingShows",
  limit: STAFF_INBOX_SHOW_PAGE_SIZE + 1,
  orderBy: ["updatedAt desc", "__name__ desc"],
  source: "staffInboxSubscriptionService.shows",
  triggerReason: "authentication",
};

const DESIGN_REPORTS_TRACE: FirestoreTraceMetadata = {
  app: "studio",
  collection: "designIssueReports",
  constraints: ["status==open"],
  limit: STAFF_INBOX_DESIGN_REPORT_PAGE_SIZE + 1,
  orderBy: ["createdAt desc", "__name__ desc"],
  source: "staffInboxSubscriptionService.designIssueReports",
  triggerReason: "authentication",
};

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
  allocationId: string,
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
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  return {
    allocationId,
    printRequestId: data.printRequestId,
    upcomingShowId: data.upcomingShowId,
    requestNameSnapshot: data.requestNameSnapshot,
    status: data.status,
    sourceType:
      data.sourceType === "catalog_design" ||
      data.sourceType === "customer_upload" ||
      data.sourceType === "staff_artwork"
        ? data.sourceType
        : undefined,
    createdAtMillis: createdAt?.toMillis() ?? 0,
    updatedAtMillis: updatedAt?.toMillis(),
    allocatedQuantity:
      typeof data.allocatedQuantity === "number" && Number.isFinite(data.allocatedQuantity)
        ? data.allocatedQuantity
        : undefined,
    printRequestItemId:
      typeof data.printRequestItemId === "string" && data.printRequestItemId.trim()
        ? data.printRequestItemId
        : undefined,
    designId: typeof data.designId === "string" && data.designId.trim() ? data.designId : undefined,
    customerUploadId:
      typeof data.customerUploadId === "string" && data.customerUploadId.trim()
        ? data.customerUploadId
        : undefined,
    staffArtworkId:
      typeof data.staffArtworkId === "string" && data.staffArtworkId.trim()
        ? data.staffArtworkId
        : undefined,
    printWidthInches:
      typeof data.printWidthInches === "number" && Number.isFinite(data.printWidthInches)
        ? data.printWidthInches
        : undefined,
    printHeightInches:
      typeof data.printHeightInches === "number" && Number.isFinite(data.printHeightInches)
        ? data.printHeightInches
        : undefined,
  };
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

function compareDescending(leftMillis: number, rightMillis: number, leftId: string, rightId: string): number {
  return rightMillis - leftMillis || rightId.localeCompare(leftId);
}

function mapSourceRecords<T>(source: StaffInboxPagedSource<T>): Map<string, T> {
  const records = new Map(source.hydratedRecords);

  for (const page of source.pages) {
    for (const [id, record] of page.docs) {
      records.set(id, record);
    }
  }

  return records;
}

function createPagedSource<T>(options: {
  collection: CollectionReference<DocumentData>;
  key: StaffInboxSourceKey;
  orderField: string;
  pageSize: number;
  baseConstraints: QueryConstraint[];
  mapDocument: (id: string, data: DocumentData) => T | null;
  trace: FirestoreTraceMetadata;
}): StaffInboxPagedSource<T> {
  return {
    ...options,
    pages: [],
    records: new Map(),
    hydratedRecords: new Map(),
    error: null,
  };
}

function buildPagedSourceQuery<T>(
  source: StaffInboxPagedSource<T>,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
) {
  const constraints: QueryConstraint[] = [
    ...source.baseConstraints,
    orderBy(source.orderField, "desc"),
    orderBy("__name__", "desc"),
  ];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(source.pageSize + 1));
  return query(source.collection, ...constraints);
}

function applySourcePageSnapshot<T>(
  source: StaffInboxPagedSource<T>,
  pageIndex: number,
  querySnapshot: QuerySnapshot<DocumentData>,
): string[] {
  const page = source.pages[pageIndex];
  if (!page) {
    return [];
  }

  const pageDocuments = querySnapshot.docs.slice(0, source.pageSize);
  const nextRawDocumentIds = new Set(pageDocuments.map((document) => document.id));
  const nextDocs = new Map<string, T>();

  for (const document of pageDocuments) {
    const mapped = source.mapDocument(document.id, document.data());
    if (mapped) {
      nextDocs.set(document.id, mapped);
    }
  }

  const pageState = {
    records: page.docs,
    windowDocumentIds: page.rawDocumentIds,
    hasMore: page.hasMore,
    revision: page.revision,
  };
  const evictedDocumentIds = reconcileStaffInboxPage(
    pageState,
    nextDocs,
    nextRawDocumentIds,
    querySnapshot.docs.length > source.pageSize,
  );

  page.docs = pageState.records;
  page.rawDocumentIds = pageState.windowDocumentIds;
  page.hasMore = pageState.hasMore;
  page.revision = pageState.revision;

  // The cursor is the consumed boundary from the first emission of this page.
  // Live updates reconcile the page contents but never move that boundary.
  if (!page.cursor && pageDocuments.length > 0) {
    page.cursor = pageDocuments[pageDocuments.length - 1] ?? null;
  }

  page.hasEmitted = true;
  source.records = mapSourceRecords(source);
  return evictedDocumentIds;
}

async function lookupSourceRecords<T>(
  source: StaffInboxPagedSource<T>,
  documentIds: readonly string[],
): Promise<Map<string, T>> {
  const verifiedRecords = new Map<string, T>();

  for (let index = 0; index < documentIds.length; index += REQUEST_HYDRATION_CHUNK_SIZE) {
    const chunk = documentIds.slice(index, index + REQUEST_HYDRATION_CHUNK_SIZE);
    if (chunk.length === 0) {
      continue;
    }

    const snapshot = await getDocs(
      query(
        source.collection,
        ...source.baseConstraints,
        where(documentId(), "in", chunk),
      ),
    );

    for (const document of snapshot.docs) {
      if (!mapFirestoreTimestamp(document.data()[source.orderField])) {
        continue;
      }

      const mapped = source.mapDocument(document.id, document.data());
      if (mapped) {
        verifiedRecords.set(document.id, mapped);
      }
    }
  }

  return verifiedRecords;
}

async function reconcileSourcePageEvictions<T>(
  source: StaffInboxPagedSource<T>,
  pageIndex: number,
  revision: number,
  evictedDocumentIds: readonly string[],
  emit: () => void,
): Promise<void> {
  if (evictedDocumentIds.length === 0) {
    return;
  }

  let verifiedRecords: Map<string, T>;
  try {
    verifiedRecords = await lookupSourceRecords(source, evictedDocumentIds);
  } catch (error) {
    source.error = error instanceof Error ? error.message : String(error);
    emit();
    return;
  }

  const page = source.pages[pageIndex];
  if (!page || page.revision !== revision) {
    return;
  }

  const pageState = {
    records: page.docs,
    windowDocumentIds: page.rawDocumentIds,
    hasMore: page.hasMore,
    revision: page.revision,
  };
  applyStaffInboxPageVerification(pageState, evictedDocumentIds, verifiedRecords);

  for (const documentId of evictedDocumentIds) {
    const verifiedRecord = verifiedRecords.get(documentId);
    for (const candidatePage of source.pages) {
      if (verifiedRecord) {
        if (candidatePage.docs.has(documentId)) {
          candidatePage.docs.set(documentId, verifiedRecord);
        }
      } else {
        candidatePage.docs.delete(documentId);
        candidatePage.rawDocumentIds.delete(documentId);
      }
    }
  }

  if (source.key === "requests") {
    for (const documentId of evictedDocumentIds) {
      if (!verifiedRecords.has(documentId)) {
        source.hydratedRecords.delete(documentId);
      }
    }
  }

  source.records = mapSourceRecords(source);
  emit();
}

function openSourcePage<T>(
  source: StaffInboxPagedSource<T>,
  pageIndex: number,
  emit: () => void,
): Promise<void> {
  const page = source.pages[pageIndex];
  if (!page) {
    return Promise.resolve();
  }

  const previousPage = source.pages[pageIndex - 1];
  const cursor = previousPage?.cursor ?? null;
  const pageQuery = buildPagedSourceQuery(source, cursor);
  let settled = false;

  const settle = () => {
    if (settled) {
      return;
    }
    settled = true;
  };

  const firstEmission = new Promise<void>((resolve) => {
    const finish = () => {
      settle();
      resolve();
    };

    try {
      traceFirestoreListenerAttach({ ...source.trace, source: `${source.trace.source}.page-${pageIndex}` });
      const unsubscribe = onSnapshot(
        pageQuery,
        (querySnapshot) => {
          traceFirestoreListenerEmission({ ...source.trace, source: `${source.trace.source}.page-${pageIndex}` }, querySnapshot.size);
          const evictedDocumentIds = applySourcePageSnapshot(source, pageIndex, querySnapshot);
          source.error = null;
          emit();
          if (evictedDocumentIds.length > 0) {
            void reconcileSourcePageEvictions(
              source,
              pageIndex,
              source.pages[pageIndex]?.revision ?? 0,
              evictedDocumentIds,
              emit,
            );
          }
          finish();
        },
        (error) => {
          page.hasMore = false;
          source.error = error.message;
          emit();
          finish();
        },
      );
      page.unsubscribe = traceWrappedUnsubscribe(
        { ...source.trace, source: `${source.trace.source}.page-${pageIndex}` },
        unsubscribe,
      );
    } catch (error) {
      source.error = error instanceof Error ? error.message : String(error);
      emit();
      finish();
    }
  });

  return firstEmission;
}

function appendSourcePage<T>(
  source: StaffInboxPagedSource<T>,
  emit: () => void,
): Promise<void> {
  const lastPage = source.pages[source.pages.length - 1];
  if (source.pages.length > 0 && (!lastPage || !lastPage.hasMore || !lastPage.cursor)) {
    return Promise.resolve();
  }

  source.pages.push({
    cursor: null,
    docs: new Map(),
    hasMore: source.pages.length === 0,
    rawDocumentIds: new Set(),
    unsubscribe: null,
    hasEmitted: false,
    revision: 0,
  });

  return openSourcePage(source, source.pages.length - 1, emit);
}

function getSourceHasMore(source: { pages: Array<{ hasMore: boolean }> }): boolean {
  return source.pages[source.pages.length - 1]?.hasMore ?? false;
}

function getSourceLoadedCount<T>(source: StaffInboxPagedSource<T>): number {
  return source.records.size;
}

function buildSnapshot(
  requestSource: StaffInboxPagedSource<StaffInboxPortalRequestSnapshot>,
  allocationSource: StaffInboxPagedSource<StaffInboxPortalAllocationSnapshot>,
  showSource: StaffInboxPagedSource<StaffInboxSubscribedShow>,
  reportSource: StaffInboxPagedSource<DesignIssueReport>,
): StaffInboxSubscriptionSnapshot {
  const portalRequests = [...requestSource.records.values()].sort((left, right) =>
    compareDescending(left.updatedAtMillis, right.updatedAtMillis, left.id, right.id),
  );
  const portalAllocations = [...allocationSource.records.values()].sort((left, right) =>
    compareDescending(
      left.updatedAtMillis ?? left.createdAtMillis,
      right.updatedAtMillis ?? right.createdAtMillis,
      left.allocationId ?? `${left.printRequestId}:${left.upcomingShowId}`,
      right.allocationId ?? `${right.printRequestId}:${right.upcomingShowId}`,
    ),
  );
  const shows = [...showSource.records.values()].sort((left, right) =>
    compareDescending(left.snapshot.updatedAtMillis, right.snapshot.updatedAtMillis, left.snapshot.id, right.snapshot.id),
  );
  const designIssueReports = [...reportSource.records.values()].sort((left, right) =>
    compareDescending(left.createdAtMillis, right.createdAtMillis, left.id, right.id),
  );

  return { portalRequests, portalAllocations, shows, designIssueReports };
}

export const staffInboxSubscriptionService = {
  subscribe(onStateChange: (state: StaffInboxSubscriptionState) => void): StaffInboxSubscriptionController {
    const requestSource = createPagedSource({
      collection: firestoreCollectionService.getPrintRequestsCollection(),
      key: "requests",
      orderField: "updatedAt",
      pageSize: STAFF_INBOX_REQUEST_PAGE_SIZE,
      baseConstraints: [where("requestOrigin", "==", "portal_customer")],
      mapDocument: mapPortalRequestSnapshot,
      trace: REQUESTS_TRACE,
    });
    const allocationSource = createPagedSource({
      collection: firestoreCollectionService.getShowAllocationsCollection(),
      key: "allocations",
      orderField: "updatedAt",
      pageSize: STAFF_INBOX_ALLOCATION_PAGE_SIZE,
      baseConstraints: [where("requestOriginSnapshot", "==", "portal_customer")],
      mapDocument: (id, data) => mapPortalAllocationSnapshot(data, id),
      trace: ALLOCATIONS_TRACE,
    });
    const showSource = createPagedSource({
      collection: firestoreCollectionService.getUpcomingShowsCollection(),
      key: "shows",
      orderField: "updatedAt",
      pageSize: STAFF_INBOX_SHOW_PAGE_SIZE,
      baseConstraints: [],
      mapDocument: mapSubscribedShow,
      trace: SHOWS_TRACE,
    });
    const reportSource = createPagedSource({
      collection: firestoreCollectionService.getDesignIssueReportsCollection(),
      key: "designIssueReports",
      orderField: "createdAt",
      pageSize: STAFF_INBOX_DESIGN_REPORT_PAGE_SIZE,
      baseConstraints: [where("status", "==", "open")],
      mapDocument: mapDesignIssueReport,
      trace: DESIGN_REPORTS_TRACE,
    });

    const sources = [requestSource, allocationSource, showSource, reportSource] as const;
    const alertSources = [allocationSource, showSource, reportSource] as const;
    let isLoadingMore = false;
    let requestHydrationPromise: Promise<void> | null = null;
    const hydratedRequestIds = new Set<string>();

    const emit = () => {
      const snapshot = buildSnapshot(requestSource, allocationSource, showSource, reportSource);
      onStateChange({
        snapshot,
        pagination: {
          hasMore: alertSources.some((source) => getSourceHasMore(source)),
          isLoadingMore,
          loadedCounts: {
            portalRequests: getSourceLoadedCount(requestSource),
            portalAllocations: getSourceLoadedCount(allocationSource),
            shows: getSourceLoadedCount(showSource),
            designIssueReports: getSourceLoadedCount(reportSource),
          },
        },
        requestError: requestSource.error,
        allocationError: allocationSource.error,
        showError: showSource.error,
        designIssueReportError: reportSource.error,
      });
    };

    const hydrateMissingRequests = (): Promise<void> => {
      if (requestHydrationPromise) {
        return requestHydrationPromise;
      }

      requestHydrationPromise = (async () => {
        const missingRequestIds = [
          ...new Set(
            [...allocationSource.records.values()].map((allocation) => allocation.printRequestId),
          ),
        ].filter((requestId) => !requestSource.records.has(requestId) && !hydratedRequestIds.has(requestId));

        for (let index = 0; index < missingRequestIds.length; index += REQUEST_HYDRATION_CHUNK_SIZE) {
          const chunk = missingRequestIds.slice(index, index + REQUEST_HYDRATION_CHUNK_SIZE);
          if (chunk.length === 0) {
            continue;
          }

          const snapshot = await getDocs(
            query(
              requestSource.collection,
              where(documentId(), "in", chunk),
              where("requestOrigin", "==", "portal_customer"),
            ),
          );

          for (const document of snapshot.docs) {
            const mapped = mapPortalRequestSnapshot(document.id, document.data());
            if (mapped) {
              requestSource.hydratedRecords.set(document.id, mapped);
            }
          }

          for (const requestId of chunk) {
            hydratedRequestIds.add(requestId);
          }

          requestSource.records = mapSourceRecords(requestSource);
        }
      })()
        .catch((error: unknown) => {
          requestSource.error = error instanceof Error ? error.message : String(error);
        })
        .finally(() => {
          requestHydrationPromise = null;
        });

      return requestHydrationPromise;
    };

    const openPage = async <T,>(source: StaffInboxPagedSource<T>): Promise<void> => {
      await appendSourcePage(source, emit);
      if (source.key === "allocations") {
        await hydrateMissingRequests();
        emit();
      }
    };

    const loadMore = async (): Promise<void> => {
      if (isLoadingMore) {
        return;
      }

      const sourcesWithMore = alertSources.filter((source) => getSourceHasMore(source));
      if (sourcesWithMore.length === 0) {
        return;
      }

      isLoadingMore = true;
      emit();

      try {
        await Promise.all(
          sourcesWithMore.map((source) => {
            if (source.key === "requests") {
              return openPage(requestSource);
            }
            if (source.key === "allocations") {
              return openPage(allocationSource);
            }
            if (source.key === "shows") {
              return openPage(showSource);
            }
            return openPage(reportSource);
          }),
        );
        await hydrateMissingRequests();
      } finally {
        isLoadingMore = false;
        emit();
      }
    };

    let isUnsubscribed = false;
    const unsubscribe = () => {
      if (isUnsubscribed) {
        return;
      }
      isUnsubscribed = true;
      for (const source of sources) {
        for (const page of source.pages) {
          page.unsubscribe?.();
          page.unsubscribe = null;
        }
      }
    };

    for (const source of sources) {
      source.pages.push({
        cursor: null,
        docs: new Map(),
        hasMore: true,
        rawDocumentIds: new Set(),
        unsubscribe: null,
        hasEmitted: false,
        revision: 0,
      });
      const initialPage =
        source.key === "requests"
          ? openSourcePage(requestSource, 0, emit)
          : source.key === "allocations"
            ? openSourcePage(allocationSource, 0, emit)
            : source.key === "shows"
              ? openSourcePage(showSource, 0, emit)
              : openSourcePage(reportSource, 0, emit);

      void initialPage.then(() => {
        if (source.key === "allocations") {
          return hydrateMissingRequests().then(emit);
        }
        return undefined;
      });
    }

    return { loadMore, unsubscribe };
  },
};
