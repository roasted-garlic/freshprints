'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';
import {
  getPreviewLightboxNavigationState,
  isPreviewLightboxEditableKeyboardTarget,
  preloadImageUrl,
} from '@fresh-prints/shared/utils/previewLightboxNavigation';

import { ChevronLeftIcon, ChevronRightIcon } from '../../shared/components/PortalIcons';
import { useExplicitContentPreference } from '../hooks/useExplicitContentPreference';

export interface CatalogPreviewLightboxNavItem {
  id: string;
  alt: string;
  /**
   * Optional when the parent continuously swaps the active entity and supplies
   * `previewUrl` on the lightbox (Pattern A). Prefer a concrete URL when known.
   */
  previewUrl?: string;
  artworkBackgroundHex?: string;
  isExplicitContent?: boolean;
}

interface CatalogPreviewLightboxProps {
  alt: string;
  artworkBackgroundHex?: string;
  className?: string;
  /** Same censor rules as CatalogThumbnailPanel — presentation-only. */
  isExplicitContent?: boolean;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Reveal handler shared with the caller's Design Details `sessionRevealed` state. In the
   * normal flow the lightbox only opens once already revealed there, so this is a defensive
   * fallback — never a second independent reveal gate.
   */
  onReveal?: () => void;
  previewUrl: string | null;
  /** Reveal state lifted from the paired Design Details hero — one reveal gate per open session. */
  sessionRevealed?: boolean;
  /** Ordered previewable siblings. When omitted or length ≤ 1, singleton behavior. */
  navigationItems?: readonly CatalogPreviewLightboxNavItem[];
  activeItemId?: string | null;
  onActiveItemChange?: (itemId: string) => void;
  onCloseWithFinalItemId?: (finalItemId: string | null) => void;
}

interface CommittedPresentation {
  alt: string;
  url: string;
  artworkBackgroundHex?: string;
  isExplicitContent: boolean;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
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
  targetExplicit: boolean,
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
      isExplicitContent: targetExplicit,
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
  }, [isOpen, targetUrl, targetAlt, targetBackground, targetExplicit]);

  return committed;
}

export function CatalogPreviewLightbox({
  alt,
  artworkBackgroundHex,
  className,
  isExplicitContent = false,
  isOpen,
  onClose,
  onReveal,
  previewUrl,
  sessionRevealed = false,
  navigationItems,
  activeItemId,
  onActiveItemChange,
  onCloseWithFinalItemId,
}: CatalogPreviewLightboxProps) {
  const { showExplicitContent } = useExplicitContentPreference();

  const navIds = navigationItems?.map((item) => item.id) ?? [];
  const navState = getPreviewLightboxNavigationState(navIds, activeItemId ?? null);
  const showNavigation = Boolean(navigationItems && navigationItems.length > 1 && activeItemId);
  const activeNavItem =
    showNavigation && activeItemId
      ? navigationItems?.find((item) => item.id === activeItemId)
      : undefined;

  const targetAlt = activeNavItem?.alt ?? alt;
  const resolvedDisplayUrl = activeNavItem?.previewUrl || previewUrl || null;
  // Only advance the mat when we have a fresh URL for the active item. While the previous
  // URL is held during async derivative resolve, omit background so the committed mat stays.
  const targetBackground = resolvedDisplayUrl
    ? (activeNavItem?.artworkBackgroundHex ?? artworkBackgroundHex)
    : undefined;
  const targetExplicit = activeNavItem?.isExplicitContent ?? isExplicitContent;

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
    targetExplicit,
  );

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
      if (event.key === 'Escape') {
        closeLightbox();
        return;
      }

      if (!showNavigation || isPreviewLightboxEditableKeyboardTarget(event.target)) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const isCensored = presentation.isExplicitContent && !showExplicitContent && !sessionRevealed;

  const imageStyle: CSSProperties | undefined = presentation.artworkBackgroundHex
    ? ({
        ['--color-artwork-preview-bg' as string]: resolveArtworkBackgroundHex(
          presentation.artworkBackgroundHex,
        ),
        backgroundColor: resolveArtworkBackgroundHex(presentation.artworkBackgroundHex),
      } as CSSProperties)
    : undefined;

  return (
    <div
      aria-label={`${presentation.alt} enlarged preview`}
      aria-modal="true"
      className={`modal-overlay modal-overlay-blur design-preview-lightbox${className ? ` ${className}` : ''}`}
      onClick={closeLightbox}
      role="dialog"
    >
      <div className="design-preview-lightbox-shell" onClick={(event) => event.stopPropagation()} role="presentation">
        <div className="design-preview-lightbox-chrome">
          {showNavigation && navState.positionLabel ? (
            <span aria-live="polite" className="design-preview-lightbox-position">
              {navState.positionLabel}
            </span>
          ) : (
            <span className="design-preview-lightbox-position-spacer" />
          )}
          <button
            aria-label="Close preview"
            className="design-preview-lightbox-close"
            onClick={closeLightbox}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="design-preview-lightbox-stage">
          {showNavigation ? (
            <button
              aria-label="Previous image"
              className="design-preview-lightbox-nav design-preview-lightbox-nav--prev"
              disabled={!navState.canGoPrevious}
              onClick={goPrevious}
              type="button"
            >
              <ChevronLeftIcon size={22} />
            </button>
          ) : null}

          <div className={`design-preview-lightbox-media${isCensored ? ' design-preview-lightbox-media--censored' : ''}`}>
            <img
              alt={isCensored ? '' : presentation.alt}
              className={`design-preview-lightbox-image${isCensored ? ' design-preview-lightbox-image--censored' : ''}`}
              decoding="async"
              src={presentation.url}
              style={imageStyle}
            />

            {isCensored ? (
              onReveal ? (
                <div
                  aria-label={`${presentation.alt} — Censored Content. Click to reveal.`}
                  className="design-thumbnail-panel-censor-overlay"
                  onClick={(event) => {
                    event.stopPropagation();
                    onReveal();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      onReveal();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="design-thumbnail-panel-censor-overlay-title">Censored Content</span>
                  <span className="design-thumbnail-panel-censor-overlay-action">Click to reveal</span>
                </div>
              ) : (
                <div
                  aria-label={`${presentation.alt} — Censored Content.`}
                  className="design-thumbnail-panel-censor-overlay design-thumbnail-panel-censor-overlay--static"
                >
                  <span className="design-thumbnail-panel-censor-overlay-title">Censored Content</span>
                </div>
              )
            ) : null}
          </div>

          {showNavigation ? (
            <button
              aria-label="Next image"
              className="design-preview-lightbox-nav design-preview-lightbox-nav--next"
              disabled={!navState.canGoNext}
              onClick={goNext}
              type="button"
            >
              <ChevronRightIcon size={22} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
