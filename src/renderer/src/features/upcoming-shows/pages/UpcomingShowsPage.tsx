import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Settings, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Badge } from "../../../shared/components/Badge";
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
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { desktopAppService } from "../../../shared/services/desktopAppService";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { upcomingShowService } from "../services/upcomingShowService";
import { useUpcomingShows } from "../hooks/useUpcomingShows";
import { useShowAllocations } from "../hooks/useShowAllocations";
import { useShowQueueSettings } from "../hooks/useShowQueueSettings";
import { useWhatnotShowImport, type WhatnotShowImportSummary } from "../hooks/useWhatnotShowImport";
import { usePrintRequests } from "../../print-requests/hooks/usePrintRequests";
import { usePrintRequestDetails } from "../../print-requests/hooks/usePrintRequestDetails";
import { AddToShowModal } from "../../print-requests/components/AddToShowModal";
import { groupAllocationsByRequest } from "../utils/groupAllocationsByRequest";
import { filterShowsByScheduleTab, type ShowScheduleTab } from "../utils/groupShowsByUpcomingPast";
import { parseWhatnotShowUrl } from "../../../../../../shared/utils/whatnotShowUrl";
import { parseWhatnotShowBaseUrl } from "../../../../../../shared/utils/whatnotShowBaseUrl";
import { assessShowCapacity } from "../../../../../../shared/utils/showCapacity";
import {
  formatCapacityUsedLabel,
  formatSpotsRemainingLabel,
  getCapacityFillLevel,
  getDerivedShowStatusDisplay,
  getShowCapacityPercent,
} from "../../../../../../shared/utils/showCapacityDisplay";
import { canRemoveRequestFromShow } from "../../../../../../shared/utils/showQueueEditability";
import { parseDateTimeInputToTimestamp } from "../utils/upcomingShowDateTimeInput";
import {
  formatUpcomingShowTimestampLabel,
  formatUpcomingShowTitle,
  getUpcomingShowStatusBadgeVariant,
  getUpcomingShowSyncStatusBadgeVariant,
} from "../utils/upcomingShowDisplay";
import { getShowAllocationStatusBadgeVariant } from "../utils/showAllocationDisplay";
import { UPCOMING_SHOW_ID_QUERY_PARAM, getUpcomingShowsPath } from "../constants/upcomingShowRoutes";

interface CreateShowFormState {
  whatnotUrl: string;
  title: string;
  scheduledStartAtInput: string;
  notes: string;
}

const DEFAULT_CREATE_SHOW_FORM: CreateShowFormState = {
  whatnotUrl: "",
  title: "",
  scheduledStartAtInput: "",
  notes: "",
};

const DEFAULT_WHATNOT_SHOW_BASE_URL = "https://www.whatnot.com/user/funkyfreshprints/shows";

function formatWriteErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to complete the requested write.";
}

