'use client';

import { PlusIcon } from '../../shared/components/PortalIcons';
import type { CatalogDesign } from '../types/catalog.types';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogDesignCardProps {
  /** When false, Add and qty-up are disabled (request full or Cap A exhausted). Qty-down stays enabled. */
  canAddPrints?: boolean;
  currentRequestQuantity?: number;
  design: CatalogDesign;
  exhaustedHelperText?: string | null;
  /** Short status when Add is blocked (request-full or daily). */
  exhaustedStatusText?: string | null;
  isBusy?: boolean;
  onAdjustQuantity: (design: CatalogDesign, delta: 1 | -1) => void;
  onSelect: (design: CatalogDesign) => void;
}

export function CatalogDesignCard({
  canAddPrints = true,
  currentRequestQuantity = 0,
  design,
  exhaustedStatusText = null,
  isBusy = false,
  onAdjustQuantity,
  onSelect,
}: CatalogDesignCardProps) {
  const inRequest = currentRequestQuantity > 0;
  const increaseDisabled = isBusy || !canAddPrints;
  const statusText = exhaustedStatusText;
  const requestFullLabel = !canAddPrints && statusText ? statusText : null;
  const addLabel = isBusy ? 'Adding…' : requestFullLabel ?? 'Add';
  const exhaustedTitle = requestFullLabel ?? undefined;

  return (
    <article className="design-card">
      <button
        className="design-card-open"
        onClick={() => onSelect(design)}
        type="button"
      >
        <CatalogThumbnailPanel
          alt={`${design.title} thumbnail`}
          artworkBackgroundHex={design.artworkBackgroundHex}
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
            disabled={increaseDisabled}
            onClick={() => onAdjustQuantity(design, 1)}
            title={exhaustedTitle}
            type="button"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      ) : (
        <button
          aria-label={requestFullLabel ?? `Add ${design.title} to Request`}
          className={`portal-button portal-button-secondary portal-button-sm design-card-add-btn${
            requestFullLabel ? ' is-request-full' : ' portal-button-leading-icon'
          }`}
          disabled={increaseDisabled}
          onClick={() => onAdjustQuantity(design, 1)}
          title={exhaustedTitle}
          type="button"
        >
          {requestFullLabel ? null : <PlusIcon size={14} />}
          {addLabel}
        </button>
      )}
    </article>
  );
}
