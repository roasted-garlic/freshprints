import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { ExternalLink, ImagePlus, Plus, RefreshCw, Search, X } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { DangerOverflowMenu } from "../../../shared/components/DangerOverflowMenu";
import { DismissibleSuccessAlert } from "../../../shared/components/DismissibleSuccessAlert";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Badge } from "../../../shared/components/Badge";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { isActiveCustomerAccount } from "../../users/utils/customerDirectoryVisibility";
import { convertCustomerPrintRequestService } from "../services/convertCustomerPrintRequestService";
import { printRequestService, type UpdatePrintRequestItemInput } from "../services/printRequestService";
import { clearPrintRequestsPageCache } from "../services/printRequestsPageReadCache";
import { usePrintRequestDetails } from "../hooks/usePrintRequestDetails";
import { usePrintRequests } from "../hooks/usePrintRequests";
import { useReadyDesignsForSelection } from "../hooks/useReadyDesignsForSelection";
import { PrintRequestItemCard } from "../components/PrintRequestItemCard";
import { PrintRequestItemsPreviewLightbox } from "../components/PrintRequestItemsPreviewLightbox";
import { useStandardPrintSizesSettings } from "../../settings/hooks/useStandardPrintSizesSettings";
import { useShowQueueSettings } from "../../upcoming-shows/hooks/useShowQueueSettings";
import { useInternalGangSheetSettings } from "../../upcoming-shows/hooks/useInternalGangSheetSettings";
import { resolveGangSheetSectionPricingFromSettings } from "@fresh-prints/shared/constants/gangSheetSectionPricingSettings.constants";
import {
  formatPocketFullSizeCountsLabel,
  resolvePrintRequestPocketFullSizeCounts,
} from "@fresh-prints/shared/utils/printRequestPocketFullSizeCounts";
import { buildPrintRequestItemSummaries } from "../utils/printRequestQueryPlanning";
import { AddToShowModal } from "../components/AddToShowModal";
import { TransferPrintRequestToShowModal } from "../components/TransferPrintRequestToShowModal";
import { formatPrintRequestShowTransferActionLabel, resolvePrintRequestShowTransferMode } from "@fresh-prints/shared/utils/printRequestShowTransfer";
import { PrintRequestDeletionDialog } from "../components/PrintRequestDeletionDialog";
import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { SetPrintRequestItemArtworkEnhanceModeResponse } from "@fresh-prints/shared/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { formatCustomerIdentityLabel } from "@fresh-prints/shared/utils/formatCustomerIdentityLabel";
import { formatCustomerUsernameForDisplay } from "@fresh-prints/shared/utils/formatCustomerUsernameForDisplay";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import { formatInternalPrintRequestName } from "@fresh-prints/shared/utils/printRequestNaming";
import { mergePrintRequestItemPreservingArtworkEnhanceFields } from "@fresh-prints/shared/utils/printRequestItemArtworkEnhanceFields";
import { getPrintRequestOriginBadgeLabel } from "@fresh-prints/shared/utils/printRequestOrigin";
import { evaluateCustomerPrintRequestConversionEligibility, isPrintRequestConvertedToInternal } from "@fresh-prints/shared/utils/printRequestConversion";
import { getPrintRequestTabHelperCopy } from "@fresh-prints/shared/staffInbox/printRequestTabHelperCopy";
import { derivePrintRequestQueueState, isPrintRequestFullyPrinted } from "@fresh-prints/shared/utils/printRequestQueueState";
import { derivePrintRequestListTab, type PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";
import {
  getPrintRequestWorkingTriageLabel,
  isPrintRequestIncludedInListTabs,
  PRINT_REQUEST_WORKING_TRIAGE_FILTERS,
  resolvePrintRequestWorkingTriageBucket,
  type PrintRequestWorkingTriageFilter,
} from "@fresh-prints/shared/utils/printRequestWorkingTriage";
import { groupAllocationsByShow } from "@fresh-prints/shared/utils/groupAllocationsByShow";
import {
  groupPrintRequestsByShow,
  UNASSIGNED_SHOW_SECTION_KEY,
  type PrintRequestShowSection,
} from "@fresh-prints/shared/utils/groupPrintRequestsByShow";
import { assessShowCapacity } from "@fresh-prints/shared/utils/showCapacity";
import {
  formatShowCapacitySlotLabel,
  getCapacityFillLevel,
  getShowCapacityPercent,
} from "@fresh-prints/shared/utils/showCapacityDisplay";
import { resolveShowDisplayAllocatedQuantity } from "@fresh-prints/shared/utils/showDisplayAllocatedQuantity";
import { canRemoveRequestFromShow } from "@fresh-prints/shared/utils/showQueueEditability";
import {
  summarizePrintRequestPersistenceHealth,
  type PrintRequestItemPersistenceHealth,
} from "@fresh-prints/shared/utils/printRequestItemPersistenceHealth";
import { getPrintRequestQueueStateBadgeLabel, getPrintRequestQueueStateBadgeVariant } from "../utils/printRequestQueueBadge";
import {
  getPrintRequestRequeueBadgeLabel,
  getPrintRequestRequeueBadgeTitle,
  getPrintRequestRequeueBadgeVariant,
  shouldShowPrintRequestRequeueBadge,
} from "../utils/printRequestRequeueBadge";
import { filterPrintRequestsByListSearch } from "../utils/printRequestListSearch";
import { filterPrintRequestsByActiveTab } from "../utils/filterPrintRequestsByActiveTab";
import { filterPrintRequestsByRequestKind } from "../utils/filterPrintRequestsByRequestKind";
import {
  PRINT_REQUEST_ID_QUERY_PARAM,
  PRINT_REQUEST_KIND_QUERY_PARAM,
  PRINT_REQUEST_TAB_QUERY_PARAM,
  PRINT_REQUEST_WORKING_FILTER_QUERY_PARAM,
  getPrintRequestsPath,
  buildPrintRequestNavigationDeepLinkPath,
  getPrintRequestListTabsForKind,
  isInternalFromPrintRequestListKind,
  isPrintRequestRouteTab,
  isPrintRequestWorkingFilter,
  normalizePrintRequestListTabForKind,
  printRequestListKindFromIsInternal,
  resolveCanonicalPrintRequestsRoute,
  resolvePrintRequestListKind,
  resolveWorkingFilterClick,
  shouldReplacePrintRequestsPath,
  type PrintRequestRouteTab,
  type PrintRequestRouteTriageRequest,
} from "../constants/printRequestRoutes";
import { getDesignLibraryPath } from "../../designs/constants/designLibraryFilters";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { formatUpcomingShowTitle, formatUpcomingShowTimestampLabel } from "../../upcoming-shows/utils/upcomingShowDisplay";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import { buildShowQueueDeepLinkPath } from "../../upcoming-shows/utils/buildShowQueueDeepLinkPath";

type CustomerMode = "internal" | "customer";

interface PrintRequestFormState {
  customerMode: CustomerMode;
  customerId: string;
  internalBaseName: string;
  notes: string;
}

const DEFAULT_REQUEST_FORM: PrintRequestFormState = {
  customerMode: "internal",
  customerId: "",
  internalBaseName: "",
  notes: "",
};

const CUSTOMER_MODE_OPTIONS = [
  { label: "Internal", value: "internal" },
  { label: "Customer", value: "customer" },
];

type AutosaveStatus = "idle" | "saving" | "saved" | "failed";

interface AutosaveState {
  status: AutosaveStatus;
  message?: string;
  retry?: () => Promise<void>;
}

function formatTimestampLabel(value: { toDate: () => Date } | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return value.toDate().toLocaleString();
}

function getPrintRequestCustomerLabel(
  printRequest: PrintRequest | null,
  customersById: ReadonlyMap<string, Customer>,
): string {
  if (!printRequest) {
    return "No request selected";
  }

  if (printRequest.isInternal) {
    return "Internal";
  }

  if (printRequest.customerId) {
    const customer = customersById.get(printRequest.customerId);
    const usernameLabel = formatCustomerIdentityLabel({
      currentUsername: printRequest.customerUsernameSnapshot ?? customer?.username,
      usernameAtCreation: printRequest.customerUsernameAtCreationSnapshot,
      currentDisplayName: printRequest.customerDisplayNameSnapshot ?? customer?.displayName,
    });

    if (!customer) {
      return usernameLabel;
    }

    if (customer.isDeleted === true) {
      const deletedUsername = formatCustomerUsernameForDisplay(customer.username, {
        isDeleted: true,
      });
      return `${customer.displayName} (${deletedUsername})`;
    }

    return usernameLabel;
  }

  return "Unassigned";
}

function getStatusBadgeVariant(status: PrintRequest["status"]) {
  switch (status) {
    case "active":
      return "success";
    case "completed":
      return "info";
    case "editing":
      return "warning";
    case "archived":
      return "warning";
    case "draft":
    default:
      return "default";
  }
}

function formatWriteErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unable to complete the requested write.";

  if (/permission/i.test(message)) {
    return `${message} Firestore permissions for print requests may still be pending review.`;
  }

  return message;
}

function formatDesignCountLabel(count: number): string {
  return `${count} design${count === 1 ? "" : "s"}`;
}

function formatTotalQuantityLabel(quantity: number): string {
  return `${quantity} total qty`;
}

function emptyPrintRequestItemSummary(): {
  totalQuantity: number;
  uniqueDesignCount: number;
  sizeClassRows: Array<{ printWidthInches: number; quantity: number }>;
} {
  return { totalQuantity: 0, uniqueDesignCount: 0, sizeClassRows: [] };
}

function summarizeItemsForRequest(printRequestId: string, items: PrintRequestItem[]) {
  return (
    buildPrintRequestItemSummaries(items)[printRequestId] ?? {
      totalQuantity: 0,
      uniqueDesignCount: 0,
      sizeClassRows: [],
    }
  );
}

function resolveSectionShowCapacity(
  section: PrintRequestShowSection<
    Pick<UpcomingShow, "id" | "scheduledStartAt" | "allocatedQuantity" | "maxTotalQuantity">
  >,
  allocationsByRequestId: Readonly<Record<string, readonly ShowAllocation[]>>,
) {
  if (!section.show) {
    return null;
  }

  const sectionAllocations = section.requests.flatMap((request) =>
    (allocationsByRequestId[request.id] ?? []).filter(
      (allocation) => allocation.upcomingShowId === section.show!.id,
    ),
  );
  const allocatedQuantity = resolveShowDisplayAllocatedQuantity({
    show: section.show,
    allocations: sectionAllocations,
  });

  if (allocatedQuantity <= 0 && section.show.allocatedQuantity === 0) {
    return null;
  }

  return assessShowCapacity({
    maxTotalQuantity: section.show.maxTotalQuantity,
    allocatedQuantity,
  });
}

function hasUsableRequestSequence(printRequest: PrintRequest): boolean {
  return Number.isInteger(printRequest.requestSequenceNumber) && (printRequest.requestSequenceNumber ?? 0) >= 1;
}

function getInternalBaseNameDraft(printRequest: PrintRequest): string {
  return printRequest.internalBaseName ?? "internal";
}

function getRequestNamePreview(printRequest: PrintRequest, internalBaseName: string): string {
  const sequence = printRequest.requestSequenceNumber;

  if (!printRequest.isInternal || typeof sequence !== "number" || !Number.isInteger(sequence) || sequence < 1) {
    return printRequest.name;
  }

  try {
    return formatInternalPrintRequestName(internalBaseName, sequence);
  } catch {
    return printRequest.name;
  }
}

function isRequestDetailDirty(printRequest: PrintRequest, notes: string, internalBaseName: string): boolean {
  const notesChanged = notes.trim() !== (printRequest.notes ?? "");
  const internalBaseNameChanged =
    printRequest.isInternal &&
    hasUsableRequestSequence(printRequest) &&
    getRequestNamePreview(printRequest, internalBaseName) !== printRequest.name;

  return notesChanged || internalBaseNameChanged;
}