export function UpcomingShowsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { shows, error: loadError, isLoading, reloadUpcomingShows } = useUpcomingShows();
  const { requests } = usePrintRequests();
  const showQueueSettings = useShowQueueSettings();

  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateShowFormState>(DEFAULT_CREATE_SHOW_FORM);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successAlertSeed, setSuccessAlertSeed] = useState(0);

  const [isMaxQuantityModalOpen, setIsMaxQuantityModalOpen] = useState(false);
  const [maxQuantityInput, setMaxQuantityInput] = useState("");
  const [maxQuantityOverrideConfirmed, setMaxQuantityOverrideConfirmed] = useState(false);

  const [isAddRequestModalOpen, setIsAddRequestModalOpen] = useState(false);
  const [addRequestId, setAddRequestId] = useState("");

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [defaultCapacityInput, setDefaultCapacityInput] = useState("");
  const [whatnotBaseUrlInput, setWhatnotBaseUrlInput] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleShowsImported = useCallback(
    async (summary: WhatnotShowImportSummary) => {
      await showQueueSettings.recordAssistedImportResult({ status: "succeeded", summary });
      setSuccessMessage(
        `Imported Whatnot shows: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged, ${summary.skipped} skipped.`,
      );
      setSuccessAlertSeed((current) => current + 1);
      await reloadUpcomingShows();
    },
    [reloadUpcomingShows, showQueueSettings],
  );

  const whatnotImport = useWhatnotShowImport(shows, handleShowsImported);

  const [confirmingRemoveRequestId, setConfirmingRemoveRequestId] = useState<string | null>(null);
  const [activeScheduleTab, setActiveScheduleTab] = useState<ShowScheduleTab>("upcoming");

  const selectedShowIdParam = searchParams.get(UPCOMING_SHOW_ID_QUERY_PARAM);

  useEffect(() => {
    if (selectedShowIdParam) {
      if (selectedShowIdParam !== selectedShowId) {
        setSelectedShowId(selectedShowIdParam);
      }

      return;
    }

    if (!selectedShowId && shows.length > 0) {
      setSelectedShowId(shows[0].id);
    }
  }, [selectedShowId, selectedShowIdParam, shows]);

  useEffect(() => {
    setConfirmingRemoveRequestId(null);
  }, [selectedShowId]);

  const updateSelectedShowPath = useCallback(
    (showId: string) => {
      navigate(getUpcomingShowsPath({ showId }), { replace: true });
    },
    [navigate],
  );

  const openCreateModal = useCallback(() => {
    setActionError(null);
    setCreateForm(DEFAULT_CREATE_SHOW_FORM);
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setActionError(null);
  }, []);

  const openSettingsModal = useCallback(() => {
    setActionError(null);
    setDefaultCapacityInput(showQueueSettings.settings.defaultMaxTotalQuantity?.toString() ?? "");
    setWhatnotBaseUrlInput(showQueueSettings.settings.whatnotShowBaseUrl ?? DEFAULT_WHATNOT_SHOW_BASE_URL);
    setIsSettingsModalOpen(true);
  }, [showQueueSettings.settings.defaultMaxTotalQuantity, showQueueSettings.settings.whatnotShowBaseUrl]);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
    setActionError(null);
  }, []);

  const effectiveWhatnotBaseUrl = showQueueSettings.settings.whatnotShowBaseUrl ?? DEFAULT_WHATNOT_SHOW_BASE_URL;

  const openWhatnotImportWindow = useCallback(() => {
    setActionError(null);
    void whatnotImport.openImportWindow(effectiveWhatnotBaseUrl);
  }, [effectiveWhatnotBaseUrl, whatnotImport]);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Show Queue",
        actions: permissionService.canManageUpcomingShows(user)
          ? [
              {
                label: "Import Whatnot shows",
                onClick: openWhatnotImportWindow,
              },
              {
                icon: <Settings aria-hidden="true" size={16} strokeWidth={2} />,
                label: "Settings",
                onClick: openSettingsModal,
              },
            ]
          : null,
        primaryAction: permissionService.canManageUpcomingShows(user)
          ? {
              label: "Add show",
              onClick: openCreateModal,
            }
          : null,
      }),
      [openCreateModal, openWhatnotImportWindow, openSettingsModal, user],
    ),
  );

  const selectedShow = useMemo(
    () => shows.find((show) => show.id === selectedShowId) ?? null,
    [selectedShowId, shows],
  );

  const showsByScheduleTab = useMemo(() => {
    const now = new Date();
    return {
      upcoming: filterShowsByScheduleTab(shows, "upcoming", now),
      past: filterShowsByScheduleTab(shows, "past", now),
    };
  }, [shows]);
  const visibleShows = showsByScheduleTab[activeScheduleTab];

  const { allocations, reloadAllocations } = useShowAllocations(selectedShowId);
  const requestGroups = useMemo(() => groupAllocationsByRequest(allocations), [allocations]);

  const parsedShow = useMemo(() => parseWhatnotShowUrl(createForm.whatnotUrl), [createForm.whatnotUrl]);
  const scheduledStartAt = parseDateTimeInputToTimestamp(createForm.scheduledStartAtInput);
  const isCreateSubmitDisabled = !parsedShow || !scheduledStartAt;

  async function handleCreateShow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !permissionService.canManageUpcomingShows(user) || !parsedShow || !scheduledStartAt) {
      return;
    }

    try {
      setActionError(null);
      const result = await upcomingShowService.upsertUpcomingShow(user, {
        source: "whatnot",
        whatnotShowId: parsedShow.whatnotShowId,
        whatnotUrl: parsedShow.whatnotUrl,
        title: createForm.title.trim() || undefined,
        scheduledStartAt,
        notes: createForm.notes.trim() || undefined,
      });

      setSuccessMessage(`Show "${formatUpcomingShowTitle(result)}" saved.`);
      setSuccessAlertSeed((current) => current + 1);
      closeCreateModal();
      await reloadUpcomingShows();
      setSelectedShowId(result.id);
      updateSelectedShowPath(result.id);
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  const parsedWhatnotBaseUrl = parseWhatnotShowBaseUrl(whatnotBaseUrlInput);
  const isWhatnotBaseUrlValid = whatnotBaseUrlInput.trim() === "" || Boolean(parsedWhatnotBaseUrl);

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !permissionService.canManageUpcomingShows(user) || !isWhatnotBaseUrlValid) {
      return;
    }

    const trimmed = defaultCapacityInput.trim();
    const parsedDefault = trimmed ? Number(trimmed) : undefined;

    try {
      setActionError(null);
      setIsSavingSettings(true);
      await showQueueSettings.updateSettings({
        defaultMaxTotalQuantity: parsedDefault,
        whatnotShowBaseUrl: parsedWhatnotBaseUrl?.normalizedUrl,
      });
      setSuccessMessage("Show Queue settings updated.");
      setSuccessAlertSeed((current) => current + 1);
      closeSettingsModal();
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    } finally {
      setIsSavingSettings(false);
    }
  }

  const openMaxQuantityModal = useCallback(() => {
    if (!selectedShow) {
      return;
    }

    setActionError(null);
    setMaxQuantityInput(selectedShow.maxTotalQuantity?.toString() ?? "");
    setMaxQuantityOverrideConfirmed(false);
    setIsMaxQuantityModalOpen(true);
  }, [selectedShow]);

  const closeMaxQuantityModal = useCallback(() => {
    setIsMaxQuantityModalOpen(false);
    setActionError(null);
  }, []);

  const capacity = selectedShow
    ? assessShowCapacity({ maxTotalQuantity: selectedShow.maxTotalQuantity, allocatedQuantity: selectedShow.allocatedQuantity })
    : null;

  const pendingMaxQuantity = maxQuantityInput.trim() ? Number(maxQuantityInput) : undefined;
  const maxQuantityNeedsOverride =
    pendingMaxQuantity !== undefined && selectedShow !== null && pendingMaxQuantity < (selectedShow?.allocatedQuantity ?? 0);

  async function handleSaveMaxQuantity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !selectedShow || !permissionService.canManageUpcomingShows(user)) {
      return;
    }

    try {
      setActionError(null);
      await upcomingShowService.setShowMaxQuantity(user, selectedShow.id, {
        maxTotalQuantity: pendingMaxQuantity,
        override: maxQuantityNeedsOverride ? maxQuantityOverrideConfirmed : undefined,
      });

      setSuccessMessage("Show capacity updated.");
      setSuccessAlertSeed((current) => current + 1);
      closeMaxQuantityModal();
      await reloadUpcomingShows();
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  const openAddRequestModal = useCallback(() => {
    setActionError(null);
    setAddRequestId("");
    setIsAddRequestModalOpen(true);
  }, []);

  const closeAddRequestModal = useCallback(() => {
    setIsAddRequestModalOpen(false);
    setAddRequestId("");
    setActionError(null);
  }, []);

  const addRequestDetails = usePrintRequestDetails(isAddRequestModalOpen ? addRequestId || null : null);
  const addRequestItems = useMemo(
    () => (addRequestDetails.loadedRequestId === addRequestId ? addRequestDetails.items : []),
    [addRequestDetails.items, addRequestDetails.loadedRequestId, addRequestId],
  );

  const requestOptions = useMemo(
    () => [{ label: "Choose a request", value: "" }, ...requests.map((request) => ({ label: request.name, value: request.id }))],
    [requests],
  );

  async function handleRemoveRequestFromShow(printRequestId: string) {
    if (!user || !selectedShow || !permissionService.canManageUpcomingShows(user)) {
      return;
    }

    try {
      setActionError(null);
      await upcomingShowService.removeShowAllocationsForRequest(user, selectedShow.id, printRequestId);
      setConfirmingRemoveRequestId(null);
      await Promise.all([reloadUpcomingShows(), reloadAllocations()]);
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  return (
    <main className="page-layout page-layout-shell upcoming-shows-page">
      {loadError ? <ErrorState message={loadError} title="Unable to load the show queue" /> : null}
      {successMessage ? (
        <DismissibleSuccessAlert
          key={`${successAlertSeed}-${successMessage}`}
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      ) : null}

      <div className="print-requests-layout upcoming-shows-layout">
        <aside className="print-requests-rail">
          <div className="print-requests-tab-bar">
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                className={`print-requests-tab-button${activeScheduleTab === tab ? " is-active" : ""}`}
                key={tab}
                onClick={() => setActiveScheduleTab(tab)}
                type="button"
              >
                {tab === "upcoming" ? "Upcoming" : "Past"} ({showsByScheduleTab[tab].length})
              </button>
            ))}
          </div>
          <div className="print-requests-rail-list">
            {isLoading ? (
              <div className="print-requests-loading">
                <LoadingSpinner label="Loading shows" />
              </div>
            ) : visibleShows.length === 0 ? (
              <EmptyState
                message="Add the first Whatnot show to start tracking the schedule and production."
                title="No shows yet"
              />
            ) : (
              visibleShows.map((show) => {
                const isSelected = show.id === selectedShowId;
                const showCapacity = assessShowCapacity({
                  maxTotalQuantity: show.maxTotalQuantity,
                  allocatedQuantity: show.allocatedQuantity,
                });
                const showStatusDisplay = getDerivedShowStatusDisplay(show.productionStatus, showCapacity);
                const cardStateClass = showCapacity.isOverCapacity
                  ? " is-over-capacity"
                  : showCapacity.isFull
                    ? " is-full"
                    : "";

                return (
                  <button
                    className={`print-requests-request-card${isSelected ? " is-selected" : ""}${cardStateClass}`}
                    key={show.id}
                    onClick={() => {
                      setSelectedShowId(show.id);
                      updateSelectedShowPath(show.id);
                    }}
                    type="button"
                  >
                    <div className="print-requests-request-card-title-row">
                      <strong>{formatUpcomingShowTitle(show)}</strong>
                      <div className="print-requests-request-card-badges">
                        <Badge variant={showStatusDisplay.variant}>{showStatusDisplay.label}</Badge>
                      </div>
                    </div>
                    <p className="print-requests-request-card-subtitle">
                      {formatUpcomingShowTimestampLabel(show.scheduledStartAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="print-requests-main">
          {isLoading ? (
            <Card className="print-requests-card print-requests-loading-card">
              <LoadingSpinner label="Loading show" />
            </Card>
          ) : !selectedShow ? (
            <Card className="print-requests-card print-requests-empty-card">
              <EmptyState
                message="Select a show from the queue or add a new one."
                title="No show selected"
              />
            </Card>
          ) : (
            <>
              <Card className="print-requests-card print-requests-detail-card">
                <div className="print-requests-detail-header">
                  <div className="print-requests-detail-copy">
                    <p className="eyebrow">Show detail</p>
                    <h2>{formatUpcomingShowTitle(selectedShow)}</h2>
                    <p className="print-requests-detail-timestamps">
                      Scheduled {formatUpcomingShowTimestampLabel(selectedShow.scheduledStartAt)}
                    </p>
                  </div>
                </div>

                <div className="show-detail-pill-row">
                  <Badge variant={getUpcomingShowStatusBadgeVariant(selectedShow.status)}>
                    {selectedShow.status}
                  </Badge>
                  {capacity ? (
                    <Badge variant={getDerivedShowStatusDisplay(selectedShow.productionStatus, capacity).variant}>
                      {getDerivedShowStatusDisplay(selectedShow.productionStatus, capacity).label}
                    </Badge>
                  ) : null}
                  <Badge variant={getUpcomingShowSyncStatusBadgeVariant(selectedShow.syncStatus)}>
                    sync: {selectedShow.syncStatus}
                  </Badge>
                </div>

                <dl className="upcoming-show-detail-facts">
                  <div>
                    <dt>Whatnot show ID</dt>
                    <dd>{selectedShow.whatnotShowId}</dd>
                  </div>
                  <div>
                    <dt>Whatnot URL</dt>
                    <dd>
                      {selectedShow.whatnotUrl ? (
                        <button
                          className="link-button"
                          onClick={() => void desktopAppService.openExternalLink(selectedShow.whatnotUrl!)}
                          type="button"
                        >
                          {selectedShow.whatnotUrl}
                        </button>
                      ) : (
                        "Not set"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Last synced</dt>
                    <dd>{formatUpcomingShowTimestampLabel(selectedShow.lastSyncedAt)}</dd>
                  </div>
                  <div>
                    <dt>Last seen</dt>
                    <dd>{formatUpcomingShowTimestampLabel(selectedShow.lastSeenAt)}</dd>
                  </div>
                  {selectedShow.syncError ? (
                    <div>
                      <dt>Sync error</dt>
                      <dd>{selectedShow.syncError}</dd>
                    </div>
                  ) : null}
                  {selectedShow.notes ? (
                    <div>
                      <dt>Notes</dt>
                      <dd>{selectedShow.notes}</dd>
                    </div>
                  ) : null}
                </dl>
              </Card>

              <Card
                className={`print-requests-card show-capacity-card${
                  capacity?.isOverCapacity ? " is-over-capacity" : capacity?.isFull ? " is-full" : ""
                }`}
              >
                <div className="print-requests-section-header">
                  <p className="eyebrow">Capacity</p>
                  <Button
                    disabled={!permissionService.canManageUpcomingShows(user)}
                    onClick={openMaxQuantityModal}
                    size="sm"
                    variant="secondary"
                  >
                    Set max quantity
                  </Button>
                </div>

                {capacity ? (
                  <>
                    <div className="show-capacity-bar-track">
                      <div
                        className={`show-capacity-bar-fill${
                          getCapacityFillLevel(getShowCapacityPercent(capacity))
                            ? ` is-${getCapacityFillLevel(getShowCapacityPercent(capacity))}`
                            : ""
                        }`}
                        style={{
                          width: `${Math.min(100, getShowCapacityPercent(capacity) ?? 0)}%`,
                        }}
                      />
                    </div>
                    <div className="show-capacity-summary">
                      <span>{formatCapacityUsedLabel(capacity)}</span>
                      <span>{formatSpotsRemainingLabel(capacity)}</span>
                    </div>
                    {capacity.isOverCapacity ? (
                      <p className="print-requests-workflow-copy">
                        This show is over its staff-set maximum via an override.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </Card>

              <Card className="print-requests-card">
                <div className="print-requests-section-header">
                  <p className="eyebrow">Attached print requests</p>
                  <Button
                    disabled={!permissionService.canManageUpcomingShows(user)}
                    onClick={openAddRequestModal}
                    size="sm"
                    variant="secondary"
                  >
                    + Add Print Request
                  </Button>
                </div>

                {requestGroups.length === 0 ? (
                  <EmptyState
                    message="Add a print request to start production planning for this show."
                    title="No print requests attached yet"
                  />
                ) : (
                  <div className="print-requests-item-list">
                    {requestGroups.map((group) => {
                      const totalAllocated = group.allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0);
                      const isConfirmingRemove = confirmingRemoveRequestId === group.printRequestId;
                      const canRemove = canRemoveRequestFromShow(selectedShow.productionStatus);

                      return (
                        <div className="show-allocation-row" key={group.printRequestId}>
                          <div>
                            <strong>{group.requestNameSnapshot}</strong>
                            <p>
                              {group.allocations.length} item{group.allocations.length === 1 ? "" : "s"} |{" "}
                              {totalAllocated} allocated
                            </p>
                          </div>
                          <div className="show-allocation-row-actions">
                            <Badge variant={getShowAllocationStatusBadgeVariant(group.allocations[0].status)}>
                              {group.allocations[0].status}
                            </Badge>
                            {!canRemove ? null : isConfirmingRemove ? (
                              <>
                                <Button
                                  onClick={() => setConfirmingRemoveRequestId(null)}
                                  size="sm"
                                  variant="ghost"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => void handleRemoveRequestFromShow(group.printRequestId)}
                                  size="sm"
                                  variant="danger"
                                >
                                  Confirm
                                </Button>
                              </>
                            ) : (
                              <Button
                                onClick={() => setConfirmingRemoveRequestId(group.printRequestId)}
                                size="sm"
                                variant="ghost"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
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
            aria-labelledby="upcoming-show-create-title"
            className="modal-panel modal-panel-md"
            role="dialog"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Add show</p>
                <h3 id="upcoming-show-create-title">Track a Whatnot show</h3>
              </div>
              <button
                aria-label="Close add show"
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
                id="create-upcoming-show-form"
                onSubmit={handleCreateShow}
              >
                <TextInput
                  label="Whatnot show URL"
                  name="whatnotUrl"
                  onChange={(event) => setCreateForm((current) => ({ ...current, whatnotUrl: event.target.value }))}
                  placeholder="https://www.whatnot.com/live/..."
                  value={createForm.whatnotUrl}
                />
                <p className="print-requests-modal-hint">
                  {parsedShow
                    ? `Show ID: ${parsedShow.whatnotShowId}`
                    : createForm.whatnotUrl.trim()
                      ? "This does not look like a valid Whatnot live show URL."
                      : "Show ID will appear after a valid Whatnot URL is entered."}
                </p>
                <TextInput
                  label="Title"
                  name="title"
                  onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
                  value={createForm.title}
                />
                <TextInput
                  label="Scheduled date and time"
                  name="scheduledStartAtInput"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, scheduledStartAtInput: event.target.value }))
                  }
                  type="datetime-local"
                  value={createForm.scheduledStartAtInput}
                />
                <AutoResizeTextarea
                  label="Notes"
                  name="notes"
                  onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional planning notes"
                  value={createForm.notes}
                />
                <p className="print-requests-modal-hint">
                  Saving an existing parsed show ID updates that show instead of creating a duplicate.
                  Automatic Whatnot sync is not implemented yet; shows are added manually for now.
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
              <Button disabled={isCreateSubmitDisabled} form="create-upcoming-show-form" type="submit">
                Save show
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {isMaxQuantityModalOpen && selectedShow ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal aria-labelledby="show-max-quantity-title" className="modal-panel modal-panel-sm" role="dialog">
            <ModalHeader>
              <div>
                <p className="eyebrow">Capacity</p>
                <h3 id="show-max-quantity-title">Set max print quantity</h3>
              </div>
              <button
                aria-label="Close set max quantity"
                className="icon-button icon-button-md icon-button-ghost"
                onClick={closeMaxQuantityModal}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <form className="print-requests-modal-form" id="show-max-quantity-form" onSubmit={handleSaveMaxQuantity}>
                <TextInput
                  label="Max total quantity"
                  min={0}
                  name="maxTotalQuantity"
                  onChange={(event) => setMaxQuantityInput(event.target.value)}
                  placeholder="Leave blank for no limit"
                  type="number"
                  value={maxQuantityInput}
                />
                <p className="print-requests-modal-hint">Currently allocated: {selectedShow.allocatedQuantity}</p>

                {maxQuantityNeedsOverride ? (
                  <label className="print-requests-modal-hint">
                    <input
                      checked={maxQuantityOverrideConfirmed}
                      onChange={(event) => setMaxQuantityOverrideConfirmed(event.target.checked)}
                      type="checkbox"
                    />{" "}
                    This is below the current allocated quantity. Confirm the override to proceed.
                  </label>
                ) : null}

                {actionError ? (
                  <p className="auth-message auth-message-error" role="alert">
                    {actionError}
                  </p>
                ) : null}
              </form>
            </ModalBody>
            <ModalFooter>
              <Button onClick={closeMaxQuantityModal} variant="ghost">
                Cancel
              </Button>
              <Button
                disabled={maxQuantityNeedsOverride && !maxQuantityOverrideConfirmed}
                form="show-max-quantity-form"
                type="submit"
                variant={maxQuantityNeedsOverride ? "danger" : "primary"}
              >
                Save
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {isAddRequestModalOpen && selectedShow && !addRequestDetails.printRequest ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal aria-labelledby="show-add-request-title" className="modal-panel modal-panel-md" role="dialog">
            <ModalHeader>
              <div>
                <p className="eyebrow">Attach request</p>
                <h3 id="show-add-request-title">Add print request to show</h3>
              </div>
              <button
                aria-label="Close add print request"
                className="icon-button icon-button-md icon-button-ghost"
                onClick={closeAddRequestModal}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <Select
                label="Print request"
                name="printRequestId"
                onChange={(event) => setAddRequestId(event.target.value)}
                options={requestOptions}
                value={addRequestId}
              />

              {actionError ? (
                <p className="auth-message auth-message-error" role="alert">
                  {actionError}
                </p>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button onClick={closeAddRequestModal} variant="ghost">
                Cancel
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {isAddRequestModalOpen && selectedShow && addRequestDetails.printRequest ? (
        <AddToShowModal
          fixedShowId={selectedShow.id}
          items={addRequestItems}
          onAdded={async () => {
            setSuccessMessage("Print request added to show.");
            setSuccessAlertSeed((current) => current + 1);
            await Promise.all([reloadUpcomingShows(), reloadAllocations()]);
          }}
          onClose={closeAddRequestModal}
          printRequest={addRequestDetails.printRequest}
        />
      ) : null}

      {isSettingsModalOpen ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal aria-labelledby="show-queue-settings-title" className="modal-panel modal-panel-sm" role="dialog">
            <ModalHeader>
              <div>
                <p className="eyebrow">Settings</p>
                <h3 id="show-queue-settings-title">Show Queue settings</h3>
              </div>
              <button
                aria-label="Close Show Queue settings"
                className="icon-button icon-button-md icon-button-ghost"
                onClick={closeSettingsModal}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <form className="print-requests-modal-form" id="show-queue-settings-form" onSubmit={handleSaveSettings}>
                <p className="print-requests-modal-hint">
                  Current default:{" "}
                  {showQueueSettings.isLoading
                    ? "Loading..."
                    : showQueueSettings.settings.defaultMaxTotalQuantity === undefined
                      ? "No default limit"
                      : showQueueSettings.settings.defaultMaxTotalQuantity}
                </p>
                <TextInput
                  label="Default max quantity for new shows"
                  min={0}
                  name="defaultMaxTotalQuantity"
                  onChange={(event) => setDefaultCapacityInput(event.target.value)}
                  placeholder="Leave blank for no default limit"
                  type="number"
                  value={defaultCapacityInput}
                />
                <p className="print-requests-modal-hint">
                  Applied only to new shows going forward. Existing shows keep their current capacity, and
                  staff can still override capacity on any individual show.
                </p>

                <TextInput
                  label="Whatnot show base URL"
                  name="whatnotShowBaseUrl"
                  onChange={(event) => setWhatnotBaseUrlInput(event.target.value)}
                  placeholder={DEFAULT_WHATNOT_SHOW_BASE_URL}
                  value={whatnotBaseUrlInput}
                />
                <p className="print-requests-modal-hint">
                  {isWhatnotBaseUrlValid
                    ? "Used by “Import Whatnot shows” to open your show list."
                    : "Must be a https://www.whatnot.com/user/<name>/shows URL."}
                </p>

                {actionError ? (
                  <p className="auth-message auth-message-error" role="alert">
                    {actionError}
                  </p>
                ) : null}
              </form>
            </ModalBody>
            <ModalFooter>
              <Button onClick={closeSettingsModal} variant="ghost">
                Cancel
              </Button>
              <Button
                disabled={isSavingSettings || !isWhatnotBaseUrlValid}
                form="show-queue-settings-form"
                type="submit"
              >
                {isSavingSettings ? "Saving..." : "Save"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {whatnotImport.error ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal aria-labelledby="whatnot-import-error-title" className="modal-panel modal-panel-sm" role="dialog">
            <ModalHeader>
              <div>
                <p className="eyebrow">Import</p>
                <h3 id="whatnot-import-error-title">Import Whatnot shows</h3>
              </div>
              <button
                aria-label="Dismiss"
                className="icon-button icon-button-md icon-button-ghost"
                onClick={() => void whatnotImport.cancel()}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <p className="auth-message auth-message-error" role="alert">
                {whatnotImport.error}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => void whatnotImport.cancel()} variant="ghost">
                Close
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {whatnotImport.stage === "importing" ? (
        <div className="modal-overlay modal-overlay-blur">
          <Card className="print-requests-card print-requests-loading-card">
            <LoadingSpinner label="Importing Whatnot shows" />
          </Card>
        </div>
      ) : null}
    </main>
  );
}
