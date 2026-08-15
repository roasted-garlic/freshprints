import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { useAuth } from "../../auth/hooks/useAuth";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import { useUpcomingShows } from "../../upcoming-shows/hooks/useUpcomingShows";
import {
  filterShowsAvailableForAllocation,
  isPastScheduledShow,
} from "../../upcoming-shows/utils/groupShowsByUpcomingPast";
import { ShowPicker, SHOW_CAPACITY_BAR_ANIMATION_MS, buildShowPickerOptions } from "@fresh-prints/show-picker";
import "@fresh-prints/show-picker/show-picker.css";
import type { Design } from "../../designs/types/design.types";
import { SplitDesignPickerModal } from "./SplitDesignPickerModal";
import { assessShowCapacity, planAllocationSplit } from "@fresh-prints/shared/utils/showCapacity";
import {
  formatShowCapacitySlotLabel,
  getCapacityFillLevel,
  getShowCapacityPercent,
} from "@fresh-prints/shared/utils/showCapacityDisplay";
import {
  canAcceptNewShowAllocations,
  formatShowAllocationBlockedMessage,
  getShowAllocationBlockReason,
  SHOW_QUEUE_FULL_MESSAGE,
} from "@fresh-prints/shared/utils/showAllocationEligibility";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import { formatPrintRequestAllocationSummary } from "@fresh-prints/shared/utils/printRequestSummaryCopy";
import {
  formatSplitNeededWarning,
  shouldShowRemainingWording,
  type SplitPickerQuantities,
} from "@fresh-prints/shared/utils/printRequestSplitAllocation";
import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { canAllocateOriginToShowSource, formatStaffGangSheetTitle, isStaffGangSheetActiveProductionStatus } from "@fresh-prints/shared/utils/staffGangSheet";
import { isStaffGangSheetShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

interface AddToShowModalProps {
  printRequest: PrintRequest;
  items: PrintRequestItem[];
  designById?: Map<string, Design>;
  /** When set, locks the flow to this show and hides the show picker (used from Show Detail). */
  fixedShowId?: string;
  /**
   * When set (and not fixedShowId), locks destination to Shows calendar or Internal Gang Sheet
   * without a tabbed picker. Print Requests uses separate buttons for each mode.
   */
  destinationMode?: StudioDestinationTab;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}

type StudioDestinationTab = "shows" | "staff_gang_sheet";

interface AllocationLeg {
  showId: string;
  quantitiesByItemId: Record<string, number>;
}

interface AllocationProgress {
  stepIndex: number;
  stepTotal: number;
  showLabel: string;
  itemLabel: string;
}

function formatWriteErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to complete the requested write.";
}

function waitForCapacityBarAnimation(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, SHOW_CAPACITY_BAR_ANIMATION_MS);
  });
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function sumLegQuantities(leg: AllocationLeg): number {
  return Object.values(leg.quantitiesByItemId).reduce((sum, quantity) => sum + quantity, 0);
}

function aggregateLegQuantitiesByShowId(legs: AllocationLeg[]): Map<string, number> {
  const byShowId = new Map<string, number>();
  for (const leg of legs) {
    byShowId.set(leg.showId, (byShowId.get(leg.showId) ?? 0) + sumLegQuantities(leg));
  }
  return byShowId;
}

