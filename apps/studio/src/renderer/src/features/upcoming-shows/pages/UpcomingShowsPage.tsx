import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { ChevronDown, Download, ExternalLink, Pause, Play, Plus, RefreshCw, Settings, Upload, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { DangerOverflowMenu, type DangerOverflowMenuItem } from "../../../shared/components/DangerOverflowMenu";
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
import { clearPrintRequestsPageCache } from "../../print-requests/services/printRequestsPageReadCache";
import { TransferPrintRequestToShowModal } from "../../print-requests/components/TransferPrintRequestToShowModal";
import { formatPrintRequestShowTransferActionLabel, resolvePrintRequestShowTransferMode } from "@fresh-prints/shared/utils/printRequestShowTransfer";
import { upcomingShowService } from "../services/upcomingShowService";
import { UpcomingShowDeletionDialog } from "../components/UpcomingShowDeletionDialog";
import { NeedsAttentionShowPanel } from "../components/NeedsAttentionShowPanel";
import { DidNotPrintRecoveryDialog } from "../components/DidNotPrintRecoveryDialog";
import {
  OwnerShowProductionOverrideDialog,
  ShowProductionRecoveryDialog,
} from "../components/ShowProductionRecoveryDialog";
import { useUpcomingShows } from "../hooks/useUpcomingShows";
import { useShowAllocations } from "../hooks/useShowAllocations";
import { useShowProductionTimer } from "../hooks/useShowProductionTimer";
import { useStalePastPrintingShowReconciliation } from "../hooks/useStalePastPrintingShowReconciliation";
import { useEmptyPastShowReconciliation } from "../hooks/useEmptyPastShowReconciliation";
import { useShowQueueSettings } from "../hooks/useShowQueueSettings";
import {
  DEFAULT_GANG_SHEET_GUTTER_INCHES,
  DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX,
  DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES,
  DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES,
  DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES,
  DEFAULT_GANG_SHEET_WIDTH_INCHES,
  DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
} from "../services/showQueueSettingsService";
import { useWhatnotShowImport, type WhatnotShowImportSummary } from "../hooks/useWhatnotShowImport";
import { useShowQueuePrintRequests } from "../hooks/useShowQueuePrintRequests";
import { usePrintRequestAllocationTotals } from "../../print-requests/hooks/usePrintRequestAllocationTotals";
import { usePrintRequestDetails } from "../../print-requests/hooks/usePrintRequestDetails";
import { getPrintRequestsPath, printRequestListKindFromIsInternal } from "../../print-requests/constants/printRequestRoutes";
import { AddToShowModal } from "../../print-requests/components/AddToShowModal";
import { ExportShowConfirmModal } from "../components/ExportShowConfirmModal";
import { ExportGangSheetConfirmModal } from "../components/ExportGangSheetConfirmModal";
import { GangSheetLayoutModeMenu } from "../components/GangSheetLayoutModeMenu";
import { useExportShowZip } from "../hooks/useExportShowZip";
import { useExportGangSheetPng, type GangSheetSheetCountPreview } from "../hooks/useExportGangSheetPng";
import { groupAllocationsByRequest } from "../utils/groupAllocationsByRequest";
import {
  formatShowAllocationBlockedMessage,
  getShowAllocationBlockReason,
} from "@fresh-prints/shared/utils/showAllocationEligibility";
import {
  getWhatnotShowQueueTab,
  isShowQueuePastReadOnlyShow,
  partitionWhatnotShowsByQueueTab,
  resolveWhatnotQueueTabForStillExistingSelection,
  type WhatnotShowQueueTab,
} from "@fresh-prints/shared/utils/showProductionRecovery";
import type { ShowProductionRecoveryAction } from "@fresh-prints/shared/types/showProductionRecovery/showProductionRecovery.types";
import {
  isPastScheduledShow,
  PAST_SHOW_READ_ONLY_MESSAGE,
  resolveVisibleShowSelection,
} from "../utils/groupShowsByUpcomingPast";
import { sortPastShowsForDisplay } from "../utils/upcomingShowListSort";
import { parseWhatnotShowUrl, isDevOverrideShowUrlSentinel } from "@fresh-prints/shared/utils/whatnotShowUrl";
import { parseWhatnotShowBaseUrl } from "@fresh-prints/shared/utils/whatnotShowBaseUrl";
import { assessShowCapacity } from "@fresh-prints/shared/utils/showCapacity";
import {
  formatShowCapacitySlotLabel,
  getCapacityFillLevel,
  getDerivedShowStatusDisplay,
  getShowCapacityPercent,
} from "@fresh-prints/shared/utils/showCapacityDisplay";
import { resolveShowDisplayAllocatedQuantity } from "@fresh-prints/shared/utils/showDisplayAllocatedQuantity";
import { canRemoveRequestFromShow } from "@fresh-prints/shared/utils/showQueueEditability";
import { isStaffGangSheetShow, isDevFixtureShow, isWhatnotQueueSurfaceShow, type UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import {
  canAllocateOriginToShowSource,
  formatStaffGangSheetTitle,
  resolveNextStaffGangSheetCycleNumber,
} from "@fresh-prints/shared/utils/staffGangSheet";
import {
  canEnableAddRequestAction,
  decideQuerySurfaceSync,
  type ShowQueueSurface,
} from "../utils/showQueueSurfaceSelection";
import {
  buildShowQueuePrintRequestOptions,
  resolveShowQueuePrintRequestLinkTab,
} from "../utils/showQueuePrintRequestSources";
import { refreshSelectedShowGangSheetCache } from "../utils/gangSheetCacheRefresh";
import {
  hasShowExportableAllocations,
  PAST_SHOW_EXPORT_COPY,
} from "../utils/showExportEligibility";
import type { GangSheetLayoutMode } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import { parseDateTimeInputToTimestamp, formatTimestampForDateTimeInput } from "../utils/upcomingShowDateTimeInput";
import {
  formatUpcomingShowTimestampLabel,
  formatUpcomingShowManualImportTimestampLabel,
  formatUpcomingShowTitle,
  formatUpcomingShowWhatnotIdentityLabel,
  getUpcomingShowStatusBadgeVariant,
  shouldShowUpcomingShowScheduleStatusBadge,
} from "../utils/upcomingShowDisplay";
import { isDevFixtureShowOperationAllowedForStudio } from "../utils/devFixtureShowStudioGate";
import { getShowAllocationStatusBadgeVariant } from "../utils/showAllocationDisplay";
import {
  buildShowQueueRouteSearchParams,
  SHOW_QUEUE_TAB_QUERY_PARAM,
  UPCOMING_SHOW_ID_QUERY_PARAM,
  UPCOMING_SHOW_REQUEST_ID_QUERY_PARAM,
  getShowQueueSurfacePath,
  resolveStaffGangSheetListTab,
  resolveWhatnotShowQueueListTab,
  type StaffGangSheetListTab,
} from "../constants/upcomingShowRoutes";

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

/** Live print timer — 1s while a show is printing. */
const SHOW_QUEUE_SCHEDULE_TICK_MS_WHILE_PRINTING = 1_000;
/** Queue tab classification (Upcoming → Needs Attention) — must tick even when idle. */
const SHOW_QUEUE_SCHEDULE_TICK_MS = 5_000;

function getShowQueueRailEmptyState(
  queueSurface: ShowQueueSurface,
  tab: WhatnotShowQueueTab | StaffGangSheetListTab,
): { title: string; message: string; isPastScheduled: boolean } {
  if (queueSurface === "staff_gang_sheets") {
    return {
      title: "No Internal Gang Sheets yet",
      message: "Create a shared Internal Gang Sheet to start internal production.",
      isPastScheduled: false,
    };
  }

  switch (tab) {
    case "needs_attention":
      return {
        title: "No shows need attention",
        message: "Unresolved past shows with incomplete production will appear here.",
        isPastScheduled: true,
      };
    case "past":
      return {
        title: "No past shows yet",
        message: "Completed and archived past shows appear here after remediation.",
        isPastScheduled: true,
      };
    case "upcoming":
    default:
      return {
        title: "No shows yet",
        message: "Add the first Whatnot show to start tracking the schedule and production.",
        isPastScheduled: false,
      };
  }
}

function isCurrentStaffGangSheetProductionStatus(status: string): boolean {
  return status === "open" || status === "full" || status === "printing";
}

function formatWriteErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const message = error.message.trim();
    if (/^internal$/i.test(message)) {
      return "Server error while saving. If you just purged DEV data, reload Studio and try again — create will fall back if Functions are not redeployed yet.";
    }
    return message;
  }
  return "Unable to complete the requested write.";
}

interface UpcomingShowsPageProps {
  /** Dedicated Show Queue vs Internal Sheets routes — no surface tabs. */
  lockedSurface?: ShowQueueSurface;
}

