import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { ChevronDown, ChevronUp, ImagePlus } from "lucide-react";
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
import { printRequestService } from "../services/printRequestService";
import { useCustomers } from "../hooks/useCustomers";
import { usePrintRequestDetails } from "../hooks/usePrintRequestDetails";
import { usePrintRequests } from "../hooks/usePrintRequests";
import { useReadyDesignsForSelection } from "../hooks/useReadyDesignsForSelection";
import { PrintRequestItemCard } from "../components/PrintRequestItemCard";
import type { PrintRequest, PrintRequestItem } from "../../../../../../shared/types/printRequest/printRequest.types";
import type { PrintRequestItemStatus } from "../../../../../../shared/types/printRequest/printRequest.enums";
import type { Customer } from "../../../../../../shared/types/customer/customer.types";
import { PRINT_REQUEST_ID_QUERY_PARAM, getPrintRequestsPath } from "../constants/printRequestRoutes";
import { getDesignLibraryPath } from "../../designs/constants/designLibraryFilters";

type CustomerMode = "internal" | "customer";

interface PrintRequestFormState {
  name: string;
  customerMode: CustomerMode;
  customerId: string;
  notes: string;
}

const DEFAULT_REQUEST_FORM: PrintRequestFormState = {
  name: "",
  customerMode: "internal",
  customerId: "",
  notes: "",
};

const CUSTOMER_MODE_OPTIONS = [
  { label: "Internal", value: "internal" },
  { label: "Customer", value: "customer" },
];

const PRINT_REQUEST_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

const PRINT_REQUEST_ITEM_STATUS_OPTIONS: Array<{ label: string; value: PrintRequestItemStatus }> = [
  { label: "Pending", value: "pending" },
  { label: "Queued", value: "queued" },
  { label: "In progress", value: "in_progress" },
  { label: "Printed", value: "printed" },
  { label: "Done", value: "done" },
  { label: "Canceled", value: "canceled" },
];

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

