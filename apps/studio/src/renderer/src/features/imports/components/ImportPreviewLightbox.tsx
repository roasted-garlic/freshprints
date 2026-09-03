import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import {
  getPreviewLightboxNavigationState,
  isPreviewLightboxEditableKeyboardTarget,
} from "@fresh-prints/shared/utils/previewLightboxNavigation";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";

export interface ImportPreviewLightboxNavItem {
  id: string;
  alt: string;
  title: string;
  previewDataUrl: string;
  backgroundCssHex?: string;
}

interface ImportPreviewLightboxProps {
  alt: string;
  backgroundCssHex?: string;
  isOpen: boolean;
  onClose: () => void;
  previewDataUrl: string | null;
  title: string;
  navigationItems?: readonly ImportPreviewLightboxNavItem[];
  activeItemId?: string | null;
  onActiveItemChange?: (itemId: string) => void;
  onCloseWithFinalItemId?: (finalItemId: string | null) => void;
}

export function ImportPreviewLightbox({
  alt,
  backgroundCssHex,
  isOpen,
  onClose,
  previewDataUrl,
  title,
  navigationItems,
  activeItemId,
  onActiveItemChange,
  onCloseWithFinalItemId,
}: ImportPreviewLightboxProps) {
  const navIds = navigationItems?.map((item) => item.id) ?? [];
  const navState = getPreviewLightboxNavigationState(navIds, activeItemId ?? null);
  const showNavigation = Boolean(navigationItems && navigationItems.length > 1 && activeItemId);
  const activeNavItem =
    showNavigation && activeItemId
      ? navigationItems?.find((item) => item.id === activeItemId)
      : undefined;

  const displayAlt = activeNavItem?.alt ?? alt;
  const displayTitle = activeNavItem?.title ?? title;
  const displayUrl = activeNavItem?.previewDataUrl ?? previewDataUrl;
  const displayBackground = activeNavItem?.backgroundCssHex ?? backgroundCssHex;

  function closeLightbox() {
    onCloseWithFinalItemId?.(activeItemId ?? null);
    onClose();
  }

  function goPrevious() {
    if (!navState.canGoPrevious || !navState.previousId || !onActiveItemChange) {
      return;
    }
    onActiveItemChange(navState.previousId);
  }

  function goNext() {
    if (!navState.canGoNext || !navState.nextId || !onActiveItemChange) {
      return;
    }
    onActiveItemChange(navState.nextId);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }

      if (!showNavigation || isPreviewLightboxEditableKeyboardTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lightbox open session
  }, [
    isOpen,
    showNavigation,
    navState.canGoPrevious,
    navState.canGoNext,
    navState.previousId,
    navState.nextId,
    activeItemId,
  ]);

  if (!isOpen || !displayUrl) {
    return null;
  }

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" onClick={closeLightbox} role="dialog">
      <Modal
        aria-labelledby="import-preview-lightbox-title"
        className="import-preview-lightbox"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Preview</p>
            <h2 id="import-preview-lightbox-title">{displayTitle}</h2>
            {showNavigation && navState.positionLabel ? (
              <p aria-live="polite" className="import-preview-lightbox-position">
                {navState.positionLabel}
              </p>
            ) : null}
          </div>

          <button
            aria-label="Close preview"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={closeLightbox}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

        <ModalBody>
          <div className="import-preview-lightbox-nav-stage">
            {showNavigation ? (
              <Button
                aria-label="Previous image"
                className="import-preview-lightbox-nav"
                disabled={!navState.canGoPrevious}
                onClick={goPrevious}
                type="button"
                variant="secondary"
              >
                <ChevronLeft aria-hidden="true" size={20} strokeWidth={2} />
              </Button>
            ) : null}

            <div
              className="import-preview-lightbox-stage"
              style={displayBackground ? { background: displayBackground } : undefined}
            >
              <img
                alt={displayAlt}
                className="import-preview-lightbox-image"
                src={displayUrl}
                style={displayBackground ? { background: displayBackground } : undefined}
              />
            </div>

            {showNavigation ? (
              <Button
                aria-label="Next image"
                className="import-preview-lightbox-nav"
                disabled={!navState.canGoNext}
                onClick={goNext}
                type="button"
                variant="secondary"
              >
                <ChevronRight aria-hidden="true" size={20} strokeWidth={2} />
              </Button>
            ) : null}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button onClick={closeLightbox} variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