export function PrintRequestsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { settings: standardPrintSizesSettings } = useStandardPrintSizesSettings();
  const showQueueSettings = useShowQueueSettings();
  const internalGangSheetSettings = useInternalGangSheetSettings();
  const showQueueSizeCutoffInches = resolveGangSheetSectionPricingFromSettings(
    showQueueSettings.settings,
  ).sizeCutoffInches;
  const internalSizeCutoffInches = resolveGangSheetSectionPricingFromSettings(
    internalGangSheetSettings.settings,
  ).sizeCutoffInches;
  const tabParam = searchParams.get(PRINT_REQUEST_TAB_QUERY_PARAM);
  const kindParam = searchParams.get(PRINT_REQUEST_KIND_QUERY_PARAM);
  const selectedRequestIdParam = searchParams.get(PRINT_REQUEST_ID_QUERY_PARAM);
  const workingFilterParam = searchParams.get(PRINT_REQUEST_WORKING_FILTER_QUERY_PARAM);
  const activeListKind = resolvePrintRequestListKind(kindParam);
  const activeIsInternal = isInternalFromPrintRequestListKind(activeListKind);
  const activeListTab: PrintRequestListTab = normalizePrintRequestListTabForKind(
    isPrintRequestRouteTab(tabParam) ? tabParam : "working",
    activeListKind,
  );
  const visibleStatusTabs = getPrintRequestListTabsForKind(activeListKind);
  const workingTriageFilter: PrintRequestWorkingTriageFilter =
    isPrintRequestWorkingFilter(workingFilterParam) ? workingFilterParam : "active";
  const selectedRequestId = selectedRequestIdParam;
  const commitPrintRequestsRoute = useCallback(
    (
      options: {
        requestId?: string;
        kind?: typeof activeListKind;
        tab: PrintRequestListTab;
        workingFilter?: PrintRequestWorkingTriageFilter;
      },
      history: "push" | "replace" = "replace",
    ) => {
      const next = { ...options, kind: options.kind ?? activeListKind };
      const target = getPrintRequestsPath(next);
      const current = `${location.pathname}${location.search}`;
      if (!shouldReplacePrintRequestsPath(
        {
          requestId: selectedRequestIdParam,
          kind: kindParam,
          tab: tabParam,
          workingFilter: workingFilterParam,
        },
        next,
      ) && current === target) {
        return;
      }

      navigate(target, { replace: history === "replace" });
    },
    [
      activeListKind,
      kindParam,
      location.pathname,
      location.search,
      navigate,
      selectedRequestIdParam,
      tabParam,
      workingFilterParam,
    ],
  );

  useEffect(() => {
    if (!activeIsInternal || tabParam !== "printing") {
      return;
    }

    commitPrintRequestsRoute({
      kind: activeListKind,
      tab: "printed",
      requestId: selectedRequestId ?? undefined,
    });
  }, [activeIsInternal, activeListKind, commitPrintRequestsRoute, selectedRequestId, tabParam]);

  const [listSearchQuery, setListSearchQuery] = useState("");
  const previousSelectedRequestIdRef = useRef<string | null | undefined>(undefined);

  const {
    allocationTotalsByRequestId,
    allocationsByRequestId,
    countsByTab,
    customersById,
    ensureRequestLoaded,
    error: requestsError,
    hasMore: hasMoreRequests,
    insertCreatedRequestLocally,
    isLoading: isRequestsLoading,
    isLoadingMore: isLoadingMoreRequests,
    loadMore: loadMoreRequests,
    patchRequestLocally,
    patchSummaryLocally,
    reconcileDeletedOrArchivedRequest,
    refreshAllocationHydration,
    reloadPrintRequests,
    requests,
    showsById,
    summariesByRequestId,
  } = usePrintRequests(activeListTab, activeIsInternal);

  // Deep-linked/selected requests outside the currently loaded page are fetched by direct ID —
  // never by widening the page query (Wave C hydration remediation, 2026-07-25).
  useEffect(() => {
    if (selectedRequestId) {
      void ensureRequestLoaded(selectedRequestId);
    }
  }, [ensureRequestLoaded, selectedRequestId]);

  // Full customer directory is only needed for the "create request for a customer" picker —
  // loaded lazily when that form is actually shown, never on page mount.
  const [customerDirectory, setCustomerDirectory] = useState<Customer[]>([]);
  const [customerIdsWithContinuableRequest, setCustomerIdsWithContinuableRequest] = useState<
    Set<string>
  >(new Set());
  const [isCustomerDirectoryLoading, setIsCustomerDirectoryLoading] = useState(false);

  const requestDetails = usePrintRequestDetails(selectedRequestId);
  const isLoadedSelectedRequest = requestDetails.loadedRequestId === selectedRequestId;
  const selectedRequest = isLoadedSelectedRequest ? requestDetails.printRequest : null;
  const requestItems = useMemo(
    () => isLoadedSelectedRequest ? requestDetails.items : [],
    [isLoadedSelectedRequest, requestDetails.items],
  );

  useEffect(() => {
    setLightboxItemId(null);
  }, [selectedRequestId]);

  const selectedDesignIds = useMemo(
    () =>
      requestItems.flatMap((item) => item.designId ? [item.designId] : []),
    [requestItems],
  );
  const {
    designs: readyDesigns,
    isLoading: isReadyDesignsLoading,
    reloadDesigns: reloadReadyDesigns,
  } = useReadyDesignsForSelection(selectedDesignIds);
  const uploadSummariesById = isLoadedSelectedRequest ? requestDetails.uploadSummaries : new Map();
  const requestError = isLoadedSelectedRequest ? requestDetails.error : null;
  const isRequestLoading = requestDetails.isLoading || (Boolean(selectedRequestId) && !isLoadedSelectedRequest);
  const reloadPrintRequest = requestDetails.reloadPrintRequest;
  const insertRequestItemAfter = requestDetails.insertItemAfter;
  const removeRequestItem = requestDetails.removeItem;
  const replaceRequestItem = requestDetails.replaceItem;
  const replaceSelectedRequest = requestDetails.replacePrintRequest;
  const visibleSelectedRequest = isRequestLoading ? null : selectedRequest;

  useEffect(() => {
    if (!visibleSelectedRequest || visibleSelectedRequest.isInternal) {
      return;
    }

    const internalRequestId = visibleSelectedRequest.convertedToInternalRequestId?.trim();
    if (
      !isPrintRequestConvertedToInternal(visibleSelectedRequest.closureKind) ||
      !internalRequestId ||
      selectedRequestId !== visibleSelectedRequest.id
    ) {
      return;
    }

    navigate(
      buildPrintRequestNavigationDeepLinkPath({
        id: visibleSelectedRequest.id,
        closureKind: visibleSelectedRequest.closureKind,
        convertedToInternalRequestId: internalRequestId,
      }).path,
      { replace: true },
    );
  }, [navigate, selectedRequestId, visibleSelectedRequest]);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({ status: "idle" });
  const [itemPersistenceHealth, setItemPersistenceHealth] = useState<
    Record<string, PrintRequestItemPersistenceHealth>
  >({});
  const itemFlushersRef = useRef(new Map<string, () => Promise<boolean>>());
  const [isFlushingQueue, setIsFlushingQueue] = useState(false);
  const [requestNotesDraft, setRequestNotesDraft] = useState("");
  const [internalBaseNameDraft, setInternalBaseNameDraft] = useState("internal");
  const [isSavingRequestDetail, setIsSavingRequestDetail] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRequestForm, setCreateRequestForm] = useState<PrintRequestFormState>(DEFAULT_REQUEST_FORM);
  const [isRequestDetailExpanded, setIsRequestDetailExpanded] = useState(false);
  const [successAlertSeed, setSuccessAlertSeed] = useState(0);
  const [isRepairingQueueTab, setIsRepairingQueueTab] = useState(false);
  const [isAddToShowModalOpen, setIsAddToShowModalOpen] = useState(false);
  const [addToShowDestination, setAddToShowDestination] = useState<"shows" | "staff_gang_sheet">("shows");
  const [selectedRequestAllocations, setSelectedRequestAllocations] = useState<ShowAllocation[]>([]);
  const [isConfirmingShowQueueRemoval, setIsConfirmingShowQueueRemoval] = useState(false);
  const [isRemovingFromShowQueue, setIsRemovingFromShowQueue] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletionDialogOpen, setIsDeletionDialogOpen] = useState(false);
  const [isConvertConfirmOpen, setIsConvertConfirmOpen] = useState(false);
  const [isConvertingRequest, setIsConvertingRequest] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [isClearingAllItems, setIsClearingAllItems] = useState(false);
  const [lightboxItemId, setLightboxItemId] = useState<string | null>(null);
  const [clearAllError, setClearAllError] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [transferShowContext, setTransferShowContext] = useState<{
    sourceShowId: string;
    transferQuantity: number;
  } | null>(null);

  const reloadSelectedRequestAllocations = useCallback(async () => {
    if (!user || !visibleSelectedRequest) {
      setSelectedRequestAllocations([]);
      return;
    }

    const allocations = await upcomingShowService.listShowAllocationsForPrintRequest(user, visibleSelectedRequest.id);
    setSelectedRequestAllocations(allocations.filter((allocation) => allocation.status !== "canceled"));
  }, [user, visibleSelectedRequest]);

  useEffect(() => {
    void reloadSelectedRequestAllocations();
  }, [reloadSelectedRequestAllocations]);

  useEffect(() => {
    setIsConfirmingShowQueueRemoval(false);
  }, [selectedRequestId]);

  const selectedRequestShowGroups = useMemo(
    () => groupAllocationsByShow(selectedRequestAllocations),
    [selectedRequestAllocations],
  );

  // Only the shows the selected request is actually queued to — direct-ID reads, never the full
  // upcomingShows collection (Wave C hydration remediation, 2026-07-25).
  const [selectedRequestShowsById, setSelectedRequestShowsById] = useState<Map<string, UpcomingShow>>(
    new Map(),
  );
  const showGroupIdsKey = selectedRequestShowGroups.map((group) => group.upcomingShowId).sort().join("|");
  useEffect(() => {
    if (!user || !showGroupIdsKey) {
      setSelectedRequestShowsById(new Map());
      return;
    }
    let cancelled = false;
    void upcomingShowService
      .getUpcomingShowsByIds(user, showGroupIdsKey.split("|"))
      .then((shows) => {
        if (cancelled) return;
        setSelectedRequestShowsById(new Map(shows.map((show) => [show.id, show])));
      });
    return () => {
      cancelled = true;
    };
  }, [showGroupIdsKey, user]);

  /**
   * Mirrors the Show Detail page's removal gate (`canRemoveRequestFromShow`): once any show the
   * request is queued to has started printing or further along, removal must go through an admin
   * correction instead of this normal remove-from-here flow.
   */
  
  const conversionEligibility = useMemo(() => {
    if (!visibleSelectedRequest || visibleSelectedRequest.isInternal) {
      return null;
    }

    const linkedShowsPrinting = selectedRequestShowGroups.some((group) => {
      const show = selectedRequestShowsById.get(group.upcomingShowId);
      return show?.productionStatus === "printing";
    });

    return evaluateCustomerPrintRequestConversionEligibility({
      isInternal: visibleSelectedRequest.isInternal,
      requestOrigin: visibleSelectedRequest.requestOrigin,
      closureKind: visibleSelectedRequest.closureKind,
      status: visibleSelectedRequest.status,
      allocations: selectedRequestAllocations.map((allocation) => ({
        id: allocation.id,
        upcomingShowId: allocation.upcomingShowId,
        status: allocation.status,
        allocatedQuantity: allocation.allocatedQuantity,
        requestNameSnapshot: allocation.requestNameSnapshot,
      })),
      linkedShowsPrinting,
    });
  }, [
    selectedRequestAllocations,
    selectedRequestShowGroups,
    selectedRequestShowsById,
    visibleSelectedRequest,
  ]);

  const handleConvertToInternal = useCallback(async () => {
    if (!visibleSelectedRequest || !conversionEligibility?.eligible) {
      return;
    }

    setIsConvertingRequest(true);
    setConvertError(null);

    try {
      const result = await convertCustomerPrintRequestService.convertCustomerPrintRequestToInternal({
        printRequestId: visibleSelectedRequest.id,
        internalBaseName:
          visibleSelectedRequest.customerUsernameSnapshot ??
          visibleSelectedRequest.internalBaseName ??
          "internal",
        confirmCancelAllocations: conversionEligibility.cancelableAllocations.length > 0,
      });

      setIsConvertConfirmOpen(false);
      setSuccessMessage(
        result.alreadyConverted
          ? `Request already converted to ${result.internalRequestName}.`
          : `Converted to internal request ${result.internalRequestName}.`,
      );
      reconcileDeletedOrArchivedRequest(visibleSelectedRequest.id, "archived");
      if (user) {
        clearPrintRequestsPageCache();
      }
      await reloadPrintRequests({ silent: true });
      navigate(
        getPrintRequestsPath({
          kind: "internal",
          tab: "working",
          requestId: result.internalRequestId,
        }),
      );
    } catch (error) {
      setConvertError(error instanceof Error ? error.message : "Unable to convert this request.");
    } finally {
      setIsConvertingRequest(false);
    }
  }, [
    conversionEligibility,
    navigate,
    reconcileDeletedOrArchivedRequest,
    reloadPrintRequests,
    user,
    visibleSelectedRequest,
  ]);

  const canRemoveSelectedRequestFromShowQueue = selectedRequestShowGroups.every((group) => {
    const show = selectedRequestShowsById.get(group.upcomingShowId);
    return !show || canRemoveRequestFromShow(show.productionStatus);
  });

  /**
   * Allocating/removing from a show can flip the print request's persisted `status` (e.g.
   * `editing` -> `active` on re-add) and its server-maintained `queueTab` (via the
   * `onShowAllocationQueueTabInputWritten` trigger). The request detail's own reload remains
   * authoritative for the open selection; the visible list is reconciled by refetching just this
   * one request by ID and patching it locally — never a full-list/allocation-totals scan (Wave C
   * hydration remediation, 2026-07-25).
   */
  const reloadAllAllocationData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const requestId = visibleSelectedRequest?.id;
    const [, , [refreshedRequest]] = await Promise.all([
      reloadPrintRequest(silent ? { silent: true } : undefined),
      reloadSelectedRequestAllocations(),
      requestId && user ? printRequestService.getPrintRequestsByIds(user, [requestId]) : Promise.resolve([]),
    ]);
    if (refreshedRequest) {
      patchRequestLocally(refreshedRequest.id, refreshedRequest);
    }
  }, [patchRequestLocally, reloadPrintRequest, reloadSelectedRequestAllocations, user, visibleSelectedRequest?.id]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setActionError(null);

    try {
      await Promise.all([
        reloadPrintRequests({ silent: true }),
        reloadReadyDesigns({ silent: true }),
        reloadPrintRequest({ silent: true }),
        reloadSelectedRequestAllocations(),
      ]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to refresh print requests.");
    } finally {
      setIsRefreshing(false);
    }
  }, [
    reloadPrintRequest,
    reloadPrintRequests,
    reloadReadyDesigns,
    reloadSelectedRequestAllocations,
  ]);

  const handleRemoveSelectedRequestFromShowQueue = useCallback(async () => {
    if (!user || !visibleSelectedRequest || selectedRequestShowGroups.length === 0) {
      return;
    }

    setIsRemovingFromShowQueue(true);
    setActionError(null);

    try {
      const requestId = visibleSelectedRequest.id;
      for (const group of selectedRequestShowGroups) {
        await upcomingShowService.removeShowAllocationsForRequest(user, group.upcomingShowId, requestId);
      }

      setIsConfirmingShowQueueRemoval(false);
      // List tabs key off persisted queueTab (detail badges already flip from live allocations).
      // Clear remount cache, patch locally, then route to Editing so the tab effect reloads fresh.
      clearPrintRequestsPageCache();
      patchRequestLocally(requestId, { queueTab: "editing", status: "editing" });
      commitPrintRequestsRoute({ requestId, kind: activeListKind, tab: "editing" });
      await Promise.all([
        refreshAllocationHydration(),
        reloadAllAllocationData({ silent: true }),
      ]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to remove this request from the show queue.");
    } finally {
      setIsRemovingFromShowQueue(false);
    }
  }, [
    commitPrintRequestsRoute,
    patchRequestLocally,
    reloadAllAllocationData,
    refreshAllocationHydration,
    selectedRequestShowGroups,
    user,
    visibleSelectedRequest,
    activeListKind,
  ]);

  const resetCreateRequestForm = useCallback(() => {
    setCreateRequestForm(DEFAULT_REQUEST_FORM);
  }, []);

  const openCreateModal = useCallback(() => {
    setActionError(null);
    setSuccessMessage(null);
    resetCreateRequestForm();
    setIsCreateModalOpen(true);
    if (user) {
      void printRequestService
        .listCustomerIdsWithContinuableCustomerRequests(user)
        .then((customerIds) => setCustomerIdsWithContinuableRequest(new Set(customerIds)));
      if (customerDirectory.length === 0) {
        setIsCustomerDirectoryLoading(true);
        void printRequestService
          .listCustomers(user)
          .then(setCustomerDirectory)
          .finally(() => setIsCustomerDirectoryLoading(false));
      }
    }
  }, [customerDirectory.length, resetCreateRequestForm, user]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    resetCreateRequestForm();
    setActionError(null);
  }, [resetCreateRequestForm]);

  /** After Add to Show / Internal Gangsheet, reload so queueTab Working→Queued is visible. */
  const handleAddedToShow = useCallback(async () => {
    const requestId = visibleSelectedRequest?.id;

    clearPrintRequestsPageCache();
    await Promise.all([
      reloadAllAllocationData({ silent: true }),
      reloadPrintRequests({ silent: true }),
    ]);
    if (requestId) {
      commitPrintRequestsRoute({ requestId, kind: activeListKind, tab: "queued" });
    }
  }, [
    activeListKind,
    commitPrintRequestsRoute,
    reloadAllAllocationData,
    reloadPrintRequests,
    visibleSelectedRequest?.id,
  ]);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Print Requests",
        actions: [
          {
            icon: <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />,
            label: isRefreshing ? "Refreshing…" : "Refresh",
            onClick: () => {
              if (!isRefreshing) {
                void handleRefresh();
              }
            },
          },
        ],
        primaryAction: {
          icon: <Plus aria-hidden="true" size={16} strokeWidth={2} />,
          label: "New request",
          onClick: openCreateModal,
        },
      }),
      [handleRefresh, isRefreshing, openCreateModal],
    ),
  );

  useEffect(() => {
    setIsRequestDetailExpanded(false);
  }, [selectedRequestId]);

  const designById = useMemo(
    () => new Map(readyDesigns.map((design) => [design.id, design])),
    [readyDesigns],
  );

  // Search/display needs a Map; the hook returns a Record keyed by customer ID (only customers
  // referenced by the currently loaded page, not a full directory).
  const customersByIdMap = useMemo(
    () => new Map(Object.entries(customersById)),
    [customersById],
  );

  const customerOptions = useMemo(
    () =>
      customerDirectory
        .filter((customer) => !customer.isGuest)
        .filter((customer) => isActiveCustomerAccount(customer))
        .filter((customer) => !customerIdsWithContinuableRequest.has(customer.id))
        .map((customer) => ({
          label: customer.username
            ? `${customer.displayName} (${customer.username})`
            : `${customer.displayName} (needs username)`,
          value: customer.id,
        })),
    [customerDirectory, customerIdsWithContinuableRequest],
  );

  // `requests` already IS the current tab's bounded, server-filtered page (filtered by the
  // server-maintained `queueTab` field) — no client-side re-derivation/grouping across tabs is
  // needed in the steady state, since only the active tab's page is loaded (Wave C hydration
  // remediation, 2026-07-25). Archived requests are excluded server-side by the callers that
  // build tab query options. `filterPrintRequestsByActiveTab` is a render-time safety net for the
  // one transitional window where `requests` can still briefly hold the PREVIOUS tab's page after
  // `activeListTab` changes but before `usePrintRequests`'s own reset has completed — never a
  // substitute for that fix, but a second, independent guarantee that a mismatched-`queueTab` row
  // can never render under the wrong tab label (tab-switch stale-list-state remediation,
  // 2026-08-04).
  const activeTabRequests = useMemo(
    () =>
      filterPrintRequestsByRequestKind(
        filterPrintRequestsByActiveTab(requests, activeListTab),
        activeIsInternal,
      ).filter((request) => isPrintRequestIncludedInListTabs(request.status)),
    [activeIsInternal, activeListTab, requests],
  );

  const workingRequestsByFilter = useMemo(() => {
    const grouped: Record<PrintRequestWorkingTriageFilter, PrintRequest[]> = {
      needs_requeue: [],
      active: [],
      stale: [],
      empty: [],
      all: [...activeTabRequests],
    };
    if (activeListTab !== "working") {
      return grouped;
    }
    const nowMs = Date.now();
    for (const request of activeTabRequests) {
      const bucket = resolvePrintRequestWorkingTriageBucket({
        itemCount: request.itemCount,
        updatedAtMillis: request.updatedAt.toMillis(),
        needsStaffRequeueAt: request.needsStaffRequeueAt,
        nowMs,
      });
      grouped[bucket].push(request);
    }
    return grouped;
  }, [activeListTab, activeTabRequests]);

  // Triage chip counts reflect the currently loaded Working page, not the full corpus — an exact
  // whole-database Active/Stale count would require a second maintained field kept in sync purely
  // by time passing (no write event to trigger off), a materially larger mechanism than this
  // secondary in-page filter chip warrants. The primary tab counts (`countsByTab`) remain exact
  // via `getCountFromServer`.
  const workingTriageCounts = useMemo(
    () => ({
      needs_requeue: workingRequestsByFilter.needs_requeue.length,
      active: workingRequestsByFilter.active.length,
      stale: workingRequestsByFilter.stale.length,
      empty: workingRequestsByFilter.empty.length,
      all: workingRequestsByFilter.all.length,
    }),
    [workingRequestsByFilter],
  );

  const routeEligibleRequests = useMemo(
    () =>
      activeListTab === "working" ? workingRequestsByFilter[workingTriageFilter] : activeTabRequests,
    [activeListTab, activeTabRequests, workingRequestsByFilter, workingTriageFilter],
  );

  const visibleRequests = useMemo(() => {
    return filterPrintRequestsByListSearch(routeEligibleRequests, listSearchQuery, customersByIdMap);
  }, [
    customersByIdMap,
    listSearchQuery,
    routeEligibleRequests,
  ]);

  const visibleRequestSections = useMemo(
    () =>
      groupPrintRequestsByShow({
        requests: visibleRequests,
        allocationsByRequestId,
        showsById,
        sectionOrder:
          activeListKind === "internal" && activeListTab === "printed"
            ? "staff_gang_sheet_history"
            : "scheduled_start_asc",
      }),
    [activeListKind, activeListTab, allocationsByRequestId, showsById, visibleRequests],
  );

  // A deep-linked/selected request outside the currently loaded page is never treated as
  // "route-illegal" — `ensureRequestLoaded` (above) fetches it directly by ID, and once loaded it
  // participates in `eligibleRequestIds` like any other loaded row.
  const selectedRequestKindMatches =
    !selectedRequestId ||
    (isLoadedSelectedRequest &&
      selectedRequest !== null &&
      printRequestListKindFromIsInternal(selectedRequest.isInternal) === activeListKind);
  const detailsPendingForSelection =
    Boolean(selectedRequestId) && !isLoadedSelectedRequest && !requestDetails.error;

  const routeTriageRequests = useMemo(() => {
    const toTriageRequest = (request: PrintRequest): PrintRequestRouteTriageRequest => {
      const authoritative =
        selectedRequestId === request.id && selectedRequest ? selectedRequest : request;

      return {
        id: authoritative.id,
        itemCount: authoritative.itemCount,
        updatedAtMillis: authoritative.updatedAt.toMillis(),
        needsStaffRequeueAt: authoritative.needsStaffRequeueAt,
      };
    };

    const buckets: Record<PrintRequestRouteTab, PrintRequestRouteTriageRequest[]> = {
      working: activeListTab === "working" ? activeTabRequests.map(toTriageRequest) : [],
      editing: activeListTab === "editing" ? activeTabRequests.map(toTriageRequest) : [],
      queued: activeListTab === "queued" ? activeTabRequests.map(toTriageRequest) : [],
      printing: activeListTab === "printing" ? activeTabRequests.map(toTriageRequest) : [],
      printed: activeListTab === "printed" ? activeTabRequests.map(toTriageRequest) : [],
    };

    if (selectedRequestId && isLoadedSelectedRequest && selectedRequest?.queueTab) {
      const hintTab = isPrintRequestRouteTab(selectedRequest.queueTab)
        ? normalizePrintRequestListTabForKind(selectedRequest.queueTab, activeListKind)
        : null;
      if (hintTab) {
        const hint = toTriageRequest(selectedRequest);
        if (!buckets[hintTab].some((request) => request.id === hint.id)) {
          buckets[hintTab] = [...buckets[hintTab], hint];
        }
      }
    }

    return buckets;
  }, [
    activeListKind,
    activeListTab,
    activeTabRequests,
    isLoadedSelectedRequest,
    selectedRequest,
    selectedRequestId,
  ]);

  const loadedRequestHint = useMemo(() => {
    if (!selectedRequestId || !isLoadedSelectedRequest || !selectedRequest) {
      return null;
    }

    return {
      id: selectedRequest.id,
      queueTab: selectedRequest.queueTab,
      itemCount: selectedRequest.itemCount,
      updatedAtMillis: selectedRequest.updatedAt.toMillis(),
      needsStaffRequeueAt: selectedRequest.needsStaffRequeueAt,
    };
  }, [isLoadedSelectedRequest, selectedRequest, selectedRequestId]);

  const canonicalRoute = useMemo(
    () =>
      resolveCanonicalPrintRequestsRoute({
        dataReady: !isRequestsLoading && !detailsPendingForSelection && selectedRequestKindMatches,
        eligibleRequestIds: routeEligibleRequests.map((request) => request.id),
        requestedRequestId: selectedRequestIdParam,
        requestedKind: kindParam,
        requestedTab: tabParam,
        requestedWorkingFilter: workingFilterParam,
        requestsByTab: routeTriageRequests,
        loadedRequestHint,
      }),
    [
      detailsPendingForSelection,
      isRequestsLoading,
      kindParam,
      loadedRequestHint,
      routeEligibleRequests,
      routeTriageRequests,
      selectedRequestIdParam,
      selectedRequestKindMatches,
      tabParam,
      workingFilterParam,
    ],
  );

  useEffect(() => {
    if (!selectedRequestId || !isLoadedSelectedRequest || !selectedRequest) {
      return;
    }

    const listRow = activeTabRequests.find((request) => request.id === selectedRequestId);
    if (!listRow) {
      return;
    }

    if (
      listRow.itemCount === selectedRequest.itemCount &&
      listRow.updatedAt.toMillis() === selectedRequest.updatedAt.toMillis()
    ) {
      return;
    }

    patchRequestLocally(selectedRequestId, {
      itemCount: selectedRequest.itemCount,
      updatedAt: selectedRequest.updatedAt,
    });
  }, [
    activeTabRequests,
    isLoadedSelectedRequest,
    patchRequestLocally,
    selectedRequest,
    selectedRequestId,
  ]);

  useEffect(() => {
    if (!selectedRequestId || !isLoadedSelectedRequest || !selectedRequest) {
      return;
    }

    const requestKind = printRequestListKindFromIsInternal(selectedRequest.isInternal);
    const requestTab =
      selectedRequest.queueTab && isPrintRequestRouteTab(selectedRequest.queueTab)
        ? normalizePrintRequestListTabForKind(selectedRequest.queueTab, requestKind)
        : null;
    const kindMismatch = requestKind !== activeListKind;
    const tabMismatch = requestTab !== null && requestTab !== activeListTab;

    if (!kindMismatch && !tabMismatch) {
      return;
    }

    const targetTab = requestTab ?? activeListTab;
    commitPrintRequestsRoute({
      kind: requestKind,
      tab: targetTab,
      requestId: selectedRequest.id,
      workingFilter:
        targetTab === "working"
          ? resolvePrintRequestWorkingTriageBucket({
              itemCount: selectedRequest.itemCount,
              updatedAtMillis: selectedRequest.updatedAt.toMillis(),
              needsStaffRequeueAt: selectedRequest.needsStaffRequeueAt,
              nowMs: Date.now(),
            })
          : undefined,
    });
  }, [
    activeListKind,
    activeListTab,
    commitPrintRequestsRoute,
    isLoadedSelectedRequest,
    selectedRequest,
    selectedRequestId,
  ]);

  /** The only effect allowed to normalize the Print Requests URL. */
  useEffect(() => {
    if (canonicalRoute) {
      commitPrintRequestsRoute(canonicalRoute);
    }
  }, [canonicalRoute, commitPrintRequestsRoute]);

  /** Reveal a valid routed selection hidden only by local search; never change its route filter. */
  useEffect(() => {
    const selectionChanged =
      previousSelectedRequestIdRef.current !== selectedRequestId;
    previousSelectedRequestIdRef.current = selectedRequestId;

    if (!selectionChanged) {
      return;
    }

    if (
      !selectedRequestId ||
      isRequestsLoading ||
      !routeEligibleRequests.some((request) => request.id === selectedRequestId) ||
      visibleRequests.some((request) => request.id === selectedRequestId)
    ) {
      return;
    }

    if (listSearchQuery.trim()) {
      setListSearchQuery("");
    }
  }, [
    isRequestsLoading,
    listSearchQuery,
    routeEligibleRequests,
    selectedRequestId,
    visibleRequests,
  ]);

  useEffect(() => {
    if (!selectedRequestId || isRequestsLoading) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-print-request-id="${CSS.escape(selectedRequestId)}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isRequestsLoading, selectedRequestId, visibleRequests]);

  const selectedCreateCustomer = useMemo(
    () => customerDirectory.find((customer) => customer.id === createRequestForm.customerId),
    [createRequestForm.customerId, customerDirectory],
  );
  const isCreateSubmitDisabled =
    createRequestForm.customerMode === "customer" && !createRequestForm.customerId;

  const dismissSuccessMessage = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const updateAutosaveState = useCallback((
    status: Exclude<AutosaveStatus, "idle">,
    message?: string,
    retry?: () => Promise<void>,
  ) => {
    setAutosaveState({ status, message, retry });
  }, []);

  const handlePersistenceHealthChange = useCallback(
    (itemId: string, health: PrintRequestItemPersistenceHealth) => {
      setItemPersistenceHealth((current) =>
        current[itemId] === health ? current : { ...current, [itemId]: health },
      );
    },
    [],
  );

  const handleRegisterFlush = useCallback((itemId: string, flush: (() => Promise<boolean>) | null) => {
    if (flush) {
      itemFlushersRef.current.set(itemId, flush);
      return;
    }
    itemFlushersRef.current.delete(itemId);
  }, []);

  const persistenceSummary = summarizePrintRequestPersistenceHealth(itemPersistenceHealth);

  async function openAddToShow(destination: "shows" | "staff_gang_sheet") {
    if (requestItems.length === 0) {
      return;
    }
    if (!persistenceSummary.canOpenQueue) {
      setActionError(persistenceSummary.blockReason);
      return;
    }
    if (persistenceSummary.needsFlush) {
      setIsFlushingQueue(true);
      try {
        const results = await Promise.all(
          [...itemFlushersRef.current.values()].map((flush) => flush()),
        );
        if (results.some((ok) => !ok)) {
          setActionError("Save item sizes before adding this request to a show.");
          return;
        }
      } finally {
        setIsFlushingQueue(false);
      }
    }
    setAddToShowDestination(destination);
    setIsAddToShowModalOpen(true);
  }

  useEffect(() => {
    setAutosaveState({ status: "idle" });
    setItemPersistenceHealth({});
  }, [selectedRequestId]);

  useEffect(() => {
    if (autosaveState.status !== "saved") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAutosaveState({ status: "idle" });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [autosaveState.status]);

  useEffect(() => {
    if (!visibleSelectedRequest) {
      setRequestNotesDraft("");
      setInternalBaseNameDraft("internal");
      return;
    }

    setRequestNotesDraft(visibleSelectedRequest.notes ?? "");
    setInternalBaseNameDraft(getInternalBaseNameDraft(visibleSelectedRequest));
  }, [visibleSelectedRequest]);

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !permissionService.canManagePrintRequests(user)) {
      return;
    }

    try {
      setActionError(null);
      const result =
        createRequestForm.customerMode === "customer"
          ? await printRequestService.createCustomerPrintRequest(user, {
              customerId: createRequestForm.customerId,
              notes: createRequestForm.notes || undefined,
            })
          : await printRequestService.createInternalPrintRequest(user, {
              internalBaseName: createRequestForm.internalBaseName,
              notes: createRequestForm.notes || undefined,
            });

      setSuccessMessage(`Print request "${result.name}" created.`);
      setSuccessAlertSeed((current) => current + 1);
      closeCreateModal();
      // A brand-new request is always Working/Empty (no items, no allocations yet) — insert it
      // locally instead of reloading the list, and select it directly (Wave C hydration
      // remediation, 2026-07-25).
      const createdKind = printRequestListKindFromIsInternal(result.isInternal);
      if (createdKind !== activeListKind) {
        clearPrintRequestsPageCache();
      } else if (activeListTab === "working") {
        insertCreatedRequestLocally(result);
      }
      commitPrintRequestsRoute({
        requestId: result.id,
        kind: createdKind,
        tab: "working",
        workingFilter: "empty",
      });
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  const handleUpdateItem = useCallback(async (
    item: PrintRequestItem,
    input: UpdatePrintRequestItemInput,
  ) => {
    if (!user || !permissionService.canManagePrintRequestItems(user)) {
      throw new Error("You do not have permission to edit print request items.");
    }

    setActionError(null);
    const updatedItem = await printRequestService.updatePrintRequestItem(user, item.id, input);
    replaceRequestItem(
      mergePrintRequestItemPreservingArtworkEnhanceFields(item, updatedItem),
    );
    // Only this item's quantity changed — recompute the one affected row's summary locally
    // instead of a full-list reload (Wave C hydration remediation, 2026-07-25).
    if (visibleSelectedRequest) {
      const nextItems = requestItems.map((existing) =>
        existing.id === updatedItem.id ? updatedItem : existing,
      );
      patchSummaryLocally(
        visibleSelectedRequest.id,
        summarizeItemsForRequest(visibleSelectedRequest.id, nextItems),
      );
    }
  }, [patchSummaryLocally, requestItems, replaceRequestItem, user, visibleSelectedRequest]);

  async function handleSaveRequestDetail() {
    if (!user || !visibleSelectedRequest || !permissionService.canManagePrintRequests(user)) {
      return;
    }

    const canEditInternalBaseName =
      visibleSelectedRequest.isInternal && hasUsableRequestSequence(visibleSelectedRequest);

    try {
      setActionError(null);
      setIsSavingRequestDetail(true);
      const updatedRequest = await printRequestService.updatePrintRequestDetail(
        user,
        visibleSelectedRequest.id,
        {
          notes: requestNotesDraft,
          internalBaseName: canEditInternalBaseName ? internalBaseNameDraft : undefined,
        },
      );

      replaceSelectedRequest(updatedRequest);
      patchRequestLocally(updatedRequest.id, updatedRequest);
      setSuccessMessage("Request detail saved.");
      setSuccessAlertSeed((current) => current + 1);
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    } finally {
      setIsSavingRequestDetail(false);
    }
  }

  async function handleRemoveItem(item: PrintRequestItem) {
    if (!user || !permissionService.canManagePrintRequestItems(user)) {
      return;
    }

    try {
      setActionError(null);
      await printRequestService.removePrintRequestItem(user, item.id);
      removeRequestItem(item.id);
      if (visibleSelectedRequest) {
        const nextItems = requestItems.filter((existing) => existing.id !== item.id);
        patchSummaryLocally(
          visibleSelectedRequest.id,
          summarizeItemsForRequest(visibleSelectedRequest.id, nextItems),
        );
        patchRequestLocally(visibleSelectedRequest.id, {
          itemCount: Math.max(0, visibleSelectedRequest.itemCount - 1),
        });
      }
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  async function handleClearAllItems() {
    if (!user || !permissionService.canManagePrintRequestItems(user) || !visibleSelectedRequest) {
      return;
    }

    const itemsToRemove = [...requestItems];
    if (itemsToRemove.length === 0) {
      return;
    }

    try {
      setClearAllError(null);
      setActionError(null);
      setIsClearingAllItems(true);
      for (const item of itemsToRemove) {
        await printRequestService.removePrintRequestItem(user, item.id);
        removeRequestItem(item.id);
      }
      patchSummaryLocally(visibleSelectedRequest.id, emptyPrintRequestItemSummary());
      patchRequestLocally(visibleSelectedRequest.id, { itemCount: 0 });
      setSuccessMessage("All designs removed from request.");
      setSuccessAlertSeed((current) => current + 1);
      setIsClearAllConfirmOpen(false);
    } catch (error) {
      setClearAllError(formatWriteErrorMessage(error));
    } finally {
      setIsClearingAllItems(false);
    }
  }

  function handleArtworkEnhanceModeChanged(
    item: PrintRequestItem,
    result: SetPrintRequestItemArtworkEnhanceModeResponse,
  ) {
    replaceRequestItem({
      ...item,
      artworkEnhanceMode: result.artworkEnhanceMode,
    });
  }

  async function handleDuplicateItem(item: PrintRequestItem) {
    if (!user || !permissionService.canManagePrintRequestItems(user)) {
      return;
    }

    try {
      setActionError(null);
      const createdItem = await printRequestService.duplicatePrintRequestItem(user, item.id);
      insertRequestItemAfter(item.id, createdItem);
      if (visibleSelectedRequest) {
        const nextItems = [...requestItems, createdItem];
        patchSummaryLocally(
          visibleSelectedRequest.id,
          summarizeItemsForRequest(visibleSelectedRequest.id, nextItems),
        );
        patchRequestLocally(visibleSelectedRequest.id, {
          itemCount: visibleSelectedRequest.itemCount + 1,
        });
      }
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  const selectedRequestSizeClassLabel = useMemo(() => {
    if (!visibleSelectedRequest) {
      return null;
    }
    const cutoffInches = visibleSelectedRequest.isInternal
      ? internalSizeCutoffInches
      : showQueueSizeCutoffInches;
    return formatPocketFullSizeCountsLabel(
      resolvePrintRequestPocketFullSizeCounts(
        requestItems.map((item) => ({
          printWidthInches: item.printWidthInches,
          printHeightInches: item.printHeightInches,
          quantity: item.quantity,
          status: item.status,
        })),
        cutoffInches,
      ),
    );
  }, [
    internalSizeCutoffInches,
    requestItems,
    showQueueSizeCutoffInches,
    visibleSelectedRequest,
  ]);

  const openDesignLibrarySelection = useCallback(() => {
    if (!selectedRequest) {
      return;
    }

    navigate(
      getDesignLibraryPath({
        mode: "request-selection",
        requestId: selectedRequest.id,
      }),
    );
  }, [navigate, selectedRequest]);

  const openUsersForCustomerCreation = useCallback(() => {
    closeCreateModal();
    navigate("/users");
  }, [closeCreateModal, navigate]);

  const isLoading = isRequestsLoading || isReadyDesignsLoading;
  const loadError = requestsError ?? requestError;
  /**
   * Derived from `allocationTotalsByRequestId` (loaded once for every request and stable across
   * selection changes) rather than the per-selection `totalAllocatedQuantity` state, which is
   * refetched asynchronously whenever `selectedRequest` changes and briefly reads as `0` while that
   * fetch is in flight — using it here caused the Add to Show button to flash in and back out when
   * switching tabs, since the button would render before the async totals resolved.
   */
  const isSelectedRequestQueueLocked =
    Boolean(visibleSelectedRequest) &&
    visibleSelectedRequest?.status !== "completed" &&
    (allocationTotalsByRequestId[visibleSelectedRequest?.id ?? ""]?.totalAllocatedQuantity ?? 0) > 0;
  /**
   * Uses the same stable `allocationTotalsByRequestId` map as `isSelectedRequestQueueLocked`
   * instead of the per-selection `totalAllocatedQuantity`/`totalPrintedQuantity` state, which
   * briefly resets while `reloadAllocationSummary()` is in flight for a newly selected request —
   * that caused the detail panel's queue-state pill to flash from the correct state back to
   * "Working" and then to the correct state again when clicking between cards on the Queued tab.
   */
  const selectedRequestQueueState = visibleSelectedRequest
    ? derivePrintRequestQueueState({
        totalRequestedQuantity: requestItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAllocatedQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalAllocatedQuantity ?? 0,
        totalInProgressQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalInProgressQuantity ?? 0,
        totalPrintedQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalPrintedQuantity ?? 0,
      })
    : null;
  const isSelectedRequestFullyPrinted = visibleSelectedRequest
    ? isPrintRequestFullyPrinted({
        status: visibleSelectedRequest.status,
        totalRequestedQuantity: requestItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAllocatedQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalAllocatedQuantity ?? 0,
        totalInProgressQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalInProgressQuantity ?? 0,
        totalPrintedQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalPrintedQuantity ?? 0,
      })
    : false;
  const selectedRequestDerivedListTab = visibleSelectedRequest
    ? derivePrintRequestListTab({
        status: visibleSelectedRequest.status,
        totalRequestedQuantity: requestItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAllocatedQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalAllocatedQuantity ?? 0,
        totalInProgressQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalInProgressQuantity ?? 0,
        totalPrintedQuantity: allocationTotalsByRequestId[visibleSelectedRequest.id]?.totalPrintedQuantity ?? 0,
      })
    : null;
  const selectedRequestConvertedInternalId =
    visibleSelectedRequest &&
    !visibleSelectedRequest.isInternal &&
    isPrintRequestConvertedToInternal(visibleSelectedRequest.closureKind)
      ? visibleSelectedRequest.convertedToInternalRequestId?.trim() || null
      : null;
  const convertedInternalDeepLinkPath = selectedRequestConvertedInternalId
    ? buildPrintRequestNavigationDeepLinkPath({
        id: visibleSelectedRequest!.id,
        closureKind: visibleSelectedRequest!.closureKind,
        convertedToInternalRequestId: selectedRequestConvertedInternalId,
        queueTab: visibleSelectedRequest!.queueTab,
        itemCount: visibleSelectedRequest!.itemCount,
        updatedAtMillis: visibleSelectedRequest!.updatedAt?.toMillis?.() ?? 0,
        needsStaffRequeueAt: visibleSelectedRequest!.needsStaffRequeueAt,
      }).path
    : null;
  const selectedRequestRepairTargetTab = selectedRequestDerivedListTab
    ? normalizePrintRequestListTabForKind(selectedRequestDerivedListTab, activeListKind)
    : null;
  const canRepairQueueTab = Boolean(
    user &&
      permissionService.canManagePrintRequests(user) &&
      visibleSelectedRequest &&
      !selectedRequestConvertedInternalId &&
      selectedRequestRepairTargetTab &&
      (visibleSelectedRequest.queueTab !== selectedRequestDerivedListTab ||
        normalizePrintRequestListTabForKind(activeListTab, activeListKind) !== selectedRequestRepairTargetTab),
  );

  const handleRepairQueueTab = useCallback(async () => {
    if (!user || !visibleSelectedRequest || !selectedRequestDerivedListTab) {
      return;
    }

    const repairTargetTab = normalizePrintRequestListTabForKind(
      selectedRequestDerivedListTab,
      activeListKind,
    );

    try {
      setIsRepairingQueueTab(true);
      setActionError(null);
      const nextTab = await printRequestService.syncPrintRequestQueueTab(user, visibleSelectedRequest.id);
      const resolvedTab = nextTab ?? selectedRequestDerivedListTab;

      patchRequestLocally(visibleSelectedRequest.id, { queueTab: resolvedTab });

      if (normalizePrintRequestListTabForKind(activeListTab, activeListKind) !== repairTargetTab) {
        commitPrintRequestsRoute({
          kind: activeListKind,
          requestId: visibleSelectedRequest.id,
          tab: repairTargetTab,
        });
      }

      clearPrintRequestsPageCache();
      await reloadPrintRequests({ silent: true });

      setSuccessMessage(`Moved ${visibleSelectedRequest.name} to the ${repairTargetTab} tab.`);
      setSuccessAlertSeed((current) => current + 1);
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    } finally {
      setIsRepairingQueueTab(false);
    }
  }, [
    activeListKind,
    activeListTab,
    commitPrintRequestsRoute,
    patchRequestLocally,
    reloadPrintRequests,
    selectedRequestDerivedListTab,
    user,
    visibleSelectedRequest,
  ]);

  const isSelectedRequestDetailLocked = isSelectedRequestQueueLocked || isSelectedRequestFullyPrinted;
  const canManageRequestItems = Boolean(
    user && permissionService.canManagePrintRequestItems(user),
  );
  const canViewUpcomingShows = user ? permissionService.canViewUpcomingShows(user) : false;

  function renderSelectedRequestShowQueueLinks(includeTransferActions: boolean) {
    if (!visibleSelectedRequest || selectedRequestShowGroups.length === 0) {
      return null;
    }

    return selectedRequestShowGroups.map((group) => {
      const show = selectedRequestShowsById.get(group.upcomingShowId);
      const groupQuantity = group.allocations.reduce(
        (sum, allocation) => sum + allocation.allocatedQuantity,
        0,
      );
      const showTitle = show ? formatUpcomingShowTitle(show) : "Show";
      const showDateLabel = show?.scheduledStartAt
        ? formatShowDateTimeLabel(show.scheduledStartAt.toDate())
        : "Not scheduled";
      const transferMode = show ? resolvePrintRequestShowTransferMode(show) : "move";
      const showQueuePath = show
        ? buildShowQueueDeepLinkPath({
            showId: group.upcomingShowId,
            printRequestId: visibleSelectedRequest.id,
            show,
          })
        : null;

      const link = showQueuePath ? (
        <Link
          className="print-requests-show-queue-pill"
          title={showTitle}
          to={showQueuePath}
        >
          <span>{groupQuantity} qty</span>
          <span>&middot;</span>
          <span>{showDateLabel}</span>
          <ExternalLink aria-hidden="true" size={12} strokeWidth={2.2} />
        </Link>
      ) : (
        <span aria-busy="true" className="print-requests-show-queue-pill">
          <span>{groupQuantity} qty</span>
          <span>&middot;</span>
          <span>{showDateLabel}</span>
        </span>
      );

      if (!includeTransferActions) {
        return (
          <div className="print-requests-show-queue-group" key={group.upcomingShowId}>
            {link}
          </div>
        );
      }

      return (
        <div className="print-requests-show-queue-group" key={group.upcomingShowId}>
          {link}
          {show ? (
            <DangerOverflowMenu
              ariaLabel={`Actions for ${showTitle}`}
              items={[
                {
                  id: "transfer",
                  danger: false,
                  label: formatPrintRequestShowTransferActionLabel(transferMode),
                  onSelect: () =>
                    setTransferShowContext({
                      sourceShowId: group.upcomingShowId,
                      transferQuantity: groupQuantity,
                    }),
                },
              ]}
            />
          ) : null}
        </div>
      );
    });
  }

  const requestNamePreview = visibleSelectedRequest
    ? getRequestNamePreview(visibleSelectedRequest, internalBaseNameDraft)
    : "";
  const isRequestDetailSaveDisabled =
    !visibleSelectedRequest ||
    isSavingRequestDetail ||
    !isRequestDetailDirty(visibleSelectedRequest, requestNotesDraft, internalBaseNameDraft);

  return (
    <main className="page-layout page-layout-shell print-requests-page">
      {loadError ? <ErrorState message={loadError} title="Unable to load print requests" /> : null}
      {successMessage ? (
        <DismissibleSuccessAlert
          key={`${successAlertSeed}-${successMessage}`}
          message={successMessage}
          onDismiss={dismissSuccessMessage}
        />
      ) : null}
      {actionError && !isCreateModalOpen ? (
        <p className="auth-message auth-message-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="print-requests-layout">
        <aside className="print-requests-rail">
          <div className="print-requests-kind-switch">
            <div aria-label="Request type" className="print-requests-kind-tab-bar" role="tablist">
              {(
                [
                  { kind: "customer" as const, label: "Customer Requests" },
                  { kind: "internal" as const, label: "Internal Requests" },
                ] as const
              ).map(({ kind, label }) => (
                <button
                  aria-selected={activeListKind === kind}
                  className={`print-requests-kind-tab-button${activeListKind === kind ? " is-active" : ""}`}
                  key={kind}
                  onClick={() => {
                    if (kind === activeListKind) {
                      return;
                    }
                    commitPrintRequestsRoute({
                      kind,
                      tab: activeListTab,
                      workingFilter: activeListTab === "working" ? workingTriageFilter : undefined,
                    });
                  }}
                  role="tab"
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div aria-label="Request status" className="print-requests-tab-bar" role="tablist">
            {visibleStatusTabs.map((tab) => (
              <button
                className={`print-requests-tab-button${activeListTab === tab ? " is-active" : ""}`}
                key={tab}
                onClick={() => {
                  // The destination tab's own requests aren't loaded yet (only the active tab's
                  // page is loaded — Wave C hydration remediation, 2026-07-25); when switching to
                  // the CURRENT tab (re-clicking Working while already on Working) the existing
                  // selection can be preserved locally. Switching to a different tab always
                  // navigates with no explicit request — the canonical-route effect selects the
                  // destination tab's first loaded request once its page arrives.
                  const selectionStillInTab =
                    tab === activeListTab &&
                    Boolean(selectedRequestId) &&
                    routeEligibleRequests.some((request) => request.id === selectedRequestId);

                  commitPrintRequestsRoute({
                    kind: activeListKind,
                    tab,
                    workingFilter: tab === "working" ? workingTriageFilter : undefined,
                    requestId: selectionStillInTab ? (selectedRequestId ?? undefined) : undefined,
                  });
                }}
                type="button"
              >
                {tab === "working"
                  ? "Working"
                  : tab === "editing"
                    ? "Editing"
                    : tab === "queued"
                      ? "Queued"
                      : tab === "printing"
                        ? "Printing"
                        : "Printed"}{" "}
                ({countsByTab[tab]})
              </button>
            ))}
          </div>
          <p className="print-requests-tab-helper">
            {getPrintRequestTabHelperCopy(activeListTab, { isInternal: activeIsInternal })}
          </p>
          <div className="print-requests-rail-controls">
            <label className="print-requests-rail-search">
              <span className="visually-hidden">Search print requests</span>
              <Search aria-hidden className="print-requests-rail-search-icon" size={14} strokeWidth={2} />
              <input
                className="print-requests-rail-search-input"
                onChange={(event) => setListSearchQuery(event.target.value)}
                placeholder="Search name, customer, id…"
                type="search"
                value={listSearchQuery}
              />
            </label>
            {activeListTab === "working" ? (
              <div aria-label="Working triage" className="print-requests-triage-bar" role="group">
                {PRINT_REQUEST_WORKING_TRIAGE_FILTERS.map((filter) => (
                  <button
                    className={`print-requests-triage-chip${
                      workingTriageFilter === filter ? " is-active" : ""
                    }`}
                    key={filter}
                    onClick={() => {
                      commitPrintRequestsRoute(
                        resolveWorkingFilterClick({
                          currentRequestId: selectedRequestId,
                          destinationFilter: filter,
                          destinationRequestIds: workingRequestsByFilter[filter].map(
                            (request) => request.id,
                          ),
                          kind: activeListKind,
                        }),
                        "push",
                      );
                    }}
                    type="button"
                  >
                    {getPrintRequestWorkingTriageLabel(filter)}
                    <span className="print-requests-triage-chip-count">
                      {workingTriageCounts[filter]}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="print-requests-rail-list">
            {isLoading ? (
              <div className="print-requests-loading">
                <LoadingSpinner label="Loading print requests" />
              </div>
            ) : visibleRequests.length === 0 ? (
              <EmptyState
                message={
                  listSearchQuery.trim()
                    ? "No print requests match this search in the current tab."
                    : activeListTab === "working" && workingTriageFilter === "needs_requeue"
                      ? "No requests need staff re-queue in this filter."
                      : activeListTab === "working" && workingTriageFilter === "active"
                      ? "No Active carts here. New empty carts are under Empty; older unused carts under Stale. Or choose All."
                      : activeListTab === "working" && workingTriageFilter !== "all"
                        ? "No requests in this Working filter. Try Stale, Empty, or All."
                        : "No print requests in this tab yet."
                }
                title="Nothing here yet"
              />
            ) : (
              visibleRequestSections.map((section) => {
                const sectionCapacity = resolveSectionShowCapacity(section, allocationsByRequestId);

                return (
                <div className="print-requests-show-section" key={section.sectionKey}>
                  {section.sectionKey === UNASSIGNED_SHOW_SECTION_KEY || !section.show || !canViewUpcomingShows ? (
                    <div className="print-requests-show-section-header">
                      {section.sectionKey === UNASSIGNED_SHOW_SECTION_KEY
                        ? "Unassigned"
                        : section.show
                          ? `${formatUpcomingShowTitle(section.show)} · ${formatUpcomingShowTimestampLabel(section.show.scheduledStartAt)}`
                          : "Show"}
                    </div>
                  ) : (
                    <Link
                      className="print-requests-show-section-header print-requests-show-section-header-link"
                      title={`Open ${formatUpcomingShowTitle(section.show)} in Show Queue`}
                      to={buildShowQueueDeepLinkPath({
                        showId: section.show.id,
                        printRequestId: section.requests[0]?.id ?? "",
                        show: section.show,
                      })}
                    >
                      <span>
                        {formatUpcomingShowTitle(section.show)} ·{" "}
                        {formatUpcomingShowTimestampLabel(section.show.scheduledStartAt)}
                      </span>
                      <ExternalLink aria-hidden="true" size={12} strokeWidth={2.2} />
                    </Link>
                  )}
                  {sectionCapacity ? (
                    <div className="print-requests-show-section-capacity">
                      <div className="show-capacity-bar-track">
                        <div
                          className={`show-capacity-bar-fill${
                            getCapacityFillLevel(getShowCapacityPercent(sectionCapacity))
                              ? ` is-${getCapacityFillLevel(getShowCapacityPercent(sectionCapacity))}`
                              : ""
                          }`}
                          style={{
                            width: `${Math.min(100, getShowCapacityPercent(sectionCapacity) ?? 0)}%`,
                          }}
                        />
                      </div>
                      <div className="show-capacity-summary">
                        <span>{formatShowCapacitySlotLabel(sectionCapacity)}</span>
                      </div>
                    </div>
                  ) : null}
                  {section.requests.map((request) => {
                const isSelected = request.id === selectedRequestId;
                const requestSummary = summariesByRequestId[request.id] ?? emptyPrintRequestItemSummary();
                const extraShowCount = section.extraShowCountByRequestId[request.id] ?? 0;
                const listCutoffInches = request.isInternal
                  ? internalSizeCutoffInches
                  : showQueueSizeCutoffInches;
                const sizeClassLabel = formatPocketFullSizeCountsLabel(
                  resolvePrintRequestPocketFullSizeCounts(
                    requestSummary.sizeClassRows ?? [],
                    listCutoffInches,
                  ),
                );

                return (
                  <button
                    className={`print-requests-request-card${isSelected ? " is-selected" : ""}`}
                    data-print-request-id={request.id}
                    key={request.id}
                    onClick={() => commitPrintRequestsRoute({
                      requestId: request.id,
                      kind: activeListKind,
                      tab: activeListTab,
                      workingFilter:
                        activeListTab === "working" ? workingTriageFilter : undefined,
                    })}
                    type="button"
                  >
                    <div className="print-requests-request-card-title-row">
                      <strong>{request.name}</strong>
                      <div className="print-requests-request-card-badges">
                        {shouldShowPrintRequestRequeueBadge(request) ? (
                          <Badge
                            title={getPrintRequestRequeueBadgeTitle(request)}
                            variant={getPrintRequestRequeueBadgeVariant()}
                          >
                            {getPrintRequestRequeueBadgeLabel()}
                          </Badge>
                        ) : null}
                        <Badge variant="default">{getPrintRequestOriginBadgeLabel(request)}</Badge>
                        <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
                      </div>
                    </div>
                    <p className="print-requests-request-card-subtitle">
                      {request.isInternal
                        ? request.notes?.trim() || "No notes"
                        : getPrintRequestCustomerLabel(request, customersByIdMap)}
                      {extraShowCount > 0 ? (
                        <span className="print-requests-request-card-extra-shows">
                          {" "}
                          +{extraShowCount} more show{extraShowCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </p>
                    <div className="print-requests-request-card-counts">
                      <span>{formatDesignCountLabel(requestSummary.uniqueDesignCount)}</span>
                      <span>{formatTotalQuantityLabel(requestSummary.totalQuantity)}</span>
                      {sizeClassLabel ? (
                        <span className="print-requests-request-card-size-class">{sizeClassLabel}</span>
                      ) : null}
                    </div>
                  </button>
                );
                  })}
                </div>
                );
              })
            )}
            {!isLoading && hasMoreRequests && !listSearchQuery.trim() ? (
              <Button
                className="print-requests-load-more"
                disabled={isLoadingMoreRequests}
                onClick={() => void loadMoreRequests()}
                size="sm"
                type="button"
                variant="secondary"
              >
                {isLoadingMoreRequests ? "Loading…" : "Load more"}
              </Button>
            ) : null}
          </div>
        </aside>

        <section className="print-requests-main">
          {visibleSelectedRequest && !isSelectedRequestDetailLocked ? (
            <div className="print-requests-page-actions">
              {!visibleSelectedRequest.isInternal ? (
                <Button
                  disabled={
                    requestItems.length === 0 ||
                    !persistenceSummary.canOpenQueue ||
                    isFlushingQueue
                  }
                  onClick={() => void openAddToShow("shows")}
                  title={
                    requestItems.length === 0
                      ? "Add designs to this request before adding it to a show."
                      : persistenceSummary.blockReason ?? undefined
                  }
                  type="button"
                >
                  Add to Show
                </Button>
              ) : (
                <Button
                  disabled={
                    requestItems.length === 0 ||
                    !persistenceSummary.canOpenQueue ||
                    isFlushingQueue
                  }
                  onClick={() => void openAddToShow("staff_gang_sheet")}
                  title={
                    requestItems.length === 0
                      ? "Add designs to this request before adding it to an Internal Gangsheet."
                      : persistenceSummary.blockReason ?? undefined
                  }
                  type="button"
                  variant="secondary"
                >
                  Add to Internal Gangsheet
                </Button>
              )}
            </div>
          ) : null}

          {isRequestLoading ? (
            <Card className="print-requests-card print-requests-loading-card">
              <LoadingSpinner label="Loading print request" />
            </Card>
          ) : !visibleSelectedRequest ? (
            <Card className="print-requests-card print-requests-empty-card">
              <EmptyState
                message="Select a request from the queue or create a new one."
                title="No request selected"
              />
            </Card>
          ) : (
            <>
              <Card className="print-requests-card print-requests-detail-card">
                <div className="print-requests-detail-header">
                  <div className="print-requests-detail-copy">
                    <p className="eyebrow">Request detail</p>
                    <h2>{visibleSelectedRequest.name}</h2>
                    <p className="print-requests-detail-timestamps">
                      Created {formatTimestampLabel(visibleSelectedRequest.createdAt)}
                      {" | "}
                      Updated {formatTimestampLabel(visibleSelectedRequest.updatedAt)}
                    </p>
                    {selectedRequestSizeClassLabel ? (
                      <div className="print-requests-detail-size-class-row">
                        <span className="print-requests-request-card-size-class">
                          {selectedRequestSizeClassLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="print-requests-detail-actions">
                    <div className="print-requests-detail-badges">
                      {shouldShowPrintRequestRequeueBadge(visibleSelectedRequest) ? (
                        <Badge
                          title={getPrintRequestRequeueBadgeTitle(visibleSelectedRequest)}
                          variant={getPrintRequestRequeueBadgeVariant()}
                        >
                          {getPrintRequestRequeueBadgeLabel()}
                        </Badge>
                      ) : null}
                      <Badge variant="default">
                        {getPrintRequestOriginBadgeLabel(visibleSelectedRequest)}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(visibleSelectedRequest.status)}>
                        {visibleSelectedRequest.status}
                      </Badge>
                      <Badge
                        variant={getPrintRequestQueueStateBadgeVariant(selectedRequestQueueState ?? "not_queued")}
                      >
                        {getPrintRequestQueueStateBadgeLabel(selectedRequestQueueState ?? "not_queued")}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedRequestConvertedInternalId && convertedInternalDeepLinkPath ? (
                  <div className="print-requests-queue-tab-repair">
                    <p className="print-requests-modal-hint">
                      This customer request was converted to an internal request. Open the internal
                      request to continue working with it.
                    </p>
                    <Button
                      onClick={() => navigate(convertedInternalDeepLinkPath)}
                      type="button"
                      variant="warning"
                    >
                      Open internal request
                    </Button>
                  </div>
                ) : null}

                {canRepairQueueTab && selectedRequestRepairTargetTab ? (
                  <div className="print-requests-queue-tab-repair">
                    <p className="print-requests-modal-hint">
                      {visibleSelectedRequest.queueTab !== selectedRequestDerivedListTab ? (
                        <>
                          This request belongs in the <strong>{selectedRequestRepairTargetTab}</strong> tab but is
                          still listed under <strong>{visibleSelectedRequest.queueTab ?? "unknown"}</strong>.
                        </>
                      ) : (
                        <>
                          This request belongs in the <strong>{selectedRequestRepairTargetTab}</strong> tab but you are
                          viewing the <strong>{activeListTab}</strong> tab.
                        </>
                      )}
                    </p>
                    <Button
                      disabled={isRepairingQueueTab}
                      onClick={() => {
                        void handleRepairQueueTab();
                      }}
                      type="button"
                      variant="warning"
                    >
                      {isRepairingQueueTab
                        ? "Moving…"
                        : `Move to ${selectedRequestRepairTargetTab} tab`}
                    </Button>
                  </div>
                ) : null}

                {isRequestDetailExpanded ? (
                  <div className="print-requests-detail-form">
                    <TextInput
                      label={visibleSelectedRequest.isInternal ? "Generated request name" : "Customer request name"}
                      name="requestName"
                      readOnly
                      value={requestNamePreview}
                    />

                    {visibleSelectedRequest.isInternal ? (
                      <TextInput
                        disabled={!hasUsableRequestSequence(visibleSelectedRequest)}
                        label="Internal base name"
                        name="internalBaseName"
                        onChange={(event) => setInternalBaseNameDraft(event.target.value)}
                        value={internalBaseNameDraft}
                      />
                    ) : null}

                    <AutoResizeTextarea
                      label="Notes"
                      name="requestNotes"
                      onChange={(event) => setRequestNotesDraft(event.target.value)}
                      placeholder="Optional request notes"
                      value={requestNotesDraft}
                    />

                    <div className="print-requests-detail-locked-fields">
                      <span>Status locked: {visibleSelectedRequest.status}</span>
                      {visibleSelectedRequest.requestSequenceNumber ? (
                        <span>Sequence locked: {visibleSelectedRequest.requestSequenceNumber}</span>
                      ) : null}
                    </div>

                    <div className="print-requests-detail-actions">
                      <Button
                        onClick={() => setIsRequestDetailExpanded(false)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={isRequestDetailSaveDisabled}
                        onClick={() => {
                          void handleSaveRequestDetail();
                        }}
                        type="button"
                      >
                        {isSavingRequestDetail ? "Saving..." : "Save request detail"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="print-requests-detail-actions">
                    {isSelectedRequestFullyPrinted ? (
                      <div className="print-requests-show-queue-lock">
                        <p className="print-requests-modal-hint">
                          This request has been fully printed and cannot be edited.
                        </p>
                        {canViewUpcomingShows && selectedRequestShowGroups.length > 0 ? (
                          <div className="print-requests-show-queue-row">
                            <div className="print-requests-show-queue-links">
                              {renderSelectedRequestShowQueueLinks(false)}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : isSelectedRequestQueueLocked ? (
                      <div className="print-requests-show-queue-lock">
                        <p className="print-requests-modal-hint">
                          This request is queued to a show. Remove it from the Show Queue to edit it.
                        </p>
                        <div className="print-requests-show-queue-row">
                          <div className="print-requests-show-queue-links">
                            {renderSelectedRequestShowQueueLinks(true)}
                          </div>
                          {!canRemoveSelectedRequestFromShowQueue ? (
                            <p className="print-requests-modal-hint">
                              This show has already started printing. Removing this request requires an
                              admin correction.
                            </p>
                          ) : isConfirmingShowQueueRemoval ? (
                            <div className="print-requests-show-queue-remove-confirm">
                              <span>
                                {selectedRequestShowGroups.length > 1
                                  ? `Remove this request from all ${selectedRequestShowGroups.length} shows it's queued to?`
                                  : "Remove this request from the show queue?"}
                              </span>
                              <Button
                                disabled={isRemovingFromShowQueue}
                                onClick={() => setIsConfirmingShowQueueRemoval(false)}
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                Cancel
                              </Button>
                              <Button
                                disabled={isRemovingFromShowQueue}
                                onClick={() => void handleRemoveSelectedRequestFromShowQueue()}
                                size="sm"
                                type="button"
                                variant="danger"
                              >
                                {isRemovingFromShowQueue ? "Removing..." : "Confirm"}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => setIsConfirmingShowQueueRemoval(true)}
                              size="sm"
                              type="button"
                              variant="danger"
                            >
                              Remove from show queue
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          onClick={() => setIsRequestDetailExpanded(true)}
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          Edit
                        </Button>
                        {(() => {
                          const overflowItems: Array<{
                            id: string;
                            label: string;
                            onSelect: () => void;
                            danger?: boolean;
                            disabled?: boolean;
                          }> = [];

                          if (!visibleSelectedRequest.isInternal && conversionEligibility?.eligible) {
                            overflowItems.push({
                              id: "convert-to-internal",
                              label: isConvertingRequest
                                ? "Converting..."
                                : "Convert to Internal Request",
                              danger: false,
                              disabled: isConvertingRequest,
                              onSelect: () => {
                                setConvertError(null);
                                setIsConvertConfirmOpen(true);
                              },
                            });
                          }

                          if (
                            permissionService.canDeleteEligiblePrintRequest(user) &&
                            visibleSelectedRequest.status !== "archived"
                          ) {
                            overflowItems.push({
                              id: "delete-or-archive",
                              label: "Delete or archive...",
                              onSelect: () => setIsDeletionDialogOpen(true),
                            });
                          }

                          return overflowItems.length > 0 ? (
                            <DangerOverflowMenu
                              ariaLabel="Print request more actions"
                              items={overflowItems}
                            />
                          ) : null;
                        })()}
                      </>
                    )}
                  </div>
                )}
              </Card>

              <Card className="print-requests-card">
                <div className="print-requests-section-header">
                  {requestItems.length > 0 &&
                  canManageRequestItems &&
                  !isSelectedRequestDetailLocked &&
                  !isSelectedRequestFullyPrinted ? (
                    <button
                      className="print-requests-clear-all"
                      disabled={isClearingAllItems}
                      onClick={() => {
                        setClearAllError(null);
                        setIsClearAllConfirmOpen(true);
                      }}
                      type="button"
                    >
                      {isClearingAllItems ? "Clearing..." : "Clear all"}
                    </button>
                  ) : (
                    <p className="eyebrow">Request items</p>
                  )}
                  {!isSelectedRequestFullyPrinted ? (
                    <Button
                      className="button-leading-icon"
                      onClick={openDesignLibrarySelection}
                      disabled={!selectedRequest || isSelectedRequestDetailLocked}
                      size="sm"
                      variant="secondary"
                    >
                      <ImagePlus aria-hidden="true" size={16} strokeWidth={2} />
                      Add designs
                    </Button>
                  ) : null}
                </div>

                {requestItems.length === 0 ? (
                  <EmptyState
                    message="Add an approved catalog design to start the request."
                    title="No items yet"
                  />
                ) : (
                  <div className="print-requests-item-editor-grid">
                    {requestItems.map((item) => {
                      const design = item.designId ? designById.get(item.designId) : undefined;
                      const uploadDoc = item.customerUploadId
                        ? uploadSummariesById.get(item.customerUploadId)
                        : null;
                      const upload = uploadDoc
                        ? {
                            title:
                              uploadDoc.originalFilename?.trim() ||
                              item.titleSnapshot?.trim() ||
                              "Uploaded artwork",
                            previewPath: uploadDoc.previewStoragePath,
                            thumbnailPath: uploadDoc.thumbnailStoragePath,
                            printWidthInches: uploadDoc.printWidthInches,
                            printHeightInches: uploadDoc.printHeightInches,
                            widthPx: uploadDoc.widthPx,
                            heightPx: uploadDoc.heightPx,
                            approvedMaxPrintWidthInches: uploadDoc.approvedMaxPrintWidthInches,
                            approvedMaxPrintHeightInches: uploadDoc.approvedMaxPrintHeightInches,
                            wasUpscaled: uploadDoc.wasUpscaled,
                            fromAssistedCreation: Boolean(uploadDoc.assistedCreationRequestId),
                          }
                        : item.titleSnapshot
                          ? {
                              title: item.titleSnapshot,
                              previewPath: null,
                              thumbnailPath: null,
                            }
                          : null;

                      return (
                        <PrintRequestItemCard
                          design={design}
                          item={item}
                          key={item.id}
                          onAutosaveStateChange={updateAutosaveState}
                          onDesignArtworkEnhanced={reloadReadyDesigns}
                          onArtworkEnhanceModeChanged={(result) =>
                            handleArtworkEnhanceModeChanged(item, result)
                          }
                          onOpenPreview={
                            design?.previewPath ||
                            design?.thumbnailPath ||
                            upload?.previewPath ||
                            upload?.thumbnailPath
                              ? () => setLightboxItemId(item.id)
                              : undefined
                          }
                          onPersistenceHealthChange={handlePersistenceHealthChange}
                          onRegisterFlush={handleRegisterFlush}
                          onDuplicate={handleDuplicateItem}
                          onRemove={handleRemoveItem}
                          onUpdate={handleUpdateItem}
                          printRequestId={selectedRequestId ?? ""}
                          readOnly={isSelectedRequestDetailLocked}
                          standardPrintSizesSettings={standardPrintSizesSettings}
                          upload={upload}
                        />
                      );
                    })}
                  </div>
                )}
              </Card>

              <PrintRequestItemsPreviewLightbox
                activeItemId={lightboxItemId}
                designById={designById}
                items={requestItems}
                onActiveItemChange={setLightboxItemId}
                onClose={() => setLightboxItemId(null)}
                resolveUpload={(item) => {
                  const uploadDoc = item.customerUploadId
                    ? uploadSummariesById.get(item.customerUploadId)
                    : null;
                  if (uploadDoc) {
                    return {
                      title:
                        uploadDoc.originalFilename?.trim() ||
                        item.titleSnapshot?.trim() ||
                        "Uploaded artwork",
                      previewPath: uploadDoc.previewStoragePath,
                      thumbnailPath: uploadDoc.thumbnailStoragePath,
                      printWidthInches: uploadDoc.printWidthInches,
                      printHeightInches: uploadDoc.printHeightInches,
                      widthPx: uploadDoc.widthPx,
                      heightPx: uploadDoc.heightPx,
                      approvedMaxPrintWidthInches: uploadDoc.approvedMaxPrintWidthInches,
                      approvedMaxPrintHeightInches: uploadDoc.approvedMaxPrintHeightInches,
                      wasUpscaled: uploadDoc.wasUpscaled,
                      fromAssistedCreation: Boolean(uploadDoc.assistedCreationRequestId),
                    };
                  }
                  if (item.titleSnapshot) {
                    return {
                      title: item.titleSnapshot,
                      previewPath: null,
                      thumbnailPath: null,
                    };
                  }
                  return null;
                }}
              />
            </>
          )}
        </section>
      </div>

      {isCreateModalOpen ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="print-request-create-title"
            className="modal-panel modal-panel-md print-requests-create-modal"
            role="dialog"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Create request</p>
                <h3 id="print-request-create-title">New print request</h3>
              </div>

              <button
                aria-label="Close new print request"
                className="icon-button icon-button-md icon-button-ghost"
                onClick={closeCreateModal}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <form
                className="print-requests-modal-form"
                id="create-print-request-form"
                onSubmit={handleCreateRequest}
              >
                <div className="print-requests-modal-grid">
                  <Select
                    className={
                      createRequestForm.customerMode === "internal"
                        ? "print-requests-modal-grid-full"
                        : undefined
                    }
                    label="Request type"
                    name="customerMode"
                    onChange={(event) =>
                      setCreateRequestForm((current) => ({
                        ...current,
                        customerMode: event.target.value as CustomerMode,
                        customerId: event.target.value === "customer" ? current.customerId : "",
                        internalBaseName: event.target.value === "internal" ? current.internalBaseName : "",
                      }))
                    }
                    options={CUSTOMER_MODE_OPTIONS}
                    value={createRequestForm.customerMode}
                  />

                  {createRequestForm.customerMode === "customer" ? (
                    <Select
                      disabled={isCustomerDirectoryLoading}
                      label={isCustomerDirectoryLoading ? "Customer (loading…)" : "Customer"}
                      name="customerId"
                      onChange={(event) =>
                        setCreateRequestForm((current) => ({
                          ...current,
                          customerId: event.target.value,
                        }))
                      }
                      options={[{ label: "Choose a customer", value: "" }, ...customerOptions]}
                      value={createRequestForm.customerId}
                    />
                  ) : null}
                </div>

                {createRequestForm.customerMode === "internal" ? (
                  <TextInput
                    label="Internal base name"
                    name="internalBaseName"
                    onChange={(event) =>
                      setCreateRequestForm((current) => ({
                        ...current,
                        internalBaseName: event.target.value,
                      }))
                    }
                    value={createRequestForm.internalBaseName}
                  />
                ) : null}

                {createRequestForm.customerMode === "customer" ? (
                  <>
                    {customerOptions.length === 0 ? (
                      <div className="print-requests-modal-helper">
                        <p className="print-requests-modal-hint">
                          Create a customer before creating customer requests.
                        </p>
                        {permissionService.canManageCustomers(user) ? (
                          <Button
                            className="print-requests-modal-helper-btn"
                            onClick={openUsersForCustomerCreation}
                            size="sm"
                            variant="secondary"
                          >
                            Go to Users
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="print-requests-modal-hint">
                        Customer request names are generated from the customer's username and next sequence.
                      </p>
                    )}

                    {selectedCreateCustomer && !selectedCreateCustomer.username ? (
                      <p className="auth-message auth-message-error" role="alert">
                        Add a username to this customer before creating a print request.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="print-requests-modal-hint">
                    Internal request names use the base name and next locked internal sequence. Leave blank to use internal.
                  </p>
                )}

                <AutoResizeTextarea
                  label="Request notes"
                  name="notes"
                  onChange={(event) => setCreateRequestForm((current) => ({ ...current, notes: event.target.value }))}
                  value={createRequestForm.notes}
                />

                <p className="print-requests-modal-hint">
                  Create a clean request list, then add approved designs and item details once the request is saved.
                </p>

                {actionError ? (
                  <p className="auth-message auth-message-error" role="alert">
                    {actionError}
                  </p>
                ) : null}
              </form>
            </ModalBody>
            <ModalFooter>
              <Button onClick={closeCreateModal} variant="ghost">
                Cancel
              </Button>
              <Button
                disabled={isCreateSubmitDisabled || (selectedCreateCustomer !== undefined && !selectedCreateCustomer.username)}
                form="create-print-request-form"
                type="submit"
              >
                Create request
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {isAddToShowModalOpen && visibleSelectedRequest ? (
        <AddToShowModal
          destinationMode={addToShowDestination}
          designById={designById}
          items={requestItems}
          onAdded={handleAddedToShow}
          onClose={() => setIsAddToShowModalOpen(false)}
          printRequest={visibleSelectedRequest}
        />
      ) : null}

      {transferShowContext && visibleSelectedRequest ? (() => {
        const sourceShow = selectedRequestShowsById.get(transferShowContext.sourceShowId);
        if (!sourceShow) {
          return null;
        }

        return (
          <TransferPrintRequestToShowModal
            onClose={() => setTransferShowContext(null)}
            onTransferred={async ({ mode }) => {
              setTransferShowContext(null);
              setSuccessMessage(
                mode === "copy"
                  ? "Request copied to the selected show."
                  : "Request moved to the selected show.",
              );
              setSuccessAlertSeed((current) => current + 1);
              await reloadAllAllocationData();
            }}
            printRequest={visibleSelectedRequest}
            sourceShow={sourceShow}
            transferQuantity={transferShowContext.transferQuantity}
          />
        );
      })() : null}

      
      {isConvertConfirmOpen ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="print-request-convert-title"
            className="modal-panel modal-panel-md"
            role="dialog"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Customer request</p>
                <h3 id="print-request-convert-title">Convert to Internal Request</h3>
              </div>
              <button
                aria-label="Close convert confirmation"
                className="icon-button icon-button-md icon-button-ghost"
                disabled={isConvertingRequest}
                onClick={() => setIsConvertConfirmOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <p>
                This closes the customer request in Portal history as converted and creates a new
                internal request with the same items.
              </p>
              {conversionEligibility && conversionEligibility.cancelableAllocations.length > 0 ? (
                <div className="print-requests-modal-helper">
                  <p className="print-requests-modal-hint">
                    The following show allocations will be canceled:
                  </p>
                  <ul>
                    {conversionEligibility.cancelableAllocations.map((allocation) => (
                      <li key={allocation.id}>
                        {allocation.requestNameSnapshot ?? allocation.upcomingShowId} — {allocation.status} — qty{' '}
                        {allocation.allocatedQuantity}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {convertError ? <p className="auth-message auth-message-error">{convertError}</p> : null}
            </ModalBody>
            <ModalFooter>
              <Button
                disabled={isConvertingRequest}
                onClick={() => setIsConvertConfirmOpen(false)}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={isConvertingRequest}
                onClick={() => void handleConvertToInternal()}
                type="button"
              >
                {isConvertingRequest ? "Converting..." : "Convert"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {isClearAllConfirmOpen ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="print-request-clear-all-title"
            className="modal-panel modal-panel-md"
            role="dialog"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Request items</p>
                <h3 id="print-request-clear-all-title">Clear all designs?</h3>
              </div>
              <button
                aria-label="Close clear-all confirmation"
                className="icon-button icon-button-md icon-button-ghost"
                disabled={isClearingAllItems}
                onClick={() => setIsClearAllConfirmOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <p>
                This removes every design from this request so you can start fresh. You can add
                designs again anytime.
              </p>
              {clearAllError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {clearAllError}
                </p>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button
                disabled={isClearingAllItems}
                onClick={() => setIsClearAllConfirmOpen(false)}
                type="button"
                variant="secondary"
              >
                Keep designs
              </Button>
              <Button
                disabled={isClearingAllItems}
                onClick={() => void handleClearAllItems()}
                type="button"
                variant="danger"
              >
                {isClearingAllItems ? "Clearing..." : "Clear all"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      <PrintRequestDeletionDialog
        isOpen={isDeletionDialogOpen}
        onCancel={() => setIsDeletionDialogOpen(false)}
        onCompleted={({ message, printRequestId, outcome }) => {
          setIsDeletionDialogOpen(false);
          setSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
          reconcileDeletedOrArchivedRequest(printRequestId, outcome);
          commitPrintRequestsRoute({
            kind: activeListKind,
            tab: activeListTab,
            workingFilter: activeListTab === "working" ? workingTriageFilter : undefined,
          });
        }}
        printRequestId={visibleSelectedRequest?.id ?? null}
        printRequestName={visibleSelectedRequest?.name ?? "Print request"}
      />

      {autosaveState.status !== "idle" ? (
        <div className={`print-requests-autosave-indicator is-${autosaveState.status}`} role="status">
          <span>
            {autosaveState.status === "saving"
              ? "Saving..."
              : autosaveState.status === "saved"
                ? "Saved"
                : "Save failed"}
          </span>
          {autosaveState.status === "failed" && autosaveState.message ? (
            <span className="print-requests-autosave-message">{autosaveState.message}</span>
          ) : null}
          {autosaveState.status === "failed" && autosaveState.retry ? (
            <Button
              onClick={() => {
                void autosaveState.retry?.();
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

    </main>
  );
}
