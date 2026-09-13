import { useCallback, useEffect, useRef, useState } from "react";

import type { PreviewCustomerUploadDeletionResponse } from "@fresh-prints/shared/types/deletion/deletion.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useModalFocusContainment } from "../../../shared/hooks/useModalFocusContainment";
import { customerUploadDeletionService } from "../services/customerUploadDeletionService";

interface CustomerUploadDeletionDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onCompleted: (message: string) => void;
  title: string;
  uploadId: string;
}

export function CustomerUploadDeletionDialog({
  isOpen,
  onCancel,
  onCompleted,
  title,
  uploadId,
}: CustomerUploadDeletionDialogProps) {
  const [preview, setPreview] = useState<PreviewCustomerUploadDeletionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const safeCancel = useCallback(() => {
    if (!isSubmitting) {
      onCancel();
    }
  }, [isSubmitting, onCancel]);

  useModalFocusContainment({
    containerRef: modalRef,
    initialFocusRef: cancelRef,
    isOpen,
    onEscape: safeCancel,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    let cancelled = false;
    setPreview(null);
    setError(null);
    setIsLoading(true);
    customerUploadDeletionService.warmMutateCallables();
    void customerUploadDeletionService
      .preview(uploadId)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      })
      .catch((previewError: unknown) => {
        if (!cancelled) {
          setError(
            previewError instanceof Error
              ? previewError.message
              : "Unable to determine whether this upload can be deleted.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, uploadId]);

  if (!isOpen) {
    return null;
  }

  const canDelete = preview?.outcome === "allowed_hard_delete" && !isLoading && !isSubmitting;

  return (
    <div
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      ref={modalRef}
      role="dialog"
    >
      <Modal
        aria-labelledby="customer-upload-delete-title"
        className="modal-panel modal-panel-md"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Permanent cleanup</p>
            <h2 id="customer-upload-delete-title">Delete Upload?</h2>
          </div>
        </ModalHeader>
        <ModalBody>
          <p><strong>{title}</strong></p>
          {isLoading ? <p>Checking whether this upload is safe to delete…</p> : null}
          {preview?.outcome === "allowed_hard_delete" ? (
            <p>This permanently removes the unused upload and its stored files. This cannot be undone.</p>
          ) : null}
          {preview?.outcome === "blocked" ? (
            <div role="alert">
              {preview.blockers.map((blocker) => <p key={blocker.code}>{blocker.message}</p>)}
            </div>
          ) : null}
          {preview?.outcome === "already_done" ? <p>This upload has already been deleted.</p> : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </ModalBody>
        <ModalFooter>
          <button
            className="button button-secondary button-md"
            disabled={isSubmitting}
            onClick={safeCancel}
            ref={cancelRef}
            type="button"
          >
            {preview?.outcome === "blocked" || preview?.outcome === "already_done" ? "Close" : "Cancel"}
          </button>
          {preview?.outcome === "allowed_hard_delete" ? (
            <Button
              disabled={!canDelete}
              onClick={() => {
                if (!canDelete) {
                  return;
                }
                void (async () => {
                  setIsSubmitting(true);
                  setError(null);
                  try {
                    const result = await customerUploadDeletionService.deleteEligible(
                      uploadId,
                      customerUploadDeletionService.confirmationPhrase,
                    );
                    if (result.outcome === "blocked" || result.outcome === "failed") {
                      setError(result.blockers?.[0]?.message ?? result.message);
                      return;
                    }
                    onCompleted(result.message);
                  } catch (submitError: unknown) {
                    setError(
                      submitError instanceof Error
                        ? submitError.message
                        : "Unable to delete this upload. Please try again.",
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                })();
              }}
              variant="danger"
            >
              {isSubmitting ? "Deleting…" : "Delete Upload"}
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>
    </div>
  );
}
