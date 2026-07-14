'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import type { PrintRequest, PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { assessShowCapacity } from '@fresh-prints/shared/utils/showCapacity';
import { formatPrintRequestAllocationSummary } from '@fresh-prints/shared/utils/printRequestSummaryCopy';
import {
  canFitPrintRequestOnShow,
  formatShowCapacityExceededMessage,
  sumPrintRequestItemQuantities,
} from '@fresh-prints/shared/utils/portalShowQueueCapacity';
import {
  SHOW_CAPACITY_BAR_ANIMATION_MS,
  ShowPicker,
  buildShowPickerOptions,
  getDefaultShowPickerOptionId,
} from '@fresh-prints/show-picker';

import { usePortalAllocatableShows } from '../hooks/usePortalAllocatableShows';
import { useQueuePrintRequestToShow } from '../hooks/useQueuePrintRequestToShow';
import { PortalLoadingPanel } from '../../shared/components/PortalLoadingPanel';

function waitForCapacityBarAnimation(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, SHOW_CAPACITY_BAR_ANIMATION_MS);
  });
}

/** Let React commit the pending fill widths before starting the hold timer. */
function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

interface PortalQueueToShowModalProps {
  isOpen: boolean;
  items: PrintRequestItem[];
  onClose: () => void;
  onQueued: () => void | Promise<void>;
  printRequest: PrintRequest;
}

export function PortalQueueToShowModal({
  isOpen,
  items,
  onClose,
  onQueued,
  printRequest,
}: PortalQueueToShowModalProps) {
  const { shows, isLoading, error: loadError } = usePortalAllocatableShows(isOpen);
  const { queueToShow, isSubmitting, error: submitError, clearError } = useQueuePrintRequestToShow();
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAllocatedByShowId, setPendingAllocatedByShowId] = useState<ReadonlyMap<string, number> | undefined>();
  const [isCelebratingSave, setIsCelebratingSave] = useState(false);
  const [allocatedBaselineByShowId, setAllocatedBaselineByShowId] = useState<ReadonlyMap<string, number> | undefined>();

  const totalQuantity = useMemo(() => sumPrintRequestItemQuantities(items), [items]);

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
          return show.scheduledAt.getTime() <= Date.now();
        },
        canSelectShow: (show) => {
          const match = shows.find((candidate) => candidate.id === show.id);
          return match?.isAllocatable !== false;
        },
      }),
    [allocatedBaselineByShowId, pendingAllocatedByShowId, shows],
  );

  const defaultShowId = useMemo(
    () =>
      getDefaultShowPickerOptionId(showPickerOptions, (showId) => {
        const show = shows.find((candidate) => candidate.id === showId);
        if (!show || show.isAllocatable === false) {
          return false;
        }

        return canFitPrintRequestOnShow({
          totalQuantity,
          maxTotalQuantity: show.maxTotalQuantity,
          allocatedQuantity: show.allocatedQuantity,
        });
      }),
    [showPickerOptions, shows, totalQuantity],
  );

  // Derive on render so ShowPicker mounts with the open show already selected (avoids its
  // null-selectedId fallback racing to the soonest/full slot).
  const effectiveSelectedId = selectedShowId ?? (!isLoading ? defaultShowId : null);

  const selectedShow = useMemo(
    () => shows.find((show) => show.id === effectiveSelectedId) ?? null,
    [effectiveSelectedId, shows],
  );

  const capacityMessage = useMemo(() => {
    if (!selectedShow) {
      return null;
    }

    const capacity = assessShowCapacity({
      maxTotalQuantity: selectedShow.maxTotalQuantity,
      allocatedQuantity: selectedShow.allocatedQuantity,
    });

    if (
      !canFitPrintRequestOnShow({
        totalQuantity,
        maxTotalQuantity: selectedShow.maxTotalQuantity,
        allocatedQuantity: selectedShow.allocatedQuantity,
      }) &&
      capacity.remainingQuantity !== undefined
    ) {
      return formatShowCapacityExceededMessage(totalQuantity, capacity.remainingQuantity);
    }

    return null;
  }, [selectedShow, totalQuantity]);

  const isBusy = isSubmitting || isCelebratingSave;
  const canConfirm =
    Boolean(effectiveSelectedId) &&
    selectedShow?.isAllocatable !== false &&
    !capacityMessage &&
    !isLoading &&
    !isBusy &&
    items.length > 0;

  useEffect(() => {
    if (!isOpen) {
      setSelectedShowId(null);
      setActionError(null);
      setPendingAllocatedByShowId(undefined);
      setIsCelebratingSave(false);
      setAllocatedBaselineByShowId(undefined);
      clearError();
      return;
    }

    if (!isLoading && !selectedShowId && defaultShowId) {
      setSelectedShowId(defaultShowId);
    }
  }, [clearError, defaultShowId, isOpen, isLoading, selectedShowId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, isOpen, onClose]);

  const handleConfirm = async () => {
    if (!effectiveSelectedId || !canConfirm) {
      return;
    }

    setActionError(null);

    try {
      setAllocatedBaselineByShowId(
        new Map(shows.map((show) => [show.id, show.allocatedQuantity] as const)),
      );
      await queueToShow({
        printRequestId: printRequest.id,
        upcomingShowId: effectiveSelectedId,
      });
      // Keep the same ShowPicker mounted; animate capacity in place, then close before parent refresh.
      setIsCelebratingSave(true);
      setPendingAllocatedByShowId(new Map([[effectiveSelectedId, totalQuantity]]));
      await waitForNextPaint();
      await waitForCapacityBarAnimation();
      onClose();
      await onQueued();
    } catch (queueError) {
      setPendingAllocatedByShowId(undefined);
      setIsCelebratingSave(false);
      setAllocatedBaselineByShowId(undefined);
      setActionError(queueError instanceof Error ? queueError.message : 'Unable to add request to a show\'s print run.');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="portal-queue-to-show-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur portal-queue-to-show-overlay"
      onClick={() => {
        if (!isBusy) {
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
            {!isLoading ? (
              <p className="portal-muted portal-queue-to-show-summary">
                {formatPrintRequestAllocationSummary(items.length, totalQuantity)}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Close"
            className="modal-close-button"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden size={18} />
          </button>
        </header>

        <div className="modal-body portal-queue-to-show-body">
          {isLoading ? (
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
                onSelect={isBusy ? () => undefined : setSelectedShowId}
                options={showPickerOptions}
                selectedId={effectiveSelectedId}
              />
            </>
          )}
        </div>

        <div className="portal-queue-to-show-alerts" aria-live="polite">
          {capacityMessage ? (
            <p className="portal-error portal-queue-to-show-alert" role="alert">
              {capacityMessage}
            </p>
          ) : null}

          {submitError || actionError ? (
            <p className="portal-error portal-queue-to-show-alert" role="alert">
              {submitError ?? actionError}
            </p>
          ) : null}
        </div>

        <footer className="modal-footer portal-queue-to-show-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="portal-button portal-button-primary"
            disabled={!canConfirm}
            onClick={() => void handleConfirm()}
            type="button"
          >
            {isBusy ? 'Adding…' : 'Add to show'}
          </button>
        </footer>
      </div>
    </div>
  );
}
