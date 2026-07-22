'use client';

import { useEffect, type CSSProperties } from 'react';

import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';

interface CatalogPreviewLightboxProps {
  alt: string;
  artworkBackgroundHex?: string;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string | null;
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
  isOpen,
  onClose,
  previewUrl,
}: CatalogPreviewLightboxProps) {
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

        <img
          alt={alt}
          className="design-preview-lightbox-image"
          decoding="async"
          src={previewUrl}
          style={imageStyle}
        />
      </div>
    </div>
  );
}