export function UpcomingShowsPage({ lockedSurface = "shows" }: UpcomingShowsPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const selectedShowId = searchParams.get(UPCOMING_SHOW_ID_QUERY_PARAM)?.trim() || null;
  // Plan Section 22.5 (Amendment 4, Fix 3 extended): live-subscribe only the currently selected
  // show's own document, so its `allocatedQuantity`/capacity fields reflect a Portal-submitted
  // allocation without a remount — bounded to one show, never the whole collection.
  const { shows, error: loadError, isLoading, reloadUpcomingShows } = useUpcomingShows(selectedShowId);
  const { totalsByRequestId: allocationTotalsByRequestId, reload: reloadAllocationTotals } =
    usePrintRequestAllocationTotals();
  const showQueueSettings = useShowQueueSettings();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateShowFormState>(DEFAULT_CREATE_SHOW_FORM);
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<CreateShowFormState>(DEFAULT_CREATE_SHOW_FORM);
  const [isSavingShowEdit, setIsSavingShowEdit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successAlertSeed, setSuccessAlertSeed] = useState(0);
  const dismissSuccessMessage = useCallback(() => {
    setSuccessMessage(null);
  }, []);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const [isMaxQuantityModalOpen, setIsMaxQuantityModalOpen] = useState(false);
  const [maxQuantityInput, setMaxQuantityInput] = useState("");
  const [maxQuantityOverrideConfirmed, setMaxQuantityOverrideConfirmed] = useState(false);

  const [isAddRequestModalOpen, setIsAddRequestModalOpen] = useState(false);
  const [addRequestId, setAddRequestId] = useState("");
  const [isDeletionDialogOpen, setIsDeletionDialogOpen] = useState(false);
  const [recoveryDialogAction, setRecoveryDialogAction] = useState<ShowProductionRecoveryAction | null>(
    null,
  );
  const [isDidNotPrintDialogOpen, setIsDidNotPrintDialogOpen] = useState(false);
  const [isOwnerOverrideDialogOpen, setIsOwnerOverrideDialogOpen] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [defaultCapacityInput, setDefaultCapacityInput] = useState("");
  const [whatnotBaseUrlInput, setWhatnotBaseUrlInput] = useState("");
  const [portalCutoffHoursInput, setPortalCutoffHoursInput] = useState("");
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
  const [transferRequestContext, setTransferRequestContext] = useState<{
    printRequestId: string;
    requestNameSnapshot: string;
    transferQuantity: number;
  } | null>(null);
  const queueSurface = lockedSurface;
  const [isCreateStaffLaneModalOpen, setIsCreateStaffLaneModalOpen] = useState(false);
  const [isCompletingStaffGangSheet, setIsCompletingStaffGangSheet] = useState(false);
  const [completeConfirmKind, setCompleteConfirmKind] = useState<"staff_complete" | "show_finished" | null>(
    null,
  );
  const hasHydratedFromQueryRef = useRef(false);
  const skipRailScrollRef = useRef(false);
  const skipListTabRouteSyncRef = useRef(false);

  const tabParam = searchParams.get(SHOW_QUEUE_TAB_QUERY_PARAM);
  const highlightedRequestIdParam = searchParams.get(UPCOMING_SHOW_REQUEST_ID_QUERY_PARAM)?.trim() || null;
  const activeScheduleTab = resolveWhatnotShowQueueListTab(tabParam);
  const staffListTab = resolveStaffGangSheetListTab(tabParam);

  useEffect(() => {
    setConfirmingRemoveRequestId(null);
  }, [selectedShowId]);

  const applyShowQueueRoute = useCallback(
    (options: {
      tab: WhatnotShowQueueTab | StaffGangSheetListTab;
      showId?: string | null;
      requestId?: string | null;
    }) => {
      const nextParams = buildShowQueueRouteSearchParams({
        tab: options.tab,
        showId: options.showId?.trim() || undefined,
        requestId:
          options.requestId === undefined
            ? highlightedRequestIdParam ?? undefined
            : options.requestId?.trim() || undefined,
      });
      const nextSearch = nextParams.toString();
      if (searchParams.toString() === nextSearch) {
        return;
      }
      setSearchParams(nextParams, { replace: true });
    },
    [highlightedRequestIdParam, searchParams, setSearchParams],
  );

  const openCreateModal = useCallback(() => {
    setActionError(null);
    setCreateForm(DEFAULT_CREATE_SHOW_FORM);
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setIsCreatingShow(false);
    setActionError(null);
  }, []);

  const openSettingsModal = useCallback(() => {
    setActionError(null);
    setDefaultCapacityInput(showQueueSettings.settings.defaultMaxTotalQuantity?.toString() ?? "");
    setWhatnotBaseUrlInput(showQueueSettings.settings.whatnotShowBaseUrl ?? DEFAULT_WHATNOT_SHOW_BASE_URL);
    setPortalCutoffHoursInput(
      (
        showQueueSettings.settings.portalQueueCutoffHoursBeforeStart ??
        DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START
      ).toString(),
    );
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
    showQueueSettings.settings.portalQueueCutoffHoursBeforeStart,
    showQueueSettings.settings.whatnotShowBaseUrl,
  ]);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
    setActionError(null);
  }, []);

  const effectiveWhatnotBaseUrl = showQueueSettings.settings.whatnotShowBaseUrl ?? DEFAULT_WHATNOT_SHOW_BASE_URL;

  const staffSurfaceShows = useMemo(
    () => shows.filter((show) => isStaffGangSheetShow(show)),
    [shows],
  );
  const hasActiveStaffGangSheet = useMemo(
    () =>
      staffSurfaceShows.some((show) => isCurrentStaffGangSheetProductionStatus(show.productionStatus)),
    [staffSurfaceShows],
  );
  const nextStaffGangSheetCycleNumber = useMemo(
    () =>
      resolveNextStaffGangSheetCycleNumber(
        staffSurfaceShows.map((show) => show.staffGangSheetCycleNumber),
      ),
    [staffSurfaceShows],
  );
  const canCreateStaffGangSheet =
    permissionService.canCreateStaffGangSheetLane(user) && !hasActiveStaffGangSheet;

  const { openImportWindow: openWhatnotImportWindowRequest } = whatnotImport;
  const openWhatnotImportWindow = useCallback(() => {
    setActionError(null);
    void openWhatnotImportWindowRequest(effectiveWhatnotBaseUrl);
  }, [effectiveWhatnotBaseUrl, openWhatnotImportWindowRequest]);

  const surfaceShows = useMemo(() => {
    return shows.filter((show) =>
      queueSurface === "staff_gang_sheets" ? isStaffGangSheetShow(show) : isWhatnotQueueSurfaceShow(show),
    );
  }, [queueSurface, shows]);

  const hasPrintingWhatnotShow = useMemo(
    () =>
      surfaceShows.some(
        (show) => show.source === "whatnot" && show.productionStatus === "printing",
      ),
    [surfaceShows],
  );
  const [scheduleNow, setScheduleNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setScheduleNow(new Date());
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", onVisibility);
    tick();
    const intervalMs = hasPrintingWhatnotShow
      ? SHOW_QUEUE_SCHEDULE_TICK_MS_WHILE_PRINTING
      : SHOW_QUEUE_SCHEDULE_TICK_MS;
    const intervalId = window.setInterval(tick, intervalMs);
    return () => {
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, [hasPrintingWhatnotShow]);

  const showsByScheduleTab = useMemo(() => {
    const partitioned = partitionWhatnotShowsByQueueTab(surfaceShows, scheduleNow);
    return {
      upcoming: partitioned.upcoming,
      needs_attention: partitioned.needs_attention,
      past: sortPastShowsForDisplay(partitioned.past),
    };
  }, [scheduleNow, surfaceShows]);

  const staffShowsByListTab = useMemo(() => {
    const current: typeof surfaceShows = [];
    const history: typeof surfaceShows = [];
    for (const show of surfaceShows) {
      if (isCurrentStaffGangSheetProductionStatus(show.productionStatus)) {
        current.push(show);
      } else {
        history.push(show);
      }
    }
    return { current, history };
  }, [surfaceShows]);

  const visibleShows =
    queueSurface === "staff_gang_sheets"
      ? staffShowsByListTab[staffListTab]
      : showsByScheduleTab[activeScheduleTab];

  const activeListTab =
    queueSurface === "staff_gang_sheets" ? staffListTab : activeScheduleTab;
  const railEmptyState = getShowQueueRailEmptyState(queueSurface, activeListTab);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (skipListTabRouteSyncRef.current) {
      skipListTabRouteSyncRef.current = false;
      return;
    }

    const currentListTab =
      queueSurface === "staff_gang_sheets" ? staffListTab : activeScheduleTab;

    const inferListTabForShow = (show: UpcomingShow): WhatnotShowQueueTab | StaffGangSheetListTab => {
      if (queueSurface === "staff_gang_sheets") {
        return isCurrentStaffGangSheetProductionStatus(show.productionStatus) ? "current" : "history";
      }
      return getWhatnotShowQueueTab(show, scheduleNow);
    };

    if (selectedShowId) {
      const showFromQuery = shows.find((show) => show.id === selectedShowId) ?? null;

      if (showFromQuery) {
        const surfaceDecision = decideQuerySurfaceSync({
          queueSurface,
          queryShowSource: showFromQuery.source,
          hasHydratedFromQuery: hasHydratedFromQueryRef.current,
        });

        if (surfaceDecision.action === "set_surface") {
          if (surfaceDecision.surface !== lockedSurface) {
            const targetTab =
              surfaceDecision.surface === "staff_gang_sheets"
                ? isCurrentStaffGangSheetProductionStatus(showFromQuery.productionStatus)
                  ? "current"
                  : "history"
                : getWhatnotShowQueueTab(showFromQuery, scheduleNow);
            navigate(
              getShowQueueSurfacePath(surfaceDecision.surface, {
                showId: selectedShowId,
                requestId: highlightedRequestIdParam ?? undefined,
                tab: targetTab,
              }),
              { replace: true },
            );
          }
          return;
        }

        if (surfaceDecision.action === "clear_incompatible_query") {
          applyShowQueueRoute({ tab: currentListTab, showId: null, requestId: null });
          hasHydratedFromQueryRef.current = true;
          return;
        }

        if (!tabParam) {
          applyShowQueueRoute({
            tab: inferListTabForShow(showFromQuery),
            showId: selectedShowId,
            requestId: highlightedRequestIdParam ?? null,
          });
          hasHydratedFromQueryRef.current = true;
          return;
        }

        if (!visibleShows.some((show) => show.id === selectedShowId)) {
          const showTab = inferListTabForShow(showFromQuery);
          if (showTab !== currentListTab) {
            applyShowQueueRoute({
              tab: showTab,
              showId: selectedShowId,
              requestId: highlightedRequestIdParam ?? null,
            });
          } else {
            applyShowQueueRoute({ tab: currentListTab, showId: null, requestId: null });
          }
          hasHydratedFromQueryRef.current = true;
          return;
        }

        hasHydratedFromQueryRef.current = true;
        return;
      }
    }

    if (!tabParam) {
      applyShowQueueRoute({
        tab: currentListTab,
        showId: selectedShowId ?? undefined,
        requestId: highlightedRequestIdParam ?? null,
      });
      hasHydratedFromQueryRef.current = true;
      return;
    }

    if (selectedShowId && visibleShows.some((show) => show.id === selectedShowId)) {
      if (
        queueSurface === "shows" &&
        visibleShows.some((show) => show.id === selectedShowId)
      ) {
        const reclassifiedTab = resolveWhatnotQueueTabForStillExistingSelection(
          shows,
          selectedShowId,
          activeScheduleTab,
          scheduleNow,
        );
        if (reclassifiedTab) {
          applyShowQueueRoute({
            tab: reclassifiedTab,
            showId: selectedShowId,
            requestId: highlightedRequestIdParam ?? null,
          });
          hasHydratedFromQueryRef.current = true;
          return;
        }
      }

      hasHydratedFromQueryRef.current = true;
      return;
    }

    hasHydratedFromQueryRef.current = true;

    if (!selectedShowId && visibleShows.length > 0) {
      const nextSelectedShowId = resolveVisibleShowSelection(visibleShows, null);
      applyShowQueueRoute({
        tab: currentListTab,
        showId: nextSelectedShowId,
        requestId: null,
      });
    }
  }, [
    activeScheduleTab,
    applyShowQueueRoute,
    highlightedRequestIdParam,
    isLoading,
    lockedSurface,
    navigate,
    queueSurface,
    scheduleNow,
    selectedShowId,
    shows,
    staffListTab,
    tabParam,
    visibleShows,
  ]);

  useEffect(() => {
    if (!selectedShowId || isLoading) {
      return;
    }

    if (skipRailScrollRef.current) {
      skipRailScrollRef.current = false;
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-upcoming-show-id="${CSS.escape(selectedShowId)}"]`,
      );
      target?.scrollIntoView({ block: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, selectedShowId]);

  const handleScheduleTabChange = useCallback(
    (tab: WhatnotShowQueueTab) => {
      if (tab === activeScheduleTab) {
        return;
      }

      skipRailScrollRef.current = true;
      skipListTabRouteSyncRef.current = true;
      hasHydratedFromQueryRef.current = true;
      const nextSelectedShowId = resolveVisibleShowSelection(showsByScheduleTab[tab], null);
      applyShowQueueRoute({ tab, showId: nextSelectedShowId, requestId: null });
    },
    [activeScheduleTab, applyShowQueueRoute, showsByScheduleTab],
  );

  const handleStaffListTabChange = useCallback(
    (tab: StaffGangSheetListTab) => {
      if (tab === staffListTab) {
        return;
      }

      skipRailScrollRef.current = true;
      skipListTabRouteSyncRef.current = true;
      hasHydratedFromQueryRef.current = true;
      const nextSelectedShowId = resolveVisibleShowSelection(staffShowsByListTab[tab], null);
      applyShowQueueRoute({ tab, showId: nextSelectedShowId, requestId: null });
    },
    [applyShowQueueRoute, staffListTab, staffShowsByListTab],
  );

  const handleSelectShow = useCallback(
    (showId: string) => {
      applyShowQueueRoute({
        tab: queueSurface === "staff_gang_sheets" ? staffListTab : activeScheduleTab,
        showId,
        requestId: null,
      });
    },
    [activeScheduleTab, applyShowQueueRoute, queueSurface, staffListTab],
  );

  const selectedShow = useMemo(
    () => shows.find((show) => show.id === selectedShowId) ?? null,
    [selectedShowId, shows],
  );

  const openEditShowModal = useCallback(() => {
    if (!selectedShow || !isWhatnotQueueSurfaceShow(selectedShow)) {
      return;
    }
    setActionError(null);
    setEditForm({
      whatnotUrl: selectedShow.whatnotUrl ?? "",
      title: selectedShow.title ?? "",
      scheduledStartAtInput: formatTimestampForDateTimeInput(selectedShow.scheduledStartAt),
      notes: selectedShow.notes ?? "",
    });
    setIsEditModalOpen(true);
  }, [selectedShow]);

  const closeEditShowModal = useCallback(() => {
    setIsEditModalOpen(false);
    setIsSavingShowEdit(false);
    setActionError(null);
  }, []);

  const showDetailOverflowMenuItems = useMemo((): DangerOverflowMenuItem[] => {
    const items: DangerOverflowMenuItem[] = [];

    if (
      user &&
      selectedShow &&
      permissionService.canEditUpcomingShowMetadata(user) &&
      isWhatnotQueueSurfaceShow(selectedShow)
    ) {
      items.push({
        id: "edit-show",
        label: "Edit show…",
        danger: false,
        onSelect: openEditShowModal,
      });
    }

    if (user && permissionService.canDeleteEligibleUpcomingShow(user)) {
      items.push({
        id: "delete-show",
        label: "Delete show…",
        onSelect: () => setIsDeletionDialogOpen(true),
      });
    }

    return items;
  }, [openEditShowModal, selectedShow, user]);

  const isSelectedStaffGangSheet = Boolean(selectedShow && isStaffGangSheetShow(selectedShow));
  const canManageSelectedStaffGangSheet = Boolean(
    user &&
      selectedShow &&
      isStaffGangSheetShow(selectedShow) &&
      permissionService.canManageStaffGangSheetShow(user, selectedShow),
  );
  const isSelectedShowPast = useMemo(
    () =>
      selectedShow && !isStaffGangSheetShow(selectedShow)
        ? isShowQueuePastReadOnlyShow(selectedShow, scheduleNow)
        : false,
    [scheduleNow, selectedShow],
  );
  const selectedShowQueueTab = useMemo((): WhatnotShowQueueTab | null => {
    if (!selectedShow || isStaffGangSheetShow(selectedShow) || !isWhatnotQueueSurfaceShow(selectedShow)) {
      return null;
    }
    return getWhatnotShowQueueTab(selectedShow, scheduleNow);
  }, [scheduleNow, selectedShow]);
  const selectedShowAllocationBlockReason = useMemo(() => {
    if (!selectedShow) {
      return null;
    }
    return getShowAllocationBlockReason(
      {
        scheduledStartAt: selectedShow.scheduledStartAt,
        productionStatus: selectedShow.productionStatus,
        maxTotalQuantity: selectedShow.maxTotalQuantity,
        allocatedQuantity: selectedShow.allocatedQuantity,
      },
      scheduleNow,
    );
  }, [scheduleNow, selectedShow]);
  const canAddPrintRequestToSelectedShow = selectedShowAllocationBlockReason === null;
  const canShowAddRequestAction = canEnableAddRequestAction({
    isStaffGangSheet: isSelectedStaffGangSheet,
    canManageUpcomingShows: Boolean(user && permissionService.canManageUpcomingShows(user)),
    canManageStaffGangSheet: canManageSelectedStaffGangSheet,
    allocationBlocked: !canAddPrintRequestToSelectedShow,
  });
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
  const attachedRequestIds = useMemo(
    () => [...new Set(allocations.map((allocation) => allocation.printRequestId))],
    [allocations],
  );
  const {
    requests,
    summariesByRequestId,
    hasMore: hasMoreShowQueueRequests,
    isLoadingMore: isLoadingMoreShowQueueRequests,
    loadMore: loadMoreShowQueueRequests,
  } = useShowQueuePrintRequests(attachedRequestIds);

  useEffect(() => {
    if (!highlightedRequestIdParam || requestGroups.length === 0) {
      return;
    }

    const hasTarget = requestGroups.some((group) => group.printRequestId === highlightedRequestIdParam);
    if (!hasTarget) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-print-request-id="${CSS.escape(highlightedRequestIdParam)}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [highlightedRequestIdParam, requestGroups, selectedShowId]);

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
  const hasExportableAllocationsForSelectedShow = useMemo(
    () =>
      selectedShow
        ? hasShowExportableAllocations({
            allocatedQuantity: selectedShow.allocatedQuantity ?? 0,
            allocations,
            show: selectedShow,
            now: scheduleNow,
          })
        : false,
    [allocations, scheduleNow, selectedShow],
  );

  const handleProductionTimerUpdated = useCallback(async () => {
    await Promise.all([reloadUpcomingShows(), reloadAllocations()]);
  }, [reloadAllocations, reloadUpcomingShows]);

  const handleRecoveryCompleted = useCallback(async () => {
    await Promise.all([reloadUpcomingShows(), reloadAllocations()]);
  }, [reloadAllocations, reloadUpcomingShows]);

  const handleRefreshShowQueue = useCallback(async () => {
    if (isManualRefreshing) {
      return;
    }

    setIsManualRefreshing(true);
    setActionError(null);

    try {
      clearPrintRequestsPageCache();
      const reloadTasks: Promise<unknown>[] = [
        reloadUpcomingShows({ silent: true }),
        reloadAllocationTotals({ silent: true }),
      ];
      if (selectedShowId) {
        reloadTasks.push(reloadAllocations());
      }
      await Promise.all(reloadTasks);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to refresh Show Queue.");
    } finally {
      setIsManualRefreshing(false);
    }
  }, [
    isManualRefreshing,
    reloadAllocationTotals,
    reloadAllocations,
    reloadUpcomingShows,
    selectedShowId,
  ]);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: queueSurface === "staff_gang_sheets" ? "Internal Sheets" : "Show Queue",
        actions: permissionService.canViewUpcomingShows(user)
          ? [
              {
                icon: <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />,
                label: isManualRefreshing ? "Refreshing…" : "Refresh",
                onClick: () => {
                  void handleRefreshShowQueue();
                },
              },
              ...(queueSurface === "shows" && permissionService.canManageUpcomingShows(user)
                ? [
                    ...(permissionService.canImportWhatnotShows(user)
                      ? [
                          {
                            icon: <Upload aria-hidden="true" size={16} strokeWidth={2} />,
                            label: "Import Shows",
                            onClick: openWhatnotImportWindow,
                          },
                        ]
                      : []),
                    ...(permissionService.canManageShowQueueSettings(user)
                      ? [
                          {
                            icon: <Settings aria-hidden="true" size={16} strokeWidth={2} />,
                            label: "Settings",
                            onClick: openSettingsModal,
                          },
                        ]
                      : []),
                  ]
                : []),
            ]
          : null,
        primaryAction:
          queueSurface === "shows" && permissionService.canManageUpcomingShows(user)
            ? {
                icon: <Plus aria-hidden="true" size={16} strokeWidth={2} />,
                label: "Add show",
                onClick: openCreateModal,
              }
            : queueSurface === "staff_gang_sheets" && canCreateStaffGangSheet
              ? {
                  icon: <Plus aria-hidden="true" size={16} strokeWidth={2} />,
                  label: "Create Internal Gang Sheet",
                  onClick: () => {
                    setActionError(null);
                    setIsCreateStaffLaneModalOpen(true);
                  },
                }
              : null,
      }),
      [
        canCreateStaffGangSheet,
        handleRefreshShowQueue,
        isManualRefreshing,
        openCreateModal,
        openWhatnotImportWindow,
        openSettingsModal,
        queueSurface,
        user,
      ],
    ),
  );

  const productionTimer = useShowProductionTimer({
    show: selectedShow,
    hasActiveAllocations: hasActiveAllocationsForSelectedShow,
    now: scheduleNow,
    onShowUpdated: handleProductionTimerUpdated,
  });
  const stalePrintingReconciliation = useStalePastPrintingShowReconciliation(surfaceShows, scheduleNow);
  const emptyPastShowReconciliation = useEmptyPastShowReconciliation(
    surfaceShows,
    scheduleNow,
    handleProductionTimerUpdated,
  );

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMultiplyByQuantity, setExportMultiplyByQuantity] = useState(false);
  const exportShowZipState = useExportShowZip();

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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
      exportShowZipState.reset();
      setExportMultiplyByQuantity(multiplyByQuantity);
      setIsExportModalOpen(true);
      setIsExportMenuOpen(false);
    },
    [exportShowZipState],
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
  const [gangSheetModalLayoutMode, setGangSheetModalLayoutMode] =
    useState<GangSheetLayoutMode>("efficiency");
  const [gangSheetSheetCountPreview, setGangSheetSheetCountPreview] =
    useState<GangSheetSheetCountPreview | null>(null);
  const [isPreparingGangSheetModal, setIsPreparingGangSheetModal] = useState(false);
  const gangSheetModalPrepareIdRef = useRef(0);
  const exportGangSheetPngState = useExportGangSheetPng();
  const {
    prepareGangSheetModal: prepareGangSheetModalData,
    hydrateCacheForLayoutMode: hydrateGangSheetCacheForLayoutMode,
    refreshCacheStatus: refreshGangSheetCacheStatus,
    reset: resetGangSheetExport,
  } = exportGangSheetPngState;
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

  useEffect(() => {
    void refreshSelectedShowGangSheetCache({
      show: selectedShow,
      selectedShowId,
      settings: gangSheetLayoutSettings,
      reset: resetGangSheetExport,
      refresh: refreshGangSheetCacheStatus,
    });
  }, [
    gangSheetLayoutSettings,
    refreshGangSheetCacheStatus,
    resetGangSheetExport,
    selectedShow,
    selectedShowId,
  ]);

  const openExportGangSheetModal = useCallback(
    (layoutMode: GangSheetLayoutMode) => {
      if (!selectedShow) {
        return;
      }

      const prepareId = gangSheetModalPrepareIdRef.current + 1;
      gangSheetModalPrepareIdRef.current = prepareId;

      setGangSheetModalLayoutMode(layoutMode);
      setGangSheetSheetCountPreview(null);
      setIsPreparingGangSheetModal(true);
      setIsExportGangSheetModalOpen(true);

      void prepareGangSheetModalData(selectedShow, gangSheetLayoutSettings, layoutMode)
        .then((result) => {
          if (prepareId !== gangSheetModalPrepareIdRef.current) {
            return;
          }

          if (result.error) {
            setGangSheetSheetCountPreview(null);
            return;
          }

          setGangSheetSheetCountPreview(result.preview);
        })
        .finally(() => {
          if (prepareId === gangSheetModalPrepareIdRef.current) {
            setIsPreparingGangSheetModal(false);
          }
        });
    },
    [gangSheetLayoutSettings, prepareGangSheetModalData, selectedShow],
  );

  const handleGangSheetLayoutModeChange = useCallback(
    (layoutMode: GangSheetLayoutMode) => {
      if (layoutMode === gangSheetModalLayoutMode) {
        return;
      }

      if (!selectedShow) {
        setGangSheetModalLayoutMode(layoutMode);
        return;
      }

      if (exportGangSheetPngState.hasGeneratedCacheForMode(layoutMode)) {
        setGangSheetModalLayoutMode(layoutMode);
        return;
      }

      const prepareId = gangSheetModalPrepareIdRef.current + 1;
      gangSheetModalPrepareIdRef.current = prepareId;
      setIsPreparingGangSheetModal(true);
      setGangSheetModalLayoutMode(layoutMode);

      void hydrateGangSheetCacheForLayoutMode(selectedShow, gangSheetLayoutSettings, layoutMode).finally(() => {
        if (prepareId === gangSheetModalPrepareIdRef.current) {
          setIsPreparingGangSheetModal(false);
        }
      });
    },
    [
      exportGangSheetPngState,
      gangSheetLayoutSettings,
      gangSheetModalLayoutMode,
      hydrateGangSheetCacheForLayoutMode,
      selectedShow,
    ],
  );

  const closeExportGangSheetModal = useCallback(() => {
    gangSheetModalPrepareIdRef.current += 1;
    setIsExportGangSheetModalOpen(false);
    setGangSheetSheetCountPreview(null);
    setIsPreparingGangSheetModal(false);
  }, []);

  const handleGenerateGangSheet = useCallback(() => {
    if (selectedShow) {
      void exportGangSheetPngState.generateGangSheet(
        selectedShow,
        gangSheetLayoutSettings,
        gangSheetModalLayoutMode,
      );
    }
  }, [
    exportGangSheetPngState,
    gangSheetLayoutSettings,
    gangSheetModalLayoutMode,
    selectedShow,
  ]);

  const handleExportCachedGangSheets = useCallback(() => {
    void exportGangSheetPngState.exportCachedGangSheets();
  }, [exportGangSheetPngState]);

  const isDevFixtureCreateIntent = useMemo(() => {
    const trimmedUrl = createForm.whatnotUrl.trim();
    if (!isDevOverrideShowUrlSentinel(trimmedUrl)) {
      return false;
    }
    return isDevFixtureShowOperationAllowedForStudio();
  }, [createForm.whatnotUrl]);

  const parsedShow = useMemo(() => {
    if (isDevFixtureCreateIntent) {
      return undefined;
    }
    return parseWhatnotShowUrl(createForm.whatnotUrl);
  }, [createForm.whatnotUrl, isDevFixtureCreateIntent]);
  const scheduledStartAt = parseDateTimeInputToTimestamp(createForm.scheduledStartAtInput);
  const isCreateSubmitDisabled = isDevFixtureCreateIntent
    ? !scheduledStartAt
    : !parsedShow || !scheduledStartAt;

  const isEditingDevFixtureShow = Boolean(
    selectedShow && isDevFixtureShow(selectedShow),
  );
  const editParsedShow = useMemo(() => {
    if (isEditingDevFixtureShow) {
      return undefined;
    }
    return parseWhatnotShowUrl(editForm.whatnotUrl);
  }, [editForm.whatnotUrl, isEditingDevFixtureShow]);
  const editScheduledStartAt = parseDateTimeInputToTimestamp(editForm.scheduledStartAtInput);
  const isEditSubmitDisabled = isEditingDevFixtureShow
    ? !editScheduledStartAt
    : !editParsedShow || !editScheduledStartAt;

  async function handleCreateShow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreatingShow) {
      return;
    }

    if (!user || !permissionService.canManageUpcomingShows(user) || !scheduledStartAt) {
      return;
    }

    if (isDevFixtureCreateIntent) {
      if (!isDevFixtureShowOperationAllowedForStudio()) {
        setActionError("DEV-OVERRIDE is only available on fresh-prints-dev in a development build.");
        return;
      }

      try {
        setIsCreatingShow(true);
        setActionError(null);
        const result = await upcomingShowService.upsertDevFixtureShow(user, {
          title: createForm.title.trim() || undefined,
          scheduledStartAt,
          notes: createForm.notes.trim() || undefined,
        });

        setSuccessMessage(`Show "${formatUpcomingShowTitle(result)}" created.`);
        setSuccessAlertSeed((current) => current + 1);
        closeCreateModal();
        await reloadUpcomingShows();
        applyShowQueueRoute({
          showId: result.id,
          tab: getWhatnotShowQueueTab(result, scheduleNow),
        });
      } catch (error) {
        setActionError(formatWriteErrorMessage(error));
      } finally {
        setIsCreatingShow(false);
      }
      return;
    }

    if (!parsedShow) {
      return;
    }

    try {
      setIsCreatingShow(true);
      setActionError(null);
      const result = await upcomingShowService.upsertUpcomingShow(user, {
        source: "whatnot",
        whatnotShowId: parsedShow.whatnotShowId,
        whatnotUrl: parsedShow.whatnotUrl,
        title: createForm.title.trim() || undefined,
        scheduledStartAt,
        notes: createForm.notes.trim() || undefined,
      });

      setSuccessMessage(`Show "${formatUpcomingShowTitle(result)}" created.`);
      setSuccessAlertSeed((current) => current + 1);
      closeCreateModal();
      await reloadUpcomingShows();
      applyShowQueueRoute({
        showId: result.id,
        tab: getWhatnotShowQueueTab(result, scheduleNow),
      });
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    } finally {
      setIsCreatingShow(false);
    }
  }

  async function handleSaveShowEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSavingShowEdit || !user || !selectedShow || !editScheduledStartAt) {
      return;
    }
    if (!permissionService.canEditUpcomingShowMetadata(user)) {
      setActionError("Only owners can edit show details.");
      return;
    }
    if (!isWhatnotQueueSurfaceShow(selectedShow)) {
      return;
    }
    if (!isEditingDevFixtureShow && editParsedShow && editParsedShow.whatnotShowId !== selectedShow.whatnotShowId) {
      setActionError("Whatnot URL must refer to the same show ID as this record.");
      return;
    }

    try {
      setIsSavingShowEdit(true);
      setActionError(null);
      const result = await upcomingShowService.updateUpcomingShowMetadata(user, selectedShow.id, {
        title: editForm.title.trim() || undefined,
        scheduledStartAt: editScheduledStartAt,
        notes: editForm.notes.trim() || undefined,
        whatnotUrl: isEditingDevFixtureShow ? undefined : editForm.whatnotUrl.trim() || undefined,
      });

      setSuccessMessage(`Show "${formatUpcomingShowTitle(result)}" updated.`);
      setSuccessAlertSeed((current) => current + 1);
      closeEditShowModal();
      setScheduleNow(new Date());
      await reloadUpcomingShows();
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    } finally {
      setIsSavingShowEdit(false);
    }
  }

  const parsedWhatnotBaseUrl = parseWhatnotShowBaseUrl(whatnotBaseUrlInput);
  const isWhatnotBaseUrlValid = whatnotBaseUrlInput.trim() === "" || Boolean(parsedWhatnotBaseUrl);
  const parsedPortalCutoffHours = Number(portalCutoffHoursInput.trim());
  const isPortalCutoffHoursValid =
    portalCutoffHoursInput.trim() !== "" &&
    Number.isInteger(parsedPortalCutoffHours) &&
    parsedPortalCutoffHours >= MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START &&
    parsedPortalCutoffHours <= MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START;
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
      !permissionService.canManageShowQueueSettings(user) ||
      !isWhatnotBaseUrlValid ||
      !isPortalCutoffHoursValid ||
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
        portalQueueCutoffHoursBeforeStart: parsedPortalCutoffHours,
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

  const selectedShowDisplayAllocatedQuantity = useMemo(() => {
    if (!selectedShow) {
      return 0;
    }

    return resolveShowDisplayAllocatedQuantity({
      show: selectedShow,
      allocations,
      now: scheduleNow,
    });
  }, [allocations, scheduleNow, selectedShow]);

  const capacity = selectedShow
    ? assessShowCapacity({
        maxTotalQuantity: selectedShow.maxTotalQuantity,
        allocatedQuantity: selectedShowDisplayAllocatedQuantity,
      })
    : null;
  const selectedShowStatusDisplay = useMemo(() => {
    if (!selectedShow || !capacity) {
      return null;
    }

    return getDerivedShowStatusDisplay(selectedShow.productionStatus, capacity, {
      isPastScheduled: isPastScheduledShow(selectedShow, scheduleNow),
      productionResolutionKind: selectedShow.productionResolutionKind,
    });
  }, [capacity, scheduleNow, selectedShow]);

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
    if (!canShowAddRequestAction) {
      return;
    }

    setActionError(null);
    setAddRequestId("");
    setIsAddRequestModalOpen(true);
  }, [canShowAddRequestAction]);

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

  const requestOptions = useMemo(() => {
    const options = buildShowQueuePrintRequestOptions({
      requests,
      summariesByRequestId,
      allocationTotalsByRequestId,
      requestIdsAlreadyOnShow: printRequestIdsAlreadyOnSelectedShow,
    });
    if (!selectedShow) {
      return options;
    }

    // Preserve placeholder (value ""); filter by show-source ↔ request-origin eligibility.
    return options.filter((option) => {
      if (option.value === "") {
        return true;
      }
      if (printRequestIdsAlreadyOnSelectedShow.has(option.value)) {
        return false;
      }
      const request = requests.find((candidate) => candidate.id === option.value);
      if (!request) {
        return false;
      }
      return canAllocateOriginToShowSource({
        source: selectedShow.source,
        requestOrigin: request.requestOrigin,
        isInternal: request.isInternal,
      });
    });
  }, [
    allocationTotalsByRequestId,
    printRequestIdsAlreadyOnSelectedShow,
    requests,
    selectedShow,
    summariesByRequestId,
  ]);

  const staffAddRequestEmptyMessage = useMemo(() => {
    if (!selectedShow || !isStaffGangSheetShow(selectedShow)) {
      return null;
    }
    const eligibleCount = requestOptions.filter((option) => option.value !== "").length;
    return eligibleCount === 0
      ? "No eligible Internal print requests. Only Internal requests can be added to Internal Gangsheets."
      : null;
  }, [requestOptions, selectedShow]);

  async function handleRemoveRequestFromShow(printRequestId: string) {
    if (!user || !selectedShow || !permissionService.canManageUpcomingShows(user)) {
      return;
    }

    try {
      setActionError(null);
      await upcomingShowService.removeShowAllocationsForRequest(user, selectedShow.id, printRequestId);
      setConfirmingRemoveRequestId(null);
      // Print Requests list is query/`queueTab`-cached; clear so Queued→Working is fresh on return.
      clearPrintRequestsPageCache();
      await Promise.all([reloadUpcomingShows(), reloadAllocations()]);
    } catch (error) {
      setActionError(formatWriteErrorMessage(error));
    }
  }

  const renderShowRailCard = useCallback(
    (show: UpcomingShow, isPastScheduled: boolean) => {
      const isSelected = show.id === selectedShowId;
      const showCapacity = assessShowCapacity({
        maxTotalQuantity: show.maxTotalQuantity,
        allocatedQuantity: show.allocatedQuantity,
      });
      const showStatusDisplay = getDerivedShowStatusDisplay(show.productionStatus, showCapacity, {
        isPastScheduled,
        productionResolutionKind: show.productionResolutionKind,
      });
      const cardStateClass =
        queueSurface === "staff_gang_sheets"
          ? ""
          : showCapacity.isOverCapacity
            ? " is-over-capacity"
            : showCapacity.isFull
              ? " is-full"
              : "";

      return (
        <button
          className={`print-requests-request-card${isSelected ? " is-selected" : ""}${cardStateClass}`}
          data-upcoming-show-id={show.id}
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
            {queueSurface === "staff_gang_sheets"
              ? isStaffGangSheetShow(show)
                ? `Shared · Cycle ${show.staffGangSheetCycleNumber}`
                : "Internal Gang Sheet"
              : formatUpcomingShowTimestampLabel(show.scheduledStartAt)}
          </p>
        </button>
      );
    },
    [handleSelectShow, queueSurface, selectedShowId],
  );

  const renderShowRailPane = useCallback(
    (tabShows: UpcomingShow[], emptyTitle: string, emptyMessage: string, isPastScheduled: boolean) => (
      <div className="print-requests-rail-list-pane">
        {tabShows.length === 0 ? (
          <EmptyState message={emptyMessage} title={emptyTitle} />
        ) : (
          tabShows.map((show) => renderShowRailCard(show, isPastScheduled))
        )}
      </div>
    ),
    [renderShowRailCard],
  );

  return (
    <main className="page-layout page-layout-shell upcoming-shows-page">
      {loadError ? <ErrorState message={loadError} title="Unable to load the show queue" /> : null}
      {successMessage ? (
        <DismissibleSuccessAlert
          key={`${successAlertSeed}-${successMessage}`}
          message={successMessage}
          onDismiss={dismissSuccessMessage}
        />
      ) : null}

      <div className="print-requests-layout upcoming-shows-layout">
        <aside className="print-requests-rail">
          <div className="print-requests-tab-bar">
            {queueSurface === "staff_gang_sheets"
              ? (["current", "history"] as const).map((tab) => (
                  <button
                    className={`print-requests-tab-button${staffListTab === tab ? " is-active" : ""}`}
                    key={tab}
                    onClick={() => handleStaffListTabChange(tab)}
                    type="button"
                  >
                    {tab === "current" ? "Current" : "History"} ({staffShowsByListTab[tab].length})
                  </button>
                ))
              : (["upcoming", "needs_attention", "past"] as const).map((tab) => (
                  <button
                    className={`print-requests-tab-button${activeScheduleTab === tab ? " is-active" : ""}`}
                    key={tab}
                    onClick={() => handleScheduleTabChange(tab)}
                    type="button"
                  >
                    {tab === "upcoming"
                      ? "Upcoming"
                      : tab === "needs_attention"
                        ? "Needs Attention"
                        : "Past"} ({showsByScheduleTab[tab].length})
                  </button>
                ))}
          </div>
          <div className="print-requests-rail-list">
            {isLoading ? (
              <div className="print-requests-loading">
                <LoadingSpinner label="Loading shows" />
              </div>
            ) : (
              renderShowRailPane(
                visibleShows,
                railEmptyState.title,
                railEmptyState.message,
                railEmptyState.isPastScheduled,
              )
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
                message={
                  queueSurface === "staff_gang_sheets"
                    ? "Select an Internal Gang Sheet from the list, or create one if none exist yet."
                    : "Select a show from the queue or add a new one."
                }
                title={
                  queueSurface === "staff_gang_sheets" ? "No Internal Gang Sheet selected" : "No show selected"
                }
              />
            </Card>
          ) : (
            <>
              <Card className="print-requests-card print-requests-detail-card">
                <div className="print-requests-detail-header show-detail-header">
                  <div className="print-requests-detail-copy">
                    <p className="eyebrow">{isSelectedStaffGangSheet ? "Internal Gang Sheet" : "Show detail"}</p>
                    <h2>{formatUpcomingShowTitle(selectedShow)}</h2>
                    {isSelectedStaffGangSheet ? (
                      <p className="print-requests-detail-timestamps">
                        {isStaffGangSheetShow(selectedShow)
                          ? `Shared · Cycle ${selectedShow.staffGangSheetCycleNumber}`
                          : null}
                      </p>
                    ) : (
                      <p className="print-requests-detail-timestamps">
                        Scheduled {formatUpcomingShowTimestampLabel(selectedShow.scheduledStartAt)}
                      </p>
                    )}
                  </div>
                  {(isSelectedStaffGangSheet
                    ? canManageSelectedStaffGangSheet
                    : permissionService.canManageUpcomingShows(user)) ? (
                    <div className="print-requests-detail-actions show-detail-header-actions">
                      <div className="export-menu-shell" ref={exportMenuRef}>
                        <Button
                          aria-controls="export-menu"
                          aria-expanded={isExportMenuOpen}
                          aria-haspopup="menu"
                          className="button-leading-icon"
                          disabled={!hasExportableAllocationsForSelectedShow}
                          onClick={() => setIsExportMenuOpen((current) => !current)}
                          size="sm"
                          variant="secondary"
                          title={
                            hasExportableAllocationsForSelectedShow
                              ? undefined
                              : "Add a print request to this show before exporting."
                          }
                        >
                          <Download aria-hidden="true" size={16} strokeWidth={2} />
                          Export Images
                          <ChevronDown aria-hidden="true" size={14} strokeWidth={2.4} />
                        </Button>

                        {isExportMenuOpen ? (
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

                      <GangSheetLayoutModeMenu
                        disabled={!hasExportableAllocationsForSelectedShow}
                        isBusy={exportGangSheetPngState.isGenerating}
                        label="Generate"
                        menuId="gang-sheet-generate-menu"
                        onSelect={openExportGangSheetModal}
                        title={
                          hasExportableAllocationsForSelectedShow
                            ? undefined
                            : "Add a print request to this show before exporting."
                        }
                      />
                      {isSelectedStaffGangSheet &&
                      canManageSelectedStaffGangSheet &&
                      isCurrentStaffGangSheetProductionStatus(selectedShow.productionStatus) ? (
                        <Button
                          disabled={isCompletingStaffGangSheet || !hasActiveAllocationsForSelectedShow}
                          onClick={() => setCompleteConfirmKind("staff_complete")}
                          size="sm"
                          title={
                            hasActiveAllocationsForSelectedShow
                              ? undefined
                              : "Add at least one print request before marking complete."
                          }
                          variant="primary"
                        >
                          Mark Complete
                        </Button>
                      ) : null}
                      {showDetailOverflowMenuItems.length > 0 ? (
                        <DangerOverflowMenu
                          ariaLabel="Show actions"
                          items={showDetailOverflowMenuItems}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="show-detail-pill-row">
                  {!isSelectedStaffGangSheet &&
                  shouldShowUpcomingShowScheduleStatusBadge(selectedShow, new Date()) ? (
                    <Badge variant={getUpcomingShowStatusBadgeVariant(selectedShow.status)}>
                      {selectedShow.status}
                    </Badge>
                  ) : null}
                  {selectedShowStatusDisplay ? (
                    <Badge variant={selectedShowStatusDisplay.variant}>{selectedShowStatusDisplay.label}</Badge>
                  ) : null}
                </div>

                {!isSelectedStaffGangSheet && selectedShow ? (
                  <NeedsAttentionShowPanel
                    allocations={allocations}
                    canManage={Boolean(user && permissionService.canManageUpcomingShows(user))}
                    isOwner={Boolean(user && permissionService.isOwner(user))}
                    now={scheduleNow}
                    onOpenDidNotPrint={() => setIsDidNotPrintDialogOpen(true)}
                    onOpenOwnerOverride={() => setIsOwnerOverrideDialogOpen(true)}
                    onSelectRecoveryAction={(action) => setRecoveryDialogAction(action)}
                    show={selectedShow}
                  />
                ) : null}

                {!isSelectedStaffGangSheet && permissionService.canManageUpcomingShows(user) ? (
                  <Card
                    className={[
                      "show-production-timer-card",
                      productionTimer.isFinished
                        ? "is-finished"
                        : productionTimer.isPaused
                          ? "is-paused"
                          : productionTimer.isPrinting
                            ? "is-live"
                            : "is-idle",
                    ].join(" ")}
                  >
                    <div className="show-production-timer-readout" aria-live="polite">
                      <div className="show-production-timer-label-row">
                        <span
                          aria-hidden="true"
                          className={[
                            "show-production-timer-live-dot",
                            productionTimer.isPrinting ? "is-pulsing" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        />
                        <p className="eyebrow">Live printing</p>
                        <span className="show-production-timer-status-chip">
                          {productionTimer.isFinished
                            ? "Finished"
                            : productionTimer.isPaused
                              ? "Paused"
                              : productionTimer.isPrinting
                                ? "Running"
                                : productionTimer.isPastScheduledShow
                                  ? "Past show"
                                  : "Ready"}
                        </span>
                      </div>
                      <p className="show-production-timer-elapsed">{productionTimer.formattedElapsed}</p>
                    </div>

                    <div className="show-production-timer-side">
                      <p className="show-production-timer-copy">
                        {productionTimer.isFinished
                          ? "This show's printing run is finished."
                          : productionTimer.isPaused
                            ? "Paused — resume when the printer is running again."
                            : productionTimer.isPrinting
                              ? "Customers see this as Printing in the portal."
                              : productionTimer.isPastScheduledShow
                                ? selectedShowQueueTab === "needs_attention"
                                  ? "Scheduled time has passed. Resolve production using the Needs Attention actions below."
                                  : PAST_SHOW_EXPORT_COPY
                                : "Start when the printer begins. Exporting does not start the timer."}
                      </p>
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
                            disabled={
                              productionTimer.isActionPending || !hasActiveAllocationsForSelectedShow
                            }
                            onClick={() => setCompleteConfirmKind("show_finished")}
                            size="sm"
                            title={
                              hasActiveAllocationsForSelectedShow
                                ? undefined
                                : "Add at least one print request before marking finished."
                            }
                            variant="secondary"
                          >
                            Mark {productionTimer.isPastScheduledShow ? "Complete" : "finished"}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {productionTimer.actionError ? (
                      <p className="print-requests-error show-production-timer-error" role="alert">
                        {productionTimer.actionError}
                      </p>
                    ) : stalePrintingReconciliation.error ? (
                      <p className="print-requests-error show-production-timer-error" role="alert">
                        {stalePrintingReconciliation.error}
                      </p>
                    ) : emptyPastShowReconciliation.error ? (
                      <p className="print-requests-error show-production-timer-error" role="alert">
                        {emptyPastShowReconciliation.error}
                      </p>
                    ) : null}
                    {productionTimer.reconciliationRetryUiState !== "none" ? (
                      <div role="status">
                        <p className="show-production-timer-copy">
                          {productionTimer.reconciliationRetryUiState === "finalizing"
                            ? "Finalizing request updates…"
                            : productionTimer.actionWarning}
                        </p>
                        {productionTimer.reconciliationRetryUiState === "retryable" ? (
                          <Button
                            disabled={productionTimer.retryButtonDisabled}
                            onClick={() => void productionTimer.retryReconciliation()}
                            size="sm"
                            variant="secondary"
                          >
                            {productionTimer.retryButtonLabel}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                ) : null}

                {!isSelectedStaffGangSheet ? (
                <dl className="upcoming-show-detail-facts">
                  <div>
                    <dt>Whatnot show ID</dt>
                    <dd>{formatUpcomingShowWhatnotIdentityLabel(selectedShow)}</dd>
                  </div>
                  <div>
                    <dt>Whatnot URL</dt>
                    <dd>
                      {isDevFixtureShow(selectedShow) ? (
                        "No external Whatnot URL"
                      ) : selectedShow.whatnotUrl ? (
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
                ) : selectedShow.notes ? (
                  <dl className="upcoming-show-detail-facts">
                    <div>
                      <dt>Notes</dt>
                      <dd>{selectedShow.notes}</dd>
                    </div>
                  </dl>
                ) : null}
              </Card>

              <Card
                className={`print-requests-card show-capacity-card${
                  capacity?.isOverCapacity ? " is-over-capacity" : capacity?.isFull ? " is-full" : ""
                }`}
              >
                <div className="print-requests-section-header">
                  <p className="eyebrow">Capacity</p>
                  <Button
                    disabled={
                      (!isSelectedStaffGangSheet && isSelectedShowPast) ||
                      !permissionService.canManageUpcomingShows(user)
                    }
                    onClick={openMaxQuantityModal}
                    size="sm"
                    title={
                      !isSelectedStaffGangSheet && isSelectedShowPast
                        ? PAST_SHOW_READ_ONLY_MESSAGE
                        : undefined
                    }
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
                      <span>{formatShowCapacitySlotLabel(capacity)}</span>
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
                    className={isSelectedStaffGangSheet ? "button-leading-icon" : undefined}
                    disabled={!canShowAddRequestAction}
                    onClick={openAddRequestModal}
                    size="sm"
                    title={
                      selectedShowAllocationBlockReason
                        ? formatShowAllocationBlockedMessage(selectedShowAllocationBlockReason)
                        : isSelectedStaffGangSheet && !canManageSelectedStaffGangSheet
                          ? "You do not have permission to add requests to this Internal Gang Sheet."
                          : undefined
                    }
                    variant="secondary"
                  >
                    {isSelectedStaffGangSheet ? (
                      <Plus aria-hidden="true" size={16} strokeWidth={2} />
                    ) : null}
                    Add Request
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
                      const isHighlighted = highlightedRequestIdParam === group.printRequestId;
                      const requestSummary = summariesByRequestId[group.printRequestId] ?? {
                        totalQuantity: 0,
                        uniqueDesignCount: 0,
                      };
                      const requestAllocationTotals = allocationTotalsByRequestId[group.printRequestId] ?? {
                        totalAllocatedQuantity: 0,
                        totalInProgressQuantity: 0,
                        totalPrintedQuantity: 0,
                      };
                      const matchedRequest = requests.find((request) => request.id === group.printRequestId);
                      const requestTab = resolveShowQueuePrintRequestLinkTab({
                        matchedRequest,
                        totalRequestedQuantity: requestSummary.totalQuantity,
                        totalAllocatedQuantity: requestAllocationTotals.totalAllocatedQuantity,
                        totalInProgressQuantity: requestAllocationTotals.totalInProgressQuantity,
                        totalPrintedQuantity: requestAllocationTotals.totalPrintedQuantity,
                      });
                      const printRequestHref = getPrintRequestsPath({
                        tab: requestTab,
                        requestId: group.printRequestId,
                        kind: matchedRequest
                          ? printRequestListKindFromIsInternal(matchedRequest.isInternal)
                          : undefined,
                      });

                      return (
                        <div
                          className={`show-allocation-row${isHighlighted ? " is-highlighted" : ""}`}
                          data-print-request-id={group.printRequestId}
                          key={group.printRequestId}
                        >
                          <div className="show-allocation-row-copy">
                            <Link className="show-allocation-row-link" to={printRequestHref}>
                              <strong>{group.requestNameSnapshot}</strong>
                              <ExternalLink aria-hidden="true" size={12} strokeWidth={2.2} />
                            </Link>
                            <p>
                              {group.allocations.length} Design{group.allocations.length === 1 ? "" : "s"} |{" "}
                              {totalAllocated} Item{totalAllocated === 1 ? "" : "s"}
                            </p>
                          </div>
                          <div className="show-allocation-row-actions">
                            <Badge variant={getShowAllocationStatusBadgeVariant(group.allocations[0].status)}>
                              {group.allocations[0].status}
                            </Badge>
                            {isConfirmingRemove ? (
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
                              <DangerOverflowMenu
                                ariaLabel={`Actions for ${group.requestNameSnapshot}`}
                                items={[
                                  {
                                    id: "transfer",
                                    danger: false,
                                    label: selectedShow
                                      ? formatPrintRequestShowTransferActionLabel(
                                          resolvePrintRequestShowTransferMode(selectedShow),
                                        )
                                      : "Move to another show",
                                    onSelect: () =>
                                      setTransferRequestContext({
                                        printRequestId: group.printRequestId,
                                        requestNameSnapshot: group.requestNameSnapshot,
                                        transferQuantity: totalAllocated,
                                      }),
                                  },
                                  ...(canRemove
                                    ? [
                                        {
                                          id: "remove",
                                          label: "Remove from show",
                                          onSelect: () =>
                                            setConfirmingRemoveRequestId(group.printRequestId),
                                        },
                                      ]
                                    : []),
                                ]}
                              />
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
                disabled={isCreatingShow}
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
                  {isDevFixtureCreateIntent
                    ? "DEV OVERRIDE — creates a fixture show with no real Whatnot identity."
                    : parsedShow
                      ? `Show ID: ${parsedShow.whatnotShowId}`
                      : isDevOverrideShowUrlSentinel(createForm.whatnotUrl)
                        ? "DEV-OVERRIDE is only available on fresh-prints-dev in a development build."
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
              <Button disabled={isCreatingShow} onClick={closeCreateModal} variant="ghost">
                Cancel
              </Button>
              <Button
                disabled={isCreateSubmitDisabled || isCreatingShow}
                form="create-upcoming-show-form"
                type="submit"
              >
                {isCreatingShow ? "Saving…" : "Save show"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {isEditModalOpen && selectedShow ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="upcoming-show-edit-title"
            className="modal-panel modal-panel-md"
            role="dialog"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Edit show</p>
                <h3 id="upcoming-show-edit-title">{formatUpcomingShowTitle(selectedShow)}</h3>
              </div>
              <button
                aria-label="Close edit show"
                className="icon-button icon-button-md icon-button-ghost"
                disabled={isSavingShowEdit}
                onClick={closeEditShowModal}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <form
                className="print-requests-modal-form"
                id="edit-upcoming-show-form"
                onSubmit={handleSaveShowEdit}
              >
                {isEditingDevFixtureShow ? (
                  <p className="print-requests-modal-hint">
                    DEV OVERRIDE fixture — Whatnot URL and show ID cannot be changed.
                  </p>
                ) : (
                  <>
                    <TextInput
                      label="Whatnot show URL"
                      name="editWhatnotUrl"
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, whatnotUrl: event.target.value }))
                      }
                      placeholder="https://www.whatnot.com/live/..."
                      value={editForm.whatnotUrl}
                    />
                    <p className="print-requests-modal-hint">
                      {editParsedShow
                        ? editParsedShow.whatnotShowId === selectedShow.whatnotShowId
                          ? `Show ID: ${editParsedShow.whatnotShowId}`
                          : "URL must refer to the same show ID as this record."
                        : editForm.whatnotUrl.trim()
                          ? "This does not look like a valid Whatnot live show URL."
                          : "Show ID will appear after a valid Whatnot URL is entered."}
                    </p>
                  </>
                )}
                <TextInput
                  label="Title"
                  name="editTitle"
                  onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                  value={editForm.title}
                />
                <TextInput
                  label="Scheduled date and time"
                  name="editScheduledStartAtInput"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, scheduledStartAtInput: event.target.value }))
                  }
                  type="datetime-local"
                  value={editForm.scheduledStartAtInput}
                />
                <AutoResizeTextarea
                  label="Notes"
                  name="editNotes"
                  onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional planning notes"
                  value={editForm.notes}
                />

                {actionError ? (
                  <p className="auth-message auth-message-error" role="alert">
                    {actionError}
                  </p>
                ) : null}
              </form>
            </ModalBody>
            <ModalFooter>
              <Button disabled={isSavingShowEdit} onClick={closeEditShowModal} variant="ghost">
                Cancel
              </Button>
              <Button
                disabled={isEditSubmitDisabled || isSavingShowEdit}
                form="edit-upcoming-show-form"
                type="submit"
              >
                {isSavingShowEdit ? "Saving…" : "Save changes"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {isCreateStaffLaneModalOpen ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="create-staff-gang-sheet-title"
            className="modal-panel modal-panel-lg create-internal-gang-sheet-modal"
            role="dialog"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Internal Gang Sheets</p>
                <h3 id="create-staff-gang-sheet-title">Create Internal Gang Sheet</h3>
              </div>
              <button
                aria-label="Close Create Internal Gang Sheet"
                className="icon-button icon-button-md icon-button-ghost"
                onClick={() => {
                  setIsCreateStaffLaneModalOpen(false);
                  setActionError(null);
                }}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <form
                className="print-requests-modal-form"
                id="create-staff-gang-sheet-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!user) {
                    return;
                  }
                  void (async () => {
                    try {
                      setActionError(null);
                      const created = await upcomingShowService.createStaffGangSheetLane(user, {
                        staffGangSheetCycleNumber: nextStaffGangSheetCycleNumber,
                      });
                      setIsCreateStaffLaneModalOpen(false);
                      setSuccessMessage(`Created ${formatUpcomingShowTitle(created)}.`);
                      setSuccessAlertSeed((current) => current + 1);
                      await reloadUpcomingShows();
                      applyShowQueueRoute({ tab: "current", showId: created.id, requestId: null });
                    } catch (error) {
                      setActionError(formatWriteErrorMessage(error));
                    }
                  })();
                }}
              >
                <p className="print-requests-modal-hint">
                  Creates shared {formatStaffGangSheetTitle(nextStaffGangSheetCycleNumber)} with
                  capacity 200 (editable) for Studio staff. No Whatnot information is required. After
                  this sheet is open, use Mark Complete to open the next cycle automatically.
                </p>
                {actionError ? (
                  <p className="auth-message auth-message-error" role="alert">
                    {actionError}
                  </p>
                ) : null}
              </form>
            </ModalBody>
            <ModalFooter>
              <Button
                onClick={() => {
                  setIsCreateStaffLaneModalOpen(false);
                  setActionError(null);
                }}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button form="create-staff-gang-sheet-form" type="submit">
                Create Internal Gang Sheet
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
                <h3 id="show-add-request-title">
                  {isSelectedStaffGangSheet
                    ? "Add print request to Internal Gang Sheet"
                    : "Add print request to show"}
                </h3>
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
              {staffAddRequestEmptyMessage ? (
                <p className="print-requests-modal-hint">{staffAddRequestEmptyMessage}</p>
              ) : null}
              {hasMoreShowQueueRequests ? (
                <Button
                  disabled={isLoadingMoreShowQueueRequests}
                  onClick={() => void loadMoreShowQueueRequests()}
                  size="sm"
                  variant="secondary"
                >
                  {isLoadingMoreShowQueueRequests ? "Loading…" : "Load more requests"}
                </Button>
              ) : null}

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
            setSuccessMessage(
              isSelectedStaffGangSheet
                ? "Print request added to Internal Gang Sheet."
                : "Print request added to show.",
            );
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
          generated={exportGangSheetPngState.generated}
          hasGeneratedForLayout={exportGangSheetPngState.hasGeneratedCacheForMode(
            gangSheetModalLayoutMode,
          )}
          layoutMode={gangSheetModalLayoutMode}
          isExporting={exportGangSheetPngState.isExporting}
          isGenerating={exportGangSheetPngState.isGenerating}
          isPreparing={isPreparingGangSheetModal}
          lastSavedPaths={exportGangSheetPngState.lastSavedPaths}
          onClose={closeExportGangSheetModal}
          onDownloadSheet={(sheetIndex) => void exportGangSheetPngState.downloadCachedSheet(sheetIndex)}
          onExport={handleExportCachedGangSheets}
          onGenerate={handleGenerateGangSheet}
          onLayoutModeChange={handleGangSheetLayoutModeChange}
          progress={exportGangSheetPngState.progress}
          sheetCountPreview={gangSheetSheetCountPreview}
          sheets={exportGangSheetPngState.sheets}
          show={selectedShow}
          warnings={exportGangSheetPngState.warnings}
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

                    <div className="show-queue-settings-field">
                      <TextInput
                        label="Portal add-to-show cutoff (hours before start)"
                        min={MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START}
                        max={MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START}
                        name="portalQueueCutoffHoursBeforeStart"
                        onChange={(event) => setPortalCutoffHoursInput(event.target.value)}
                        type="number"
                        value={portalCutoffHoursInput}
                      />
                      <p className="print-requests-modal-hint">
                        {isPortalCutoffHoursValid
                          ? `Portal customers cannot Add to Show within this many hours of show start (default ${DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START}). Example: 5 → 8pm show closes at 3pm. Studio staff can still add after cutoff.`
                          : `Enter a whole number from ${MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START} to ${MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START}.`}
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
                  !isPortalCutoffHoursValid ||
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

      {completeConfirmKind && selectedShow ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="complete-show-confirm-title"
            className="modal-panel modal-panel-md"
            role="dialog"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">
                  {completeConfirmKind === "staff_complete" || productionTimer.isPastScheduledShow
                    ? "Mark complete"
                    : "Mark finished"}
                </p>
                <h3 id="complete-show-confirm-title">
                  {completeConfirmKind === "staff_complete"
                    ? `Mark "${formatUpcomingShowTitle(selectedShow)}" complete?`
                    : productionTimer.isPastScheduledShow
                      ? `Mark "${formatUpcomingShowTitle(selectedShow)}" complete?`
                      : `Mark "${formatUpcomingShowTitle(selectedShow)}" finished?`}
                </h3>
              </div>
              <button
                aria-label="Close confirmation"
                className="icon-button icon-button-md icon-button-ghost"
                disabled={isCompletingStaffGangSheet || productionTimer.isActionPending}
                onClick={() => setCompleteConfirmKind(null)}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>
            <ModalBody>
              <p className="print-requests-modal-hint">
                {completeConfirmKind === "staff_complete"
                  ? "This closes the current Internal Gangsheet and opens the next one. Attached print requests stay on the completed sheet."
                  : "This marks the show as finished for production. You can still review attached requests afterward."}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button
                disabled={isCompletingStaffGangSheet || productionTimer.isActionPending}
                onClick={() => setCompleteConfirmKind(null)}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={isCompletingStaffGangSheet || productionTimer.isActionPending}
                onClick={() => {
                  if (completeConfirmKind === "show_finished") {
                    setCompleteConfirmKind(null);
                    void productionTimer.markFinished();
                    return;
                  }
                  if (!user || !selectedShow) {
                    return;
                  }
                  void (async () => {
                    try {
                      setActionError(null);
                      setIsCompletingStaffGangSheet(true);
                      const result = await upcomingShowService.completeStaffGangSheetAndOpenNext(
                        user,
                        selectedShow.id,
                      );
                      setCompleteConfirmKind(null);
                      setSuccessMessage(
                        result.alreadyCompleted
                          ? `Already completed — opened Internal Gang Sheet #${result.nextCycleNumber}.`
                          : `Completed. Opened Internal Gang Sheet #${result.nextCycleNumber}.`,
                      );
                      setSuccessAlertSeed((current) => current + 1);
                      await reloadUpcomingShows();
                      applyShowQueueRoute({ tab: "current", showId: result.nextShowId, requestId: null });
                    } catch (error) {
                      setActionError(formatWriteErrorMessage(error));
                    } finally {
                      setIsCompletingStaffGangSheet(false);
                    }
                  })();
                }}
                type="button"
                variant="primary"
              >
                {completeConfirmKind === "staff_complete"
                  ? isCompletingStaffGangSheet
                    ? "Completing…"
                    : "Mark Complete"
                  : productionTimer.isActionPending
                    ? "Finishing…"
                    : productionTimer.isPastScheduledShow
                      ? "Mark Complete"
                      : "Mark finished"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      <UpcomingShowDeletionDialog
        isOpen={isDeletionDialogOpen}
        onCancel={() => setIsDeletionDialogOpen(false)}
        onCompleted={(message) => {
          setIsDeletionDialogOpen(false);
          setSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
          applyShowQueueRoute({
            showId: null,
            requestId: null,
            tab: queueSurface === "staff_gang_sheets" ? staffListTab : activeScheduleTab,
          });
          void reloadUpcomingShows();
        }}
        showLabel={selectedShow ? formatUpcomingShowTitle(selectedShow) : "Show"}
        upcomingShowId={selectedShow?.id ?? null}
      />

      <DidNotPrintRecoveryDialog
        allocations={allocations}
        isOpen={isDidNotPrintDialogOpen}
        now={scheduleNow}
        onCancel={() => setIsDidNotPrintDialogOpen(false)}
        onCompleted={(message) => {
          setIsDidNotPrintDialogOpen(false);
          setSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
          clearPrintRequestsPageCache();
          void handleRecoveryCompleted();
        }}
        onReleaseOnly={() => {
          setIsDidNotPrintDialogOpen(false);
          setRecoveryDialogAction("release_unfulfilled");
        }}
        show={selectedShow}
        showLabel={selectedShow ? formatUpcomingShowTitle(selectedShow) : "Show"}
        upcomingShowId={selectedShow?.id ?? null}
      />

      <ShowProductionRecoveryDialog
        action={recoveryDialogAction}
        allocations={allocations}
        isOpen={recoveryDialogAction !== null}
        now={scheduleNow}
        onCancel={() => setRecoveryDialogAction(null)}
        onCompleted={(message) => {
          setRecoveryDialogAction(null);
          setSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
          clearPrintRequestsPageCache();
          void handleRecoveryCompleted();
        }}
        show={selectedShow}
        showLabel={selectedShow ? formatUpcomingShowTitle(selectedShow) : "Show"}
        upcomingShowId={selectedShow?.id ?? null}
      />

      <OwnerShowProductionOverrideDialog
        allocations={allocations}
        isOpen={isOwnerOverrideDialogOpen}
        now={scheduleNow}
        onCancel={() => setIsOwnerOverrideDialogOpen(false)}
        onCompleted={(message) => {
          setIsOwnerOverrideDialogOpen(false);
          setSuccessMessage(message);
          setSuccessAlertSeed((current) => current + 1);
          clearPrintRequestsPageCache();
          void handleRecoveryCompleted();
        }}
        show={selectedShow}
        showLabel={selectedShow ? formatUpcomingShowTitle(selectedShow) : "Show"}
        upcomingShowId={selectedShow?.id ?? null}
      />

      {transferRequestContext && selectedShow ? (() => {
        const matchedRequest =
          requests.find((request) => request.id === transferRequestContext.printRequestId) ?? {
            id: transferRequestContext.printRequestId,
            name: transferRequestContext.requestNameSnapshot,
          };

        return (
          <TransferPrintRequestToShowModal
            onClose={() => setTransferRequestContext(null)}
            onTransferred={async () => {
              setTransferRequestContext(null);
              clearPrintRequestsPageCache();
              setSuccessMessage(
                selectedShow && resolvePrintRequestShowTransferMode(selectedShow) === "copy"
                  ? "Request copied to the selected show."
                  : "Request moved to the selected show.",
              );
              setSuccessAlertSeed((current) => current + 1);
              await Promise.all([reloadUpcomingShows(), reloadAllocations()]);
            }}
            printRequest={matchedRequest}
            sourceShow={selectedShow}
            transferQuantity={transferRequestContext.transferQuantity}
          />
        );
      })() : null}
    </main>
  );
}
