import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";

interface ImportPreviewLightboxProps {
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  previewDataUrl: string | null;
  title: string;
}

export function ImportPreviewLightbox({
  alt,
  isOpen,
  onClose,
  previewDataUrl,
  title,
}: ImportPreviewLightboxProps) {
  if (!isOpen || !previewDataUrl) {
    return null;
  }

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
      <Modal aria-labelledby="import-preview-lightbox-title" className="import-preview-lightbox">
        <ModalHeader>
          <div>
            <p className="eyebrow">Preview</p>
            <h2 id="import-preview-lightbox-title">{title}</h2>
          </div>

          <button
            aria-label="Close preview"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

        <ModalBody>
          <div className="import-preview-lightbox-stage">
            <img alt={alt} className="import-preview-lightbox-image" src={previewDataUrl} />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
