import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";

interface AiReviewUnsavedDialogProps {
  confirmLabel?: string;
  copy?: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
}

export function AiReviewUnsavedDialog({
  confirmLabel = "Discard and continue",
  copy = "Your review changes are not saved until you approve. Switching designs will discard them.",
  isOpen,
  onCancel,
  onConfirm,
  title = "Discard unsaved edits?",
}: AiReviewUnsavedDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
      <div className="modal-shell ai-review-unsaved-dialog">
        <div className="ai-review-unsaved-dialog-header">
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
        <p className="ai-review-unsaved-dialog-copy">{copy}</p>
        <div className="modal-actions">
          <Button onClick={onCancel} variant="secondary">
            Keep editing
          </Button>
          <Button onClick={onConfirm} variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
