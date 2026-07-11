'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import {
  assessPrintRequestItemSize,
  calculateLockedHeightFromWidth,
  calculateLockedWidthFromHeight,
} from '@fresh-prints/shared/utils/printRequestItemSizing';

import { CatalogPreviewLightbox } from '../../catalog/components/CatalogPreviewLightbox';
import { CatalogThumbnailPanel } from '../../catalog/components/CatalogThumbnailPanel';
import { useCatalogDerivativeUrl } from '../../catalog/hooks/useCatalogDerivativeUrl';
import { CopyIcon, TrashIcon } from '../../shared/components/PortalIcons';

interface PortalPrintRequestItemDesign {
  id: string;
  title: string;
  width: number;
  height: number;
  thumbnailPath?: string;
  previewPath?: string;
  printWidthInches?: number;
  printHeightInches?: number;
}

interface PortalPrintRequestItemCardProps {
  design?: PortalPrintRequestItemDesign | null;
  item: PrintRequestItem;
  readOnly?: boolean;
  onDuplicate: (item: PrintRequestItem) => void;
  onRemove: (item: PrintRequestItem) => void;
  onUpdate: (
    item: PrintRequestItem,
    input: { quantity: number; printWidthInches: number; printHeightInches: number },
  ) => Promise<void>;
  onAutosaveStateChange: (
    status: 'saving' | 'saved' | 'failed',
    message?: string,
    retry?: () => Promise<void>,
  ) => void;
}

function resolveInitialWidth(item: PrintRequestItem, design?: PortalPrintRequestItemDesign | null): number {
  return item.printWidthInches ?? design?.printWidthInches ?? 1;
}

function resolveInitialHeight(item: PrintRequestItem, design?: PortalPrintRequestItemDesign | null): number {
  return item.printHeightInches ?? design?.printHeightInches ?? 1;
}

function formatEditableNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}

function parsePositiveIntegerInput(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return null;
  }

  return Math.floor(parsedValue);
}

