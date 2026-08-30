import { useEffect, useMemo, useState } from "react";

import {
  isPrintRequestShowTransferDestination,
  formatPrintRequestShowTransferActionLabel,
  formatPrintRequestShowTransferConfirmLabel,
  resolvePrintRequestShowTransferMode,
} from "@fresh-prints/shared/utils/printRequestShowTransfer";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useAuth } from "../../auth/hooks/useAuth";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import { formatUpcomingShowTitle } from "../../upcoming-shows/utils/upcomingShowDisplay";

interface TransferPrintRequestToShowModalProps {
  printRequest: Pick<PrintRequest, "id" | "name">;
  sourceShow: UpcomingShow;
  transferQuantity: number;
  onClose: () => void;
  onTransferred: (result: { mode: "move" | "copy"; destinationShowId: string }) => void | Promise<void>;
}

interface DestinationOption {
  show: UpcomingShow;
  hasCapacity: boolean;
}

function formatWriteErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to complete the requested write.";
}

function compareShowsForPicker(left: UpcomingShow, right: UpcomingShow): number {
  const leftTime = left.scheduledStartAt?.toMillis() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = right.scheduledStartAt?.toMillis() ?? Number.MAX_SAFE_INTEGER;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return formatUpcomingShowTitle(left).localeCompare(formatUpcomingShowTitle(right));
}

export function TransferPrintRequestToShowModal({
  onClose,
  onTransferred,
  printRequest,
  sourceShow,
  transferQuantity,
}: TransferPrintRequestToShowModalProps) {
  const { user } = useAuth();
  const [shows, setShows] = useState<UpcomingShow[]>([]);
  const [isLoadingShows, setIsLoadingShows] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const transferMode = useMemo(() => resolvePrintRequestShowTransferMode(sourceShow), [sourceShow]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!user) {
        setShows([]);
        setIsLoadingShows(false);
        return;
      }

      setIsLoadingShows(true);
      setLoadError(null);

      try {
        const loadedShows = await upcomingShowService.listUpcomingShows(user);
        if (!cancelled) {
          setShows(loadedShows);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(formatWriteErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingShows(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const destinationOptions = useMemo((): DestinationOption[] => {
    const now = new Date();

    return shows
      .filter(
        (show) =>
          show.id !== sourceShow.id && isPrintRequestShowTransferDestination(show, now),
      )
      .sort(compareShowsForPicker)
      .map((show) => {
        let hasCapacity = true;
        if (show.maxTotalQuantity !== undefined) {
          const remainingCapacity = show.maxTotalQuantity - show.allocatedQuantity;
          hasCapacity = transferQuantity <= remainingCapacity;
        }

        return { show, hasCapacity };
      });
  }, [shows, sourceShow.id, transferQuantity]);

  const selectableOptions = destinationOptions.filter((option) => option.hasCapacity);

  const selectedOption = destinationOptions.find((option) => option.show.id === selectedShowId) ?? null;

  async function handleSubmit() {
    if (!user || !selectedShowId || !selectedOption?.hasCapacity) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await upcomingShowService.transferPrintRequestBetweenShows(user, {
        printRequestId: printRequest.id,
        sourceShowId: sourceShow.id,
        destinationShowId: selectedShowId,
      });
      await onTransferred({ mode: result.mode, destinationShowId: selectedShowId });
      onClose();
    } catch (error) {
      setSubmitError(formatWriteErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="transfer-print-request-title"
        className="modal-panel modal-panel-lg transfer-print-request-modal"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">{formatPrintRequestShowTransferActionLabel(transferMode)}</p>
            <h3 id="transfer-print-request-title">{printRequest.name}</h3>
            <p className="modal-subtitle">
              From {formatUpcomingShowTitle(sourceShow)}
              {sourceShow.scheduledStartAt
                ? ` · ${formatShowDateTimeLabel(sourceShow.scheduledStartAt.toDate())}`
                : ""}
              . {transferMode === "copy" ? "Copy" : "Move"} {transferQuantity} print
              {transferQuantity === 1 ? "" : "s"} to another upcoming show.
            </p>
          </div>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </ModalHeader>

        <ModalBody>
          {isLoadingShows ? (
            <div className="transfer-print-request-loading">
              <LoadingSpinner />
              <span>Loading shows…</span>
            </div>
          ) : null}
          {loadError ? <p className="form-error">{loadError}</p> : null}
          {!isLoadingShows && !loadError ? (
            selectableOptions.length === 0 ? (
              <p className="modal-hint">
                {destinationOptions.length === 0
                  ? "No other upcoming shows are open for new requests right now."
                  : "No upcoming shows have enough room for this request. Try another show or adjust capacity."}
              </p>
            ) : (
              <ul className="transfer-print-request-show-list" role="listbox">
                {selectableOptions.map(({ show }) => {
                  const isSelected = selectedShowId === show.id;
                  const scheduleLabel = show.scheduledStartAt
                    ? formatShowDateTimeLabel(show.scheduledStartAt.toDate())
                    : "Not scheduled";

                  return (
                    <li key={show.id}>
                      <button
                        aria-selected={isSelected}
                        className={`transfer-print-request-show-option${isSelected ? " is-selected" : ""}`}
                        onClick={() => setSelectedShowId(show.id)}
                        role="option"
                        type="button"
                      >
                        <span className="transfer-print-request-show-option-title">
                          {formatUpcomingShowTitle(show)}
                        </span>
                        <span className="transfer-print-request-show-option-meta">{scheduleLabel}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
          {submitError ? <p className="form-error">{submitError}</p> : null}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={!selectedShowId || !selectedOption?.hasCapacity || isSubmitting}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSubmitting
              ? transferMode === "copy"
                ? "Copying…"
                : "Moving…"
              : formatPrintRequestShowTransferConfirmLabel(transferMode)}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
