import { useState } from "react";

import { Info, X } from "lucide-react";

import type { ImportPngWarning } from "@fresh-prints/shared/types/import/importIpc.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import {
  formatImportValidationWarningMessage,
  getImportValidationMessageClassName,
} from "../utils/importValidationWarningDisplay";

interface ImportValidationWarningsTriggerProps {
  fileLabel?: string;
  warnings: ImportPngWarning[];
}

export function ImportValidationWarningsTrigger({
  fileLabel,
  warnings,
}: ImportValidationWarningsTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (warnings.length === 0) {
    return null;
  }

  const modalTitle = fileLabel ? `Import details · ${fileLabel}` : "Import details";

  return (
    <>
      <button
        aria-label={`${warnings.length} import detail${warnings.length === 1 ? "" : "s"}. Open details.`}
        className="import-validation-warnings-trigger import-validation-warnings-trigger-info"
        onClick={() => setIsOpen(true)}
        title={`${warnings.length} import detail${warnings.length === 1 ? "" : "s"}`}
        type="button"
      >
        <Info aria-hidden="true" size={14} strokeWidth={2.2} />
        <span className="import-validation-warnings-trigger-count">{warnings.length}</span>
      </button>

      {isOpen ? (
        <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
          <Modal
            aria-labelledby="import-validation-warnings-title"
            className="modal-panel-lg import-validation-warnings-modal"
          >
            <ModalHeader>
              <div>
                <p className="eyebrow">Import</p>
                <h2 id="import-validation-warnings-title">{modalTitle}</h2>
              </div>

              <button
                aria-label="Close import details"
                className="icon-button icon-button-md icon-button-ghost"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </ModalHeader>

            <ModalBody>
              <ul className="import-validation-warnings-modal-list">
                {warnings.map((warning, index) => (
                  <li
                    className={getImportValidationMessageClassName(warning.code)}
                    key={`${warning.code}-${index}`}
                  >
                    {formatImportValidationWarningMessage(warning)}
                  </li>
                ))}
              </ul>
            </ModalBody>

            <ModalFooter>
              <Button onClick={() => setIsOpen(false)} variant="secondary">
                Close
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}
    </>
  );
}
