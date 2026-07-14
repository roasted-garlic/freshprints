'use client';

import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { CatalogFavoriteButton } from '../../favorites/components/CatalogFavoriteButton';
import { MinusIcon, PlusIcon, TrashIcon } from '../../shared/components/PortalIcons';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';

interface CatalogSelectionCardProps {
  design: CatalogDesign;
  disabled?: boolean;
  isSelected: boolean;
  quantity: number;
  onAdd: (design: CatalogDesign) => void;
  onOpenDetails: (design: CatalogDesign) => void;
  onQuantityChange: (
    designId: string,
    quantity: number,
    meta?: { title?: string; announce?: boolean },
  ) => void;
  onRemove: (designId: string) => void;
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
  design,
  disabled = false,
  isSelected,
  quantity,
  onAdd,
  onOpenDetails,
  onQuantityChange,
  onRemove,
}: CatalogSelectionCardProps) {
  const [rawInput, setRawInput] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitQuantity(value: string) {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : quantity;
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
    <div className={`design-selection-card${isSelected ? ' is-selected' : ''}`}>
      <div className="design-selection-card-image-wrap">
        <CatalogThumbnailPanel
          alt={`${design.title} thumbnail`}
          catalogPath={design.thumbnailPath}
          className="design-card-thumbnail"
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

        {isSelected ? (
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
        <button
          className="design-selection-card-title-button"
          onClick={() => onOpenDetails(design)}
          type="button"
        >
          <h3 className="design-selection-card-title">{design.title}</h3>
        </button>

        {isSelected ? (
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
              disabled={disabled}
              onClick={() =>
                onQuantityChange(design.id, quantity + 1, {
                  title: design.title,
                  announce: false,
                })
              }
              type="button"
            >
              <PlusIcon />
            </button>
          </div>
        ) : (
          <button
            className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon design-selection-card-add-btn"
            disabled={disabled}
            onClick={() => onAdd(design)}
            type="button"
          >
            <PlusIcon size={14} />
            Add to request
          </button>
        )}
      </div>
    </div>
  );
}
