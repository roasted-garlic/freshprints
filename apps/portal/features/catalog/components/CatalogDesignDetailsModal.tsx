'use client';

import { useEffect, useState } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { CatalogFavoriteButton } from '../../favorites/components/CatalogFavoriteButton';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';
import { PlusIcon } from '../../shared/components/PortalIcons';
import { CatalogDesignShareButton } from './CatalogDesignShareButton';
import { CatalogPreviewLightbox } from './CatalogPreviewLightbox';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogDesignDetailsModalProps {
  /** When false, Add to request is disabled (request full or Cap A exhausted). Favorite stays enabled. */
  canAddPrints?: boolean;
  design: CatalogDesign | null;
  exhaustedHelperText?: string | null;
  exhaustedStatusText?: string | null;
  isAdding?: boolean;
  /** When true, design is already on the Current Request (or selection) — hide the full-request label. */
  isInCurrentRequest?: boolean;
  isOpen: boolean;
  onAddToRequest?: (design: CatalogDesign) => void;
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
  canAddPrints = true,
  design,
  exhaustedHelperText: _exhaustedHelperText = null,
  exhaustedStatusText = null,
  isAdding = false,
  isInCurrentRequest = false,
  isOpen,
  onAddToRequest,
  onClose,
}: CatalogDesignDetailsModalProps) {
  const [isPreviewLightboxOpen, setIsPreviewLightboxOpen] = useState(false);
  const statusText = exhaustedStatusText;
  const requestFullLabel =
    !canAddPrints && statusText && !isInCurrentRequest ? statusText : null;
  const exhaustedTitle = requestFullLabel ?? undefined;
  const previewPath = design?.previewPath ?? design?.thumbnailPath;
  const { url: previewUrl } = useCatalogDerivativeUrl(
    isOpen ? previewPath : undefined,
    design?.updatedAtMs,
  );
  const addDisabled = isAdding || !canAddPrints;

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
              className="design-details-hero-media"
              contentVersion={design.updatedAtMs}
              fallbackLabel="Preview unavailable"
              interactive
              loadingLabel="Loading preview"
              onImageClick={() => setIsPreviewLightboxOpen(true)}
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
            <div className="design-details-toolbar">
              <div className="design-details-toolbar-start">
                <CatalogFavoriteButton
                  className="design-details-favorite-btn"
                  designId={design.id}
                  designTitle={design.title}
                />
                <CatalogDesignShareButton design={design} variant="labeled" />
                {requestFullLabel ? (
                  <p className="design-details-request-full-label is-request-full">{requestFullLabel}</p>
                ) : null}
              </div>
              {onAddToRequest ? (
                <button
                  className="portal-button portal-button-primary portal-button-sm portal-button-leading-icon design-details-add-btn"
                  disabled={addDisabled}
                  onClick={() => onAddToRequest(design)}
                  title={exhaustedTitle}
                  type="button"
                >
                  <PlusIcon size={14} />
                  {isAdding ? 'Adding…' : 'Add to request'}
                </button>
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
