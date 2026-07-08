import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { ExternalLink, ImagePlus, Plus, RefreshCw, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
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
import { printRequestService, type UpdatePrintRequestItemInput } from "../services/printRequestService";
import { useCustomers } from "../hooks/useCustomers";
import { usePrintRequestDetails } from "../hooks/usePrintRequestDetails";
import { usePrintRequests } from "../hooks/usePrintRequests";
import { usePrintRequestAllocationTotals } from "../hooks/usePrintRequestAllocationTotals";
import { useReadyDesignsForSelection } from "../hooks/useReadyDesignsForSelection";
import { PrintRequestItemCard } from "../components/PrintRequestItemCard";
import { AddToShowModal } from "../components/AddToShowModal";
import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import { formatInternalPrintRequestName } from "@fresh-prints/shared/utils/printRequestNaming";
import { getPrintRequestOriginBadgeLabel } from "@fresh-prints/shared/utils/printRequestOrigin";
import { derivePrintRequestQueueState } from "@fresh-prints/shared/utils/printRequestQueueState";
import { derivePrintRequestListTab, type PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";
import { resolveSelectedRequestIdForTab } from "@fresh-prints/shared/utils/printRequestTabSelection";
import { groupAllocationsByShow } from "@fresh-prints/shared/utils/groupAllocationsByShow";
import { canRemoveRequestFromShow } from "@fresh-prints/shared/utils/showQueueEditability";
import { getPrintRequestQueueStateBadgeLabel, getPrintRequestQueueStateBadgeVariant } from "../utils/printRequestQueueBadge";
import { PRINT_REQUEST_ID_QUERY_PARAM, getPrintRequestsPath } from "../constants/printRequestRoutes";
import { getDesignLibraryPath } from "../../designs/constants/designLibraryFilters";
import { useUpcomingShows } from "../../upcoming-shows/hooks/useUpcomingShows";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import { formatUpcomingShowTitle } from "../../upcoming-shows/utils/upcomingShowDisplay";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import { getUpcomingShowsPath } from "../../upcoming-shows/constants/upcomingShowRoutes";

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

function getPrintRequestCustomerLabel(printRequest: PrintRequest | null, customers: Customer[]): string {
  if (!printRequest) {
    return "No request selected";
  }

  if (printRequest.isInternal) {
    return "Internal";
  }

  if (printRequest.customerId) {
    return customers.find((customer) => customer.id === printRequest.customerId)?.displayName ?? printRequest.customerId;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { customers, isLoading: isCustomersLoading, reloadCustomers } = useCustomers();
  const {
    designs: readyDesigns,
    isLoading: isReadyDesignsLoading,
    reloadDesigns: reloadReadyDesigns,
  } = useReadyDesignsForSelection();
  const {
    error: requestsError,
    isLoading: isRequestsLoading,
    reloadPrintRequests,
    requests,
    summariesByRequestId,
  } = usePrintRequests();
  const { totalsByRequestId: allocationTotalsByRequestId, reload: reloadAllocationTotals } =
    usePrintRequestAllocationTotals();
  const { shows: upcomingShows } = useUpcomingShows();
  const [activeListTab, setActiveListTab] = useState<PrintRequestListTab>("working");

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const requestDetails = usePrintRequestDetails(selectedRequestId);
  const isLoadedSelectedRequest = requestDetails.loadedRequestId === selectedRequestId;
  const selectedRequest = isLoadedSelectedRequest ? requestDetails.printRequest : null;
  const requestItems = isLoadedSelectedRequest ? requestDetails.items : [];
  const requestError = isLoadedSelectedRequest ? requestDetails.error : null;
  const isRequestLoading = requestDetails.isLoading || (Boolean(selectedRequestId) && !isLoadedSelectedRequest);
  const reloadPrintRequest = requestDetails.reloadPrintRequest;
  const insertRequestItemAfter = requestDetails.insertItemAfter;
  const removeRequestItem = requestDetails.removeItem;
  const replaceRequestItem = requestDetails.replaceItem;
  const replaceSelectedRequest = requestDetails.replacePrintRequest;
  const visibleSelectedRequest = isRequestLoading ? null : selectedRequest;

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({ status: "idle" });
  const [requestNotesDraft, setRequestNotesDraft] = useState("");
  const [internalBaseNameDraft, setInternalBaseNameDraft] = useState("internal");
  const [isSavingRequestDetail, setIsSavingRequestDetail] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRequestForm, setCreateRequestForm] = useState<PrintRequestFormState>(DEFAULT_REQUEST_FORM);
  const [isRequestDetailExpanded, setIsRequestDetailExpanded] = useState(false);
  const [successAlertSeed, setSuccessAlertSeed] = useState(0);
  const [isAddToShowModalOpen, setIsAddToShowModalOpen] = useState(false);
  const [selectedRequestAllocations, setSelectedRequestAllocations] = useState<ShowAllocation[]>([]);
  const [isConfirmingShowQueueRemoval, setIsConfirmingShowQueueRemoval] = useState(false);
  const [isRemovingFromShowQueue, setIsRemovingFromShowQueue] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedRequestIdParam = searchParams.get(PRINT_REQUEST_ID_QUERY_PARAM);

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

  /**
   * Mirrors the Show Detail page's removal gate (`canRemoveRequestFromShow`): once any show the
   * request is queued to has started printing or further along, removal must go through an admin
   * correction instead of this normal remove-from-here flow.
   */
  const canRemoveSelectedRequestFromShowQueue = selectedRequestShowGroups.every((group) => {
    const show = upcomingShows.find((candidate) => candidate.id === group.upcomingShowId);
    return !show || canRemoveRequestFromShow(show.productionStatus);
  });

  /**
   * Allocating/removing from a show can flip the print request's persisted `status` (e.g.
   * `editing` -> `active` on re-add), so this must also reload the request itself and the list —
   * otherwise the detail panel and sidebar badge keep showing the stale status object held from
   * before the write, even though Firestore already has the correct value.
   */
  const reloadAllAllocationData = useCallback(async () => {
    await Promise.all([
      reloadAllocationTotals(),
      reloadPrintRequest(),
      reloadPrintRequests(),
      reloadSelectedRequestAllocations(),
    ]);
  }, [reloadAllocationTotals, reloadPrintRequest, reloadPrintRequests, reloadSelectedRequestAllocations]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setActionError(null);

    try {
      await Promise.all([
        reloadPrintRequests({ silent: true }),
        reloadAllocationTotals({ silent: true }),
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
    reloadAllocationTotals,
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
      for (const group of selectedRequestShowGroups) {
        await upcomingShowService.removeShowAllocationsForRequest(user, group.upcomingShowId, visibleSelectedRequest.id);
      }

      setIsConfirmingShowQueueRemoval(false);
      await reloadAllAllocationData();
      setActiveListTab("working");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to remove this request from the show queue.");
    } finally {
      setIsRemovingFromShowQueue(false);
    }
  }, [reloadAllAllocationData, selectedRequestShowGroups, user, visibleSelectedRequest]);

  const resetCreateRequestForm = useCallback(() => {
    setCreateRequestForm(DEFAULT_REQUEST_FORM);
  }, []);

  const openCreateModal = useCallback(() => {
    setActionError(null);
    setSuccessMessage(null);
    resetCreateRequestForm();
    setIsCreateModalOpen(true);
  }, [resetCreateRequestForm]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    resetCreateRequestForm();
    setActionError(null);
  }, [resetCreateRequestForm]);

  const updateSelectedRequestPath = useCallback(
    (requestId: string) => {
      navigate(getPrintRequestsPath({ requestId }), { replace: true });
    },
    [navigate],
  );

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

  const hasAppliedInitialUrlSelectionRef = useRef(false);

  useEffect(() => {
    setIsRequestDetailExpanded(false);
  }, [selectedRequestId]);

  const customerOptions = useMemo(
    () =>
      customers.filter((customer) => !customer.isGuest).map((customer) => ({
        label: customer.username ? `${customer.displayName} (${customer.username})` : `${customer.displayName} (needs username)`,
        value: customer.id,
      })),
    [customers],
  );

  const designById = useMemo(
    () => new Map(readyDesigns.map((design) => [design.id, design])),
    [readyDesigns],
  );

  const requestsByListTab = useMemo(() => {
    const grouped: Record<PrintRequestListTab, PrintRequest[]> = {
      working: [],
      queued: [],
      printing: [],
      printed: [],
    };

    for (const request of requests) {
      const summary = summariesByRequestId[request.id] ?? { totalQuantity: 0, uniqueDesignCount: 0 };
      const allocationTotals = allocationTotalsByRequestId[request.id] ?? {
        totalAllocatedQuantity: 0,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 0,
      };
      const tab = derivePrintRequestListTab({
        totalRequestedQuantity: summary.totalQuantity,
        totalAllocatedQuantity: allocationTotals.totalAllocatedQuantity,
        totalInProgressQuantity: allocationTotals.totalInProgressQuantity,
        totalPrintedQuantity: allocationTotals.totalPrintedQuantity,
        status: request.status,
      });

      grouped[tab].push(request);
    }

    return grouped;
  }, [allocationTotalsByRequestId, requests, summariesByRequestId]);

  const visibleRequests = requestsByListTab[activeListTab];

  useEffect(() => {
    if (hasAppliedInitialUrlSelectionRef.current || !selectedRequestIdParam || isRequestsLoading) {
      return;
    }

    const linkedRequestTab = (Object.keys(requestsByListTab) as PrintRequestListTab[]).find((tab) =>
      requestsByListTab[tab].some((request) => request.id === selectedRequestIdParam),
    );

    if (!linkedRequestTab) {
      return;
    }

    hasAppliedInitialUrlSelectionRef.current = true;
    setActiveListTab(linkedRequestTab);
    setSelectedRequestId(selectedRequestIdParam);
  }, [isRequestsLoading, requestsByListTab, selectedRequestIdParam]);

  /**
   * Keeps the selected request in sync with the active tab: if the current selection no longer
   * belongs to this tab (moved by an allocation change, or the tab was just switched), fall back to
   * the tab's first request, or clear the selection entirely if the tab is empty. Without this, the
   * detail panel could keep showing a request that just moved to a different tab.
   */
  useEffect(() => {
    if (isRequestsLoading) {
      return;
    }

    const visibleRequestIds = visibleRequests.map((request) => request.id);
    const nextSelectedRequestId = resolveSelectedRequestIdForTab(selectedRequestId, visibleRequestIds);

    if (nextSelectedRequestId === selectedRequestId) {
      return;
    }

    setSelectedRequestId(nextSelectedRequestId);

    if (nextSelectedRequestId) {
      updateSelectedRequestPath(nextSelectedRequestId);
    }
  }, [isRequestsLoading, selectedRequestId, updateSelectedRequestPath, visibleRequests]);

  const selectedCreateCustomer = useMemo(
    () => customers.find((customer) => customer.id === createRequestForm.customerId),
    [createRequestForm.customerId, customers],
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

  useEffect(() => {
    setAutosaveState({ status: "idle" });
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

  async function reloadAll() {
    await Promise.all([reloadPrintRequests(), reloadCustomers(), reloadReadyDesigns(), reloadPrintRequest()]);
  }

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
      await reloadAll();
      setSelectedRequestId(result.id);
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
    replaceRequestItem(updatedItem);
    await reloadPrintRequests();
  }, [reloadPrintRequests, replaceRequestItem, user]);

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
      setSuccessMessage("Request detail saved.");
      setSuccessAlertSeed((current) => current + 1);
      await reloadPrintRequests();
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
      await reloadPrintRequests();
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  async function handleDuplicateItem(item: PrintRequestItem) {
    if (!user || !permissionService.canManagePrintRequestItems(user)) {
      return;
    }

    try {
      setActionError(null);
      const createdItem = await printRequestService.duplicatePrintRequestItem(user, item.id);
      insertRequestItemAfter(item.id, createdItem);
      await reloadPrintRequests();
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

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

  const isLoading = isRequestsLoading || isCustomersLoading || isReadyDesignsLoading;
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
          <div className="print-requests-tab-bar">
            {(["working", "queued", "printing", "printed"] as const).map((tab) => (
              <button
                className={`print-requests-tab-button${activeListTab === tab ? " is-active" : ""}`}
                key={tab}
                onClick={() => setActiveListTab(tab)}
                type="button"
              >
                {tab === "working"
                  ? "Working"
                  : tab === "queued"
                    ? "Queued"
                    : tab === "printing"
                      ? "Printing"
                      : "Printed"}{" "}
                ({requestsByListTab[tab].length})
              </button>
            ))}
          </div>
          <div className="print-requests-rail-list">
            {isLoading ? (
              <div className="print-requests-loading">
                <LoadingSpinner label="Loading print requests" />
              </div>
            ) : visibleRequests.length === 0 ? (
              <EmptyState
                message="No print requests in this tab yet."
                title="Nothing here yet"
              />
            ) : (
              visibleRequests.map((request) => {
                const isSelected = request.id === selectedRequestId;
                const requestSummary = summariesByRequestId[request.id] ?? {
                  totalQuantity: 0,
                  uniqueDesignCount: 0,
                };

                return (
                  <button
                    className={`print-requests-request-card${isSelected ? " is-selected" : ""}`}
                    key={request.id}
                    onClick={() => {
                      setSelectedRequestId(request.id);
                      updateSelectedRequestPath(request.id);
                    }}
                    type="button"
                  >
                    <div className="print-requests-request-card-title-row">
                      <strong>{request.name}</strong>
                      <div className="print-requests-request-card-badges">
                        <Badge variant="default">{getPrintRequestOriginBadgeLabel(request)}</Badge>
                        <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
                      </div>
                    </div>
                    <p className="print-requests-request-card-subtitle">
                      {request.isInternal
                        ? request.notes?.trim() || "No notes"
                        : getPrintRequestCustomerLabel(request, customers)}
                    </p>
                    <div className="print-requests-request-card-counts">
                      <span>{formatDesignCountLabel(requestSummary.uniqueDesignCount)}</span>
                      <span>{formatTotalQuantityLabel(requestSummary.totalQuantity)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="print-requests-main">
          {visibleSelectedRequest && !isSelectedRequestQueueLocked ? (
            <div className="print-requests-page-actions">
              <Button
                disabled={requestItems.length === 0}
                onClick={() => setIsAddToShowModalOpen(true)}
                title={
                  requestItems.length === 0
                    ? "Add designs to this request before adding it to a show."
                    : undefined
                }
                type="button"
              >
                Add to Show
              </Button>
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
                  </div>
                  <div className="print-requests-detail-actions">
                    <div className="print-requests-detail-badges">
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
                    {isSelectedRequestQueueLocked ? (
                      <div className="print-requests-show-queue-lock">
                        <p className="print-requests-modal-hint">
                          This request is queued to a show. Remove it from the Show Queue to edit it.
                        </p>
                        <div className="print-requests-show-queue-row">
                          <div className="print-requests-show-queue-links">
                            {selectedRequestShowGroups.map((group) => {
                              const show = upcomingShows.find((candidate) => candidate.id === group.upcomingShowId);
                              const groupQuantity = group.allocations.reduce(
                                (sum, allocation) => sum + allocation.allocatedQuantity,
                                0,
                              );
                              const showTitle = show ? formatUpcomingShowTitle(show) : "Show";
                              const showDateLabel = show?.scheduledStartAt
                                ? formatShowDateTimeLabel(show.scheduledStartAt.toDate())
                                : "Not scheduled";

                              return (
                                <Link
                                  className="print-requests-show-queue-pill"
                                  key={group.upcomingShowId}
                                  title={showTitle}
                                  to={getUpcomingShowsPath({ showId: group.upcomingShowId })}
                                >
                                  <span>{groupQuantity} qty</span>
                                  <span>&middot;</span>
                                  <span>{showDateLabel}</span>
                                  <ExternalLink aria-hidden="true" size={12} strokeWidth={2.2} />
                                </Link>
                              );
                            })}
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
                      <Button
                        onClick={() => setIsRequestDetailExpanded(true)}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </Card>

              <Card className="print-requests-card">
                <div className="print-requests-section-header">
                  <p className="eyebrow">Request items</p>
                  <Button
                    className="button-leading-icon"
                    onClick={openDesignLibrarySelection}
                    disabled={!selectedRequest || isSelectedRequestQueueLocked}
                    size="sm"
                    variant="secondary"
                  >
                    <ImagePlus aria-hidden="true" size={16} strokeWidth={2} />
                    Add designs
                  </Button>
                </div>

                {requestItems.length === 0 ? (
                  <EmptyState
                    message="Add an approved catalog design to start the request."
                    title="No items yet"
                  />
                ) : (
                  <div className="print-requests-item-editor-grid">
                    {requestItems.map((item) => {
                      const design = designById.get(item.designId);

                      return (
                        <PrintRequestItemCard
                          design={design}
                          item={item}
                          key={item.id}
                          onAutosaveStateChange={updateAutosaveState}
                          onDuplicate={handleDuplicateItem}
                          onRemove={handleRemoveItem}
                          onUpdate={handleUpdateItem}
                          readOnly={isSelectedRequestQueueLocked}
                        />
                      );
                    })}
                  </div>
                )}
              </Card>
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
                      label="Customer"
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
          designById={designById}
          items={requestItems}
          onAdded={reloadAllAllocationData}
          onClose={() => setIsAddToShowModalOpen(false)}
          printRequest={visibleSelectedRequest}
        />
      ) : null}

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
