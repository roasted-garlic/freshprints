import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type {
  ApplyInternalGangSheetHistoricalReconciliationResponse,
  PreviewInternalGangSheetHistoricalReconciliationResponse,
} from "@fresh-prints/shared/types/staffGangSheet/internalGangSheetHistoricalReconciliation.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { internalGangSheetHistoricalReconciliationService } from "../services/internalGangSheetHistoricalReconciliationService";

export function InternalGangSheetHistoricalReconciliationDialog({
  isOpen,
  upcomingShowId,
  sheetLabel,
  onCancel,
  onCompleted,
}: {
  isOpen: boolean;
  upcomingShowId: string;
  sheetLabel: string;
  onCancel: () => void;
  onCompleted: (message: string) => void;
}) {
  const [preview, setPreview] = useState<PreviewInternalGangSheetHistoricalReconciliationResponse | null>(
    null,
  );
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !upcomingShowId) {
      return;
    }
    let cancelled = false;
    setIsLoadingPreview(true);
    setError(null);
    setPreview(null);
    void internalGangSheetHistoricalReconciliationService
      .preview({ upcomingShowId })
      .then((next) => {
        if (!cancelled) {
          setPreview(next);
        }
      })
      .catch((previewError: unknown) => {
        if (!cancelled) {
          setError(
            previewError instanceof Error
              ? previewError.message
              : "Unable to preview historical reconciliation.",
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
  }, [isOpen, upcomingShowId]);

  async function handleApply() {
    if (!preview?.canApply || !preview.previewChecksum) {
      return;
    }
    setIsApplying(true);
    setError(null);
    try {
      const result: ApplyInternalGangSheetHistoricalReconciliationResponse =
        await internalGangSheetHistoricalReconciliationService.apply({
          upcomingShowId,
          previewChecksum: preview.previewChecksum,
        });
      const message = result.alreadyApplied
        ? "Nothing to reconcile — this sheet’s finishable allocations are already resolved."
        : `Reconciled ${result.finishedAllocationCount} allocation(s). ${result.becamePrintedCount} request(s) Printed; ${result.remainQueuedCount} remain Queued.`;
      onCompleted(message);
    } catch (applyError: unknown) {
      setError(
        applyError instanceof Error ? applyError.message : "Unable to apply historical reconciliation.",
      );
    } finally {
      setIsApplying(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="internal-gs-historical-recon-title"
        className="modal-panel modal-panel-lg"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <h3 id="internal-gs-historical-recon-title">Reconcile unfinished allocations</h3>
            <p className="modal-hint">{sheetLabel}</p>
          </div>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isApplying}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          {isLoadingPreview ? <p>Loading impact preview…</p> : null}
          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
          {preview ? (
            <div className="show-recovery-preview">
              <dl className="upcoming-show-detail-facts show-recovery-preview-facts">
                <div>
                  <dt>Finishable allocations</dt>
                  <dd>{preview.finishableAllocationCount}</dd>
                </div>
                <div>
                  <dt>Already done</dt>
                  <dd>{preview.alreadyDoneAllocationCount}</dd>
                </div>
                <div>
                  <dt>Canceled</dt>
                  <dd>{preview.canceledAllocationCount}</dd>
                </div>
                <div>
                  <dt>Affected requests</dt>
                  <dd>{preview.affectedPrintRequestCount}</dd>
                </div>
                <div>
                  <dt>Would become Printed</dt>
                  <dd>{preview.wouldBecomePrintedCount}</dd>
                </div>
                <div>
                  <dt>Remain Queued</dt>
                  <dd>{preview.remainQueuedCount}</dd>
                </div>
              </dl>
              {preview.blockers.length > 0 ? (
                <ul className="form-error-list">
                  {preview.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              ) : null}
              {preview.notes.map((note) => (
                <p className="modal-hint" key={note}>
                  {note}
                </p>
              ))}
              {preview.requestEffects.length > 0 ? (
                <details>
                  <summary>Affected requests</summary>
                  <ul>
                    {preview.requestEffects.map((effect) => (
                      <li key={effect.printRequestId}>
                        {effect.requestName}: {effect.effect.replace(/_/g, " ")} (
                        {effect.finishableAllocationCount} finishable)
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isApplying} onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!preview?.canApply || isApplying || isLoadingPreview}
            onClick={() => void handleApply()}
            type="button"
            variant="primary"
          >
            {isApplying ? "Applying…" : "Apply reconciliation"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
