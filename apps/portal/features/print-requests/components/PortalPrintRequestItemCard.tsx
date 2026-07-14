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
import type { CatalogDesign } from '../../catalog/types/catalog.types';
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
  updatedAtMs?: number;
}

interface PortalPrintRequestItemUpload {
  title: string;
  previewPath?: string | null;
  thumbnailPath?: string | null;
  widthPx?: number | null;
  heightPx?: number | null;
  printWidthInches?: number | null;
  printHeightInches?: number | null;
  approvedMaxPrintWidthInches?: number | null;
  approvedMaxPrintHeightInches?: number | null;
  wasUpscaled?: boolean | null;
}

interface PortalPrintRequestItemCardProps {
  design?: PortalPrintRequestItemDesign | null;
  upload?: PortalPrintRequestItemUpload | null;
  item: PrintRequestItem;
  readOnly?: boolean;
  /**
   * Read-only catalog reuse: ready `CatalogDesign` when still in catalog;
   * `null` when designId exists but design is gone; omit for non-catalog lines.
   */
  catalogReuseDesign?: CatalogDesign | null;
  isAddingToRequest?: boolean;
  onAddToRequest?: (design: CatalogDesign) => void;
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

function resolveAspectPixels(
  design?: PortalPrintRequestItemDesign | null,
  upload?: PortalPrintRequestItemUpload | null,
): { width: number; height: number } | null {
  if (typeof design?.width === 'number' && typeof design.height === 'number') {
    return { width: design.width, height: design.height };
  }

  if (typeof upload?.widthPx === 'number' && typeof upload.heightPx === 'number') {
    return { width: upload.widthPx, height: upload.heightPx };
  }

  if (
    typeof upload?.printWidthInches === 'number' &&
    typeof upload.printHeightInches === 'number' &&
    upload.printWidthInches > 0 &&
    upload.printHeightInches > 0
  ) {
    return { width: upload.printWidthInches, height: upload.printHeightInches };
  }

  return null;
}

function resolveInitialWidth(
  item: PrintRequestItem,
  design?: PortalPrintRequestItemDesign | null,
  upload?: PortalPrintRequestItemUpload | null,
): number {
  return item.printWidthInches ?? design?.printWidthInches ?? upload?.printWidthInches ?? 1;
}

function resolveInitialHeight(
  item: PrintRequestItem,
  design?: PortalPrintRequestItemDesign | null,
  upload?: PortalPrintRequestItemUpload | null,
): number {
  return item.printHeightInches ?? design?.printHeightInches ?? upload?.printHeightInches ?? 1;
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
  upload,
  item,
  readOnly = false,
  catalogReuseDesign,
  isAddingToRequest = false,
  onAddToRequest,
  onDuplicate,
  onRemove,
  onUpdate,
  onAutosaveStateChange,
}: PortalPrintRequestItemCardProps) {
  const isUploadItem =
    item.sourceType === 'customer_upload' || Boolean(item.customerUploadId);
  const catalogDesignId = item.designId?.trim() ?? '';
  const showCatalogReuse =
    readOnly && catalogDesignId.length > 0 && catalogReuseDesign !== undefined;
  const title =
    design?.title ??
    upload?.title ??
    item.titleSnapshot ??
    (isUploadItem ? 'Uploaded artwork' : 'Design');
  const previewPath =
    design?.previewPath ??
    design?.thumbnailPath ??
    upload?.previewPath ??
    upload?.thumbnailPath ??
    undefined;
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));
  const [printWidthInput, setPrintWidthInput] = useState(
    formatEditableNumber(resolveInitialWidth(item, design, upload)),
  );
  const [printHeightInput, setPrintHeightInput] = useState(
    formatEditableNumber(resolveInitialHeight(item, design, upload)),
  );
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { url: previewUrl } = useCatalogDerivativeUrl(previewPath, design?.updatedAtMs);
  const lastSavedSignatureRef = useRef(
    buildItemSignature(
      item.quantity,
      resolveInitialWidth(item, design, upload),
      resolveInitialHeight(item, design, upload),
    ),
  );
  const saveDraftRef = useRef<() => Promise<void>>(async () => undefined);
  const saveDebounceRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);

  useEffect(() => {
    const nextWidth = resolveInitialWidth(item, design, upload);
    const nextHeight = resolveInitialHeight(item, design, upload);
    const incomingSignature = buildItemSignature(item.quantity, nextWidth, nextHeight);

    if (incomingSignature === lastSavedSignatureRef.current) {
      return;
    }

    setQuantityInput(String(item.quantity));
    setPrintWidthInput(formatEditableNumber(nextWidth));
    setPrintHeightInput(formatEditableNumber(nextHeight));
    setIsLightboxOpen(false);
    lastSavedSignatureRef.current = incomingSignature;
  }, [design, item, upload]);

  const parsedQuantity = parsePositiveIntegerInput(quantityInput);
  const parsedPrintWidthInches = parsePositiveDecimalInput(printWidthInput);
  const parsedPrintHeightInches = parsePositiveDecimalInput(printHeightInput);

  const aspectPixels = useMemo(() => resolveAspectPixels(design, upload), [design, upload]);

  const sizeAssessment = useMemo(() => {
    if (!aspectPixels) {
      return null;
    }

    return assessPrintRequestItemSize({
      pixelWidth: aspectPixels.width,
      pixelHeight: aspectPixels.height,
      printWidthInches: parsedPrintWidthInches ?? Number.NaN,
      printHeightInches: parsedPrintHeightInches ?? Number.NaN,
      approvedMaxPrintWidthInches: upload?.approvedMaxPrintWidthInches ?? undefined,
      approvedMaxPrintHeightInches: upload?.approvedMaxPrintHeightInches ?? undefined,
      wasUpscaled: upload?.wasUpscaled ?? undefined,
    });
  }, [aspectPixels, parsedPrintHeightInches, parsedPrintWidthInches, upload]);

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
    if (aspectPixels && nextWidth !== null) {
      setPrintHeightInput(
        formatEditableNumber(
          calculateLockedHeightFromWidth(aspectPixels.width, aspectPixels.height, nextWidth),
        ),
      );
    }
  }

  function updateHeight(nextHeightInput: string) {
    setPrintHeightInput(nextHeightInput);

    const nextHeight = parsePositiveDecimalInput(nextHeightInput);
    if (aspectPixels && nextHeight !== null) {
      setPrintWidthInput(
        formatEditableNumber(
          calculateLockedWidthFromHeight(aspectPixels.width, aspectPixels.height, nextHeight),
        ),
      );
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
          <div className="portal-request-item-editor-thumb-wrap">
            <CatalogThumbnailPanel
              alt={`${title} preview`}
              catalogPath={previewPath}
              className="design-card-thumbnail"
              contentVersion={design?.updatedAtMs}
              fallbackLabel="Preview unavailable"
              interactive={Boolean(previewUrl)}
              loadingLabel="Loading preview"
              onImageClick={() => setIsLightboxOpen(true)}
            />
            {isUploadItem ? (
              <span className="portal-request-item-upload-badge">Uploaded</span>
            ) : null}
            {sizeAssessment ? (
              <span
                aria-label={`${sizeAssessment.qualityLabel}, ${sizeAssessment.effectiveDpi} DPI`}
                className={`portal-request-item-dpi-badge is-${sizeAssessment.qualityLevel}`}
                title={
                  sizeAssessment.warningMessage ??
                  sizeAssessment.errorMessage ??
                  `${sizeAssessment.qualityLabel} · ${sizeAssessment.effectiveDpi} DPI`
                }
              >
                {sizeAssessment.effectiveDpi} DPI
              </span>
            ) : null}
          </div>

          <div className="portal-request-item-editor-body">
            <h2>{title}</h2>

            {readOnly ? (
              <p className="portal-muted">Qty {item.quantity}</p>
            ) : null}
          </div>
        </div>

        {showCatalogReuse ? (
          <div className="portal-request-item-editor-actions portal-request-item-reuse-actions">
            {catalogReuseDesign ? (
              <button
                className="portal-button portal-button-primary portal-button-sm"
                disabled={isAddingToRequest}
                onClick={() => onAddToRequest?.(catalogReuseDesign)}
                type="button"
              >
                {isAddingToRequest ? 'Adding…' : 'Add to request'}
              </button>
            ) : (
              <p className="portal-muted portal-request-item-unavailable" role="status">
                No longer in catalog
              </p>
            )}
          </div>
        ) : null}

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
            ) : sizeAssessment?.warningMessage ? (
              <p className="portal-muted portal-request-item-dpi-warning" role="status">
                {sizeAssessment.warningMessage}
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
