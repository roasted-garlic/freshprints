import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import { useDesignDerivativeUrl } from "../../designs/hooks/useDesignDerivativeUrl";
import type { Design } from "../../designs/types/design.types";
import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import {
  assessPrintRequestItemSize,
  calculateLockedHeightFromWidth,
  calculateLockedWidthFromHeight,
  formatPrintRequestItemSizeLabel,
} from "@fresh-prints/shared/utils/printRequestItemSizing";
import type { UpdatePrintRequestItemInput } from "../services/printRequestService";
import { resolvePrintRequestItemArtworkBackground } from "../utils/resolvePrintRequestItemArtworkBackground";

export interface PrintRequestItemUploadSummary {
  title: string;
  previewPath?: string | null;
  thumbnailPath?: string | null;
  printWidthInches?: number | null;
  printHeightInches?: number | null;
  widthPx?: number | null;
  heightPx?: number | null;
  approvedMaxPrintWidthInches?: number | null;
  approvedMaxPrintHeightInches?: number | null;
  wasUpscaled?: boolean | null;
}

interface PrintRequestItemCardProps {
  design?: Design;
  upload?: PrintRequestItemUploadSummary | null;
  item: PrintRequestItem;
  onRemove: (item: PrintRequestItem) => void;
  onDuplicate: (item: PrintRequestItem) => void;
  onUpdate: (item: PrintRequestItem, input: UpdatePrintRequestItemInput) => Promise<void>;
  onAutosaveStateChange: (
    status: "saving" | "saved" | "failed",
    message?: string,
    retry?: () => Promise<void>,
  ) => void;
  /** When true, hides edit/remove/duplicate controls because the request is locked while queued to a show. */
  readOnly?: boolean;
}

function resolveInitialWidth(
  item: PrintRequestItem,
  design?: Design,
  upload?: PrintRequestItemUploadSummary | null,
): number {
  return item.printWidthInches ?? design?.printWidthInches ?? upload?.printWidthInches ?? 1;
}

function resolveInitialHeight(
  item: PrintRequestItem,
  design?: Design,
  upload?: PrintRequestItemUploadSummary | null,
): number {
  return item.printHeightInches ?? design?.printHeightInches ?? upload?.printHeightInches ?? 1;
}

function resolveAspectPixels(
  design?: Design,
  upload?: PrintRequestItemUploadSummary | null,
): { width: number; height: number } | null {
  if (typeof design?.width === "number" && typeof design.height === "number") {
    return { width: design.width, height: design.height };
  }

  if (
    typeof upload?.widthPx === "number" &&
    upload.widthPx > 0 &&
    typeof upload?.heightPx === "number" &&
    upload.heightPx > 0
  ) {
    return { width: upload.widthPx, height: upload.heightPx };
  }

  return null;
}

function formatEditableNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : "";
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

