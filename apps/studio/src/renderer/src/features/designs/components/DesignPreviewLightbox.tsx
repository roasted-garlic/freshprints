import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { resolveArtworkBackgroundHex } from "@fresh-prints/shared/constants/design/artworkBackground.constants";
import {
  getPreviewLightboxNavigationState,
  isPreviewLightboxEditableKeyboardTarget,
  preloadImageUrl,
} from "@fresh-prints/shared/utils/previewLightboxNavigation";

import { Button } from "../../../shared/components/Button";

export interface DesignPreviewLightboxNavItem {
  id: string;
  alt: string;
  /** Optional when parent continuously resolves the active item's `previewUrl` prop. */
  previewUrl?: string;
  artworkBackgroundHex?: string;
}

interface DesignPreviewLightboxProps {
  alt: string;
  artworkBackgroundHex?: string;
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
  /** Ordered previewable siblings. When omitted or length ≤ 1, singleton behavior. */
  navigationItems?: readonly DesignPreviewLightboxNavItem[];
  activeItemId?: string | null;
  onActiveItemChange?: (itemId: string) => void;
  /** Invoked with the final active id when closing (falls back to current singleton). */
  onCloseWithFinalItemId?: (finalItemId: string | null) => void;
}

interface CommittedPresentation {
  alt: string;
  url: string;
  artworkBackgroundHex?: string;
}

/**
 * Keep mat color locked to the painted image. On Previous/Next, hold the previous
 * presentation until the next URL is ready, then swap image + background together.
 */
function useCommittedLightboxPresentation(
  isOpen: boolean,
  targetUrl: string | null,
  targetAlt: string,
  targetBackground: string | undefined,
): CommittedPresentation | null {
  const [committed, setCommitted] = useState<CommittedPresentation | null>(null);
  const paintedUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      requestIdRef.current += 1;
      paintedUrlRef.current = null;
      setCommitted(null);
      return;
    }

    if (!targetUrl) {
      return;
    }

    const next: CommittedPresentation = {
      alt: targetAlt,
      url: targetUrl,
      artworkBackgroundHex: targetBackground,
    };

    if (!paintedUrlRef.current || paintedUrlRef.current === targetUrl) {
      paintedUrlRef.current = targetUrl;
      setCommitted((current) => ({
        ...next,
        artworkBackgroundHex: next.artworkBackgroundHex ?? current?.artworkBackgroundHex,
      }));
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    void preloadImageUrl(targetUrl).then(() => {
      if (cancelled || requestIdRef.current !== requestId) {
        return;
      }
      paintedUrlRef.current = targetUrl;
      setCommitted(next);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, targetUrl, targetAlt, targetBackground]);

  return committed;
}

export function DesignPreviewLightbox({
  alt,
  artworkBackgroundHex,
  isOpen,
  onClose,
  previewUrl,
  navigationItems,
  activeItemId,
  onActiveItemChange,
  onCloseWithFinalItemId,
}: DesignPreviewLightboxProps) {
  const navIds = navigationItems?.map((item) => item.id) ?? [];
  const navState = getPreviewLightboxNavigationState(navIds, activeItemId ?? null);
  const showNavigation = Boolean(navigationItems && navigationItems.length > 1 && activeItemId);
  const activeNavItem =
    showNavigation && activeItemId
      ? navigationItems?.find((item) => item.id === activeItemId)
      : undefined;

  const targetAlt = activeNavItem?.alt ?? alt;
  const resolvedDisplayUrl = previewUrl || activeNavItem?.previewUrl || null;
  // Only advance the mat when we have a fresh URL for the active item. While the previous
  // URL is held during async derivative resolve, omit background so the committed mat stays.
  const targetBackground = resolvedDisplayUrl
    ? (activeNavItem?.artworkBackgroundHex ?? artworkBackgroundHex)
    : undefined;

  const lastDisplayUrlRef = useRef<string | null>(null);
  if (!isOpen) {
    lastDisplayUrlRef.current = null;
  } else if (resolvedDisplayUrl) {
    lastDisplayUrlRef.current = resolvedDisplayUrl;
  }
  const targetUrl = resolvedDisplayUrl ?? lastDisplayUrlRef.current;

  const presentation = useCommittedLightboxPresentation(
    isOpen,
    targetUrl,
    targetAlt,
    targetBackground,
  );

  function closeLightbox() {
    const finalId = activeItemId ?? null;
    onCloseWithFinalItemId?.(finalId);
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

  if (!isOpen || !presentation) {
    return null;
  }

  const imageStyle: CSSProperties | undefined = presentation.artworkBackgroundHex
    ? ({
        ["--color-artwork-preview-bg" as string]: resolveArtworkBackgroundHex(
          presentation.artworkBackgroundHex,
        ),
        backgroundColor: resolveArtworkBackgroundHex(presentation.artworkBackgroundHex),
      } as CSSProperties)
    : undefined;

  return (
    <div
      aria-label={`${presentation.alt} enlarged preview`}
      aria-modal="true"
      className="modal-overlay modal-overlay-blur design-preview-lightbox"
      onClick={closeLightbox}
      role="dialog"
    >
      <div
        className="design-preview-lightbox-shell"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <div className="design-preview-lightbox-chrome">
          {showNavigation && navState.positionLabel ? (
            <span aria-live="polite" className="design-preview-lightbox-position">
              {navState.positionLabel}
            </span>
          ) : (
            <span className="design-preview-lightbox-position-spacer" />
          )}
          <Button
            aria-label="Close preview"
            className="design-preview-lightbox-close"
            onClick={closeLightbox}
            type="button"
            variant="secondary"
          >
            <X aria-hidden="true" size={18} strokeWidth={2} />
          </Button>
        </div>

        <div className="design-preview-lightbox-stage">
          {showNavigation ? (
            <Button
              aria-label="Previous image"
              className="design-preview-lightbox-nav design-preview-lightbox-nav--prev"
              disabled={!navState.canGoPrevious}
              onClick={goPrevious}
              type="button"
              variant="secondary"
            >
              <ChevronLeft aria-hidden="true" size={22} strokeWidth={2} />
            </Button>
          ) : null}

          <img
            alt={presentation.alt}
            className="design-preview-lightbox-image"
            decoding="async"
            src={presentation.url}
            style={imageStyle}
          />

          {showNavigation ? (
            <Button
              aria-label="Next image"
              className="design-preview-lightbox-nav design-preview-lightbox-nav--next"
              disabled={!navState.canGoNext}
              onClick={goNext}
              type="button"
              variant="secondary"
            >
              <ChevronRight aria-hidden="true" size={22} strokeWidth={2} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
