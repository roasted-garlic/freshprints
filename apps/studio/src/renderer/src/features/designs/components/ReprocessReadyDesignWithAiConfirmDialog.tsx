import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type { Design } from "../types/design.types";

interface ReprocessReadyDesignWithAiConfirmDialogProps {
  design: Design | null;
  error?: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ReprocessReadyDesignWithAiConfirmDialog({
  design,
  error,
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: ReprocessReadyDesignWithAiConfirmDialogProps) {
  if (!isOpen || !design) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="reprocess-ready-ai-title"
        className="modal-panel modal-panel-lg"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Owner maintenance</p>
            <h2 id="reprocess-ready-ai-title">Reprocess with AI?</h2>
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
            This will temporarily remove <strong>{design.title}</strong> from the Ready catalog and
            send it back through AI Processing using the current AI enrichment settings and category
            taxonomy. When processing finishes, the design will appear in Needs Review and must be
            approved again before returning to the Design Library.
          </p>
          <p className="design-details-muted">
            Staff Smart Profile edits, import presets, artwork, and print settings are kept. Existing
            print requests that already include this design are not deleted.
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
            {isSubmitting ? "Reprocessing…" : "Reprocess with AI"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
