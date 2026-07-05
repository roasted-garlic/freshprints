import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { ChevronDown, ChevronUp, ImagePlus, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
import { useReadyDesignsForSelection } from "../hooks/useReadyDesignsForSelection";
import { PrintRequestItemCard } from "../components/PrintRequestItemCard";
import type { PrintRequest, PrintRequestItem } from "../../../../../../shared/types/printRequest/printRequest.types";
import type { Customer } from "../../../../../../shared/types/customer/customer.types";
import { formatInternalPrintRequestName } from "../../../../../../shared/utils/printRequestNaming";
import { getPrintRequestOriginBadgeLabel } from "../../../../../../shared/utils/printRequestOrigin";
import { PRINT_REQUEST_ID_QUERY_PARAM, getPrintRequestsPath } from "../constants/printRequestRoutes";
import { getDesignLibraryPath } from "../../designs/constants/designLibraryFilters";

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

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const requestDetails = usePrintRequestDetails(selectedRequestId);
  const isLoadedSelectedRequest = requestDetails.loadedRequestId === selectedRequestId;
  const selectedRequest = isLoadedSelectedRequest ? requestDetails.printRequest : null;
  const requestItems = isLoadedSelectedRequest ? requestDetails.items : [];
  const requestError = isLoadedSelectedRequest ? requestDetails.error : null;
  const isRequestLoading = requestDetails.isLoading || (Boolean(selectedRequestId) && !isLoadedSelectedRequest);
  const reloadPrintRequest = requestDetails.reloadPrintRequest;
  const addRequestItem = requestDetails.addItem;
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
  const selectedRequestIdParam = searchParams.get(PRINT_REQUEST_ID_QUERY_PARAM);

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
        description: "Build named print request lists from approved catalog designs.",
        primaryAction: {
          label: "New request",
          onClick: openCreateModal,
        },
      }),
      [openCreateModal],
    ),
  );

  useEffect(() => {
    if (selectedRequestIdParam) {
      if (selectedRequestIdParam !== selectedRequestId) {
        setSelectedRequestId(selectedRequestIdParam);
      }

      return;
    }

    if (!selectedRequestId && requests.length > 0) {
      const firstRequestId = requests[0].id;
      setSelectedRequestId(firstRequestId);
      updateSelectedRequestPath(firstRequestId);
    }
  }, [requests, selectedRequestId, selectedRequestIdParam, updateSelectedRequestPath]);

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

  const requestOptions = useMemo(
    () =>
      requests.map((request) => ({
        label: request.name,
        value: request.id,
      })),
    [requests],
  );
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
      addRequestItem(createdItem);
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
          <div className="print-requests-rail-header">
            <div>
              <p className="eyebrow">Staff queue</p>
              <h2>Print Requests</h2>
              <p>Named request lists for customers and internal planning.</p>
            </div>
          </div>

          <div className="print-requests-rail-list">
            {isLoading ? (
              <div className="print-requests-loading">
                <LoadingSpinner label="Loading print requests" />
              </div>
            ) : requests.length === 0 ? (
              <EmptyState
                message="Create the first print request to start building request lists."
                title="No print requests yet"
              />
            ) : (
              requestOptions.map((option) => {
                const request = requests.find((entry) => entry.id === option.value);
                if (!request) {
                  return null;
                }

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
                      {getPrintRequestCustomerLabel(request, customers)}
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
          <Card className="print-requests-card print-requests-workflow-card">
            <p className="eyebrow">How it works</p>
            <p className="print-requests-workflow-copy">
              Create a request for a customer or internal list. Add approved catalog designs, then set
              quantity and requested print size. Phase 7 will connect requests to print runs and upcoming shows.
            </p>
          </Card>

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
                    </div>
                    <Button
                      aria-label={isRequestDetailExpanded ? "Collapse request detail" : "Expand request detail"}
                      aria-expanded={isRequestDetailExpanded}
                      className="print-requests-detail-toggle-button"
                      onClick={() => setIsRequestDetailExpanded((current) => !current)}
                      size="sm"
                      variant="ghost"
                      type="button"
                    >
                      {isRequestDetailExpanded ? (
                        <ChevronUp aria-hidden="true" size={16} strokeWidth={2} />
                      ) : (
                        <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
                      )}
                    </Button>
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
                ) : null}
              </Card>

              <Card className="print-requests-card">
                <div className="print-requests-section-header">
                  <p className="eyebrow">Request items</p>
                  <Button
                    className="button-leading-icon"
                    onClick={openDesignLibrarySelection}
                    disabled={!selectedRequest}
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
                  <div className="print-requests-item-list">
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
