import { useCallback, useRef } from "react";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useModalFocusContainment } from "../../../shared/hooks/useModalFocusContainment";

interface CustomerUploadRestoreDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
  title: string;
}

export function CustomerUploadRestoreDialog({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
  title,
}: CustomerUploadRestoreDialogProps) {
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      ref={modalRef}
      role="dialog"
    >
      <Modal aria-labelledby="customer-upload-restore-title" className="modal-panel modal-panel-md">
        <ModalHeader>
          <div>
            <p className="eyebrow">Catalog review</p>
            <h2 id="customer-upload-restore-title">Restore to Pending?</h2>
          </div>
        </ModalHeader>
        <ModalBody>
          <p><strong>{title}</strong></p>
          <p>
            This returns the existing upload to Pending for catalog review. Its artwork, request
            references, technical status, and stored files remain unchanged.
          </p>
        </ModalBody>
        <ModalFooter>
          <button
            className="button button-secondary button-md"
            disabled={isSubmitting}
            onClick={safeCancel}
            ref={cancelRef}
            type="button"
          >
            Cancel
          </button>
          <Button
            disabled={isSubmitting}
            onClick={() => {
              if (!isSubmitting) {
                void onConfirm();
              }
            }}
            variant="primary"
          >
            {isSubmitting ? "Restoring…" : "Restore to Pending"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