function getItemStatusBadgeVariant(status: PrintRequestItemStatus) {
  switch (status) {
    case "done":
    case "printed":
      return "success";
    case "queued":
    case "in_progress":
      return "warning";
    case "canceled":
      return "danger";
    case "pending":
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

function toRequestNameBase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
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
  const visibleSelectedRequest = isRequestLoading ? null : selectedRequest;

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRequestForm, setCreateRequestForm] = useState<PrintRequestFormState>(DEFAULT_REQUEST_FORM);
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
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
    setExpandedItemIds({});
  }, [selectedRequestId]);

  useEffect(() => {
    setIsRequestDetailExpanded(false);
  }, [selectedRequestId]);

  const customerOptions = useMemo(
    () =>
      customers.filter((customer) => !customer.isGuest).map((customer) => ({
        label: customer.displayName,
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

  const dismissSuccessMessage = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const buildCustomerRequestName = useCallback(
    (customerId: string) => {
      const customer = customers.find((entry) => entry.id === customerId);
      if (!customer) {
        return "";
      }

      const requestNameBase = toRequestNameBase(customer.displayName);
      if (!requestNameBase) {
        return "";
      }

      const nextSequence =
        requests
          .filter((request) => request.customerId === customerId)
          .reduce((highestSequence, request) => {
            const match = request.name.match(new RegExp(`^${requestNameBase}-(\\d{3})$`, "i"));
            if (!match) {
              return highestSequence;
            }

            const sequence = Number.parseInt(match[1], 10);
            if (Number.isNaN(sequence)) {
              return highestSequence;
            }

            return Math.max(highestSequence, sequence);
          }, 0) + 1;

      return `${requestNameBase}-${String(nextSequence).padStart(3, "0")}`;
    },
    [customers, requests],
  );

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
      const result = await printRequestService.createPrintRequest(user, {
        name: createRequestForm.name,
        customerId: createRequestForm.customerMode === "customer" ? createRequestForm.customerId : undefined,
        isInternal: createRequestForm.customerMode === "internal",
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

  async function handleUpdateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !selectedRequest || !permissionService.canManagePrintRequests(user)) {
      return;
    }

    try {
      setActionError(null);
      const formData = new FormData(event.currentTarget);
      await printRequestService.updatePrintRequest(user, selectedRequest.id, {
        name: String(formData.get("requestName") ?? selectedRequest.name),
        status: String(formData.get("requestStatus") ?? selectedRequest.status) as PrintRequest["status"],
        notes: String(formData.get("requestNotes") ?? selectedRequest.notes ?? ""),
      });
      setSuccessMessage("Print request updated.");
      setSuccessAlertSeed((current) => current + 1);
      await reloadAll();
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  async function handleUpdateItem(event: FormEvent<HTMLFormElement>, item: PrintRequestItem) {
    event.preventDefault();

    if (!user || !permissionService.canManagePrintRequestItems(user)) {
      return;
    }

    try {
      setActionError(null);
      const formData = new FormData(event.currentTarget);
      await printRequestService.updatePrintRequestItem(user, item.id, {
        quantity: Number(formData.get(`quantity-${item.id}`) ?? item.quantity),
        notes: String(formData.get(`notes-${item.id}`) ?? item.notes ?? ""),
        status: String(formData.get(`status-${item.id}`) ?? item.status) as PrintRequestItemStatus,
      });

      setSuccessMessage("Print request item updated.");
      setSuccessAlertSeed((current) => current + 1);
      await reloadAll();
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  async function handleRemoveItem(item: PrintRequestItem) {
    if (!user || !permissionService.canManagePrintRequestItems(user)) {
      return;
    }

    try {
      setActionError(null);
      await printRequestService.removePrintRequestItem(user, item.id);
      setSuccessMessage("Print request item removed.");
      setSuccessAlertSeed((current) => current + 1);
      await reloadAll();
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  const toggleItemExpanded = useCallback((itemId: string) => {
    setExpandedItemIds((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  }, []);

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
                      <Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge>
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
              quantity, notes, and item status. Phase 7 will connect requests to print runs and upcoming shows.
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
                      <Badge variant={getStatusBadgeVariant(visibleSelectedRequest.status)}>
                        {visibleSelectedRequest.status}
                      </Badge>
                      {visibleSelectedRequest.isInternal ? <Badge variant="default">Internal</Badge> : null}
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
                  <form className="print-requests-detail-form" onSubmit={handleUpdateRequest}>
                    <TextInput
                      defaultValue={visibleSelectedRequest.name}
                      label="Request name"
                      name="requestName"
                    />

                    <Select
                      label="Status"
                      name="requestStatus"
                      options={PRINT_REQUEST_STATUS_OPTIONS}
                      value={visibleSelectedRequest.status}
                    />

                    <AutoResizeTextarea
                      defaultValue={visibleSelectedRequest.notes ?? ""}
                      label="Notes"
                      name="requestNotes"
                      placeholder="Optional request notes"
                    />

                    <div className="print-requests-detail-actions">
                      <Button type="submit">Save request</Button>
                    </div>
                  </form>
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
                          isExpanded={expandedItemIds[item.id] ?? false}
                          item={item}
                          key={item.id}
                          onRemove={handleRemoveItem}
                          onToggleExpanded={toggleItemExpanded}
                          onUpdate={handleUpdateItem}
                          statusBadgeVariant={getItemStatusBadgeVariant(item.status)}
                          statusOptions={PRINT_REQUEST_ITEM_STATUS_OPTIONS}
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
            </ModalHeader>
            <ModalBody>
              <form
                className="print-requests-modal-form"
                id="create-print-request-form"
                onSubmit={handleCreateRequest}
              >
                <Select
                  label="Request type"
                  name="customerMode"
                  onChange={(event) =>
                    setCreateRequestForm((current) => ({
                      ...current,
                      customerMode: event.target.value as CustomerMode,
                      customerId: event.target.value === "customer" ? current.customerId : "",
                      name:
                        event.target.value === "customer"
                          ? current.customerId
                            ? buildCustomerRequestName(current.customerId)
                            : current.name
                          : "",
                    }))
                  }
                  options={CUSTOMER_MODE_OPTIONS}
                  value={createRequestForm.customerMode}
                />

                {createRequestForm.customerMode === "customer" ? (
                  <>
                    <Select
                      label="Customer"
                      name="customerId"
                      onChange={(event) =>
                        setCreateRequestForm((current) => ({
                          ...current,
                          customerId: event.target.value,
                          name: buildCustomerRequestName(event.target.value),
                        }))
                      }
                      options={[{ label: "Choose a customer", value: "" }, ...customerOptions]}
                      value={createRequestForm.customerId}
                    />

                    {customerOptions.length === 0 ? (
                      <div className="print-requests-modal-helper">
                        <p className="print-requests-modal-hint">
                          Create customers from Users before creating customer requests.
                        </p>
                        {permissionService.canManageCustomers(user) ? (
                          <Button onClick={openUsersForCustomerCreation} size="sm" variant="secondary">
                            Go to Users
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="print-requests-modal-hint">
                        Customer requests only use existing customers. Create new customers from Users.
                      </p>
                    )}
                  </>
                ) : null}

                <TextInput
                  label="Request name"
                  name="requestName"
                  onChange={(event) => setCreateRequestForm((current) => ({ ...current, name: event.target.value }))}
                  readOnly={createRequestForm.customerMode === "customer"}
                  required
                  value={createRequestForm.name}
                />

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
              <Button form="create-print-request-form" type="submit">
                Create request
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

    </main>
  );
}
