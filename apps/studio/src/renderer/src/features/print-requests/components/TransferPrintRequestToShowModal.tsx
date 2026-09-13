import { useEffect, useMemo, useState } from "react";

import {
  formatPrintRequestShowTransferActionLabel,
  formatPrintRequestShowTransferConfirmLabel,
  isPrintRequestShowTransferDestination,
  resolvePrintRequestShowTransferMode,
} from "@fresh-prints/shared/utils/printRequestShowTransfer";
import { isShowQueueMoveDestination } from "@fresh-prints/shared/utils/showQueueMove";
import type { PreviewShowQueueMoveResponse } from "@fresh-prints/shared/types/showQueueMove/showQueueMove.types";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { useAuth } from "../../auth/hooks/useAuth";
import { showQueueMoveService } from "../../upcoming-shows/services/showQueueMoveService";
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
  const [preview, setPreview] = useState<PreviewShowQueueMoveResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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
      .filter((show) => {
        if (show.id === sourceShow.id) {
          return false;
        }
        if (transferMode === "move") {
          return isShowQueueMoveDestination(show, now);
        }
        return isPrintRequestShowTransferDestination(show, now);
      })
      .sort(compareShowsForPicker)
      .map((show) => {
        let hasCapacity = true;
        if (show.maxTotalQuantity !== undefined) {
          const remainingCapacity = show.maxTotalQuantity - show.allocatedQuantity;
          hasCapacity = transferQuantity <= remainingCapacity;
        }

        return { show, hasCapacity };
      });
  }, [shows, sourceShow.id, transferQuantity, transferMode]);

  const selectableOptions =
    transferMode === "move"
      ? destinationOptions
      : destinationOptions.filter((option) => option.hasCapacity);

  const selectedOption = destinationOptions.find((option) => option.show.id === selectedShowId) ?? null;

  const destinationSelectOptions = useMemo(
    () =>
      selectableOptions.map(({ show }) => {
        const scheduleLabel = show.scheduledStartAt
          ? formatShowDateTimeLabel(show.scheduledStartAt.toDate())
          : "Not scheduled";
        return {
          value: show.id,
          label: `${formatUpcomingShowTitle(show)} · ${scheduleLabel}`,
        };
      }),
    [selectableOptions],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (transferMode !== "move" || !selectedShowId) {
        setPreview(null);
        setPreviewError(null);
        setIsLoadingPreview(false);
        return;
      }

      setIsLoadingPreview(true);
      setPreviewError(null);
      try {
        const nextPreview = await showQueueMoveService.preview({
          scope: "print_request",
          sourceShowId: sourceShow.id,
          destinationShowId: selectedShowId,
          printRequestId: printRequest.id,
        });
        if (!cancelled) {
          setPreview(nextPreview);
        }
      } catch (error) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(formatWriteErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [transferMode, selectedShowId, sourceShow.id, printRequest.id]);

  async function handleSubmit() {
    if (!user || !selectedShowId) {
      return;
    }

    if (transferMode === "move") {
      if (!preview?.canApply || !preview.previewChecksum) {
        return;
      }
    } else if (!selectedOption?.hasCapacity) {
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

  const moveConfirmDisabled =
    transferMode === "move" &&
    (!preview?.canApply || !preview.previewChecksum || isLoadingPreview || Boolean(previewError));

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
                  ? "No other upcoming Whatnot shows are eligible for this move right now."
                  : "No upcoming shows have enough room for this request. Try another show or adjust capacity."}
              </p>
            ) : (
              <Select
                label="Destination show"
                name="transferDestinationShowId"
                onChange={(event) => {
                  const nextValue = event.target.value.trim();
                  setSelectedShowId(nextValue.length > 0 ? nextValue : null);
                }}
                options={[
                  { value: "", label: "Select a destination show…", disabled: true },
                  ...destinationSelectOptions,
                ]}
                searchEmptyMessage="No matching shows"
                searchPlaceholder="Search shows…"
                searchable
                value={selectedShowId ?? ""}
              />
            )
          ) : null}

          {transferMode === "move" && selectedShowId ? (
            <div className="transfer-print-request-preview">
              {isLoadingPreview ? (
                <p className="modal-hint">Loading move preview…</p>
              ) : null}
              {previewError ? <p className="form-error">{previewError}</p> : null}
              {preview ? (
                <>
                  <p className="modal-hint">
                    {preview.totalMoveQuantity} print{preview.totalMoveQuantity === 1 ? "" : "s"} ·{" "}
                    {preview.itemCount} item{preview.itemCount === 1 ? "" : "s"}
                    {preview.printRequestsAlreadyOnDestinationCount > 0
                      ? " · already on destination (will combine)"
                      : ""}
                  </p>
                  <p className="modal-hint">
                    Destination capacity: {preview.destinationCurrentAllocatedQuantity}
                    {preview.maxTotalQuantity !== undefined ? ` / ${preview.maxTotalQuantity}` : ""} →{" "}
                    {preview.destinationProjectedAllocatedQuantity}
                    {preview.maxTotalQuantity !== undefined ? ` / ${preview.maxTotalQuantity}` : ""}
                  </p>
                  {preview.blockers.length > 0 ? (
                    <ul className="form-error-list">
                      {preview.blockers.map((blocker) => (
                        <li key={`${blocker.code}-${blocker.allocationId ?? blocker.message}`}>
                          {blocker.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {submitError ? <p className="form-error">{submitError}</p> : null}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={
              !selectedShowId ||
              isSubmitting ||
              (transferMode === "copy" && !selectedOption?.hasCapacity) ||
              moveConfirmDisabled
            }
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
