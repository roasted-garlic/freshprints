'use client';

import { PlusIcon } from '../../shared/components/PortalIcons';
import type { CatalogDesign } from '../types/catalog.types';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogDesignCardProps {
  currentRequestQuantity?: number;
  design: CatalogDesign;
  isBusy?: boolean;
  onAdjustQuantity: (design: CatalogDesign, delta: 1 | -1) => void;
  onSelect: (design: CatalogDesign) => void;
}

export function CatalogDesignCard({
  currentRequestQuantity = 0,
  design,
  isBusy = false,
  onAdjustQuantity,
  onSelect,
}: CatalogDesignCardProps) {
  const inRequest = currentRequestQuantity > 0;

  return (
    <article className="design-card">
      <button
        className="design-card-open"
        onClick={() => onSelect(design)}
        type="button"
      >
        <CatalogThumbnailPanel
          alt={`${design.title} thumbnail`}
          catalogPath={design.thumbnailPath}
          className="design-card-thumbnail"
          contentVersion={design.updatedAtMs}
          decorative
          fallbackLabel="Thumbnail unavailable"
          loadingLabel="Loading thumbnail"
        />

        <div className="design-card-body">
          <h3 className="design-card-title">{design.title}</h3>
          {inRequest ? (
            <p className="design-card-request-qty">
              In Current Request · Qty {currentRequestQuantity}
            </p>
          ) : null}
        </div>
      </button>

      {inRequest ? (
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
          <span className="design-card-qty-value" aria-live="polite">
            {currentRequestQuantity}
          </span>
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
          aria-label={`Add ${design.title} to Current Request`}
          className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-card-add-btn"
          disabled={isBusy}
          onClick={() => onAdjustQuantity(design, 1)}
          type="button"
        >
          <PlusIcon size={14} />
          {isBusy ? 'Adding…' : 'Add'}
        </button>
      )}
    </article>
  );
}
