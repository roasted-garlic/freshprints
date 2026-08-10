'use client';

import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

import { MinusIcon, PlusIcon, TrashIcon } from '../../shared/components/PortalIcons';

export type CatalogRequestQuantityChangeHandler = (
  designId: string,
  quantity: number,
  meta?: { title?: string; announce?: boolean },
) => void;

interface CatalogRequestQuantityControlsProps {
  /** When false, qty-up is disabled (request full / Cap A). Qty-down / remove stay enabled. */
  canAddPrints?: boolean;
  className?: string;
  designId: string;
  designTitle: string;
  disabled?: boolean;
  /** Tooltip / title when increase is blocked. */
  exhaustedTitle?: string;
  onQuantityChange: CatalogRequestQuantityChangeHandler;
  onRemove: (designId: string) => void;
  quantity: number;
}

/**
 * Shared Current Request quantity stepper used by catalog list cards and Design Details.
 * Preserves trash-at-1 / remove-at-0 input commit rules from CatalogSelectionCard.
 */
export function CatalogRequestQuantityControls({
  canAddPrints = true,
  className = 'design-selection-card-qty-controls portal-request-item-stepper portal-card-input-shell',
  designId,
  designTitle,
  disabled = false,
  exhaustedTitle,
  onQuantityChange,
  onRemove,
  quantity,
}: CatalogRequestQuantityControlsProps) {
  const [rawInput, setRawInput] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const increaseDisabled = disabled || !canAddPrints;

  function commitQuantity(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed === 0) {
      onRemove(designId);
      setRawInput(null);
      return;
    }
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : quantity;
    if (next > quantity && !canAddPrints) {
      setRawInput(null);
      return;
    }
    onQuantityChange(designId, next, {
      title: designTitle,
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
    <div className={className} role="group" aria-label={`${designTitle} quantity`}>
      <button
        aria-label={quantity <= 1 ? `Remove ${designTitle}` : `Decrease quantity for ${designTitle}`}
        className="portal-request-item-stepper-button"
        disabled={disabled}
        onClick={() => {
          if (quantity <= 1) {
            onRemove(designId);
          } else {
            onQuantityChange(designId, quantity - 1, {
              title: designTitle,
              announce: false,
            });
          }
        }}
        type="button"
      >
        {quantity <= 1 ? <TrashIcon /> : <MinusIcon />}
      </button>
      <input
        aria-label={`Quantity for ${designTitle}`}
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
        aria-label={`Increase quantity for ${designTitle}`}
        className="portal-request-item-stepper-button"
        disabled={increaseDisabled}
        onClick={() =>
          onQuantityChange(designId, quantity + 1, {
            title: designTitle,
            announce: false,
          })
        }
        title={exhaustedTitle}
        type="button"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
