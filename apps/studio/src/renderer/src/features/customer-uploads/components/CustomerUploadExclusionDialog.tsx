import { useCallback, useRef, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useModalFocusContainment } from "../../../shared/hooks/useModalFocusContainment";

interface CustomerUploadExclusionDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
  title: string;
}

export function CustomerUploadExclusionDialog({
  isOpen,
  onCancel,
  onConfirm,
  title,
}: CustomerUploadExclusionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      <Modal aria-labelledby="customer-upload-exclude-title" className="modal-panel modal-panel-md">
        <ModalHeader>
          <div>
            <p className="eyebrow">Catalog review</p>
            <h2 id="customer-upload-exclude-title">Do not add to catalog?</h2>
          </div>
        </ModalHeader>
        <ModalBody>
          <p><strong>{title}</strong></p>
          <p>
            This moves the upload to Excluded. Its upload record, stored artwork, request items,
            and technical processing state remain unchanged. It can be restored later.
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
              if (isSubmitting) {
                return;
              }
              void (async () => {
                setIsSubmitting(true);
                try {
                  await onConfirm();
                } finally {
                  setIsSubmitting(false);
                }
              })();
            }}
            variant="danger"
          >
            {isSubmitting ? "Excluding…" : "Do not add to catalog"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
