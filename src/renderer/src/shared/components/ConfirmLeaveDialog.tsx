import { X } from "lucide-react";

import { Button } from "./Button";

interface ConfirmLeaveDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  copy?: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
}

export function ConfirmLeaveDialog({
  cancelLabel = "Keep editing",
  confirmLabel = "Discard and continue",
  copy = "Your review changes are not saved until you approve. Switching designs will discard them.",
  isOpen,
  onCancel,
  onConfirm,
  title = "Discard unsaved edits?",
}: ConfirmLeaveDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
      <div className="modal-shell confirm-leave-dialog">
        <div className="confirm-leave-dialog-header">
          <h2 className="modal-title">{title}</h2>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </div>
        <p className="confirm-leave-dialog-copy">{copy}</p>
        <div className="modal-actions">
          <Button onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
