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
import { ShowPicker, buildShowPickerOptions } from '@fresh-prints/show-picker';

import { usePortalAllocatableShows } from '../hooks/usePortalAllocatableShows';
import { useQueuePrintRequestToShow } from '../hooks/useQueuePrintRequestToShow';
import { PortalLoadingPanel } from '../../shared/components/PortalLoadingPanel';

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

  const totalQuantity = useMemo(() => sumPrintRequestItemQuantities(items), [items]);

  const showPickerOptions = useMemo(
    () =>
      buildShowPickerOptions({
        shows: shows.map((show) => ({
          id: show.id,
          scheduledAt: show.scheduledStartAt ? new Date(show.scheduledStartAt) : null,
          productionStatus: show.productionStatus,
          maxTotalQuantity: show.maxTotalQuantity,
          allocatedQuantity: show.allocatedQuantity,
        })),
      }),
    [shows],
  );

  const selectedShow = useMemo(
    () => shows.find((show) => show.id === selectedShowId) ?? null,
    [selectedShowId, shows],
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

  const canConfirm =
    Boolean(selectedShowId) && !capacityMessage && !isLoading && !isSubmitting && items.length > 0;

  useEffect(() => {
    if (!isOpen) {
      setSelectedShowId(null);
      setActionError(null);
      clearError();
      return;
    }

    if (!isLoading && !selectedShowId && showPickerOptions.length > 0) {
      setSelectedShowId(showPickerOptions[0]?.id ?? null);
    }
  }, [clearError, isOpen, isLoading, selectedShowId, showPickerOptions]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleConfirm = async () => {
    if (!selectedShowId || !canConfirm) {
      return;
    }

    setActionError(null);

    try {
      await queueToShow({
        printRequestId: printRequest.id,
        upcomingShowId: selectedShowId,
      });
      await onQueued();
      onClose();
    } catch (queueError) {
      setActionError(queueError instanceof Error ? queueError.message : 'Unable to queue request.');
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
        if (!isSubmitting) {
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
          <div>
            <p className="portal-eyebrow">Add to show</p>
            <h2 id="portal-queue-to-show-title">Add &ldquo;{printRequest.name}&rdquo; to a show</h2>
          </div>
          <button
            aria-label="Close"
            className="modal-close-button"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden size={18} />
          </button>
        </header>

        <div className="modal-body portal-queue-to-show-body">
          {isLoading ? (
            <PortalLoadingPanel label="Loading show dates…" />
          ) : (
            <>
              <p className="portal-muted portal-queue-to-show-summary">
                {formatPrintRequestAllocationSummary(items.length, totalQuantity)}
              </p>

              {loadError ? (
                <p className="portal-error" role="alert">
                  {loadError}
                </p>
              ) : showPickerOptions.length === 0 ? (
                <p className="portal-muted">No upcoming shows are available right now. Try again later.</p>
              ) : (
                <ShowPicker
                  className="portal-show-picker"
                  onSelect={setSelectedShowId}
                  options={showPickerOptions}
                  selectedId={selectedShowId}
                />
              )}

              {capacityMessage ? (
                <p className="portal-error" role="alert">
                  {capacityMessage}
                </p>
              ) : null}

              {submitError || actionError ? (
                <p className="portal-error" role="alert">
                  {submitError ?? actionError}
                </p>
              ) : null}
            </>
          )}
        </div>

        <footer className="modal-footer portal-queue-to-show-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={isSubmitting}
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
            {isSubmitting ? 'Adding…' : 'Add to show'}
          </button>
        </footer>
      </div>
    </div>
  );
}
