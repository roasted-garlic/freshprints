import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type { User } from "../types/user.types";

interface DeactivateUserConfirmDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  teamUser: User | null;
}

export function DeactivateUserConfirmDialog({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
  teamUser,
}: DeactivateUserConfirmDialogProps) {
  if (!isOpen || !teamUser) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="deactivate-user-title" className="modal-panel modal-panel-md" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Confirm deactivation</p>
            <h2 id="deactivate-user-title">Deactivate {teamUser.displayName}?</h2>
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
            This will mark the account inactive in Fresh Prints and disable Firebase Authentication sign-in
            for {teamUser.email}.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={() => void onConfirm()} variant="danger">
            {isSubmitting ? "Deactivating..." : "Deactivate user"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
