'use client';

import { useEffect, type CSSProperties } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';
import { useExplicitContentPreference } from '../hooks/useExplicitContentPreference';

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
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
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
}: CatalogPreviewLightboxProps) {
  const { showExplicitContent } = useExplicitContentPreference();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !previewUrl) {
    return null;
  }

  const isCensored = isExplicitContent && !showExplicitContent && !sessionRevealed;

  const imageStyle: CSSProperties | undefined = artworkBackgroundHex
    ? ({
        ['--color-artwork-preview-bg' as string]: resolveArtworkBackgroundHex(artworkBackgroundHex),
        backgroundColor: resolveArtworkBackgroundHex(artworkBackgroundHex),
      } as CSSProperties)
    : undefined;

  return (
    <div
      aria-label={`${alt} enlarged preview`}
      aria-modal="true"
      className={`modal-overlay modal-overlay-blur design-preview-lightbox${className ? ` ${className}` : ''}`}
      onClick={onClose}
      role="dialog"
    >
      <div className="design-preview-lightbox-shell" onClick={(event) => event.stopPropagation()} role="presentation">
        <button
          aria-label="Close preview"
          className="design-preview-lightbox-close"
          onClick={onClose}
          type="button"
        >
          <CloseIcon />
        </button>

        <div className={`design-preview-lightbox-media${isCensored ? ' design-preview-lightbox-media--censored' : ''}`}>
          <img
            alt={isCensored ? '' : alt}
            className={`design-preview-lightbox-image${isCensored ? ' design-preview-lightbox-image--censored' : ''}`}
            decoding="async"
            src={previewUrl}
            style={imageStyle}
          />

          {isCensored ? (
            onReveal ? (
              <div
                aria-label={`${alt} — Censored Content. Click to reveal.`}
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
                aria-label={`${alt} — Censored Content.`}
                className="design-thumbnail-panel-censor-overlay design-thumbnail-panel-censor-overlay--static"
              >
                <span className="design-thumbnail-panel-censor-overlay-title">Censored Content</span>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
