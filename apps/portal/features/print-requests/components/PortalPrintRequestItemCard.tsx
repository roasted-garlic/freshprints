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
}: PortalPrintRequestItemCardProps) {
  const title = design?.title ?? 'Design';
  const previewPath = design?.previewPath ?? design?.thumbnailPath;
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));
  const [printWidthInput, setPrintWidthInput] = useState(formatEditableNumber(resolveInitialWidth(item, design)));
  const [printHeightInput, setPrintHeightInput] = useState(formatEditableNumber(resolveInitialHeight(item, design)));
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'failed'>('idle');
  const { url: previewUrl } = useCatalogDerivativeUrl(previewPath);
  const lastSavedSignatureRef = useRef(
    buildItemSignature(item.quantity, resolveInitialWidth(item, design), resolveInitialHeight(item, design)),
  );
  const saveDraftRef = useRef<() => Promise<void>>(async () => undefined);

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
    setSaveState('idle');
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

    setSaveState('saving');

    try {
      await onUpdate(item, {
        quantity: parsedQuantity,
        printWidthInches: parsedPrintWidthInches,
        printHeightInches: parsedPrintHeightInches,
      });
      lastSavedSignatureRef.current = draftSignature;
      setSaveState('idle');
    } catch {
      setSaveState('failed');
    }
  }, [item, onUpdate, parsedPrintHeightInches, parsedPrintWidthInches, parsedQuantity]);

  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  function stepQuantity(nextQuantity: number) {
    const parsed = parsePositiveIntegerInput(String(nextQuantity));
    setQuantityInput(parsed === null ? '' : String(parsed));
    window.setTimeout(() => void saveDraftRef.current(), 0);
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

            {saveState === 'failed' ? (
              <p className="portal-error portal-request-item-field-error" role="alert">
                Unable to save changes. Try again.
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
                type="button"
              >
                −
              </button>
              <input
                aria-label={`Quantity for ${title}`}
                className="portal-request-item-number-input portal-request-item-stepper-input"
                inputMode="numeric"
                min={1}
                name={`quantity-${item.id}`}
                onBlur={handleFieldBlur}
                onChange={(event) => setQuantityInput(event.target.value)}
                onFocus={handleFieldFocus}
                onKeyDown={handleFieldKeyDown}
                type="number"
                value={quantityInput}
              />
              <button
                aria-label={`Increase quantity for ${title}`}
                className="portal-request-item-stepper-button"
                onClick={() => stepQuantity((parsedQuantity ?? 0) + 1)}
                type="button"
              >
                +
              </button>
            </div>

            <button
              className="portal-button portal-button-secondary portal-button-sm"
              onClick={() => onDuplicate(item)}
              type="button"
            >
              Duplicate
            </button>

            <button
              className="portal-button portal-button-danger portal-button-sm"
              onClick={() => onRemove(item)}
              type="button"
            >
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
