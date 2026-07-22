import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type { Design } from "../types/design.types";

interface ArchiveDesignConfirmDialogProps {
  design: Design | null;
  error?: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ArchiveDesignConfirmDialog({
  design,
  error,
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: ArchiveDesignConfirmDialogProps) {
  if (!isOpen || !design) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="archive-design-title" className="modal-panel modal-panel-lg" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Confirm archive</p>
            <h2 id="archive-design-title">Archive {design.title}?</h2>
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
          <p>
            This will mark the design as archived. It will no longer appear in default library filters, but the
            record remains in the catalog. Restore will return the design to its previous status.
          </p>
          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={() => void onConfirm()} variant="danger">
            {isSubmitting ? "Archiving..." : "Archive design"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
