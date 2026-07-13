'use client';

import { useEffect, useState } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';
import { PlusIcon } from '../../shared/components/PortalIcons';
import { CatalogPreviewLightbox } from './CatalogPreviewLightbox';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogDesignDetailsModalProps {
  currentRequestQuantity?: number;
  design: CatalogDesign | null;
  isBusy?: boolean;
  isOpen: boolean;
  onAdjustQuantity?: (design: CatalogDesign, delta: 1 | -1) => void;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function CatalogDesignDetailsModal({
  currentRequestQuantity = 0,
  design,
  isBusy = false,
  isOpen,
  onAdjustQuantity,
  onClose,
}: CatalogDesignDetailsModalProps) {
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);
  const previewPath = design?.previewPath ?? design?.thumbnailPath;
  const { url: previewUrl } = useCatalogDerivativeUrl(isOpen ? previewPath : undefined);
  const inRequest = currentRequestQuantity > 0;

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
        <div
          className="modal-panel modal-panel-design-details"
          onClick={(event) => event.stopPropagation()}
          role="presentation"
        >
          <div className="design-details-hero">
            <CatalogThumbnailPanel
              alt={`${design.title} preview`}
              catalogPath={previewPath}
              className="design-details-hero-image"
              interactive={Boolean(previewUrl)}
              loadingLabel="Loading preview"
              onImageClick={previewUrl ? () => setIsPreviewLightboxOpen(true) : undefined}
              prioritizeLoading
            />
            <button
              aria-label="Close design details"
              className="modal-close-button design-details-close-button"
              onClick={onClose}
              type="button"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body design-details-body">
            <div className="design-details-eyebrow-row">
              <p className="portal-eyebrow design-details-eyebrow">Design details</p>
              {onAdjustQuantity ? (
                inRequest ? (
                  <div className="design-card-qty-stepper" role="group" aria-label={`${design.title} quantity`}>
                    <button
                      aria-label={`Decrease ${design.title} quantity`}
                      className="design-card-qty-btn"
                      disabled={isBusy}
                      onClick={() => onAdjustQuantity(design, -1)}
                      type="button"
                    >
                      −
                    </button>
                    <span className="design-card-qty-value">{currentRequestQuantity}</span>
                    <button
                      aria-label={`Increase ${design.title} quantity`}
                      className="design-card-qty-btn"
                      disabled={isBusy}
                      onClick={() => onAdjustQuantity(design, 1)}
                      type="button"
                    >
                      <PlusIcon size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="portal-button portal-button-primary portal-button-sm portal-button-leading-icon design-details-add-btn"
                    disabled={isBusy}
                    onClick={() => onAdjustQuantity(design, 1)}
                    type="button"
                  >
                    <PlusIcon size={14} />
                    {isBusy ? 'Adding…' : 'Add'}
                  </button>
                )
              ) : null}
            </div>
            <h2 id="catalog-design-details-title">{design.title}</h2>

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
