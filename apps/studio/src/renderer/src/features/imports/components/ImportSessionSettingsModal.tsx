import { useCallback, useRef } from "react";

import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useModalFocusContainment } from "../../../shared/hooks/useModalFocusContainment";
import { ImportSessionSettingsForm } from "./ImportSessionSettingsForm";
import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";

interface ImportSessionSettingsModalProps {
  backgroundMode: ImportArtworkBackgroundMode;
  disabled?: boolean;
  halftoneMode: ImportHalftoneMode;
  isOpen: boolean;
  onBackgroundModeChange: (mode: ImportArtworkBackgroundMode) => void;
  onClose: () => void;
  onHalftoneModeChange: (mode: ImportHalftoneMode) => void;
}

export function ImportSessionSettingsModal({
  backgroundMode,
  disabled = false,
  halftoneMode,
  isOpen,
  onBackgroundModeChange,
  onClose,
  onHalftoneModeChange,
}: ImportSessionSettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const doneButtonRef = useRef<HTMLButtonElement>(null);

  const safeClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useModalFocusContainment({
    containerRef: modalRef,
    initialFocusRef: doneButtonRef,
    isOpen,
    onEscape: safeClose,
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
      <Modal
        aria-labelledby="import-session-settings-title"
        className="modal-panel import-session-settings-modal"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Imports</p>
            <h2 id="import-session-settings-title">Import settings</h2>
            <p className="import-session-settings-modal-lede">
              Applies to single and batch imports while you stay on this page. Resets when you leave
              Imports.
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          <ImportSessionSettingsForm
            backgroundMode={backgroundMode}
            disabled={disabled}
            halftoneMode={halftoneMode}
            onBackgroundModeChange={onBackgroundModeChange}
            onHalftoneModeChange={onHalftoneModeChange}
          />
        </ModalBody>
        <ModalFooter>
          <button
            className="button button-secondary button-md"
            onClick={safeClose}
            ref={doneButtonRef}
            type="button"
          >
            Done
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
