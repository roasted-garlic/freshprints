'use client';

import { useEffect, useState } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';
import { CatalogPreviewLightbox } from './CatalogPreviewLightbox';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogDesignDetailsModalProps {
  design: CatalogDesign | null;
  isOpen: boolean;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function CatalogDesignDetailsModal({ design, isOpen, onClose }: CatalogDesignDetailsModalProps) {
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);
  const previewPath = design?.previewPath ?? design?.thumbnailPath;
  const { url: previewUrl } = useCatalogDerivativeUrl(isOpen ? previewPath : undefined);

  useEffect(() => {
    if (!isOpen) {
      setIsPreviewLightboxOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPreviewLightboxOpen) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPreviewLightboxOpen, onClose]);

  if (!isOpen || !design) {
    return null;
  }

  return (
    <>
      <div
        aria-labelledby="catalog-design-details-title"
        aria-modal="true"
        className="modal-overlay modal-overlay-blur"
        onClick={onClose}
        role="dialog"
      >
        <div className="modal-panel" onClick={(event) => event.stopPropagation()} role="presentation">
          <header className="modal-header design-details-header">
            <div className="design-details-header-copy">
              <p className="portal-eyebrow">Design details</p>
              <h2 id="catalog-design-details-title">{design.title}</h2>
            </div>

            <div className="design-details-header-media">
              <CatalogThumbnailPanel
                alt={`${design.title} preview`}
                catalogPath={previewPath}
                fallbackLabel="Preview unavailable"
                interactive
                loadingLabel="Loading preview"
                onImageClick={() => setIsPreviewLightboxOpen(true)}
              />
            </div>

            <button aria-label="Close design details" className="modal-close-button" onClick={onClose} type="button">
              <CloseIcon />
            </button>
          </header>

          <div className="modal-body">
            <section className="design-details-section">
              <h3>Description</h3>
              <p className="design-details-description">{design.description?.trim() || '—'}</p>
            </section>

            <section className="design-details-section">
              <h3>Tags</h3>
              {design.tags.length > 0 ? (
                <div className="design-details-tags">
                  {design.tags.map((tag) => (
                    <span className="design-details-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="design-details-description">—</p>
              )}
            </section>
          </div>

        </div>
      </div>

      <CatalogPreviewLightbox
        alt={design.title}
        isOpen={isPreviewLightboxOpen}
        onClose={() => setIsPreviewLightboxOpen(false)}
        previewUrl={previewUrl}
      />
    </>
  );
}
