'use client';

import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

import type { CatalogDesign } from '../types/catalog.types';
import { CatalogPreviewLightbox } from './CatalogPreviewLightbox';
import { CatalogThumbnailPanel } from './CatalogThumbnailPanel';
import { useCatalogDerivativeUrl } from '../hooks/useCatalogDerivativeUrl';

interface CatalogSelectionCardProps {
  design: CatalogDesign;
  isSelected: boolean;
  quantity: number;
  onAdd: (design: CatalogDesign) => void;
  onQuantityChange: (designId: string, quantity: number) => void;
  onRemove: (designId: string) => void;
}

function MinusIcon() {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
      <path d="M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
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
  isSelected,
  quantity,
  onAdd,
  onQuantityChange,
  onRemove,
}: CatalogSelectionCardProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [rawInput, setRawInput] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { url: previewUrl } = useCatalogDerivativeUrl(design.previewPath ?? design.thumbnailPath);

  function commitQuantity(value: string) {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : quantity;
    onQuantityChange(design.id, next);
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
    <>
      <div className={`design-selection-card${isSelected ? ' is-selected' : ''}`}>
        <div className="design-selection-card-image-wrap">
          <CatalogThumbnailPanel
            alt={`${design.title} thumbnail`}
            catalogPath={design.thumbnailPath}
            className="design-card-thumbnail"
            fallbackLabel="Thumbnail unavailable"
            interactive
            loadingLabel="Loading thumbnail"
            onImageClick={() => setIsLightboxOpen(true)}
          />

          {isSelected ? (
            <button
              aria-label={`Remove ${design.title} from selection`}
              className="design-selection-card-remove-btn"
              onClick={() => onRemove(design.id)}
              type="button"
            >
              <ClearSelectionIcon />
            </button>
          ) : null}
        </div>

        <div className="design-selection-card-body">
          <h3 className="design-selection-card-title">{design.title}</h3>

          {isSelected ? (
            <div className="design-selection-card-qty-controls portal-request-item-stepper portal-card-input-shell">
              <button
                aria-label={quantity <= 1 ? `Remove ${design.title}` : `Decrease quantity for ${design.title}`}
                className="portal-request-item-stepper-button"
                onClick={() => {
                  if (quantity <= 1) {
                    onRemove(design.id);
                  } else {
                    onQuantityChange(design.id, quantity - 1);
                  }
                }}
                type="button"
              >
                {quantity <= 1 ? <TrashIcon /> : <MinusIcon />}
              </button>
              <input
                aria-label={`Quantity for ${design.title}`}
                className="portal-request-item-number-input portal-request-item-stepper-input"
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
                onClick={() => onQuantityChange(design.id, quantity + 1)}
                type="button"
              >
                <PlusIcon />
              </button>
            </div>
          ) : (
            <button
              className="portal-button portal-button-secondary portal-button-sm design-selection-card-add-btn"
              onClick={() => onAdd(design)}
              type="button"
            >
              Add to request
            </button>
          )}
        </div>
      </div>

      <CatalogPreviewLightbox
        alt={`${design.title} preview`}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        previewUrl={previewUrl}
      />
    </>
  );
}
