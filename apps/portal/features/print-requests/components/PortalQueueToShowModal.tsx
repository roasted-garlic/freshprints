'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TriangleAlert, X } from 'lucide-react';

import type { PrintRequest, PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from '@fresh-prints/shared/constants/portal/portalBiddingAcknowledgment.constants';
import { buildPortalBiddingAcknowledgmentCopy } from '@fresh-prints/shared/utils/portalBiddingAcknowledgmentCopy';
import { assessShowCapacity } from '@fresh-prints/shared/utils/showCapacity';
import { formatPrintRequestAllocationSummary } from '@fresh-prints/shared/utils/printRequestSummaryCopy';
import {
  formatPortalShowDoesNotFitEntireRequestMessage,
  formatPortalShowQueueBlockedMessage,
  planPortalShowQueueFit,
  remainingPerShowCustomerCap,
  remainingUnallocatedQuantityForItem,
  sumAllocatedQuantityByItemId,
  sumRemainingUnallocatedQuantity,
} from '@fresh-prints/shared/utils/portalShowQueueFit';
import {
  SHOW_CAPACITY_BAR_ANIMATION_MS,
  ShowPicker,
  buildShowPickerOptions,
  getDefaultShowPickerOptionId,
} from '@fresh-prints/show-picker';
import { formatPortalQueueCutoffMeta } from '@fresh-prints/shared/utils/showQueueCutoff';

import { PortalBiddingAcknowledgmentModal } from '../../shared/components/PortalBiddingAcknowledgmentModal';
import { usePortalAllocatableShows } from '../hooks/usePortalAllocatableShows';
import { useQueuePrintRequestToShow } from '../hooks/useQueuePrintRequestToShow';
import { PortalLoadingPanel } from '../../shared/components/PortalLoadingPanel';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';
import { resolveSelectedPortalPersonalShowUsage } from '../utils/portalPersonalShowUsage';
import {
  canSubmitPortalShowDestination,
  resolvePortalShowInspectionActivation,
} from '../utils/portalHistoricalShowInspection';

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

export interface PortalQueueToShowResult {
  isFullyQueued: boolean;
  remainingUnallocatedQuantity: number;
  totalAllocatedQuantity: number;
  upcomingShowId: string;
}

interface PortalQueueToShowModalProps {
  isOpen: boolean;
  items: PrintRequestItem[];
  onClose: () => void;
  onQueued: (result: PortalQueueToShowResult) => void | Promise<void>;
  printRequest: PrintRequest;
}

export function PortalQueueToShowModal({
  isOpen,
  items,
  onClose,
  onQueued,
  printRequest,
}: PortalQueueToShowModalProps) {
  const { workingRequestLimit } = usePortalPrintRequests();
  const {
    shows,
    portalQueueCutoffHoursBeforeStart,
    isLoading,
    error: loadError,
    hasConfirmedFreshness,
  } = usePortalAllocatableShows(isOpen);
  const {
    queueToShow,
    isSubmitting,
    error: submitError,
    errorShowId: submitErrorShowId,
    clearError,
  } = useQueuePrintRequestToShow();
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [inspectedShowId, setInspectedShowId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAllocatedByShowId, setPendingAllocatedByShowId] = useState<ReadonlyMap<string, number> | undefined>();
  const [isCelebratingSave, setIsCelebratingSave] = useState(false);
  const [allocatedBaselineByShowId, setAllocatedBaselineByShowId] = useState<ReadonlyMap<string, number> | undefined>();
  const [isAckOpen, setIsAckOpen] = useState(false);
  const [allocatedByItemId, setAllocatedByItemId] = useState<Map<string, number>>(() => new Map());
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setCountdownNowMs(Date.now());
    const timerId = window.setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [isOpen]);

  const perShowLimit = workingRequestLimit.limit;

  const remainingEntries = useMemo(() => {
    return items
      .map((item) => ({
        item,
        remainingQuantity: remainingUnallocatedQuantityForItem(
          item.quantity,
          allocatedByItemId.get(item.id) ?? 0,
        ),
        title:
          item.titleSnapshot?.trim() ||
          item.sizeLabel?.trim() ||
          `Design ${item.id.slice(0, 6)}`,
      }))
      .filter((entry) => entry.remainingQuantity > 0);
  }, [allocatedByItemId, items]);

  const totalRemainingQuantity = useMemo(
    () => sumRemainingUnallocatedQuantity(items, allocatedByItemId),
    [allocatedByItemId, items],
  );

  const acknowledgmentCopy = useMemo(
    () => buildPortalBiddingAcknowledgmentCopy(),
    [],
  );

  const showPickerOptions = useMemo(
    () =>
      buildShowPickerOptions({
        shows: shows.map((show) => ({
          id: show.id,
          scheduledAt: show.scheduledStartAt ? new Date(show.scheduledStartAt) : null,
          productionStatus: show.productionStatus,
          maxTotalQuantity: show.maxTotalQuantity,
          allocatedQuantity: allocatedBaselineByShowId?.get(show.id) ?? show.allocatedQuantity,
        })),
        pendingAllocatedByShowId,
        isPastScheduled: (show) => {
          if (!show.scheduledAt) {
            return false;
          }
          return show.scheduledAt.getTime() <= countdownNowMs;
        },
        isPastQueueCutoff: (show) => {
          const match = shows.find((candidate) => candidate.id === show.id);
          return match?.isPastQueueCutoff === true;
        },
        canSelectShow: (show) => {
          const match = shows.find((candidate) => candidate.id === show.id);
          if (!match || match.isAllocatable === false) {
            return false;
          }
          return true;
        },
        getCutoffMeta: (show) => {
          if (!show.scheduledAt) {
            return undefined;
          }
          const match = shows.find((candidate) => candidate.id === show.id);
          if (!match) {
            return undefined;
          }
          // Past shows, past-cutoff upcoming shows, and still-open allocatable shows.
          const isPast =
            show.scheduledAt.getTime() <= countdownNowMs;
          if (
            match.isPastQueueCutoff !== true &&
            match.isAllocatable === false &&
            !isPast
          ) {
            return undefined;
          }
          return (
            formatPortalQueueCutoffMeta(
              show.scheduledAt,
              new Date(countdownNowMs),
              portalQueueCutoffHoursBeforeStart,
            ) ?? undefined
          );
        },
      }),
    [
      allocatedBaselineByShowId,
      countdownNowMs,
      pendingAllocatedByShowId,
      portalQueueCutoffHoursBeforeStart,
      shows,
    ],
  );

  const defaultShowId = useMemo(
    () =>
      getDefaultShowPickerOptionId(showPickerOptions, (showId) => {
        const show = shows.find((candidate) => candidate.id === showId);
        if (!show || show.isAllocatable === false || perShowLimit === null) {
          return false;
        }
        const capacity = assessShowCapacity({
          maxTotalQuantity: show.maxTotalQuantity,
          allocatedQuantity: show.allocatedQuantity,
        });
        const fit = planPortalShowQueueFit({
          requestedQuantity: totalRemainingQuantity,
          showRemainingCapacity: capacity.remainingQuantity,
          customerLimitRemaining: remainingPerShowCustomerCap(show.customerAllocatedQuantity ?? 0, perShowLimit),
        });
        return fit.fitsEntirely;
      }),
    [perShowLimit, showPickerOptions, shows, totalRemainingQuantity],
  );

  const effectiveSelectedId = selectedShowId;
  const effectiveInspectedId = inspectedShowId ?? effectiveSelectedId;

  const effectiveSelectedShow = useMemo(
    () => shows.find((show) => show.id === effectiveSelectedId) ?? null,
    [effectiveSelectedId, shows],
  );
  const inspectedShow = useMemo(
    () => shows.find((show) => show.id === effectiveInspectedId) ?? null,
    [effectiveInspectedId, shows],
  );

  const effectiveFit = useMemo(() => {
    // Plan Section 30.4 — `shows` can be serving a stale, cache-warm `isAllocatable`/capacity for a
    // show that has since become historical server-side. Never compute a capacity decision (the
    // exhausted-capacity banner, or whether submission is allowed) against that data until this
    // enable's own reload has confirmed it's current — this only defers the decision briefly on a
    // cache-warm open, it never suppresses a genuinely open show's real capacity-exhausted state.
    if (!effectiveSelectedShow || perShowLimit === null || !hasConfirmedFreshness) {
      return null;
    }
    const capacity = assessShowCapacity({
      maxTotalQuantity: effectiveSelectedShow.maxTotalQuantity,
      allocatedQuantity: effectiveSelectedShow.allocatedQuantity,
    });
    return planPortalShowQueueFit({
      requestedQuantity: totalRemainingQuantity,
      showRemainingCapacity: capacity.remainingQuantity,
      customerLimitRemaining: remainingPerShowCustomerCap(
        effectiveSelectedShow.customerAllocatedQuantity ?? 0,
        perShowLimit,
      ),
    });
  }, [effectiveSelectedShow, hasConfirmedFreshness, perShowLimit, totalRemainingQuantity]);
  const personalUsage = useMemo(() => {
    return resolveSelectedPortalPersonalShowUsage({
      shows,
      selectedShowId: effectiveInspectedId,
      limit: perShowLimit,
      pendingSuccessfulByShowId: pendingAllocatedByShowId,
    });
  }, [effectiveInspectedId, pendingAllocatedByShowId, perShowLimit, shows]);

  const showDoesNotFitEntirely = Boolean(
    effectiveFit && !effectiveFit.fitsEntirely && !effectiveFit.isBlocked,
  );
  const isBlocked = Boolean(effectiveFit?.isBlocked);

  const isBusy = isSubmitting || isCelebratingSave;
  const canConfirmFull =
    Boolean(effectiveSelectedId) &&
    effectiveSelectedShow?.isAllocatable !== false &&
    effectiveFit?.fitsEntirely === true &&
    !isLoading &&
    !isLoadingAllocations &&
    !isBusy &&
    totalRemainingQuantity > 0;

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        setSelectedShowId(null);
        setInspectedShowId(null);
        setActionError(null);
        setPendingAllocatedByShowId(undefined);
        setIsCelebratingSave(false);
        setAllocatedBaselineByShowId(undefined);
        setIsAckOpen(false);
        setAllocatedByItemId(new Map());
        clearError();
      }
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    let cancelled = false;
    setIsLoadingAllocations(true);

    void (async () => {
      try {
        const allocations = await portalPrintRequestService.listShowAllocationsForPrintRequests([
          printRequest.id,
        ]);
        if (cancelled) {
          return;
        }
        setAllocatedByItemId(
          sumAllocatedQuantityByItemId(
            allocations.map((allocation) => ({
              printRequestItemId: allocation.printRequestItemId,
              allocatedQuantity: allocation.allocatedQuantity,
              status: allocation.status,
            })),
          ),
        );
      } catch {
        if (!cancelled) {
          setActionError('Unable to load show limits. Refresh and try again.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAllocations(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearError, isOpen, printRequest.id]);

  useEffect(() => {
    if (
      !isOpen ||
      isLoading ||
      isLoadingAllocations ||
      selectedShowId ||
      inspectedShowId ||
      !defaultShowId
    ) {
      return;
    }
    setSelectedShowId(defaultShowId);
    setInspectedShowId(defaultShowId);
  }, [defaultShowId, inspectedShowId, isLoading, isLoadingAllocations, isOpen, selectedShowId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy && !isAckOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAckOpen, isBusy, isOpen, onClose]);

  const handleRequestAddToShow = () => {
    const destination = shows.find((show) => show.id === effectiveSelectedId);
    if (isBlocked || !canSubmitPortalShowDestination(destination ?? null, canConfirmFull)) {
      return;
    }
    setActionError(null);
    setIsAckOpen(true);
  };

  const handleConfirmAcknowledgment = async () => {
    const destination = shows.find((show) => show.id === effectiveSelectedId);
    if (!canSubmitPortalShowDestination(destination ?? null, canConfirmFull)) {
      return;
    }
    const destinationId = destination!.id;

    setActionError(null);
    setIsAckOpen(false);

    try {
      setAllocatedBaselineByShowId(
        new Map(shows.map((show) => [show.id, show.allocatedQuantity] as const)),
      );
      const result = await queueToShow({
        printRequestId: printRequest.id,
        upcomingShowId: destinationId,
        biddingAcknowledgmentAccepted: true,
        biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
      });
      setIsCelebratingSave(true);
      setPendingAllocatedByShowId(new Map([[destinationId, totalRemainingQuantity]]));
      await waitForNextPaint();
      await waitForCapacityBarAnimation();
      onClose();
      await onQueued({
        isFullyQueued: result.isFullyQueued,
        remainingUnallocatedQuantity: result.remainingUnallocatedQuantity,
        totalAllocatedQuantity: result.totalAllocatedQuantity,
        upcomingShowId: result.upcomingShowId,
      });
    } catch {
      // Do not also set actionError here — useQueuePrintRequestToShow's own `error` (already
      // scoped to the show id this attempt was for, Plan Section 23) is the sole source of truth
      // for a queue-submission failure. Duplicating the message into unscoped `actionError` would
      // let it survive a show switch even after the scoped `submitError` correctly clears.
      setPendingAllocatedByShowId(undefined);
      setIsCelebratingSave(false);
      setAllocatedBaselineByShowId(undefined);
    }
  };

  if (!isOpen) {
    return null;
  }

  const primaryDisabled =
    isBusy ||
    isAckOpen ||
    isLoading ||
    isLoadingAllocations ||
    !effectiveSelectedId ||
    isBlocked ||
    showDoesNotFitEntirely ||
    !canConfirmFull;

  return (
    <>
      <div
        aria-labelledby="portal-queue-to-show-title"
        aria-modal="true"
        className="modal-overlay modal-overlay-blur portal-queue-to-show-overlay"
        onClick={() => {
          if (!isBusy && !isAckOpen) {
            onClose();
          }
        }}
        role="dialog"
      >
        <div
          className="modal-panel portal-queue-to-show-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="modal-header portal-queue-to-show-header">
            <div className="portal-queue-to-show-header-copy">
              <p className="portal-eyebrow">Add to show</p>
              <h2 id="portal-queue-to-show-title">
                Add &ldquo;{printRequest.name}&rdquo; to a show&apos;s print run
              </h2>
              {!isLoading && !isLoadingAllocations ? (
                <p className="portal-muted portal-queue-to-show-summary">
                  {formatPrintRequestAllocationSummary(remainingEntries.length, totalRemainingQuantity)}
                </p>
              ) : null}
            </div>
            <button
              aria-label="Close"
              className="modal-close-button"
              disabled={isBusy || isAckOpen}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden size={18} />
            </button>
          </header>

          <div className="modal-body portal-queue-to-show-body">
            {isLoading || isLoadingAllocations ? (
              <PortalLoadingPanel label="Loading show dates…" />
            ) : loadError ? (
              <p className="portal-error" role="alert">
                {loadError}
              </p>
            ) : showPickerOptions.length === 0 ? (
              <p className="portal-muted">No upcoming shows are available right now. Try again later.</p>
            ) : (
              <>
                {isCelebratingSave ? (
                  <p className="portal-muted portal-queue-to-show-summary" role="status">
                    Updating show capacity…
                  </p>
                ) : null}
                <ShowPicker
                  className="portal-show-picker"
                  onClearSelection={() => {
                    setActionError(null);
                    clearError();
                    setSelectedShowId(null);
                  }}
                  inspectedId={effectiveInspectedId}
                  onInspect={(showId) => {
                    const show = shows.find((candidate) => candidate.id === showId);
                    if (!show) return;
                    const activation = resolvePortalShowInspectionActivation(show);
                    setActionError(null);
                    clearError();
                    setInspectedShowId(activation.inspectedShowId);
                    setSelectedShowId(activation.destinationShowId);
                    if (activation.clearSubmissionState) {
                      setPendingAllocatedByShowId(undefined);
                    }
                  }}
                  onSelect={
                    isBusy || isAckOpen
                      ? () => undefined
                      : (showId) => {
                          // Plan Section 23 (Amendment 5): a capacity/submit error is scoped to the
                          // show it happened for — selecting a different show must clear it
                          // immediately, not leave Show A's stale error visible while Show B is
                          // being evaluated.
                          setActionError(null);
                          clearError();
                          setSelectedShowId(showId);
                          setInspectedShowId(showId);
                        }
                  }
                  options={showPickerOptions}
                  selectedId={effectiveSelectedId}
                />
                {inspectedShow?.isAllocatable === false ? (
                  <div className="portal-queue-fit-callout" role="status">
                    <div className="portal-queue-fit-callout-copy">
                      <p className="portal-queue-fit-callout-text">
                        This show has already been printed, so no new print requests can be added.
                      </p>
                      <p className="portal-muted">
                        You can still review your print activity for this show.
                      </p>
                    </div>
                  </div>
                ) : null}
                {personalUsage ? (
                  <div className="portal-queue-fit-callout" role="status">
                    <div className="portal-queue-fit-callout-copy">
                      <p className="portal-queue-fit-callout-text">{personalUsage.usedLabel}</p>
                      {personalUsage.remainingLabel ? (
                        <p className="portal-muted">{personalUsage.remainingLabel}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="portal-queue-to-show-alerts" aria-live="polite">
            {isBlocked && effectiveFit ? (
              <div className="portal-queue-fit-callout portal-queue-fit-callout-blocked" role="alert">
                <TriangleAlert aria-hidden className="portal-queue-fit-callout-icon" size={20} />
                <div className="portal-queue-fit-callout-copy">
                  <p className="portal-queue-fit-callout-text">
                    {formatPortalShowQueueBlockedMessage(effectiveFit.limitingFactor, perShowLimit)}
                  </p>
                </div>
              </div>
            ) : null}

            {!isBlocked && showDoesNotFitEntirely && effectiveFit ? (
              <div className="portal-queue-fit-callout" role="status">
                <TriangleAlert aria-hidden className="portal-queue-fit-callout-icon" size={20} />
                <div className="portal-queue-fit-callout-copy">
                  <p className="portal-queue-fit-callout-text">
                    {formatPortalShowDoesNotFitEntireRequestMessage({
                      fittingQuantity: effectiveFit.fittingQuantity,
                      totalQuantity: totalRemainingQuantity,
                    })}
                  </p>
                </div>
              </div>
            ) : null}

            {(() => {
              // Defense-in-depth (Plan Section 23, Amendment 5): even if some future code path
              // sets selectedShowId without calling clearError(), a submit error only ever
              // displays when it still matches the currently effective show — a stale error for a
              // show the customer is no longer looking at can never render.
              const scopedSubmitError =
                submitError && submitErrorShowId === effectiveSelectedId ? submitError : null;
              const displayError = scopedSubmitError ?? actionError;
              return displayError ? (
                <p className="portal-error portal-queue-to-show-alert" role="alert">
                  {displayError}
                </p>
              ) : null;
            })()}
          </div>

          <footer className="modal-footer portal-queue-to-show-footer">
            <button
              className="portal-button portal-button-secondary"
              disabled={isBusy || isAckOpen}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              disabled={primaryDisabled}
              onClick={handleRequestAddToShow}
              type="button"
            >
              {isBusy ? 'Adding…' : 'Add to show'}
            </button>
          </footer>
        </div>
      </div>

      <PortalBiddingAcknowledgmentModal
        confirmLabel={isBusy ? 'Adding…' : 'Add to show'}
        copy={acknowledgmentCopy}
        isBusy={isBusy}
        isOpen={isAckOpen}
        onCancel={() => {
          setIsAckOpen(false);
        }}
        onConfirm={() => {
          void handleConfirmAcknowledgment();
        }}
      />
    </>
  );
}
