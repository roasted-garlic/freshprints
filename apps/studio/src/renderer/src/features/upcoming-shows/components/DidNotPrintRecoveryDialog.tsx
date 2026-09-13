import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import type { PreviewShowProductionRecoveryResponse } from "@fresh-prints/shared/types/showProductionRecovery/showProductionRecovery.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import { isPrintRequestShowTransferDestination } from "@fresh-prints/shared/utils/printRequestShowTransfer";
import { formatShowDateTimeLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";
import { buildClientShowProductionRecoveryPreview } from "@fresh-prints/shared/utils/showProductionRecovery";
import { formatRequeueUnfulfilledSuccessMessage } from "@fresh-prints/shared/utils/showProductionRecoveryRequeue";
import { isFinishableShowAllocationStatus } from "@fresh-prints/shared/utils/showFinishAllocationStatuses";

import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { useAuth } from "../../auth/hooks/useAuth";
import { warmDeletionCallableBackground } from "../../deletion/services/deletionCallableWarmupService";
import { formatUpcomingShowTitle } from "../utils/upcomingShowDisplay";
import { upcomingShowService } from "../services/upcomingShowService";
import {
  SHOW_PRODUCTION_RECOVERY_ACTION_LABELS,
  SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT,
  SHOW_PRODUCTION_RELEASE_ONLY_HELPER,
  showProductionRecoveryService,
} from "../services/showProductionRecoveryService";

interface DidNotPrintRecoveryDialogProps {
  isOpen: boolean;
  upcomingShowId: string | null;
  showLabel: string;
  show: UpcomingShow | null;
  allocations: ShowAllocation[];
  now: Date;
  onCancel: () => void;
  onCompleted: (message: string) => void;
  onReleaseOnly: () => void;
}

interface DestinationOption {
  show: UpcomingShow;
  hasCapacity: boolean;
}

function compareShowsForPicker(left: UpcomingShow, right: UpcomingShow): number {
  const leftTime = left.scheduledStartAt?.toMillis() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = right.scheduledStartAt?.toMillis() ?? Number.MAX_SAFE_INTEGER;
  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return formatUpcomingShowTitle(left).localeCompare(formatUpcomingShowTitle(right));
}

function DidNotPrintRequeuePreviewBody({ preview }: { preview: PreviewShowProductionRecoveryResponse }) {
  return (
    <div className="show-recovery-preview show-did-not-print-preview">
      {preview.targetShow ? (
        <dl className="upcoming-show-detail-facts show-recovery-preview-facts">
          <div>
            <dt>Target show</dt>
            <dd>{preview.targetShow.title}</dd>
          </div>
          <div>
            <dt>Total requeue quantity</dt>
            <dd>{preview.totalRequeueQuantity ?? 0}</dd>
          </div>
          <div>
            <dt>Capacity after move</dt>
            <dd>
              {preview.targetShow.projectedAllocatedQuantity}
              {preview.targetShow.maxTotalQuantity !== undefined
                ? ` / ${preview.targetShow.maxTotalQuantity}`
                : ""}
            </dd>
          </div>
          {preview.previewChecksum ? (
            <div>
              <dt>Preview checksum</dt>
              <dd className="show-did-not-print-checksum">{preview.previewChecksum}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {preview.capacityBlocker ? (
        <p className="form-error">{preview.capacityBlocker.message}</p>
      ) : null}

      {preview.otherShowAllocationWarning ? (
        <p className="show-recovery-warning">
          Some requests also have allocations on other shows — only this show will be changed.
        </p>
      ) : null}

      {preview.requeueLines && preview.requeueLines.length > 0 ? (
        <div className="show-recovery-request-effects show-did-not-print-requeue-lines">
          <p className="eyebrow">Print Requests to move</p>
          <ul>
            {preview.requeueLines.map((line) => (
              <li key={line.printRequestId}>
                <strong>{line.requestNameSnapshot}</strong>
                <span>
                  {" "}
                  — {line.requeueQuantity} print{line.requeueQuantity === 1 ? "" : "s"}
                  {line.otherShowAllocationQuantity > 0
                    ? ` · ${line.otherShowAllocationQuantity} qty on other shows`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.notes.length > 0 ? (
        <ul className="show-recovery-notes">
          {preview.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {preview.blockers.length > 0 && preview.outcome === "blocked" ? (
        <ul className="form-error-list">
          {preview.blockers.map((blocker) => (
            <li key={blocker.code}>{blocker.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DidNotPrintRecoveryDialog({
  allocations,
  isOpen,
  now,
  onCancel,
  onCompleted,
  onReleaseOnly,
  show,
  showLabel,
  upcomingShowId,
}: DidNotPrintRecoveryDialogProps) {
  const { user } = useAuth();
  const [shows, setShows] = useState<UpcomingShow[]>([]);
  const [isLoadingShows, setIsLoadingShows] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewShowProductionRecoveryResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClientPreviewOnly, setIsClientPreviewOnly] = useState(false);

  const showRef = useRef(show);
  const allocationsRef = useRef(allocations);
  const nowRef = useRef(now);
  showRef.current = show;
  allocationsRef.current = allocations;
  nowRef.current = now;

  const totalRequeueQuantity = useMemo(
    () =>
      allocations
        .filter(
          (allocation) =>
            allocation.status !== "canceled" && isFinishableShowAllocationStatus(allocation.status),
        )
        .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0),
    [allocations],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setSelectedShowId(null);
    setPreview(null);
    setError(null);
    setLoadError(null);
    setIsClientPreviewOnly(false);

    void (async () => {
      if (!user) {
        setShows([]);
        setIsLoadingShows(false);
        return;
      }

      setIsLoadingShows(true);
      try {
        const loadedShows = await upcomingShowService.listUpcomingShows(user);
        if (!cancelled) {
          setShows(loadedShows);
        }
      } catch (previewError: unknown) {
        if (!cancelled) {
          setLoadError(
            previewError instanceof Error ? previewError.message : "Unable to load upcoming shows.",
          );
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
  }, [isOpen, user]);

  const destinationOptions = useMemo((): DestinationOption[] => {
    if (!upcomingShowId) {
      return [];
    }

    return shows
      .filter(
        (candidate) =>
          candidate.id !== upcomingShowId && isPrintRequestShowTransferDestination(candidate, now),
      )
      .sort(compareShowsForPicker)
      .map((candidate) => {
        let hasCapacity = true;
        if (candidate.maxTotalQuantity !== undefined) {
          const remainingCapacity = candidate.maxTotalQuantity - candidate.allocatedQuantity;
          hasCapacity = totalRequeueQuantity <= remainingCapacity;
        }
        return { show: candidate, hasCapacity };
      });
  }, [now, shows, totalRequeueQuantity, upcomingShowId]);

  const destinationOptionsRef = useRef(destinationOptions);
  destinationOptionsRef.current = destinationOptions;

  const selectableOptions = destinationOptions.filter((option) => option.hasCapacity);

  const destinationSelectOptions = useMemo(
    () =>
      selectableOptions.map(({ show: candidate }) => {
        const scheduleLabel = candidate.scheduledStartAt
          ? formatShowDateTimeLabel(candidate.scheduledStartAt.toDate())
          : "Not scheduled";

        return {
          value: candidate.id,
          label: `${formatUpcomingShowTitle(candidate)} · ${scheduleLabel}`,
        };
      }),
    [selectableOptions],
  );

  useEffect(() => {
    if (!isOpen || !upcomingShowId || !selectedShowId) {
      setPreview(null);
      setIsLoadingPreview(false);
      return;
    }

    let cancelled = false;
    setError(null);
    setPreview(null);
    setIsClientPreviewOnly(false);
    setIsLoadingPreview(true);

    warmDeletionCallableBackground("applyShowProductionRecovery");

    void showProductionRecoveryService
      .preview({
        upcomingShowId,
        action: "requeue_unfulfilled",
        targetUpcomingShowId: selectedShowId,
      })
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
          setIsClientPreviewOnly(false);
        }
      })
      .catch((previewError: unknown) => {
        const fallbackShow = showRef.current;
        if (cancelled || !fallbackShow) {
          return;
        }

        const targetShow =
          destinationOptionsRef.current.find((option) => option.show.id === selectedShowId)?.show ??
          null;
        const fallback = buildClientShowProductionRecoveryPreview({
          upcomingShowId,
          action: "requeue_unfulfilled",
          show: fallbackShow,
          allocations: allocationsRef.current.map((allocation) => ({
            status: allocation.status,
            allocatedQuantity: allocation.allocatedQuantity,
            upcomingShowId: allocation.upcomingShowId,
            printRequestId: allocation.printRequestId,
            requestNameSnapshot: allocation.requestNameSnapshot,
            id: allocation.id,
          })),
          now: nowRef.current,
          targetUpcomingShowId: selectedShowId,
          targetShow: targetShow
            ? {
                id: targetShow.id,
                title: formatUpcomingShowTitle(targetShow),
                scheduledStartAt: targetShow.scheduledStartAt,
                source: targetShow.source,
                maxTotalQuantity: targetShow.maxTotalQuantity,
                allocatedQuantity: targetShow.allocatedQuantity,
              }
            : null,
        });
        setPreview(fallback);
        setIsClientPreviewOnly(true);
        setError(
          previewError instanceof Error && previewError.message !== SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT
            ? previewError.message
            : null,
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedShowId, upcomingShowId]);

  const handleApply = useCallback(async () => {
    if (!upcomingShowId || !selectedShowId || !preview?.previewChecksum || isClientPreviewOnly) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await showProductionRecoveryService.apply({
        upcomingShowId,
        action: "requeue_unfulfilled",
        targetUpcomingShowId: selectedShowId,
        previewChecksum: preview.previewChecksum,
      });
      if (result.outcome === "applied" || result.outcome === "already_terminal") {
        const summaryMessage =
          result.outcome === "already_terminal"
            ? result.message
            : formatRequeueUnfulfilledSuccessMessage({
                sourceShowTitle: showLabel,
                targetShowTitle: preview.targetShow?.title ?? "Destination show",
                totalQuantity: preview.totalRequeueQuantity ?? 0,
                affectedPrintRequestIds: result.affectedPrintRequestIds,
                requeueLines: preview.requeueLines,
              });
        onCompleted(summaryMessage);
        return;
      }
      setError(result.message);
    } catch (applyError: unknown) {
      setError(applyError instanceof Error ? applyError.message : "Unable to apply recovery.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isClientPreviewOnly, onCompleted, preview, selectedShowId, showLabel, upcomingShowId]);

  if (!isOpen || !upcomingShowId) {
    return null;
  }

  const actionLabel = SHOW_PRODUCTION_RECOVERY_ACTION_LABELS.requeue_unfulfilled;
  const canApply =
    preview?.outcome === "applied" &&
    !isClientPreviewOnly &&
    Boolean(preview.previewChecksum) &&
    Boolean(selectedShowId);
  const isAlreadyDone = preview?.outcome === "already_terminal";

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="did-not-print-recovery-title"
        className="modal-panel modal-panel-lg show-production-recovery-modal show-did-not-print-modal"
        role="dialog"
      >
        <ModalHeader>
          <div className="show-production-recovery-header">
            <p className="eyebrow">Did Not Print</p>
            <h2 id="did-not-print-recovery-title">{showLabel}</h2>
            <p className="modal-subtitle">
              Move {totalRequeueQuantity} unprinted print{totalRequeueQuantity === 1 ? "" : "s"} to
              another upcoming show. Use the secondary option below only if you are not rescheduling
              onto another show yet.
            </p>
          </div>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
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
                  : "No upcoming shows have enough room for the unprinted quantity. Try another show or adjust capacity."}
              </p>
            ) : (
              <div className="show-did-not-print-destination-field">
                <Select
                  label="Destination show"
                  name="requeueDestinationShowId"
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
              </div>
            )
          ) : null}

          {selectedShowId && isLoadingPreview ? <p>Loading impact preview…</p> : null}
          {isClientPreviewOnly ? (
            <p className="show-recovery-deploy-notice">{SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT}</p>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          {preview ? <DidNotPrintRequeuePreviewBody preview={preview} /> : null}

          <div className="show-did-not-print-secondary">
            <p className="show-did-not-print-secondary-title eyebrow">Alternative: do not move to another show</p>
            <p className="show-did-not-print-secondary-copy">{SHOW_PRODUCTION_RELEASE_ONLY_HELPER}</p>
            <Button disabled={isSubmitting} onClick={onReleaseOnly} type="button" variant="secondary">
              {SHOW_PRODUCTION_RECOVERY_ACTION_LABELS.release_unfulfilled}
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={
              isSubmitting ||
              isLoadingPreview ||
              isLoadingShows ||
              isClientPreviewOnly ||
              (!canApply && !isAlreadyDone)
            }
            onClick={() => {
              if (isAlreadyDone) {
                onCompleted("Show is already terminal.");
                return;
              }
              void handleApply();
            }}
            type="button"
            variant="primary"
          >
            {isSubmitting ? "Applying…" : isAlreadyDone ? "Close" : actionLabel}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
