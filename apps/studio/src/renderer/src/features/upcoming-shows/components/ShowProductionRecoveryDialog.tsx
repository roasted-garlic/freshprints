import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import type {
  PreviewShowProductionRecoveryResponse,
  ShowProductionRecoveryAction,
} from "@fresh-prints/shared/types/showProductionRecovery/showProductionRecovery.types";
import { PRODUCTION_OVERRIDE_REASON_MAX_LENGTH } from "@fresh-prints/shared/types/showProductionRecovery/showProductionRecovery.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import { buildClientShowProductionRecoveryPreview } from "@fresh-prints/shared/utils/showProductionRecovery";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { warmDeletionCallableBackground } from "../../deletion/services/deletionCallableWarmupService";
import {
  SHOW_PRODUCTION_RECOVERY_ACTION_LABELS,
  SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT,
  showProductionRecoveryService,
} from "../services/showProductionRecoveryService";

interface ShowProductionRecoveryDialogProps {
  isOpen: boolean;
  upcomingShowId: string | null;
  showLabel: string;
  show: UpcomingShow | null;
  allocations: ShowAllocation[];
  now: Date;
  action: ShowProductionRecoveryAction | null;
  onCancel: () => void;
  onCompleted: (message: string) => void;
}

function ShowProductionRecoveryPreviewBody({
  preview,
  action,
  overrideReason,
  onOverrideReasonChange,
}: {
  preview: PreviewShowProductionRecoveryResponse;
  action: ShowProductionRecoveryAction;
  overrideReason: string;
  onOverrideReasonChange: (value: string) => void;
}) {
  return (
    <div className="show-recovery-preview">
      <dl className="upcoming-show-detail-facts show-recovery-preview-facts">
        <div>
          <dt>Production status</dt>
          <dd>{preview.productionStatus}</dd>
        </div>
        <div>
          <dt>Active allocations</dt>
          <dd>
            {preview.activeAllocationCount} ({preview.activeAllocationQuantity} qty)
          </dd>
        </div>
        <div>
          <dt>Finishable allocations</dt>
          <dd>{preview.finishableAllocationCount}</dd>
        </div>
        <div>
          <dt>Affected Print Requests</dt>
          <dd>{preview.affectedPrintRequestCount}</dd>
        </div>
        <div>
          <dt>Production started</dt>
          <dd>{preview.productionStarted ? "Yes" : "No"}</dd>
        </div>
      </dl>

      {preview.otherShowAllocationWarning ? (
        <p className="show-recovery-warning">
          Some requests also have allocations on other shows — only this show will be changed.
        </p>
      ) : null}

      {preview.notes.length > 0 ? (
        <ul className="show-recovery-notes">
          {preview.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {preview.requestEffects.length > 0 ? (
        <div className="show-recovery-request-effects">
          <p className="eyebrow">Print Request impact</p>
          <ul>
            {preview.requestEffects.map((effect) => (
              <li key={effect.printRequestId}>
                <strong>{effect.requestNameSnapshot}</strong>
                {effect.currentPersistedStatus !== "—" ? (
                  <span>
                    {" "}
                    — {effect.currentPersistedStatus} → {effect.predictedPersistedStatus}
                    {effect.predictedQueueTab ? ` (tab ${effect.predictedQueueTab})` : ""}
                  </span>
                ) : null}
                {effect.otherShowAllocationCount > 0 ? (
                  <span className="show-recovery-request-other-shows">
                    {" "}
                    · {effect.otherShowAllocationCount} allocation(s) on other shows (
                    {effect.otherShowAllocationQuantity} qty)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.blockers.length > 0 && preview.outcome === "blocked" ? (
        <ul className="form-error-list">
          {preview.blockers.map((blocker) => (
            <li key={blocker.code}>{blocker.message}</li>
          ))}
        </ul>
      ) : null}

      {action === "force_completed" ? (
        <AutoResizeTextarea
          label="Owner override reason"
          maxLength={PRODUCTION_OVERRIDE_REASON_MAX_LENGTH}
          name="overrideReason"
          onChange={(event) => onOverrideReasonChange(event.target.value)}
          placeholder="Why is this override required?"
          value={overrideReason}
        />
      ) : null}
    </div>
  );
}

export function ShowProductionRecoveryDialog({
  isOpen,
  upcomingShowId,
  showLabel,
  show,
  allocations,
  now,
  action,
  onCancel,
  onCompleted,
}: ShowProductionRecoveryDialogProps) {
  const [preview, setPreview] = useState<PreviewShowProductionRecoveryResponse | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClientPreviewOnly, setIsClientPreviewOnly] = useState(false);

  // Parent re-renders on a schedule clock (`now`) and allocation snapshots; keep fallback
  // inputs in refs so the preview effect does not re-fetch / flicker after first load.
  const showRef = useRef(show);
  const allocationsRef = useRef(allocations);
  const nowRef = useRef(now);
  showRef.current = show;
  allocationsRef.current = allocations;
  nowRef.current = now;

  useEffect(() => {
    if (!isOpen || !upcomingShowId || !action) {
      return;
    }
    let cancelled = false;
    setOverrideReason("");
    setError(null);
    setPreview(null);
    setIsClientPreviewOnly(false);
    setIsLoadingPreview(true);

    // Warm mutate service in parallel so confirm is less likely to cold-start after preview.
    warmDeletionCallableBackground("applyShowProductionRecovery");

    void showProductionRecoveryService
      .preview({ upcomingShowId, action })
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
          setIsClientPreviewOnly(false);
        }
      })
      .catch((previewError: unknown) => {
        if (cancelled) {
          return;
        }
        const fallbackShow = showRef.current;
        if (fallbackShow) {
          const fallback = buildClientShowProductionRecoveryPreview({
            upcomingShowId,
            action,
            show: fallbackShow,
            allocations: allocationsRef.current.map((allocation) => ({
              status: allocation.status,
              allocatedQuantity: allocation.allocatedQuantity,
              upcomingShowId: allocation.upcomingShowId,
              printRequestId: allocation.printRequestId,
              requestNameSnapshot: allocation.requestNameSnapshot,
            })),
            now: nowRef.current,
          });
          setPreview(fallback);
          setIsClientPreviewOnly(true);
          setError(
            previewError instanceof Error && previewError.message !== SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT
              ? previewError.message
              : null,
          );
        } else {
          setError(
            previewError instanceof Error ? previewError.message : "Unable to preview recovery.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [action, isOpen, upcomingShowId]);

  const handleApply = useCallback(async () => {
    if (!upcomingShowId || !action || isClientPreviewOnly) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await showProductionRecoveryService.apply({
        upcomingShowId,
        action,
        overrideReason: action === "force_completed" ? overrideReason : undefined,
      });
      if (result.outcome === "applied" || result.outcome === "already_terminal") {
        onCompleted(result.message);
        return;
      }
      setError(result.message);
    } catch (applyError: unknown) {
      setError(applyError instanceof Error ? applyError.message : "Unable to apply recovery.");
    } finally {
      setIsSubmitting(false);
    }
  }, [action, isClientPreviewOnly, onCompleted, overrideReason, upcomingShowId]);

  if (!isOpen || !upcomingShowId || !action) {
    return null;
  }

  const actionLabel = SHOW_PRODUCTION_RECOVERY_ACTION_LABELS[action];
  const canApply = preview?.outcome === "applied" && !isClientPreviewOnly;
  const isAlreadyDone = preview?.outcome === "already_terminal";

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="show-production-recovery-title"
        className="modal-panel modal-panel-lg show-production-recovery-modal"
        role="dialog"
      >
        <ModalHeader>
          <div className="show-production-recovery-header">
            <p className="eyebrow">{actionLabel}</p>
            <h2 id="show-production-recovery-title">{showLabel}</h2>
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
          {isLoadingPreview ? <p>Loading impact preview…</p> : null}
          {isClientPreviewOnly ? (
            <p className="show-recovery-deploy-notice">{SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT}</p>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          {preview ? (
            <ShowProductionRecoveryPreviewBody
              action={action}
              onOverrideReasonChange={setOverrideReason}
              overrideReason={overrideReason}
              preview={preview}
            />
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={
              isSubmitting ||
              isLoadingPreview ||
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

interface OwnerShowProductionOverrideDialogProps {
  isOpen: boolean;
  upcomingShowId: string | null;
  showLabel: string;
  show: UpcomingShow | null;
  allocations: ShowAllocation[];
  now: Date;
  onCancel: () => void;
  onCompleted: (message: string) => void;
}

const OWNER_OVERRIDE_ACTIONS: ShowProductionRecoveryAction[] = [
  "close_empty",
  "release_unfulfilled",
  "mark_fulfilled",
  "force_completed",
];

export function OwnerShowProductionOverrideDialog({
  isOpen,
  upcomingShowId,
  showLabel,
  show,
  allocations,
  now,
  onCancel,
  onCompleted,
}: OwnerShowProductionOverrideDialogProps) {
  const [selectedAction, setSelectedAction] = useState<ShowProductionRecoveryAction | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAction(null);
    }
  }, [isOpen]);

  if (!isOpen || !upcomingShowId) {
    return null;
  }

  if (selectedAction) {
    return (
      <ShowProductionRecoveryDialog
        action={selectedAction}
        allocations={allocations}
        isOpen={isOpen}
        now={now}
        onCancel={() => setSelectedAction(null)}
        onCompleted={onCompleted}
        show={show}
        showLabel={showLabel}
        upcomingShowId={upcomingShowId}
      />
    );
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="owner-show-production-override-title"
        className="modal-panel modal-panel-lg show-production-recovery-modal"
        role="dialog"
      >
        <ModalHeader>
          <div className="show-production-recovery-header">
            <p className="eyebrow">Owner override</p>
            <h2 id="owner-show-production-override-title">{showLabel}</h2>
          </div>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          <p>Pick a semantic recovery action. This is not a raw status editor.</p>
          <div className="show-recovery-action-list">
            {OWNER_OVERRIDE_ACTIONS.map((recoveryAction) => (
              <Button
                key={recoveryAction}
                onClick={() => setSelectedAction(recoveryAction)}
                type="button"
                variant="secondary"
              >
                {SHOW_PRODUCTION_RECOVERY_ACTION_LABELS[recoveryAction]}
              </Button>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
