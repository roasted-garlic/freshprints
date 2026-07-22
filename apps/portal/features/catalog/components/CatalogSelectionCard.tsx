'use client';

import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { CatalogFavoriteButton } from '../../favorites/components/CatalogFavoriteButton';
import { MinusIcon, PlusIcon, TrashIcon } from '../../shared/components/PortalIcons';
import { CatalogDesignShareButton } from './CatalogDesignShareButton';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogSelectionCardProps {
  /** When false, Add and qty-up are disabled (request full). Qty-down / remove stay enabled. */
  canAddPrints?: boolean;
  design: CatalogDesign;
  disabled?: boolean;
  exhaustedHelperText?: string | null;
  exhaustedStatusText?: string | null;
  isSelected: boolean;
  quantity: number;
  /** Omit for guests — hides Add to request / qty controls. */
  onAdd?: (design: CatalogDesign) => void;
  onOpenDetails: (design: CatalogDesign) => void;
  onQuantityChange?: (
    designId: string,
    quantity: number,
    meta?: { title?: string; announce?: boolean },
  ) => void;
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
  exhaustedHelperText: _exhaustedHelperText = null,
  exhaustedStatusText = null,
  isSelected,
  quantity,
  onAdd,
  onOpenDetails,
  onQuantityChange,
  onRemove,
}: CatalogSelectionCardProps) {
  const [rawInput, setRawInput] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const showRequestActions = typeof onAdd === 'function';
  const increaseDisabled = disabled || !canAddPrints;
  const statusText = exhaustedStatusText;
  const requestFullLabel = !canAddPrints && statusText ? statusText : null;
  const exhaustedTitle = requestFullLabel ?? undefined;

  function commitQuantity(value: string) {
    if (!onQuantityChange || !onRemove) {
      return;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed === 0) {
      onRemove(design.id);
      setRawInput(null);
      return;
    }
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : quantity;
    if (next > quantity && !canAddPrints) {
      setRawInput(null);
      return;
    }
    onQuantityChange(design.id, next, {
      title: design.title,
      announce: next > quantity,
    });
    setRawInput(null);
  }

  function handleQuantityFocus(event: FocusEvent<HTMLInputElement>) {
    setRawInput(String(quantity));
    event.currentTarget.select();
  }

  function handleQuantityKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      inputRef.current?.blur();
    }
  }

  return (
    <div
      className={`design-selection-card${isSelected && showRequestActions ? ' is-selected' : ''}${
        showRequestActions ? '' : ' is-browse-only'
      }`}
    >
      <div className="design-selection-card-image-wrap">
        <CatalogThumbnailPanel
          alt={`${design.title} thumbnail`}
          artworkBackgroundHex={design.artworkBackgroundHex}
          catalogPath={design.thumbnailPath}
          className="design-card-thumbnail"
          contentVersion={design.updatedAtMs}
          fallbackLabel="Thumbnail unavailable"
          interactive
          loadingLabel="Loading thumbnail"
          onImageClick={() => onOpenDetails(design)}
          prioritizeLoading
        />

        <CatalogFavoriteButton
          className="design-selection-card-favorite-btn"
          designId={design.id}
          designTitle={design.title}
        />

        {showRequestActions && isSelected && onRemove ? (
          <button
            aria-label={`Remove ${design.title} from selection`}
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
            <h3 className="design-selection-card-title">{design.title}</h3>
          </button>
          <CatalogDesignShareButton design={design} variant="icon" />
        </div>

        {showRequestActions && isSelected && onQuantityChange && onRemove ? (
          <div className="design-selection-card-qty-controls portal-request-item-stepper portal-card-input-shell">
            <button
              aria-label={quantity <= 1 ? `Remove ${design.title}` : `Decrease quantity for ${design.title}`}
              className="portal-request-item-stepper-button"
              disabled={disabled}
              onClick={() => {
                if (quantity <= 1) {
                  onRemove(design.id);
                } else {
                  onQuantityChange(design.id, quantity - 1, {
                    title: design.title,
                    announce: false,
                  });
                }
              }}
              type="button"
            >
              {quantity <= 1 ? <TrashIcon /> : <MinusIcon />}
            </button>
            <input
              aria-label={`Quantity for ${design.title}`}
              className="portal-request-item-number-input portal-request-item-stepper-input"
              disabled={disabled}
              inputMode="numeric"
              min={1}
              onBlur={(event) => commitQuantity(event.target.value)}
              onChange={(event) => setRawInput(event.target.value)}
              onFocus={handleQuantityFocus}
              onKeyDown={handleQuantityKeyDown}
              ref={inputRef}
              type="number"
              value={rawInput !== null ? rawInput : quantity}
            />
            <button
              aria-label={`Increase quantity for ${design.title}`}
              className="portal-request-item-stepper-button"
              disabled={increaseDisabled}
              onClick={() =>
                onQuantityChange(design.id, quantity + 1, {
                  title: design.title,
                  announce: false,
                })
              }
              title={exhaustedTitle}
              type="button"
            >
              <PlusIcon />
            </button>
          </div>
        ) : null}

        {showRequestActions && !isSelected ? (
          <button
            aria-label={requestFullLabel ?? `Add ${design.title} to request`}
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
