import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type { StaffArtworkSummary } from "@fresh-prints/shared/types/staffArtwork/staffArtwork.types";

interface SendStaffArtworkToAiReviewConfirmDialogProps {
  artwork: StaffArtworkSummary | null;
  error?: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export function SendStaffArtworkToAiReviewConfirmDialog({
  artwork,
  error,
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: SendStaffArtworkToAiReviewConfirmDialogProps) {
  if (!isOpen || !artwork) {
    return null;
  }

  return (
    <div
      className="modal-overlay modal-overlay-blur"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <Modal
        aria-labelledby="staff-artwork-send-ai-title"
        className="modal-panel modal-panel-lg"
        role="dialog"
        aria-modal="true"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">AI Review</p>
            <h2 id="staff-artwork-send-ai-title">Send to AI Review?</h2>
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
            This copies <strong>{artwork.title}</strong> into the Design Library as a private catalog
            candidate and queues it for AI Processing. After a successful send, it is removed from
            this Staff Artwork library.
          </p>
          <p className="design-details-muted">
            Catalog publication still requires normal AI Review approval. You cannot send artwork that
            is already on a print request, show allocation, or gang sheet.
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
          <Button disabled={isSubmitting} onClick={() => void onConfirm()}>
            {isSubmitting ? "Sending…" : "Send to AI Review"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