export function PrintRequestItemCard({
  design,
  upload = null,
  item,
  onRemove,
  onDuplicate,
  onUpdate,
  onAutosaveStateChange,
  readOnly,
}: PrintRequestItemCardProps) {
  const isUploadItem = item.sourceType === "customer_upload" || Boolean(item.customerUploadId);
  const title =
    design?.title ??
    upload?.title ??
    item.titleSnapshot ??
    (isUploadItem ? "Uploaded artwork" : item.designId ?? "Design");
  const previewPath =
    design?.previewPath ??
    design?.thumbnailPath ??
    upload?.previewPath ??
    upload?.thumbnailPath ??
    undefined;
  const artworkBackgroundHex = resolvePrintRequestItemArtworkBackground(design);
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));
  const [printWidthInput, setPrintWidthInput] = useState(
    formatEditableNumber(resolveInitialWidth(item, design, upload)),
  );
  const [printHeightInput, setPrintHeightInput] = useState(
    formatEditableNumber(resolveInitialHeight(item, design, upload)),
  );
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { url: previewUrl } = useDesignDerivativeUrl(previewPath);
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
    setIsConfirmingRemove(false);
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
      approvedMaxPrintWidthInches:
        upload?.approvedMaxPrintWidthInches ?? design?.approvedMaxPrintWidthInches,
      approvedMaxPrintHeightInches:
        upload?.approvedMaxPrintHeightInches ?? design?.approvedMaxPrintHeightInches,
      wasUpscaled: upload?.wasUpscaled ?? design?.wasUpscaled,
    });
  }, [aspectPixels, design, parsedPrintHeightInches, parsedPrintWidthInches, upload]);

  const sizeLabel =
    parsedPrintWidthInches !== null && parsedPrintHeightInches !== null
      ? formatPrintRequestItemSizeLabel(parsedPrintWidthInches, parsedPrintHeightInches)
      : "Size not set";
  const qualityClass = sizeAssessment
    ? `print-requests-item-quality is-${sizeAssessment.qualityLevel}`
    : "print-requests-item-quality is-unavailable";
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

  function stepQuantity(nextQuantity: number) {
    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setQuantityInput("");
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
    onAutosaveStateChange("saving");

    try {
      await onUpdate(item, {
        quantity: parsedQuantity,
        printWidthInches: parsedPrintWidthInches,
        printHeightInches: parsedPrintHeightInches,
      });
      lastSavedSignatureRef.current = draftSignature;
      onAutosaveStateChange("saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save item changes.";
      onAutosaveStateChange("failed", message, () => saveDraftRef.current());
    } finally {
      saveInFlightRef.current = false;

      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        void saveDraftRef.current();
      }
    }
  }, [
    item,
    onAutosaveStateChange,
    onUpdate,
    parsedPrintHeightInches,
    parsedPrintWidthInches,
    parsedQuantity,
  ]);

  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  const hasUnsavedDraft = useCallback(() => {
    const draftSignature = buildItemSignature(
      parsedQuantity ?? Number.NaN,
      parsedPrintWidthInches ?? Number.NaN,
      parsedPrintHeightInches ?? Number.NaN,
    );

    return draftSignature !== lastSavedSignatureRef.current;
  }, [parsedPrintHeightInches, parsedPrintWidthInches, parsedQuantity]);

  const handleFieldBlur = useCallback(() => {
    if (readOnly || !canSave || !hasUnsavedDraft()) {
      return;
    }

    cancelScheduledSave();
    void saveDraft();
  }, [canSave, hasUnsavedDraft, readOnly, saveDraft]);

  const handleFieldFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select();
  }, []);

  const handleFieldKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  }, []);

  const handleQuantityKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      handleFieldKeyDown(event);

      if (event.key !== "Tab") {
        return;
      }

      const quantityInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[data-print-request-qty-input="true"]'),
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
    },
    [handleFieldKeyDown],
  );

  return (
    <>
      <Card className="print-requests-item-card">
        <div className="print-requests-item-card-header">
          <DesignThumbnailPanel
            alt={`${title} preview`}
            artworkBackgroundHex={artworkBackgroundHex}
            catalogPath={previewPath}
            className="print-requests-item-card-thumbnail"
            fallbackLabel="Preview unavailable"
            imageFit="contain"
            interactive={Boolean(previewUrl)}
            loadingLabel="Loading preview"
            onImageClick={() => setIsLightboxOpen(true)}
          />

          <div className="print-requests-item-card-copy">
            <strong className="print-requests-item-card-title">{title}</strong>
            {readOnly ? (
              <>
                <span className="print-requests-item-card-meta">Qty {item.quantity}</span>
                <span className="print-requests-item-card-meta">{sizeLabel}</span>
              </>
            ) : null}
          </div>
        </div>

        {!readOnly ? (
          <>
            <div className="print-requests-item-size-row">
              <label className="print-requests-item-field">
                <span className="print-requests-item-field-label">Width</span>
                <div className="print-requests-item-size-input-wrap">
                  <input
                    className="print-requests-number-input print-requests-item-size-input"
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
                  <span className="print-requests-item-size-unit">in</span>
                </div>
              </label>

              <label className="print-requests-item-field">
                <span className="print-requests-item-field-label">Height</span>
                <div className="print-requests-item-size-input-wrap">
                  <input
                    className="print-requests-number-input print-requests-item-size-input"
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
                  <span className="print-requests-item-size-unit">in</span>
                </div>
              </label>
            </div>

            <div className="print-requests-item-meta-row">
              {sizeAssessment ? (
                <span
                  aria-label={`${sizeAssessment.qualityLabel}, ${sizeAssessment.effectiveDpi} DPI`}
                  className={qualityClass}
                >
                  {sizeAssessment.effectiveDpi} DPI
                </span>
              ) : (
                <span className={`${qualityClass} print-requests-item-quality-compact`}>DPI unavailable</span>
              )}

              <div className="print-requests-item-stepper">
                <button
                  aria-label={`Decrease quantity for ${title}`}
                  className="print-requests-item-stepper-button"
                  onClick={() => stepQuantity((parsedQuantity ?? 1) - 1)}
                  tabIndex={-1}
                  type="button"
                >
                  <Minus aria-hidden="true" size={14} strokeWidth={2} />
                </button>
                <input
                  aria-label={`Quantity for ${title}`}
                  className="print-requests-number-input print-requests-item-stepper-input"
                  data-print-request-qty-input="true"
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
                  className="print-requests-item-stepper-button"
                  onClick={() => stepQuantity((parsedQuantity ?? 0) + 1)}
                  tabIndex={-1}
                  type="button"
                >
                  <Plus aria-hidden="true" size={14} strokeWidth={2} />
                </button>
              </div>
            </div>

            {sizeAssessment?.errorMessage ? (
              <p className="auth-message auth-message-error print-requests-item-field-error" role="alert">
                {sizeAssessment.errorMessage}
              </p>
            ) : sizeAssessment?.warningMessage ? (
              <p className="auth-message auth-message-warning print-requests-item-field-error" role="status">
                {sizeAssessment.warningMessage}
              </p>
            ) : null}

            <div className="print-requests-item-editor-actions">
              <Button onClick={() => onDuplicate(item)} size="sm" tabIndex={-1} type="button" variant="secondary">
                Duplicate
              </Button>

              {isConfirmingRemove ? (
                <>
                  <Button onClick={() => setIsConfirmingRemove(false)} size="sm" tabIndex={-1} type="button" variant="ghost">
                    Cancel
                  </Button>
                  <Button onClick={() => onRemove(item)} size="sm" tabIndex={-1} type="button" variant="danger">
                    Confirm
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsConfirmingRemove(true)} size="sm" tabIndex={-1} type="button" variant="danger">
                  Remove
                </Button>
              )}
            </div>
          </>
        ) : null}
      </Card>

      <DesignPreviewLightbox
        alt={`${title} preview`}
        artworkBackgroundHex={artworkBackgroundHex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        previewUrl={previewUrl ?? null}
      />
    </>
  );
}
