import { X } from "lucide-react";
import { createPortal } from "react-dom";

import { Modal, ModalBody, ModalHeader } from "../../../shared/components/Modal";
import { StudioUpdatesSettingsSection } from "./StudioUpdatesSettingsSection";

interface StudioUpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Thin shell so desktop staff (including Helpers without manageSettings) can open the
 * existing Studio updater UI without entering Settings.
 *
 * Portaled to document.body so sidebar isolation/overflow cannot trap or clip the overlay.
 */
export function StudioUpdatesModal({ isOpen, onClose }: StudioUpdatesModalProps) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="modal-overlay modal-overlay-blur studio-updates-modal-overlay"
      onClick={onClose}
    >
      <div onClick={(event) => event.stopPropagation()} role="presentation">
        <Modal
          aria-labelledby="studio-updates-modal-title"
          aria-modal="true"
          className="studio-updates-modal-panel"
          role="dialog"
        >
          <ModalHeader>
            <div>
              <h2 id="studio-updates-modal-title">Studio Updates</h2>
            </div>
            <button
              aria-label="Close Studio Updates"
              className="icon-button icon-button-md icon-button-ghost"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} strokeWidth={2.2} />
            </button>
          </ModalHeader>
          <ModalBody>
            <StudioUpdatesSettingsSection />
          </ModalBody>
        </Modal>
      </div>
    </div>,
    document.body,
  );
}
