'use client';

import type { CatalogDesign } from '../types/catalog.types';
import { usePortalCensoredDesignText } from '../utils/portalCensoredDesignText';
import { CatalogFavoriteButton } from '../../favorites/components/CatalogFavoriteButton';
import { PlusIcon } from '../../shared/components/PortalIcons';
import { CatalogDesignShareButton } from './CatalogDesignShareButton';
import {
  CatalogRequestQuantityControls,
  type CatalogRequestQuantityChangeHandler,
} from './CatalogRequestQuantityControls';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogSelectionCardProps {
  /** When false, Add and qty-up are disabled (request full). Qty-down / remove stay enabled. */
  canAddPrints?: boolean;
  design: CatalogDesign;
  disabled?: boolean;
  exhaustedHelperText?: string | null;
  exhaustedStatusText?: string | null;
  /** True when this design has direct pairwise `companionDesignIds` neighbors (Matching designs hint). */
  hasMatchingDesigns?: boolean;
  isSelected: boolean;
  /**
   * Eager thumbnail load for the bounded first viewport only.
   * Below-fold cards should omit this (default lazy).
   */
  prioritizeLoading?: boolean;
  quantity: number;
  /** Omit for guests — hides Add to request / qty controls. */
  onAdd?: (design: CatalogDesign) => void;
  onOpenDetails: (design: CatalogDesign) => void;
  onQuantityChange?: CatalogRequestQuantityChangeHandler;
  onRemove?: (designId: string) => void;
}

function ClearSelectionIcon() {
  return (
    <svg aria-hidden="true" height="15" viewBox="0 0 24 24" width="15">
      <path
        d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function CatalogSelectionCard({
  canAddPrints = true,
  design,
  disabled = false,
  exhaustedStatusText = null,
  hasMatchingDesigns = false,
  isSelected,
  prioritizeLoading = false,
  quantity,
  onAdd,
  onOpenDetails,
  onQuantityChange,
  onRemove,
}: CatalogSelectionCardProps) {
  const showRequestActions = typeof onAdd === 'function';
  const increaseDisabled = disabled || !canAddPrints;
  const statusText = exhaustedStatusText;
  const requestFullLabel = !canAddPrints && statusText ? statusText : null;
  const exhaustedTitle = requestFullLabel ?? undefined;
  const { title: displayTitle } = usePortalCensoredDesignText(design);

  return (
    <div
      className={`design-selection-card${isSelected && showRequestActions ? ' is-selected' : ''}${
        showRequestActions ? '' : ' is-browse-only'
      }`}
    >
      <div className="design-selection-card-image-wrap">
        <CatalogThumbnailPanel
          alt={`${displayTitle} thumbnail`}
          artworkBackgroundHex={design.artworkBackgroundHex}
          catalogPath={design.thumbnailPath}
          className="design-card-thumbnail"
          contentVersion={design.updatedAtMs}
          decorative
          fallbackLabel="Thumbnail unavailable"
          interactive
          isExplicitContent={design.isExplicitContent}
          loadingLabel="Loading thumbnail"
          onImageClick={() => onOpenDetails(design)}
          prioritizeLoading={prioritizeLoading}
          revealMode="none"
        />

        <CatalogFavoriteButton
          className="design-selection-card-favorite-btn"
          designId={design.id}
          designTitle={displayTitle}
        />

        {showRequestActions && isSelected && onRemove ? (
          <button
            aria-label={`Remove ${displayTitle} from selection`}
            className="design-selection-card-remove-btn"
            disabled={disabled}
            onClick={() => onRemove(design.id)}
            type="button"
          >
            <ClearSelectionIcon />
          </button>
        ) : null}
      </div>

      <div className="design-selection-card-body">
        <div className="design-selection-card-title-row">
          <button
            className="design-selection-card-title-button"
            onClick={() => onOpenDetails(design)}
            type="button"
          >
            <h3 className="design-selection-card-title">{displayTitle}</h3>
          </button>
          <CatalogDesignShareButton design={design} variant="icon" />
        </div>

        {hasMatchingDesigns ? (
          <p className="design-selection-card-matching-hint">Matching designs available</p>
        ) : null}

        {showRequestActions && isSelected && onQuantityChange && onRemove ? (
          <CatalogRequestQuantityControls
            canAddPrints={canAddPrints}
            designId={design.id}
            designTitle={displayTitle}
            disabled={disabled}
            exhaustedTitle={exhaustedTitle}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            quantity={quantity}
          />
        ) : null}

        {showRequestActions && !isSelected ? (
          <button
            aria-label={requestFullLabel ?? `Add ${displayTitle} to request`}
            className={`portal-button portal-button-secondary portal-button-sm design-selection-card-add-btn${
              requestFullLabel ? ' is-request-full' : ' portal-button-leading-icon'
            }`}
            disabled={increaseDisabled}
            onClick={() => onAdd?.(design)}
            title={exhaustedTitle}
            type="button"
          >
            {requestFullLabel ? null : <PlusIcon size={14} />}
            {requestFullLabel ?? 'Add to request'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