function parsePositiveDecimalInput(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function buildItemSignature(quantity: number, width: number, height: number): string {
  return JSON.stringify({
    quantity,
    width: Number.isFinite(width) ? Number(width.toFixed(2)) : width,
    height: Number.isFinite(height) ? Number(height.toFixed(2)) : height,
  });
}

export function PortalPrintRequestItemCard({
  design,
  item,
  readOnly = false,
  onDuplicate,
  onRemove,
  onUpdate,
  onAutosaveStateChange,
}: PortalPrintRequestItemCardProps) {
  const title = design?.title ?? 'Design';
  const previewPath = design?.previewPath ?? design?.thumbnailPath;
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));
  const [printWidthInput, setPrintWidthInput] = useState(formatEditableNumber(resolveInitialWidth(item, design)));
  const [printHeightInput, setPrintHeightInput] = useState(formatEditableNumber(resolveInitialHeight(item, design)));
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { url: previewUrl } = useCatalogDerivativeUrl(previewPath);
  const lastSavedSignatureRef = useRef(
    buildItemSignature(item.quantity, resolveInitialWidth(item, design), resolveInitialHeight(item, design)),
  );
  const saveDraftRef = useRef<() => Promise<void>>(async () => undefined);
  const saveDebounceRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);

  useEffect(() => {
    const nextWidth = resolveInitialWidth(item, design);
    const nextHeight = resolveInitialHeight(item, design);
    const incomingSignature = buildItemSignature(item.quantity, nextWidth, nextHeight);

    if (incomingSignature === lastSavedSignatureRef.current) {
      return;
    }

    setQuantityInput(String(item.quantity));
    setPrintWidthInput(formatEditableNumber(nextWidth));
    setPrintHeightInput(formatEditableNumber(nextHeight));
    setIsLightboxOpen(false);
    lastSavedSignatureRef.current = incomingSignature;
  }, [design, item]);

  const parsedQuantity = parsePositiveIntegerInput(quantityInput);
  const parsedPrintWidthInches = parsePositiveDecimalInput(printWidthInput);
  const parsedPrintHeightInches = parsePositiveDecimalInput(printHeightInput);

  const sizeAssessment = useMemo(() => {
    if (typeof design?.width !== 'number' || typeof design.height !== 'number') {
      return null;
    }

    return assessPrintRequestItemSize({
      pixelWidth: design.width,
      pixelHeight: design.height,
      printWidthInches: parsedPrintWidthInches ?? Number.NaN,
      printHeightInches: parsedPrintHeightInches ?? Number.NaN,
    });
  }, [design, parsedPrintHeightInches, parsedPrintWidthInches]);

  const canSave = (sizeAssessment?.canSave ?? true) && parsedQuantity !== null;

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current !== null) {
        window.clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  function cancelScheduledSave() {
    if (saveDebounceRef.current !== null) {
      window.clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
  }

  function scheduleSave() {
    cancelScheduledSave();
    saveDebounceRef.current = window.setTimeout(() => {
      saveDebounceRef.current = null;
      void saveDraftRef.current();
    }, 300);
  }

  const saveDraft = useCallback(async () => {
    if (
      parsedQuantity === null ||
      parsedPrintWidthInches === null ||
      parsedPrintHeightInches === null
    ) {
      return;
    }

    const draftSignature = buildItemSignature(
      parsedQuantity,
      parsedPrintWidthInches,
      parsedPrintHeightInches,
    );

    if (draftSignature === lastSavedSignatureRef.current) {
      return;
    }

    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    saveInFlightRef.current = true;
    onAutosaveStateChange('saving');

    try {
      await onUpdate(item, {
        quantity: parsedQuantity,
        printWidthInches: parsedPrintWidthInches,
        printHeightInches: parsedPrintHeightInches,
      });
      lastSavedSignatureRef.current = draftSignature;
      onAutosaveStateChange('saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save item changes.';
      onAutosaveStateChange('failed', message, () => saveDraftRef.current());
    } finally {
      saveInFlightRef.current = false;

      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        void saveDraftRef.current();
      }
    }
  }, [item, onAutosaveStateChange, onUpdate, parsedPrintHeightInches, parsedPrintWidthInches, parsedQuantity]);

  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  function stepQuantity(nextQuantity: number) {
    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setQuantityInput('');
      return;
    }

    setQuantityInput(String(Math.floor(nextQuantity)));
    scheduleSave();
  }

  function updateWidth(nextWidthInput: string) {
    setPrintWidthInput(nextWidthInput);

    const nextWidth = parsePositiveDecimalInput(nextWidthInput);
    if (typeof design?.width === 'number' && typeof design.height === 'number' && nextWidth !== null) {
      setPrintHeightInput(formatEditableNumber(calculateLockedHeightFromWidth(design.width, design.height, nextWidth)));
    }
  }

  function updateHeight(nextHeightInput: string) {
    setPrintHeightInput(nextHeightInput);

    const nextHeight = parsePositiveDecimalInput(nextHeightInput);
    if (typeof design?.width === 'number' && typeof design.height === 'number' && nextHeight !== null) {
      setPrintWidthInput(formatEditableNumber(calculateLockedWidthFromHeight(design.width, design.height, nextHeight)));
    }
  }

  const handleFieldBlur = useCallback(() => {
    if (readOnly || !canSave) {
      return;
    }

    void saveDraft();
  }, [canSave, readOnly, saveDraft]);

  const handleFieldFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  }, []);

  const handleFieldKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  }, []);

  const handleQuantityKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    handleFieldKeyDown(event);

    if (event.key !== 'Tab') {
      return;
    }

    const quantityInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[data-portal-request-qty-input="true"]'),
    ).filter((input) => !input.disabled);

    const currentIndex = quantityInputs.indexOf(event.currentTarget);

    if (currentIndex < 0) {
      return;
    }

    const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex < 0 || nextIndex >= quantityInputs.length) {
      return;
    }

    event.preventDefault();
    const nextInput = quantityInputs[nextIndex];
    nextInput.focus();
    nextInput.select();
  }, [handleFieldKeyDown]);

  return (
    <>
      <article className="portal-request-item-editor-card">
        <div className="portal-request-item-editor-header">
          <CatalogThumbnailPanel
            alt={`${title} preview`}
            catalogPath={previewPath}
            className="design-card-thumbnail"
            fallbackLabel="Preview unavailable"
            interactive={Boolean(previewUrl)}
            loadingLabel="Loading preview"
            onImageClick={() => setIsLightboxOpen(true)}
          />

          <div className="portal-request-item-editor-body">
            <h2>{title}</h2>

            {readOnly ? (
              <p className="portal-muted">Qty {item.quantity}</p>
            ) : null}
          </div>
        </div>

        {!readOnly ? (
          <>
            <div className="portal-request-item-size-row">
              <label className="portal-request-item-field">
                <span className="portal-request-item-field-label">Width</span>
                <div className="portal-request-item-size-input-wrap portal-card-input-shell">
                  <input
                    className="portal-request-item-number-input"
                    inputMode="decimal"
                    min={0.01}
                    name={`printWidthInches-${item.id}`}
                    onBlur={handleFieldBlur}
                    onChange={(event) => updateWidth(event.target.value)}
                    onFocus={handleFieldFocus}
                    onKeyDown={handleFieldKeyDown}
                    step={0.01}
                    type="number"
                    value={printWidthInput}
                  />
                  <span className="portal-request-item-size-unit">in</span>
                </div>
              </label>

              <label className="portal-request-item-field">
                <span className="portal-request-item-field-label">Height</span>
                <div className="portal-request-item-size-input-wrap portal-card-input-shell">
                  <input
                    className="portal-request-item-number-input"
                    inputMode="decimal"
                    min={0.01}
                    name={`printHeightInches-${item.id}`}
                    onBlur={handleFieldBlur}
                    onChange={(event) => updateHeight(event.target.value)}
                    onFocus={handleFieldFocus}
                    onKeyDown={handleFieldKeyDown}
                    step={0.01}
                    type="number"
                    value={printHeightInput}
                  />
                  <span className="portal-request-item-size-unit">in</span>
                </div>
              </label>
            </div>

            {sizeAssessment?.errorMessage ? (
              <p className="portal-error portal-request-item-field-error" role="alert">
                {sizeAssessment.errorMessage}
              </p>
            ) : null}
          </>
        ) : null}

        {!readOnly ? (
          <div className="portal-request-item-editor-actions">
            <div className="portal-request-item-stepper portal-card-input-shell">
              <button
                aria-label={`Decrease quantity for ${title}`}
                className="portal-request-item-stepper-button"
                onClick={() => stepQuantity((parsedQuantity ?? 1) - 1)}
                tabIndex={-1}
                type="button"
              >
                −
              </button>
              <input
                aria-label={`Quantity for ${title}`}
                className="portal-request-item-number-input portal-request-item-stepper-input"
                data-portal-request-qty-input="true"
                inputMode="numeric"
                min={1}
                name={`quantity-${item.id}`}
                onBlur={handleFieldBlur}
                onChange={(event) => setQuantityInput(event.target.value)}
                onFocus={handleFieldFocus}
                onKeyDown={handleQuantityKeyDown}
                type="number"
                value={quantityInput}
              />
              <button
                aria-label={`Increase quantity for ${title}`}
                className="portal-request-item-stepper-button"
                onClick={() => stepQuantity((parsedQuantity ?? 0) + 1)}
                tabIndex={-1}
                type="button"
              >
                +
              </button>
            </div>

            <button
              className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon"
              onClick={() => onDuplicate(item)}
              tabIndex={-1}
              type="button"
            >
              <CopyIcon size={14} />
              Duplicate
            </button>

            <button
              className="portal-button portal-button-danger portal-button-sm portal-button-leading-icon"
              onClick={() => onRemove(item)}
              tabIndex={-1}
              type="button"
            >
              <TrashIcon size={14} />
              Remove
            </button>
          </div>
        ) : null}
      </article>

      <CatalogPreviewLightbox
        alt={`${title} preview`}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        previewUrl={previewUrl}
      />
    </>
  );
}
