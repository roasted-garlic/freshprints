import { useEffect, useMemo, useState } from "react";

import { isShowQueueMoveDestination } from "@fresh-prints/shared/utils/showQueueMove";
import type { PreviewShowQueueMoveResponse } from "@fresh-prints/shared/types/showQueueMove/showQueueMove.types";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { useAuth } from "../../auth/hooks/useAuth";
import { showQueueMoveService } from "../services/showQueueMoveService";
import { upcomingShowService } from "../services/upcomingShowService";
import { formatUpcomingShowTitle } from "../utils/upcomingShowDisplay";

interface MoveShowQueueAllRequestsModalProps {
  sourceShow: UpcomingShow;
  onClose: () => void;
  onMoved: (result: { destinationShowId: string; totalMoveQuantity: number }) => void | Promise<void>;
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

export function MoveShowQueueAllRequestsModal({
  sourceShow,
  onClose,
  onMoved,
}: MoveShowQueueAllRequestsModalProps) {
  const { user } = useAuth();
  const [shows, setShows] = useState<UpcomingShow[]>([]);
  const [isLoadingShows, setIsLoadingShows] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewShowQueueMoveResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        const loaded = await upcomingShowService.listUpcomingShows(user);
        if (!cancelled) {
          setShows(loaded);
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

  const destinationShows = useMemo(() => {
    const now = new Date();
    return shows
      .filter((show) => show.id !== sourceShow.id && isShowQueueMoveDestination(show, now))
      .sort(compareShowsForPicker);
  }, [shows, sourceShow.id]);

  const destinationSelectOptions = useMemo(
    () =>
      destinationShows.map((show) => {
        const scheduleLabel = show.scheduledStartAt
          ? formatShowDateTimeLabel(show.scheduledStartAt.toDate())
          : "Not scheduled";
        return {
          value: show.id,
          label: `${formatUpcomingShowTitle(show)} · ${scheduleLabel}`,
        };
      }),
    [destinationShows],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selectedShowId) {
        setPreview(null);
        setPreviewError(null);
        setIsLoadingPreview(false);
        return;
      }
      setIsLoadingPreview(true);
      setPreviewError(null);
      try {
        const nextPreview = await showQueueMoveService.preview({
          scope: "whole_show",
          sourceShowId: sourceShow.id,
          destinationShowId: selectedShowId,
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
  }, [selectedShowId, sourceShow.id]);

  async function handleSubmit() {
    if (!selectedShowId || !preview?.canApply || !preview.previewChecksum) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const applied = await showQueueMoveService.apply({
        scope: "whole_show",
        sourceShowId: sourceShow.id,
        destinationShowId: selectedShowId,
        previewChecksum: preview.previewChecksum,
      });
      await onMoved({
        destinationShowId: selectedShowId,
        totalMoveQuantity: applied.totalMoveQuantity,
      });
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
        aria-labelledby="move-all-requests-title"
        className="modal-panel modal-panel-lg transfer-print-request-modal"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Move All Requests</p>
            <h3 id="move-all-requests-title">Move queue to another show</h3>
            <p className="modal-subtitle">
              From {formatUpcomingShowTitle(sourceShow)}
              {sourceShow.scheduledStartAt
                ? ` · ${formatShowDateTimeLabel(sourceShow.scheduledStartAt.toDate())}`
                : ""}
              . Moves every pending/queued allocation. Blocked production work stops the entire move.
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
            destinationShows.length === 0 ? (
              <p className="modal-hint">
                No other upcoming Whatnot shows are eligible destinations right now.
              </p>
            ) : (
              <Select
                label="Destination show"
                name="moveAllDestinationShowId"
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

          {selectedShowId ? (
            <div className="transfer-print-request-preview">
              {isLoadingPreview ? <p className="modal-hint">Loading move preview…</p> : null}
              {previewError ? <p className="form-error">{previewError}</p> : null}
              {preview ? (
                <>
                  <p className="modal-hint">
                    {preview.affectedPrintRequestCount} print request
                    {preview.affectedPrintRequestCount === 1 ? "" : "s"} · {preview.totalMoveQuantity}{" "}
                    print{preview.totalMoveQuantity === 1 ? "" : "s"} ·{" "}
                    {preview.movableAllocationCount} allocation
                    {preview.movableAllocationCount === 1 ? "" : "s"}
                  </p>
                  <p className="modal-hint">
                    Destination: {preview.destinationCurrentAllocatedQuantity}
                    {preview.maxTotalQuantity !== undefined ? ` / ${preview.maxTotalQuantity}` : ""} →{" "}
                    {preview.destinationProjectedAllocatedQuantity}
                    {preview.maxTotalQuantity !== undefined ? ` / ${preview.maxTotalQuantity}` : ""}
                  </p>
                  {preview.printRequestsAlreadyOnDestinationCount > 0 ? (
                    <p className="modal-hint">
                      {preview.printRequestsAlreadyOnDestinationCount} request
                      {preview.printRequestsAlreadyOnDestinationCount === 1 ? "" : "s"} already on
                      destination will combine.
                    </p>
                  ) : null}
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
              isLoadingPreview ||
              !preview?.canApply ||
              !preview.previewChecksum
            }
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSubmitting ? "Moving…" : "Move All Requests"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
