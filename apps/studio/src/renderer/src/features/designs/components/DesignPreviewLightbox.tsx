import { useEffect } from "react";
import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";

interface DesignPreviewLightboxProps {
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
}

export function DesignPreviewLightbox({
  alt,
  isOpen,
  onClose,
  previewUrl,
}: DesignPreviewLightboxProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !previewUrl) {
    return null;
  }

  return (
    <div
      aria-label={`${alt} enlarged preview`}
      aria-modal="true"
      className="modal-overlay modal-overlay-blur design-preview-lightbox"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="design-preview-lightbox-shell"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <Button
          aria-label="Close preview"
          className="design-preview-lightbox-close"
          onClick={onClose}
          type="button"
          variant="secondary"
        >
          <X aria-hidden="true" size={18} strokeWidth={2} />
        </Button>

        <img
          alt={alt}
          className="design-preview-lightbox-image"
          decoding="async"
          src={previewUrl}
        />
      </div>
    </div>
  );
}
