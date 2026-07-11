import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useAuth } from "../../auth/hooks/useAuth";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import { useUpcomingShows } from "../../upcoming-shows/hooks/useUpcomingShows";
import {
  filterShowsAvailableForAllocation,
  isPastScheduledShow,
  PAST_SHOW_READ_ONLY_MESSAGE,
} from "../../upcoming-shows/utils/groupShowsByUpcomingPast";
import { ShowPicker, SHOW_CAPACITY_BAR_ANIMATION_MS, buildShowPickerOptions } from "@fresh-prints/show-picker";
import "@fresh-prints/show-picker/show-picker.css";
import type { Design } from "../../designs/types/design.types";
import { SplitDesignPickerModal } from "./SplitDesignPickerModal";
import { assessShowCapacity, planAllocationSplit } from "@fresh-prints/shared/utils/showCapacity";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import { formatPrintRequestAllocationSummary } from "@fresh-prints/shared/utils/printRequestSummaryCopy";
import {
  formatSplitNeededWarning,
  shouldShowRemainingWording,
  type SplitPickerQuantities,
} from "@fresh-prints/shared/utils/printRequestSplitAllocation";
import type { PrintRequest, PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";

interface AddToShowModalProps {
  printRequest: PrintRequest;
  items: PrintRequestItem[];
  designById?: Map<string, Design>;
  /** When set, locks the flow to this show and hides the show picker (used from Show Detail). */
  fixedShowId?: string;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}

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
  onClose,
  onAdded,
}: AddToShowModalProps) {
  const { user } = useAuth();
  const { shows, isLoading: isShowsLoading } = useUpcomingShows();
  const [legs, setLegs] = useState<AllocationLeg[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<string>(fixedShowId ?? "");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<AllocationProgress | null>(null);
  const [savePendingByShowId, setSavePendingByShowId] = useState<ReadonlyMap<string, number> | undefined>();
  const [isCelebratingSave, setIsCelebratingSave] = useState(false);
  /** Frozen allocated totals at save start so live Firestore updates do not double-count the pending fill. */
  const [allocatedBaselineByShowId, setAllocatedBaselineByShowId] = useState<ReadonlyMap<string, number> | undefined>();


  useEffect(() => {
    setOverrideConfirmed(false);
    setIsPickerOpen(false);
    setActionError(null);
  }, [selectedShowId]);

  const allocatableShows = useMemo(
    () => filterShowsAvailableForAllocation(shows, new Date()),
    [shows],
  );

  const fixedShowIsPast = useMemo(() => {
    if (!fixedShowId) {
      return false;
    }

    const show = shows.find((candidate) => candidate.id === fixedShowId);
    return show ? isPastScheduledShow(show, new Date()) : false;
  }, [fixedShowId, shows]);

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
        shows: allocatableShows.map((show) => ({
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
          const fullShow = allocatableShows.find((candidate) => candidate.id === show.id);
          return fullShow ? isPastScheduledShow(fullShow, new Date()) : false;
        },
      }),
    [allocatableShows, allocatedBaselineByShowId, isCelebratingSave, legs, savePendingByShowId],
  );

  const selectedCapacity = selectedShowId ? capacityByShowId.get(selectedShowId) : undefined;
  const splitPlan = selectedCapacity
    ? planAllocationSplit({ requestedQuantity: remainingTotalQuantity, remainingCapacity: selectedCapacity.remainingQuantity })
    : null;
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

  const handleAddOverrideLegForFullRemainder = useCallback(() => {
    if (!selectedShowId || remainingItems.length === 0 || !overrideConfirmed) {
      return;
    }

    const quantitiesByItemId = Object.fromEntries(remainingItems.map((entry) => [entry.item.id, entry.remainingQuantity]));
    setLegs((current) => [...current, { showId: selectedShowId, quantitiesByItemId }]);
    setSelectedShowId(fixedShowId ?? "");
    setOverrideConfirmed(false);
  }, [fixedShowId, overrideConfirmed, remainingItems, selectedShowId]);

  const removeLeg = useCallback((index: number) => {
    setLegs((current) => current.filter((_, legIndex) => legIndex !== index));
  }, []);

  const getShowLabel = useCallback(
    (showId: string) => {
      const show = shows.find((candidate) => candidate.id === showId);
      return show ? formatShowDateTimeLabel(show.scheduledStartAt?.toDate() ?? new Date()) : showId;
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
      allocatableShows.some((show) => show.id === selectedShowId) &&
      !needsDecision &&
      !isPickerOpen,
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
          overrideCapacity: true,
        });
      }

      // Hand off to capacity-bar celebration (picker must be visible).
      setProgress(null);
      setIsSubmitting(false);
      setIsCelebratingSave(true);
      setSavePendingByShowId(aggregateLegQuantitiesByShowId(finalLegs));
      await waitForNextPaint();
      await waitForCapacityBarAnimation();

      await onAdded();
      onClose();
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

  const isConfirmDisabled =
    fixedShowIsPast ||
    isSubmitting ||
    isCelebratingSave ||
    (legs.length === 0 && !(canConfirmFullFitDirectly && remainingItems.length > 0));

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="add-to-show-title" className="modal-panel modal-panel-lg" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Add to show</p>
            <h3 id="add-to-show-title">Add "{printRequest.name}" to a show</h3>
          </div>
          <button
            aria-label="Close add to show"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isSubmitting || isCelebratingSave}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          {isCelebratingSave ? (
            <div className="show-allocation-progress">
              <p className="show-allocation-progress-label">Updating show capacity…</p>
              <ShowPicker
                onSelect={() => undefined}
                options={showPickerOptions}
                selectedId={selectedShowId || null}
              />
            </div>
          ) : isSubmitting ? (
            <div className="show-allocation-progress">
              <p className="show-allocation-progress-label">
                {progress
                  ? `${progress.stepIndex} of ${progress.stepTotal} prints — allocating "${progress.itemLabel}" to ${progress.showLabel}`
                  : "Preparing..."}
              </p>
              {progress ? (
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
            <>
              <p className="print-requests-modal-hint">
                {formatPrintRequestAllocationSummary(items.length, totalRequestedQuantity)}
              </p>

              {legs.length > 0 ? (
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

              {remainingItems.length === 0 ? (
                <p className="print-requests-modal-hint">Every print in this request has been assigned to a show.</p>
              ) : isShowsLoading ? (
                <LoadingSpinner label="Loading shows" />
              ) : allocatableShows.length === 0 ? (
                <p className="print-requests-modal-hint">
                  {shows.length === 0
                    ? "Add a show in the Show Queue before attaching print requests."
                    : "No upcoming shows are available. Past shows cannot accept new print requests."}
                </p>
              ) : fixedShowIsPast ? (
                <p className="auth-message auth-message-error" role="alert">
                  {PAST_SHOW_READ_ONLY_MESSAGE}
                </p>
              ) : (
                <>
                  {shouldShowRemainingWording(legs.length) ? (
                    <p className="print-requests-modal-hint">
                      {remainingTotalQuantity} print{remainingTotalQuantity === 1 ? "" : "s"} still need a show.
                    </p>
                  ) : null}
                  {fixedShowId ? null : (
                    <ShowPicker
                      onSelect={setSelectedShowId}
                      options={showPickerOptions}
                      selectedId={selectedShowId || null}
                    />
                  )}

                  {selectedShowId && !needsDecision && shouldShowRemainingWording(legs.length) ? (
                    <Button onClick={handleAddLegForFullRemainder} type="button" variant="secondary">
                      Add remaining {remainingTotalQuantity} print{remainingTotalQuantity === 1 ? "" : "s"} to this
                      show
                    </Button>
                  ) : null}

                  {selectedShowId && needsDecision ? (
                    <div className="show-allocation-decision">
                      <p className="show-allocation-decision-message">
                        {isSelectedShowFull
                          ? "This show is full. You can select a different show for the full request, or use the staff override below to add it anyway."
                          : formatSplitNeededWarning({
                              fittingQuantity: splitPlan?.fittingQuantity ?? 0,
                              totalQuantity: remainingTotalQuantity,
                            })}
                      </p>
                      {isSelectedShowFull ? null : (
                        <div className="show-allocation-decision-actions">
                          <Button onClick={() => setIsPickerOpen(true)} type="button" variant="secondary">
                            Choose designs for this show
                          </Button>
                        </div>
                      )}
                      <label className="show-allocation-decision-override">
                        <input
                          checked={overrideConfirmed}
                          onChange={(event) => setOverrideConfirmed(event.target.checked)}
                          type="checkbox"
                        />
                        <span>
                          Staff override: add all {remainingTotalQuantity}{" "}
                          {shouldShowRemainingWording(legs.length) ? "remaining " : ""}print
                          {remainingTotalQuantity === 1 ? "" : "s"} to this show even though it exceeds remaining
                          capacity.
                        </span>
                      </label>
                      {overrideConfirmed ? (
                        <Button onClick={handleAddOverrideLegForFullRemainder} type="button" variant="danger">
                          Add with override
                        </Button>
                      ) : null}
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
          <Button disabled={isSubmitting || isCelebratingSave} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button disabled={isConfirmDisabled} onClick={() => void handleConfirm()} type="button">
            {isSubmitting || isCelebratingSave ? "Adding..." : "Add to show"}
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