export function AddToShowModal({
  printRequest,
  items,
  designById,
  fixedShowId,
  destinationMode,
  onClose,
  onAdded,
}: AddToShowModalProps) {
  const { user } = useAuth();
  const { shows, isLoading: isShowsLoading } = useUpcomingShows();
  const [legs, setLegs] = useState<AllocationLeg[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<string>(fixedShowId ?? "");
  const [destinationTab, setDestinationTab] = useState<StudioDestinationTab>(
    destinationMode ?? "shows",
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<AllocationProgress | null>(null);
  const [savePendingByShowId, setSavePendingByShowId] = useState<ReadonlyMap<string, number> | undefined>();
  const [isCelebratingSave, setIsCelebratingSave] = useState(false);
  /** Frozen allocated totals at save start so live Firestore updates do not double-count the pending fill. */
  const [allocatedBaselineByShowId, setAllocatedBaselineByShowId] = useState<ReadonlyMap<string, number> | undefined>();


  useEffect(() => {
    setIsPickerOpen(false);
    setActionError(null);
  }, [selectedShowId]);

  const openStaffGangSheets = useMemo(
    () =>
      shows
        .filter(
          (show) =>
            isStaffGangSheetShow(show) &&
            show.isArchived !== true &&
            isStaffGangSheetActiveProductionStatus(show.productionStatus),
        )
        .sort(
          (left, right) =>
            (left.staffGangSheetCycleNumber ?? 0) - (right.staffGangSheetCycleNumber ?? 0),
        ),
    [shows],
  );
  const openStaffGangSheetOptions = useMemo(
    () =>
      openStaffGangSheets.map((show) => ({
        label: formatStaffGangSheetTitle(show.staffGangSheetCycleNumber ?? 1),
        value: show.id,
      })),
    [openStaffGangSheets],
  );
  const openStaffGangSheet =
    openStaffGangSheets.find((show) => show.id === selectedShowId) ??
    openStaffGangSheets[0] ??
    null;

  const isStaffDestination =
    Boolean(destinationMode === "staff_gang_sheet") ||
    (!fixedShowId && !destinationMode && destinationTab === "staff_gang_sheet");
  const isRequestEligibleForStaff = canAllocateOriginToShowSource({
    source: "staff_gang_sheet",
    requestOrigin: printRequest.requestOrigin,
    isInternal: printRequest.isInternal,
  });
  const showDestinationTabs = !fixedShowId && !destinationMode;

  useEffect(() => {
    if (fixedShowId || (destinationMode !== "staff_gang_sheet" && destinationTab !== "staff_gang_sheet")) {
      return;
    }
    if (openStaffGangSheets.length === 0) {
      setSelectedShowId("");
      return;
    }
    const stillValid = openStaffGangSheets.some((show) => show.id === selectedShowId);
    if (!stillValid) {
      setSelectedShowId(openStaffGangSheets[0]!.id);
    }
  }, [destinationMode, destinationTab, fixedShowId, openStaffGangSheets, selectedShowId]);

  const allocatableShows = useMemo(() => {
    const now = new Date();
    return filterShowsAvailableForAllocation(shows, now).filter((show) => {
      if (
        !canAllocateOriginToShowSource({
          source: show.source,
          requestOrigin: printRequest.requestOrigin,
          isInternal: printRequest.isInternal,
        })
      ) {
        return false;
      }
      return canAcceptNewShowAllocations(
        {
          scheduledStartAt: show.scheduledStartAt,
          productionStatus: show.productionStatus,
          maxTotalQuantity: show.maxTotalQuantity,
          allocatedQuantity: show.allocatedQuantity,
        },
        now,
      );
    });
  }, [printRequest.isInternal, printRequest.requestOrigin, shows]);

  const calendarShows = useMemo(() => {
    const now = new Date();
    const pastWindowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    return shows.filter((show) => {
      if (show.isArchived === true) {
        return false;
      }
      // Internal Gang Sheets are Studio-only production lanes — never on the Portal-style calendar picker.
      if (isStaffGangSheetShow(show)) {
        return false;
      }
      if (show.productionStatus === "canceled" || show.productionStatus === "archived") {
        return false;
      }
      if (!isPastScheduledShow(show, now)) {
        return true;
      }
      const scheduled = show.scheduledStartAt?.toDate();
      return scheduled ? scheduled.getTime() >= pastWindowStart.getTime() : false;
    });
  }, [shows]);

  const fixedShowBlockReason = useMemo(() => {
    if (!fixedShowId) {
      return null;
    }

    const show = shows.find((candidate) => candidate.id === fixedShowId);
    if (!show) {
      return null;
    }

    return getShowAllocationBlockReason(
      {
        scheduledStartAt: show.scheduledStartAt,
        productionStatus: show.productionStatus,
        maxTotalQuantity: show.maxTotalQuantity,
        allocatedQuantity: show.allocatedQuantity,
      },
      new Date(),
    );
  }, [fixedShowId, shows]);

  const fixedShowIsBlocked = fixedShowBlockReason !== null;

  const totalRequestedQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const allocatedByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const leg of legs) {
      for (const [itemId, quantity] of Object.entries(leg.quantitiesByItemId)) {
        map.set(itemId, (map.get(itemId) ?? 0) + quantity);
      }
    }
    return map;
  }, [legs]);

  const remainingItems = useMemo(
    () =>
      items
        .map((item) => ({ item, remainingQuantity: item.quantity - (allocatedByItemId.get(item.id) ?? 0) }))
        .filter((entry) => entry.remainingQuantity > 0),
    [allocatedByItemId, items],
  );
  const remainingTotalQuantity = useMemo(
    () => remainingItems.reduce((sum, entry) => sum + entry.remainingQuantity, 0),
    [remainingItems],
  );

  const capacityByShowId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof assessShowCapacity>>();
    for (const show of allocatableShows) {
      const legQuantityForShow = legs
        .filter((leg) => leg.showId === show.id)
        .reduce((sum, leg) => sum + Object.values(leg.quantitiesByItemId).reduce((legSum, q) => legSum + q, 0), 0);
      map.set(
        show.id,
        assessShowCapacity({
          maxTotalQuantity: show.maxTotalQuantity,
          allocatedQuantity: show.allocatedQuantity + legQuantityForShow,
        }),
      );
    }
    return map;
  }, [allocatableShows, legs]);

  const showPickerOptions = useMemo(
    () =>
      buildShowPickerOptions({
        shows: calendarShows.map((show) => ({
          id: show.id,
          scheduledAt: show.scheduledStartAt?.toDate() ?? null,
          productionStatus: show.productionStatus,
          maxTotalQuantity: show.maxTotalQuantity,
          allocatedQuantity: allocatedBaselineByShowId?.get(show.id) ?? show.allocatedQuantity,
        })),
        // While celebrating a save, drop staged-leg extras so the pending layer can fill from the
        // live allocated baseline (avoids double-counting and matches the post-save animation).
        extraAllocatedByShowId: isCelebratingSave
          ? undefined
          : new Map(
              allocatableShows.map((show) => {
                const legQuantityForShow = legs
                  .filter((leg) => leg.showId === show.id)
                  .reduce((sum, leg) => sum + sumLegQuantities(leg), 0);
                return [show.id, legQuantityForShow] as const;
              }),
            ),
        pendingAllocatedByShowId: savePendingByShowId,
        isPastScheduled: (show) => {
          const fullShow = calendarShows.find((candidate) => candidate.id === show.id);
          return fullShow ? isPastScheduledShow(fullShow, new Date()) : false;
        },
        canSelectShow: (show) => allocatableShows.some((candidate) => candidate.id === show.id),
      }),
    [allocatableShows, allocatedBaselineByShowId, calendarShows, isCelebratingSave, legs, savePendingByShowId],
  );

  const selectedCapacity = selectedShowId ? capacityByShowId.get(selectedShowId) : undefined;
  const selectedShowIsStaff = useMemo(() => {
    const show = shows.find((candidate) => candidate.id === selectedShowId);
    return Boolean(show && isStaffGangSheetShow(show));
  }, [selectedShowId, shows]);
  const splitPlan =
    !selectedCapacity
      ? null
      : planAllocationSplit({
          requestedQuantity: remainingTotalQuantity,
          remainingCapacity: selectedCapacity.remainingQuantity,
        });
  const needsDecision = Boolean(splitPlan && !splitPlan.fitsEntirely);
  /**
   * When the selected show has zero remaining capacity (already full or over capacity), there is
   * nothing to split — offering "choose designs for this show" would open a picker with no capacity
   * to place anything into. In that case the only path forward is a full staff override of the
   * entire remainder onto this show; the split-picker path only makes sense when the show can still
   * accept part of the request.
   */
  const isSelectedShowFull = Boolean(splitPlan && splitPlan.fittingQuantity === 0 && remainingTotalQuantity > 0);

  const handleAddLegForFullRemainder = useCallback(() => {
    if (!selectedShowId || remainingItems.length === 0) {
      return;
    }

    const quantitiesByItemId = Object.fromEntries(remainingItems.map((entry) => [entry.item.id, entry.remainingQuantity]));
    setLegs((current) => [...current, { showId: selectedShowId, quantitiesByItemId }]);
    setSelectedShowId(fixedShowId ?? "");
  }, [fixedShowId, remainingItems, selectedShowId]);

  const handleConfirmPickerSelection = useCallback(
    (quantities: SplitPickerQuantities) => {
      if (!selectedShowId) {
        return;
      }

      const quantitiesByItemId = Object.fromEntries(
        Object.entries(quantities).filter(([, quantity]) => quantity > 0),
      );

      if (Object.keys(quantitiesByItemId).length === 0) {
        return;
      }

      setLegs((current) => [...current, { showId: selectedShowId, quantitiesByItemId }]);
      setSelectedShowId(fixedShowId ?? "");
      setIsPickerOpen(false);
    },
    [fixedShowId, selectedShowId],
  );

  const removeLeg = useCallback((index: number) => {
    setLegs((current) => current.filter((_, legIndex) => legIndex !== index));
  }, []);

  const getShowLabel = useCallback(
    (showId: string) => {
      const show = shows.find((candidate) => candidate.id === showId);
      if (!show) {
        return showId;
      }
      if (isStaffGangSheetShow(show)) {
        return formatStaffGangSheetTitle(show.staffGangSheetCycleNumber ?? 1);
      }
      return formatShowDateTimeLabel(show.scheduledStartAt?.toDate() ?? new Date());
    },
    [shows],
  );

  /**
   * When the selected show fully fits everything not yet assigned to a leg (the common case, and
   * always true before any split has started), the footer's normal "Add to show" button commits
   * that whole remainder as one final leg rather than requiring staff to first click a separate
   * "Add all remaining" button — that extra step and its "remaining" wording only make sense once
   * a split is actually in progress (i.e. `legs.length > 0` or the selected show can't fit
   * everything and staff is mid-decision).
   */
  const canConfirmFullFitDirectly = Boolean(
    selectedShowId &&
      !needsDecision &&
      !isPickerOpen &&
      (allocatableShows.some((show) => show.id === selectedShowId) ||
        (isStaffDestination &&
          isRequestEligibleForStaff &&
          openStaffGangSheet?.id === selectedShowId) ||
        (Boolean(fixedShowId) &&
          selectedShowIsStaff &&
          isRequestEligibleForStaff &&
          selectedShowId === fixedShowId)),
  );

  const handleConfirm = useCallback(async () => {
    if (!user) {
      return;
    }

    const finalLegs =
      canConfirmFullFitDirectly && selectedShowId && remainingItems.length > 0
        ? [
            ...legs,
            {
              showId: selectedShowId,
              quantitiesByItemId: Object.fromEntries(
                remainingItems.map((entry) => [entry.item.id, entry.remainingQuantity]),
              ),
            },
          ]
        : legs;

    if (finalLegs.length === 0) {
      return;
    }

    const steps = finalLegs.flatMap((leg) =>
      Object.entries(leg.quantitiesByItemId).map(([itemId, quantity]) => ({
        showId: leg.showId,
        itemId,
        quantity,
      })),
    );

    setIsSubmitting(true);
    setActionError(null);
    setProgress(steps.length > 0 ? { stepIndex: 0, stepTotal: steps.length, showLabel: "", itemLabel: "" } : null);
    setAllocatedBaselineByShowId(
      new Map(allocatableShows.map((show) => [show.id, show.allocatedQuantity] as const)),
    );

    try {
      for (const [index, step] of steps.entries()) {
        const design = designById?.get(items.find((item) => item.id === step.itemId)?.designId ?? "");

        setProgress({
          stepIndex: index + 1,
          stepTotal: steps.length,
          showLabel: getShowLabel(step.showId),
          itemLabel: design?.title ?? "design",
        });

        await upcomingShowService.allocatePrintRequestItem(user, step.showId, {
          printRequestId: printRequest.id,
          printRequestItemId: step.itemId,
          quantity: step.quantity,
        });
      }

      // Capacity celebration on the same ShowPicker instance (do not unmount the calendar).
      setProgress(null);
      setIsSubmitting(false);
      setIsCelebratingSave(true);
      setSavePendingByShowId(aggregateLegQuantitiesByShowId(finalLegs));
      await waitForNextPaint();
      await waitForCapacityBarAnimation();

      onClose();
      await onAdded();
    } catch (error) {
      setSavePendingByShowId(undefined);
      setIsCelebratingSave(false);
      setAllocatedBaselineByShowId(undefined);
      setActionError(formatWriteErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  }, [
    allocatableShows,
    canConfirmFullFitDirectly,
    designById,
    getShowLabel,
    items,
    legs,
    onAdded,
    onClose,
    printRequest.id,
    remainingItems,
    selectedShowId,
    user,
  ]);

  const isBusy = isSubmitting || isCelebratingSave;

  const isConfirmDisabled =
    fixedShowIsBlocked ||
    isBusy ||
    (isStaffDestination && (!isRequestEligibleForStaff || !openStaffGangSheet)) ||
    (legs.length === 0 && !(canConfirmFullFitDirectly && remainingItems.length > 0));

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="add-to-show-title" className="modal-panel modal-panel-lg" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">
              {fixedShowId
                ? "Add to show"
                : destinationMode === "staff_gang_sheet"
                  ? "Add to Internal Gangsheet"
                  : destinationMode === "shows"
                    ? "Add to show"
                    : "Add to show / gang sheet"}
            </p>
            <h3 id="add-to-show-title">
              {fixedShowId
                ? `Add "${printRequest.name}" to a show`
                : destinationMode === "staff_gang_sheet"
                  ? `Add "${printRequest.name}" to Internal Gangsheet`
                  : destinationMode === "shows"
                    ? `Add "${printRequest.name}" to a show`
                    : `Add "${printRequest.name}" to a show or Internal Gangsheet`}
            </h3>
          </div>
          <button
            aria-label="Close add to show"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          {isBusy ? (
            <div className="show-allocation-progress">
              <p className="show-allocation-progress-label" role="status">
                {isCelebratingSave
                  ? "Updating show capacity…"
                  : progress
                    ? `${progress.stepIndex} of ${progress.stepTotal} prints — allocating "${progress.itemLabel}" to ${progress.showLabel}`
                    : "Preparing..."}
              </p>
              {isSubmitting && progress && !isCelebratingSave ? (
                <div
                  aria-valuemax={progress.stepTotal}
                  aria-valuemin={0}
                  aria-valuenow={progress.stepIndex}
                  className="show-allocation-progress-bar"
                  role="progressbar"
                >
                  <div
                    className="show-allocation-progress-bar-fill"
                    style={{ width: `${(progress.stepIndex / progress.stepTotal) * 100}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="print-requests-modal-hint">
              {formatPrintRequestAllocationSummary(items.length, totalRequestedQuantity)}
            </p>
          )}

          {!isBusy && legs.length > 0 ? (
            <div className="show-allocation-plan-list">
              {legs.map((leg, index) => {
                const legTotal = Object.values(leg.quantitiesByItemId).reduce(
                  (sum, quantity) => sum + quantity,
                  0,
                );

                return (
                  <div className="show-allocation-plan-row" key={`${leg.showId}-${index}`}>
                    <span>
                      {getShowLabel(leg.showId)}: {legTotal} print{legTotal === 1 ? "" : "s"}
                    </span>
                    <Button onClick={() => removeLeg(index)} size="sm" variant="ghost">
                      Undo
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {!isBusy && remainingItems.length === 0 ? (
            <p className="print-requests-modal-hint">Every print in this request has been assigned to a show.</p>
          ) : isShowsLoading ? (
            <LoadingSpinner label="Loading shows" />
          ) : fixedShowIsBlocked ? (
            <p className="auth-message auth-message-error" role="alert">
              {formatShowAllocationBlockedMessage(fixedShowBlockReason)}
            </p>
          ) : (
            <>
              {showDestinationTabs ? (
                <div className="print-requests-tab-bar" role="tablist" aria-label="Destination">
                  <button
                    aria-selected={destinationTab === "shows"}
                    className={`print-requests-tab-button${destinationTab === "shows" ? " is-active" : ""}`}
                    disabled={isBusy}
                    onClick={() => {
                      setDestinationTab("shows");
                      setSelectedShowId("");
                      setLegs([]);
                    }}
                    role="tab"
                    type="button"
                  >
                    Shows
                  </button>
                  <button
                    aria-selected={destinationTab === "staff_gang_sheet"}
                    className={`print-requests-tab-button${destinationTab === "staff_gang_sheet" ? " is-active" : ""}`}
                    disabled={isBusy}
                    onClick={() => {
                      setDestinationTab("staff_gang_sheet");
                      setLegs([]);
                    }}
                    role="tab"
                    type="button"
                  >
                    Internal Gangsheet
                  </button>
                </div>
              ) : null}

              {isStaffDestination ? (
                !isRequestEligibleForStaff ? (
                  <p className="print-requests-modal-hint">
                    Only Internal print requests can be added to Internal Gangsheets.
                  </p>
                ) : openStaffGangSheets.length === 0 ? (
                  <p className="print-requests-modal-hint">No open Internal Gangsheet</p>
                ) : (
                  <>
                    {openStaffGangSheets.length > 1 ? (
                      <Select
                        label="Internal Gangsheet"
                        name="staffGangSheetId"
                        onChange={(event) => {
                          setSelectedShowId(event.target.value);
                          setLegs([]);
                        }}
                        options={openStaffGangSheetOptions}
                        value={selectedShowId}
                      />
                    ) : (
                      <div className="print-requests-modal-hint">
                        <p>
                          <strong>
                            {formatStaffGangSheetTitle(openStaffGangSheet?.staffGangSheetCycleNumber ?? 1)}
                          </strong>
                        </p>
                      </div>
                    )}
                    {selectedCapacity ? (
                      <div
                        className={`show-capacity-card print-requests-modal-capacity${
                          selectedCapacity.isOverCapacity
                            ? " is-over-capacity"
                            : selectedCapacity.isFull
                              ? " is-full"
                              : ""
                        }`}
                      >
                        <div className="show-capacity-bar-track">
                          <div
                            className={`show-capacity-bar-fill${
                              getCapacityFillLevel(getShowCapacityPercent(selectedCapacity))
                                ? ` is-${getCapacityFillLevel(getShowCapacityPercent(selectedCapacity))}`
                                : ""
                            }`}
                            style={{
                              width: `${Math.min(100, getShowCapacityPercent(selectedCapacity) ?? 0)}%`,
                            }}
                          />
                        </div>
                        <div className="show-capacity-summary">
                          <span>{formatShowCapacitySlotLabel(selectedCapacity)}</span>
                        </div>
                      </div>
                    ) : null}
                    {!isBusy && needsDecision ? (
                      <div className="show-allocation-decision">
                        <p className="show-allocation-decision-message">
                          {isSelectedShowFull
                            ? SHOW_QUEUE_FULL_MESSAGE
                            : formatSplitNeededWarning({
                                fittingQuantity: splitPlan?.fittingQuantity ?? 0,
                                totalQuantity: remainingTotalQuantity,
                              })}
                        </p>
                        {isSelectedShowFull ? null : (
                          <Button onClick={() => setIsPickerOpen(true)} type="button" variant="secondary">
                            Choose designs for this sheet
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </>
                )
              ) : allocatableShows.filter((show) => !isStaffGangSheetShow(show)).length === 0 &&
                calendarShows.length === 0 ? (
                <p className="print-requests-modal-hint">
                  {shows.filter((show) => !isStaffGangSheetShow(show)).length === 0
                    ? "Add a show in the Show Queue before attaching print requests."
                    : "No upcoming shows are available. Past shows cannot accept new print requests."}
                </p>
              ) : (
                <>
                  {!isBusy && shouldShowRemainingWording(legs.length) ? (
                    <p className="print-requests-modal-hint">
                      {remainingTotalQuantity} print{remainingTotalQuantity === 1 ? "" : "s"} still need a
                      show.
                    </p>
                  ) : null}
                  {fixedShowId ? null : (
                    <ShowPicker
                      onSelect={isBusy ? () => undefined : setSelectedShowId}
                      options={showPickerOptions}
                      selectedId={selectedShowId || null}
                    />
                  )}

                  {!isBusy &&
                  selectedShowId &&
                  !needsDecision &&
                  shouldShowRemainingWording(legs.length) ? (
                    <Button onClick={handleAddLegForFullRemainder} type="button" variant="secondary">
                      Add remaining {remainingTotalQuantity} print
                      {remainingTotalQuantity === 1 ? "" : "s"} to this show
                    </Button>
                  ) : null}

                  {!isBusy && selectedShowId && needsDecision ? (
                    <div className="show-allocation-decision">
                      <p className="show-allocation-decision-message">
                        {isSelectedShowFull
                          ? SHOW_QUEUE_FULL_MESSAGE
                          : formatSplitNeededWarning({
                              fittingQuantity: splitPlan?.fittingQuantity ?? 0,
                              totalQuantity: remainingTotalQuantity,
                            })}
                      </p>
                      {isSelectedShowFull ? (
                        <p className="print-requests-modal-hint">
                          Choose a different show that still has capacity.
                        </p>
                      ) : (
                        <div className="show-allocation-decision-actions">
                          <Button onClick={() => setIsPickerOpen(true)} type="button" variant="secondary">
                            Choose designs for this show
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}

          {actionError ? (
            <p className="auth-message auth-message-error" role="alert">
              {actionError}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isBusy} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button disabled={isConfirmDisabled} onClick={() => void handleConfirm()} type="button">
            {isBusy
              ? "Adding..."
              : isStaffDestination || selectedShowIsStaff
                ? "Add to Internal Gangsheet"
                : "Add to show"}
          </Button>
        </ModalFooter>
      </Modal>

      {isPickerOpen && selectedShowId ? (
        <SplitDesignPickerModal
          designById={designById}
          entries={remainingItems}
          onCancel={() => setIsPickerOpen(false)}
          onConfirm={handleConfirmPickerSelection}
          showRemainingCapacity={selectedCapacity?.remainingQuantity}
        />
      ) : null}
    </div>
  );
}
