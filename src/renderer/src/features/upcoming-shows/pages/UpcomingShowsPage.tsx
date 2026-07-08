import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { ChevronDown, Download, Pause, Play, Plus, Settings, Upload, X } from "lucide-react";
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
import { useShowProductionTimer } from "../hooks/useShowProductionTimer";
import { useShowQueueSettings } from "../hooks/useShowQueueSettings";
import {
  DEFAULT_GANG_SHEET_GUTTER_INCHES,
  DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX,
  DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES,
  DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES,
  DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES,
  DEFAULT_GANG_SHEET_WIDTH_INCHES,
} from "../services/showQueueSettingsService";
import { useWhatnotShowImport, type WhatnotShowImportSummary } from "../hooks/useWhatnotShowImport";
import { usePrintRequests } from "../../print-requests/hooks/usePrintRequests";
import { usePrintRequestAllocationTotals } from "../../print-requests/hooks/usePrintRequestAllocationTotals";
import { usePrintRequestDetails } from "../../print-requests/hooks/usePrintRequestDetails";
import { AddToShowModal } from "../../print-requests/components/AddToShowModal";
import { ExportShowConfirmModal } from "../components/ExportShowConfirmModal";
import { ExportGangSheetConfirmModal } from "../components/ExportGangSheetConfirmModal";
import { useExportShowZip } from "../hooks/useExportShowZip";
import { useExportGangSheetPng } from "../hooks/useExportGangSheetPng";
import { groupAllocationsByRequest } from "../utils/groupAllocationsByRequest";
import {
  filterShowsByScheduleTab,
  getShowScheduleTab,
  isPastScheduledShow,
  PAST_SHOW_READ_ONLY_MESSAGE,
  resolveVisibleShowSelection,
  type ShowScheduleTab,
} from "../utils/groupShowsByUpcomingPast";
import { parseWhatnotShowUrl } from "@fresh-prints/shared/utils/whatnotShowUrl";
import { parseWhatnotShowBaseUrl } from "@fresh-prints/shared/utils/whatnotShowBaseUrl";
import { assessShowCapacity } from "@fresh-prints/shared/utils/showCapacity";
import {
  formatCapacityUsedLabel,
  formatSpotsRemainingLabel,
  getCapacityFillLevel,
  getDerivedShowStatusDisplay,
  getShowCapacityPercent,
} from "@fresh-prints/shared/utils/showCapacityDisplay";
import { canRemoveRequestFromShow } from "@fresh-prints/shared/utils/showQueueEditability";
import { isPrintRequestFullyPrinted } from "@fresh-prints/shared/utils/printRequestQueueState";
import { parseDateTimeInputToTimestamp } from "../utils/upcomingShowDateTimeInput";
import {
  formatUpcomingShowTimestampLabel,
  formatUpcomingShowManualImportTimestampLabel,
  formatUpcomingShowTitle,
  getUpcomingShowStatusBadgeVariant,
  shouldShowUpcomingShowScheduleStatusBadge,
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
  const { requests, summariesByRequestId } = usePrintRequests();
  const { totalsByRequestId: allocationTotalsByRequestId } = usePrintRequestAllocationTotals();
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
  const [gangSheetWidthInput, setGangSheetWidthInput] = useState("");
  const [gangSheetSideMarginInput, setGangSheetSideMarginInput] = useState("");
  const [gangSheetTopBottomMarginInput, setGangSheetTopBottomMarginInput] = useState("");
  const [gangSheetGutterInput, setGangSheetGutterInput] = useState("");
  const [gangSheetMaxLengthInput, setGangSheetMaxLengthInput] = useState("");
  const [gangSheetLabelFontSizeInput, setGangSheetLabelFontSizeInput] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleShowsImported = useCallback(
    async (summary: WhatnotShowImportSummary) => {
      await showQueueSettings.recordAssistedImportResult({ status: "succeeded", summary });
      setSuccessMessage(
        `Imported shows: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged, ${summary.skipped} skipped.`,
      );
      setSuccessAlertSeed((current) => current + 1);
      await reloadUpcomingShows();
    },
    [reloadUpcomingShows, showQueueSettings],
  );

  const whatnotImport = useWhatnotShowImport(shows, handleShowsImported);

  const [confirmingRemoveRequestId, setConfirmingRemoveRequestId] = useState<string | null>(null);
  const [activeScheduleTab, setActiveScheduleTab] = useState<ShowScheduleTab>("upcoming");
  const hasHydratedFromQueryRef = useRef(false);

  const selectedShowIdParam = searchParams.get(UPCOMING_SHOW_ID_QUERY_PARAM);

  useEffect(() => {
    setConfirmingRemoveRequestId(null);
  }, [selectedShowId]);

  const updateSelectedShowPath = useCallback(
    (showId: string | null) => {
      navigate(getUpcomingShowsPath(showId ? { showId } : undefined), { replace: true });
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
    setGangSheetWidthInput(
      (showQueueSettings.settings.gangSheetWidthInches ?? DEFAULT_GANG_SHEET_WIDTH_INCHES).toString(),
    );
    setGangSheetSideMarginInput(
      (showQueueSettings.settings.gangSheetSideMarginInches ?? DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES).toString(),
    );
    setGangSheetTopBottomMarginInput(
      (
        showQueueSettings.settings.gangSheetTopBottomMarginInches ?? DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES
      ).toString(),
    );
    setGangSheetGutterInput(
      (showQueueSettings.settings.gangSheetGutterInches ?? DEFAULT_GANG_SHEET_GUTTER_INCHES).toString(),
    );
    setGangSheetMaxLengthInput(
      (showQueueSettings.settings.gangSheetMaxLengthInches ?? DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES).toString(),
    );
    setGangSheetLabelFontSizeInput(
      (showQueueSettings.settings.gangSheetLabelFontSizePx ?? DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX).toString(),
    );
    setIsSettingsModalOpen(true);
  }, [
    showQueueSettings.settings.defaultMaxTotalQuantity,
    showQueueSettings.settings.gangSheetGutterInches,
    showQueueSettings.settings.gangSheetLabelFontSizePx,
    showQueueSettings.settings.gangSheetMaxLengthInches,
    showQueueSettings.settings.gangSheetSideMarginInches,
    showQueueSettings.settings.gangSheetTopBottomMarginInches,
    showQueueSettings.settings.gangSheetWidthInches,
    showQueueSettings.settings.whatnotShowBaseUrl,
  ]);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
    setActionError(null);
  }, []);

  const effectiveWhatnotBaseUrl = showQueueSettings.settings.whatnotShowBaseUrl ?? DEFAULT_WHATNOT_SHOW_BASE_URL;

  const { openImportWindow: openWhatnotImportWindowRequest } = whatnotImport;
  const openWhatnotImportWindow = useCallback(() => {
    setActionError(null);
    void openWhatnotImportWindowRequest(effectiveWhatnotBaseUrl);
  }, [effectiveWhatnotBaseUrl, openWhatnotImportWindowRequest]);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Show Queue",
        actions: permissionService.canManageUpcomingShows(user)
          ? [
              {
                icon: <Upload aria-hidden="true" size={16} strokeWidth={2} />,
                label: "Import Shows",
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
              icon: <Plus aria-hidden="true" size={16} strokeWidth={2} />,
              label: "Add show",
              onClick: openCreateModal,
            }
          : null,
      }),
      [openCreateModal, openWhatnotImportWindow, openSettingsModal, user],
    ),
  );

  const showsByScheduleTab = useMemo(() => {
    const now = new Date();
    return {
      upcoming: filterShowsByScheduleTab(shows, "upcoming", now),
      past: filterShowsByScheduleTab(shows, "past", now),
    };
  }, [shows]);
  const visibleShows = showsByScheduleTab[activeScheduleTab];

  useEffect(() => {
    if (selectedShowId && visibleShows.some((show) => show.id === selectedShowId)) {
      return;
    }

    if (!hasHydratedFromQueryRef.current) {
      hasHydratedFromQueryRef.current = true;

      const showFromQuery = selectedShowIdParam ? shows.find((show) => show.id === selectedShowIdParam) ?? null : null;

      if (showFromQuery) {
        const queryShowTab = getShowScheduleTab(showFromQuery, new Date());

        if (queryShowTab !== activeScheduleTab) {
          setActiveScheduleTab(queryShowTab);
        }

        if (selectedShowId !== selectedShowIdParam) {
          setSelectedShowId(selectedShowIdParam);
        }

        return;
      }
    }

    const nextSelectedShowId = resolveVisibleShowSelection(visibleShows, selectedShowId);

    if (nextSelectedShowId !== selectedShowId) {
      setSelectedShowId(nextSelectedShowId);
      updateSelectedShowPath(nextSelectedShowId);
    }
  }, [activeScheduleTab, selectedShowId, selectedShowIdParam, shows, updateSelectedShowPath, visibleShows]);

  const handleScheduleTabChange = useCallback(
    (tab: ShowScheduleTab) => {
      const nextSelectedShowId = resolveVisibleShowSelection(showsByScheduleTab[tab], null);

      setActiveScheduleTab(tab);
      setSelectedShowId(nextSelectedShowId);
      updateSelectedShowPath(nextSelectedShowId);
    },
    [showsByScheduleTab, updateSelectedShowPath],
  );

  const handleSelectShow = useCallback(
    (showId: string) => {
      setSelectedShowId(showId);
      updateSelectedShowPath(showId);
    },
    [updateSelectedShowPath],
  );

  const selectedShow = useMemo(
    () => visibleShows.find((show) => show.id === selectedShowId) ?? null,
    [selectedShowId, visibleShows],
  );
  const isSelectedShowPast = useMemo(
    () => (selectedShow ? isPastScheduledShow(selectedShow, new Date()) : false),
    [selectedShow],
  );
  const lastManualImportAt = useMemo(() => {
    const showImportAt = selectedShow?.lastSeenInAssistedImportAt;
    const latestImportAt = showQueueSettings.settings.lastWhatnotAssistedImportAt;

    if (!showImportAt) {
      return latestImportAt;
    }

    if (!latestImportAt) {
      return showImportAt;
    }

    return showImportAt.toDate().getTime() >= latestImportAt.toDate().getTime() ? showImportAt : latestImportAt;
  }, [selectedShow?.lastSeenInAssistedImportAt, showQueueSettings.settings.lastWhatnotAssistedImportAt]);

  const { allocations, reloadAllocations } = useShowAllocations(selectedShowId);
  const requestGroups = useMemo(() => groupAllocationsByRequest(allocations), [allocations]);
  const printRequestIdsAlreadyOnSelectedShow = useMemo(
    () =>
      new Set(
        allocations.filter((allocation) => allocation.status !== "canceled").map((allocation) => allocation.printRequestId),
      ),
    [allocations],
  );
  const hasActiveAllocationsForSelectedShow = useMemo(
    () => (selectedShow?.allocatedQuantity ?? 0) > 0,
    [selectedShow?.allocatedQuantity],
  );

  const handleProductionTimerUpdated = useCallback(async () => {
    await Promise.all([reloadUpcomingShows(), reloadAllocations()]);
  }, [reloadAllocations, reloadUpcomingShows]);

  const productionTimer = useShowProductionTimer({
    show: selectedShow,
    hasActiveAllocations: hasActiveAllocationsForSelectedShow,
    onShowUpdated: handleProductionTimerUpdated,
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMultiplyByQuantity, setExportMultiplyByQuantity] = useState(false);
  const exportShowZipState = useExportShowZip();

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelectedShowPast) {
      setIsExportMenuOpen(false);
    }
  }, [isSelectedShowPast]);

  useEffect(() => {
    if (!isExportMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsExportMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExportMenuOpen]);

  const openExportModal = useCallback(
    (multiplyByQuantity: boolean) => {
      if (isSelectedShowPast) {
        return;
      }

      exportShowZipState.reset();
      setExportMultiplyByQuantity(multiplyByQuantity);
      setIsExportModalOpen(true);
      setIsExportMenuOpen(false);
    },
    [exportShowZipState, isSelectedShowPast],
  );

  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  const handleConfirmExport = useCallback(() => {
    if (selectedShow) {
      void exportShowZipState.exportShowZip(selectedShow, exportMultiplyByQuantity);
    }
  }, [exportMultiplyByQuantity, exportShowZipState, selectedShow]);

  const [isExportGangSheetModalOpen, setIsExportGangSheetModalOpen] = useState(false);
  const exportGangSheetPngState = useExportGangSheetPng();
  const gangSheetLayoutSettings = useMemo(
    () => ({
      sheetWidthInches: showQueueSettings.settings.gangSheetWidthInches ?? DEFAULT_GANG_SHEET_WIDTH_INCHES,
      sideMarginInches:
        showQueueSettings.settings.gangSheetSideMarginInches ?? DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES,
      topBottomMarginInches:
        showQueueSettings.settings.gangSheetTopBottomMarginInches ?? DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES,
      gutterInches: showQueueSettings.settings.gangSheetGutterInches ?? DEFAULT_GANG_SHEET_GUTTER_INCHES,
      maxSheetLengthInches:
        showQueueSettings.settings.gangSheetMaxLengthInches ?? DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES,
      labelFontSizePx:
        showQueueSettings.settings.gangSheetLabelFontSizePx ?? DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX,
    }),
    [
      showQueueSettings.settings.gangSheetGutterInches,
      showQueueSettings.settings.gangSheetLabelFontSizePx,
      showQueueSettings.settings.gangSheetMaxLengthInches,
      showQueueSettings.settings.gangSheetSideMarginInches,
      showQueueSettings.settings.gangSheetTopBottomMarginInches,
      showQueueSettings.settings.gangSheetWidthInches,
    ],
  );

  const openExportGangSheetModal = useCallback(() => {
    if (isSelectedShowPast) {
      return;
    }

    exportGangSheetPngState.reset();
    setIsExportGangSheetModalOpen(true);
  }, [exportGangSheetPngState, isSelectedShowPast]);

  const closeExportGangSheetModal = useCallback(() => {
    setIsExportGangSheetModalOpen(false);
  }, []);

  const handleConfirmExportGangSheet = useCallback(() => {
    if (selectedShow) {
      void exportGangSheetPngState.exportGangSheetPng(selectedShow, gangSheetLayoutSettings);
    }
  }, [exportGangSheetPngState, gangSheetLayoutSettings, selectedShow]);

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
  const parsedGangSheetWidth = Number(gangSheetWidthInput.trim());
  const isGangSheetWidthValid =
    gangSheetWidthInput.trim() !== "" &&
    Number.isFinite(parsedGangSheetWidth) &&
    parsedGangSheetWidth >= 10 &&
    parsedGangSheetWidth <= 60;
  const parsedGangSheetSideMargin = Number(gangSheetSideMarginInput.trim());
  const isGangSheetSideMarginValid =
    gangSheetSideMarginInput.trim() !== "" &&
    Number.isFinite(parsedGangSheetSideMargin) &&
    parsedGangSheetSideMargin >= 0 &&
    parsedGangSheetSideMargin <= 5;
  const parsedGangSheetTopBottomMargin = Number(gangSheetTopBottomMarginInput.trim());
  const isGangSheetTopBottomMarginValid =
    gangSheetTopBottomMarginInput.trim() !== "" &&
    Number.isFinite(parsedGangSheetTopBottomMargin) &&
    parsedGangSheetTopBottomMargin >= 0 &&
    parsedGangSheetTopBottomMargin <= 5;
  const parsedGangSheetGutter = Number(gangSheetGutterInput.trim());
  const isGangSheetGutterValid =
    gangSheetGutterInput.trim() !== "" &&
    Number.isFinite(parsedGangSheetGutter) &&
    parsedGangSheetGutter >= 0 &&
    parsedGangSheetGutter <= 5;
  const parsedGangSheetMaxLength = Number(gangSheetMaxLengthInput.trim());
  const isGangSheetMaxLengthValid =
    gangSheetMaxLengthInput.trim() !== "" &&
    Number.isFinite(parsedGangSheetMaxLength) &&
    parsedGangSheetMaxLength >= 10 &&
    parsedGangSheetMaxLength <= 300;
  const parsedGangSheetLabelFontSize = Number(gangSheetLabelFontSizeInput.trim());
  const isGangSheetLabelFontSizeValid =
    gangSheetLabelFontSizeInput.trim() !== "" &&
    Number.isFinite(parsedGangSheetLabelFontSize) &&
    parsedGangSheetLabelFontSize >= 20 &&
    parsedGangSheetLabelFontSize <= 300;

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !user ||
      !permissionService.canManageUpcomingShows(user) ||
      !isWhatnotBaseUrlValid ||
      !isGangSheetWidthValid ||
      !isGangSheetSideMarginValid ||
      !isGangSheetTopBottomMarginValid ||
      !isGangSheetGutterValid ||
      !isGangSheetMaxLengthValid ||
      !isGangSheetLabelFontSizeValid
    ) {
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
        gangSheetWidthInches: parsedGangSheetWidth,
        gangSheetSideMarginInches: parsedGangSheetSideMargin,
        gangSheetTopBottomMarginInches: parsedGangSheetTopBottomMargin,
        gangSheetGutterInches: parsedGangSheetGutter,
        gangSheetMaxLengthInches: parsedGangSheetMaxLength,
        gangSheetLabelFontSizePx: parsedGangSheetLabelFontSize,
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
    if (!selectedShow || isSelectedShowPast) {
      return;
    }

    setActionError(null);
    setMaxQuantityInput(selectedShow.maxTotalQuantity?.toString() ?? "");
    setMaxQuantityOverrideConfirmed(false);
    setIsMaxQuantityModalOpen(true);
  }, [isSelectedShowPast, selectedShow]);

  const closeMaxQuantityModal = useCallback(() => {
    setIsMaxQuantityModalOpen(false);
    setActionError(null);
  }, []);

  const capacity = selectedShow
    ? assessShowCapacity({ maxTotalQuantity: selectedShow.maxTotalQuantity, allocatedQuantity: selectedShow.allocatedQuantity })
    : null;
  const selectedShowStatusDisplay = useMemo(() => {
    if (!selectedShow || !capacity) {
      return null;
    }

    return getDerivedShowStatusDisplay(selectedShow.productionStatus, capacity, {
      isPastScheduled: isSelectedShowPast,
    });
  }, [capacity, isSelectedShowPast, selectedShow]);

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
    if (isSelectedShowPast) {
      return;
    }

    setActionError(null);
    setAddRequestId("");
    setIsAddRequestModalOpen(true);
  }, [isSelectedShowPast]);

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
    () => [
      { label: "Choose a request", value: "" },
      ...requests
        .filter((request) => !printRequestIdsAlreadyOnSelectedShow.has(request.id))
        .filter((request) => {
          const summary = summariesByRequestId[request.id];
          const allocationTotals = allocationTotalsByRequestId[request.id] ?? {
            totalAllocatedQuantity: 0,
            totalInProgressQuantity: 0,
            totalPrintedQuantity: 0,
          };

          return !isPrintRequestFullyPrinted({
            status: request.status,
            totalRequestedQuantity: summary?.totalQuantity ?? 0,
            totalAllocatedQuantity: allocationTotals.totalAllocatedQuantity,
            totalInProgressQuantity: allocationTotals.totalInProgressQuantity,
            totalPrintedQuantity: allocationTotals.totalPrintedQuantity,
          });
        })
        .map((request) => ({ label: request.name, value: request.id })),
    ],
    [allocationTotalsByRequestId, printRequestIdsAlreadyOnSelectedShow, requests, summariesByRequestId],
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
                onClick={() => handleScheduleTabChange(tab)}
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
                const showStatusDisplay = getDerivedShowStatusDisplay(show.productionStatus, showCapacity, {
                  isPastScheduled: activeScheduleTab === "past",
                });
                const cardStateClass = showCapacity.isOverCapacity
                  ? " is-over-capacity"
                  : showCapacity.isFull
                    ? " is-full"
                    : "";

                return (
                  <button
                    className={`print-requests-request-card${isSelected ? " is-selected" : ""}${cardStateClass}`}
                    key={show.id}
                    onClick={() => handleSelectShow(show.id)}
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
                <div className="print-requests-detail-header show-detail-header">
                  <div className="print-requests-detail-copy">
                    <p className="eyebrow">Show detail</p>
                    <h2>{formatUpcomingShowTitle(selectedShow)}</h2>
                    <p className="print-requests-detail-timestamps">
                      Scheduled {formatUpcomingShowTimestampLabel(selectedShow.scheduledStartAt)}
                    </p>
                  </div>
                  {permissionService.canManageUpcomingShows(user) ? (
                    <div className="print-requests-detail-actions show-detail-header-actions">
                      <div className="export-menu-shell" ref={exportMenuRef}>
                        <Button
                          aria-controls="export-menu"
                          aria-expanded={isExportMenuOpen}
                          aria-haspopup="menu"
                          className="button-leading-icon"
                          disabled={isSelectedShowPast || !hasActiveAllocationsForSelectedShow}
                          onClick={() => setIsExportMenuOpen((current) => !current)}
                          size="sm"
                          variant="secondary"
                          title={
                            isSelectedShowPast
                              ? PAST_SHOW_READ_ONLY_MESSAGE
                              : hasActiveAllocationsForSelectedShow
                                ? undefined
                                : "Add a print request to this show before exporting."
                          }
                        >
                          <Download aria-hidden="true" size={16} strokeWidth={2} />
                          Export
                          <ChevronDown aria-hidden="true" size={14} strokeWidth={2.4} />
                        </Button>

                        {isExportMenuOpen && !isSelectedShowPast ? (
                          <div aria-label="Export options" className="export-menu" id="export-menu" role="menu">
                            <button
                              className="export-menu-option"
                              onClick={() => openExportModal(false)}
                              role="menuitem"
                              type="button"
                            >
                              <span>Export</span>
                              <span className="export-menu-option-hint">One file per design.</span>
                            </button>
                            <button
                              className="export-menu-option"
                              onClick={() => openExportModal(true)}
                              role="menuitem"
                              type="button"
                            >
                              <span>Export x(Qty)</span>
                              <span className="export-menu-option-hint">
                                One file per allocated unit.
                              </span>
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <Button
                        className="button-leading-icon"
                        disabled={isSelectedShowPast || !hasActiveAllocationsForSelectedShow}
                        onClick={openExportGangSheetModal}
                        size="sm"
                        variant="secondary"
                        title={
                          isSelectedShowPast
                            ? PAST_SHOW_READ_ONLY_MESSAGE
                            : hasActiveAllocationsForSelectedShow
                              ? undefined
                              : "Add a print request to this show before exporting."
                        }
                      >
                        <Download aria-hidden="true" size={16} strokeWidth={2} />
                        Export Gang Sheet
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="show-detail-pill-row">
                  {shouldShowUpcomingShowScheduleStatusBadge(selectedShow, new Date()) ? (
                    <Badge variant={getUpcomingShowStatusBadgeVariant(selectedShow.status)}>
                      {selectedShow.status}
                    </Badge>
                  ) : null}
                  {selectedShowStatusDisplay ? (
                    <Badge variant={selectedShowStatusDisplay.variant}>{selectedShowStatusDisplay.label}</Badge>
                  ) : null}
                </div>

                {permissionService.canManageUpcomingShows(user) ? (
                  <Card className="show-production-timer-card">
                    <div className="show-production-timer-header">
                      <div>
                        <p className="eyebrow">Live printing</p>
                        <p className="show-production-timer-elapsed" aria-live="polite">
                          {productionTimer.formattedElapsed}
                        </p>
                        <p className="print-requests-workflow-copy">
                          {productionTimer.isFinished
                            ? "This show's printing run is finished."
                            : productionTimer.isPaused
                              ? "Printing is paused. Resume when the press is running again."
                              : productionTimer.isPrinting
                                ? "Timer is running. Customers see this request as Printing in the portal."
                                : productionTimer.isPastScheduledShow
                                  ? PAST_SHOW_READ_ONLY_MESSAGE
                                  : "Start the timer when printing begins so customers can track request progress in the portal. Exporting does not start the timer."}
                        </p>
                      </div>
                      <div className="show-production-timer-actions">
                        {productionTimer.canStart ? (
                          <Button
                            className="button-leading-icon"
                            disabled={productionTimer.isActionPending}
                            onClick={() => void productionTimer.startPrinting()}
                            size="sm"
                            variant="primary"
                          >
                            <Play aria-hidden="true" size={16} strokeWidth={2} />
                            Start printing
                          </Button>
                        ) : null}
                        {productionTimer.canPause ? (
                          <Button
                            className="button-leading-icon"
                            disabled={productionTimer.isActionPending}
                            onClick={() => void productionTimer.pausePrinting()}
                            size="sm"
                            variant="secondary"
                          >
                            <Pause aria-hidden="true" size={16} strokeWidth={2} />
                            Pause
                          </Button>
                        ) : null}
                        {productionTimer.canResume ? (
                          <Button
                            className="button-leading-icon"
                            disabled={productionTimer.isActionPending}
                            onClick={() => void productionTimer.resumePrinting()}
                            size="sm"
                            variant="primary"
                          >
                            <Play aria-hidden="true" size={16} strokeWidth={2} />
                            Resume
                          </Button>
                        ) : null}
                        {productionTimer.canMarkFinished ? (
                          <Button
                            disabled={productionTimer.isActionPending}
                            onClick={() => void productionTimer.markFinished()}
                            size="sm"
                            variant="secondary"
                          >
                            Mark finished
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {productionTimer.actionError ? (
                      <p className="print-requests-error" role="alert">
                        {productionTimer.actionError}
                      </p>
                    ) : null}
                  </Card>
                ) : null}

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
                    <dt>Last manual import</dt>
                    <dd>{formatUpcomingShowManualImportTimestampLabel(lastManualImportAt)}</dd>
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
                    disabled={isSelectedShowPast || !permissionService.canManageUpcomingShows(user)}
                    onClick={openMaxQuantityModal}
                    size="sm"
                    title={isSelectedShowPast ? PAST_SHOW_READ_ONLY_MESSAGE : undefined}
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
                    disabled={isSelectedShowPast || !permissionService.canManageUpcomingShows(user)}
                    onClick={openAddRequestModal}
                    size="sm"
                    title={isSelectedShowPast ? PAST_SHOW_READ_ONLY_MESSAGE : undefined}
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
                      const canRemove =
                        !isSelectedShowPast && canRemoveRequestFromShow(selectedShow.productionStatus);

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

      {isExportModalOpen && selectedShow ? (
        <ExportShowConfirmModal
          error={exportShowZipState.error}
          isExporting={exportShowZipState.isExporting}
          multiplyByQuantity={exportMultiplyByQuantity}
          onClose={closeExportModal}
          onConfirm={handleConfirmExport}
          progress={exportShowZipState.progress}
          result={exportShowZipState.result}
          show={selectedShow}
        />
      ) : null}

      {isExportGangSheetModalOpen && selectedShow ? (
        <ExportGangSheetConfirmModal
          error={exportGangSheetPngState.error}
          gangSheetWidthInches={gangSheetLayoutSettings.sheetWidthInches}
          isExporting={exportGangSheetPngState.isExporting}
          onClose={closeExportGangSheetModal}
          onConfirm={handleConfirmExportGangSheet}
          progress={exportGangSheetPngState.progress}
          result={exportGangSheetPngState.result}
          show={selectedShow}
        />
      ) : null}

      {isSettingsModalOpen ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="show-queue-settings-title"
            className="modal-panel modal-panel-lg show-queue-settings-modal"
            role="dialog"
          >
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
              <form
                className="show-queue-settings-form"
                id="show-queue-settings-form"
                onSubmit={handleSaveSettings}
              >
                <section className="show-queue-settings-section">
                  <h4 className="show-queue-settings-section-title">General</h4>
                  <div className="show-queue-settings-grid">
                    <div className="show-queue-settings-field">
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
                        Current default:{" "}
                        {showQueueSettings.isLoading
                          ? "Loading..."
                          : showQueueSettings.settings.defaultMaxTotalQuantity === undefined
                            ? "No default limit"
                            : showQueueSettings.settings.defaultMaxTotalQuantity}
                        . Applied only to new shows going forward.
                      </p>
                    </div>

                    <div className="show-queue-settings-field">
                      <TextInput
                        label="Whatnot show base URL"
                        name="whatnotShowBaseUrl"
                        onChange={(event) => setWhatnotBaseUrlInput(event.target.value)}
                        placeholder={DEFAULT_WHATNOT_SHOW_BASE_URL}
                        value={whatnotBaseUrlInput}
                      />
                      <p className="print-requests-modal-hint">
                        {isWhatnotBaseUrlValid
                          ? "Used by “Import Shows” to open your show list."
                          : "Must be a https://www.whatnot.com/user/<name>/shows URL."}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="show-queue-settings-section">
                  <h4 className="show-queue-settings-section-title">Gang sheet layout</h4>
                  <div className="show-queue-settings-grid">
                    <div className="show-queue-settings-field">
                      <TextInput
                        label="Sheet width (inches)"
                        min={10}
                        max={60}
                        name="gangSheetWidthInches"
                        onChange={(event) => setGangSheetWidthInput(event.target.value)}
                        step={0.01}
                        type="number"
                        value={gangSheetWidthInput}
                      />
                      <p className="print-requests-modal-hint">
                        {isGangSheetWidthValid
                          ? "Fixed artboard width used by “Export Gang Sheet”."
                          : "Must be a number between 10\" and 60\"."}
                      </p>
                    </div>

                    <div className="show-queue-settings-field">
                      <TextInput
                        label="Max sheet length before new sheet (inches)"
                        min={10}
                        max={300}
                        name="gangSheetMaxLengthInches"
                        onChange={(event) => setGangSheetMaxLengthInput(event.target.value)}
                        step={0.01}
                        type="number"
                        value={gangSheetMaxLengthInput}
                      />
                      <p className="print-requests-modal-hint">
                        {isGangSheetMaxLengthValid
                          ? "A new sheet starts once this height would be exceeded."
                          : "Must be a number between 10\" and 300\"."}
                      </p>
                    </div>

                    <div className="show-queue-settings-field">
                      <TextInput
                        label="Side margin (inches)"
                        min={0}
                        max={5}
                        name="gangSheetSideMarginInches"
                        onChange={(event) => setGangSheetSideMarginInput(event.target.value)}
                        step={0.01}
                        type="number"
                        value={gangSheetSideMarginInput}
                      />
                      <p className="print-requests-modal-hint">
                        {isGangSheetSideMarginValid
                          ? "Sheet edge to nearest image, left/right only."
                          : "Must be a number between 0\" and 5\"."}
                      </p>
                    </div>

                    <div className="show-queue-settings-field">
                      <TextInput
                        label="Top/bottom margin (inches)"
                        min={0}
                        max={5}
                        name="gangSheetTopBottomMarginInches"
                        onChange={(event) => setGangSheetTopBottomMarginInput(event.target.value)}
                        step={0.01}
                        type="number"
                        value={gangSheetTopBottomMarginInput}
                      />
                      <p className="print-requests-modal-hint">
                        {isGangSheetTopBottomMarginValid
                          ? "Sheet edge to nearest image, top/bottom only."
                          : "Must be a number between 0\" and 5\"."}
                      </p>
                    </div>

                    <div className="show-queue-settings-field">
                      <TextInput
                        label="Gutter between images (inches)"
                        min={0}
                        max={5}
                        name="gangSheetGutterInches"
                        onChange={(event) => setGangSheetGutterInput(event.target.value)}
                        step={0.01}
                        type="number"
                        value={gangSheetGutterInput}
                      />
                      <p className="print-requests-modal-hint">
                        {isGangSheetGutterValid
                          ? "Spacing between images, both within a row and between rows."
                          : "Must be a number between 0\" and 5\"."}
                      </p>
                    </div>

                    <div className="show-queue-settings-field">
                      <TextInput
                        label="Sheet label font size (px)"
                        min={20}
                        max={300}
                        name="gangSheetLabelFontSizePx"
                        onChange={(event) => setGangSheetLabelFontSizeInput(event.target.value)}
                        step={1}
                        type="number"
                        value={gangSheetLabelFontSizeInput}
                      />
                      <p className="print-requests-modal-hint">
                        {isGangSheetLabelFontSizeValid
                          ? "Size of the filename label printed at the top of each gang sheet."
                          : "Must be a number between 20px and 300px."}
                      </p>
                    </div>
                  </div>
                </section>

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
                disabled={
                  isSavingSettings ||
                  !isWhatnotBaseUrlValid ||
                  !isGangSheetWidthValid ||
                  !isGangSheetSideMarginValid ||
                  !isGangSheetTopBottomMarginValid ||
                  !isGangSheetGutterValid ||
                  !isGangSheetMaxLengthValid ||
                  !isGangSheetLabelFontSizeValid
                }
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
                <h3 id="whatnot-import-error-title">Import Shows</h3>
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
            <LoadingSpinner label="Importing shows" />
          </Card>
        </div>
      ) : null}
    </main>
  );
}
