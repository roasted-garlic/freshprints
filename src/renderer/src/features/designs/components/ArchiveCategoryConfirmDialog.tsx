import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type { Category } from "../types/category.types";

interface ArchiveCategoryConfirmDialogProps {
  category: Category | null;
  error?: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ArchiveCategoryConfirmDialog({
  category,
  error,
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: ArchiveCategoryConfirmDialogProps) {
  if (!isOpen || !category) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="archive-category-title" className="modal-panel modal-panel-md" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Confirm archive</p>
            <h2 id="archive-category-title">Archive {category.name}?</h2>
          </div>
        </ModalHeader>
        <ModalBody>
          <p>
            Archived categories cannot be assigned to new designs. Existing design records keep their current
            category reference.
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
            {isSubmitting ? "Archiving..." : "Archive category"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
