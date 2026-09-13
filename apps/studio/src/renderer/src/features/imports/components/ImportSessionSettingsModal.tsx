import { useCallback, useEffect, useRef, useState } from "react";

import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useModalFocusContainment } from "../../../shared/hooks/useModalFocusContainment";
import { ImportSessionSettingsForm } from "./ImportSessionSettingsForm";
import { SmartProfilePresetsEditor } from "./SmartProfilePresetsEditor";
import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import type { SmartProfileDimensionLists } from "@fresh-prints/shared/types/catalog/smartProfile.types";

interface ImportSessionSettingsModalProps {
  backgroundMode: ImportArtworkBackgroundMode;
  disabled?: boolean;
  halftoneMode: ImportHalftoneMode;
  isOpen: boolean;
  smartProfilePresets?: Partial<SmartProfileDimensionLists>;
  onBackgroundModeChange: (mode: ImportArtworkBackgroundMode) => void;
  onClose: () => void;
  onHalftoneModeChange: (mode: ImportHalftoneMode) => void;
  onSmartProfilePresetsChange?: (presets: Partial<SmartProfileDimensionLists> | undefined) => void;
}

export function ImportSessionSettingsModal({
  backgroundMode,
  disabled = false,
  halftoneMode,
  isOpen,
  smartProfilePresets,
  onBackgroundModeChange,
  onClose,
  onHalftoneModeChange,
  onSmartProfilePresetsChange,
}: ImportSessionSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "presets">("presets");
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

  useEffect(() => {
    if (isOpen) {
      setActiveTab("presets");
    }
  }, [isOpen]);

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
        <ModalBody className="import-session-settings-modal-body">
          <div
            aria-label="Import session settings sections"
            className="import-session-settings-tabs"
            role="tablist"
          >
            {onSmartProfilePresetsChange ? (
              <button
                aria-controls="import-session-presets-panel"
                aria-selected={activeTab === "presets"}
                className={`import-session-settings-tab${activeTab === "presets" ? " is-active" : ""}`}
                id="import-session-presets-tab"
                onClick={() => setActiveTab("presets")}
                role="tab"
                type="button"
              >
                Smart Profile presets
              </button>
            ) : null}
            <button
              aria-controls="import-session-settings-panel"
              aria-selected={activeTab === "settings"}
              className={`import-session-settings-tab${activeTab === "settings" ? " is-active" : ""}`}
              id="import-session-settings-tab"
              onClick={() => setActiveTab("settings")}
              role="tab"
              type="button"
            >
              Import settings
            </button>
          </div>

          <div
            aria-labelledby="import-session-settings-tab"
            className="import-session-settings-tab-panel"
            hidden={activeTab !== "settings"}
            id="import-session-settings-panel"
            role="tabpanel"
          >
            <ImportSessionSettingsForm
              backgroundMode={backgroundMode}
              disabled={disabled}
              halftoneMode={halftoneMode}
              onBackgroundModeChange={onBackgroundModeChange}
              onHalftoneModeChange={onHalftoneModeChange}
            />
          </div>
          {onSmartProfilePresetsChange ? (
            <div
              aria-labelledby="import-session-presets-tab"
              className="import-session-settings-tab-panel"
              hidden={activeTab !== "presets"}
              id="import-session-presets-panel"
              role="tabpanel"
            >
              <SmartProfilePresetsEditor
                disabled={disabled}
                onChange={onSmartProfilePresetsChange}
                presets={smartProfilePresets}
              />
            </div>
          ) : null}
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
