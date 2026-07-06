import { CopyPlus, Minus, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { TextInput } from "../../../shared/components/TextInput";
import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import { useDesignDerivativeUrl } from "../../designs/hooks/useDesignDerivativeUrl";
import type { Design } from "../../designs/types/design.types";
import type { PrintRequestItem } from "../../../../../../shared/types/printRequest/printRequest.types";
import {
  assessPrintRequestItemSize,
  calculateLockedHeightFromWidth,
  calculateLockedWidthFromHeight,
  formatPrintRequestItemSizeLabel,
} from "../../../../../../shared/utils/printRequestItemSizing";
import type { UpdatePrintRequestItemInput } from "../services/printRequestService";

interface PrintRequestItemCardProps {
  design?: Design;
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

function resolveInitialWidth(item: PrintRequestItem, design?: Design): number {
  return item.printWidthInches ?? design?.printWidthInches ?? 1;
}

function resolveInitialHeight(item: PrintRequestItem, design?: Design): number {
  return item.printHeightInches ?? design?.printHeightInches ?? 1;
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
  item,
  onRemove,
  onDuplicate,
  onUpdate,
  onAutosaveStateChange,
  readOnly,
}: PrintRequestItemCardProps) {
  const title = design?.title ?? item.designId;
  const thumbPath = design?.thumbnailPath;
  const previewPath = design?.previewPath ?? thumbPath;
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));
  const [printWidthInput, setPrintWidthInput] = useState(formatEditableNumber(resolveInitialWidth(item, design)));
  const [printHeightInput, setPrintHeightInput] = useState(formatEditableNumber(resolveInitialHeight(item, design)));
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { url: previewUrl } = useDesignDerivativeUrl(previewPath);
  const lastSavedSignatureRef = useRef(buildItemSignature(
    item.quantity,
    resolveInitialWidth(item, design),
    resolveInitialHeight(item, design),
  ));
  const saveDraftRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    const nextWidth = resolveInitialWidth(item, design);
    const nextHeight = resolveInitialHeight(item, design);

    setQuantityInput(String(item.quantity));
    setPrintWidthInput(formatEditableNumber(nextWidth));
    setPrintHeightInput(formatEditableNumber(nextHeight));
    setIsConfirmingRemove(false);
    setIsLightboxOpen(false);
    lastSavedSignatureRef.current = buildItemSignature(item.quantity, nextWidth, nextHeight);
  }, [design, item]);

  const parsedQuantity = parsePositiveIntegerInput(quantityInput);
  const parsedPrintWidthInches = parsePositiveDecimalInput(printWidthInput);
  const parsedPrintHeightInches = parsePositiveDecimalInput(printHeightInput);

  const sizeAssessment = useMemo(() => {
    if (typeof design?.width !== "number" || typeof design.height !== "number") {
      return null;
    }

    return assessPrintRequestItemSize({
      pixelWidth: design.width,
      pixelHeight: design.height,
      printWidthInches: parsedPrintWidthInches ?? Number.NaN,
      printHeightInches: parsedPrintHeightInches ?? Number.NaN,
    });
  }, [design, parsedPrintHeightInches, parsedPrintWidthInches]);

  function commitQuantity(nextQuantity: number) {
    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setQuantityInput("");
      return;
    }

    setQuantityInput(String(Math.floor(nextQuantity)));
  }

  function stepQuantity(nextQuantity: number) {
    commitQuantity(nextQuantity);
    // Stepper clicks are a discrete action, not mid-edit typing, so they save immediately once
    // the committed quantity is reflected in state on the next tick.
    window.setTimeout(() => void saveDraftRef.current(), 0);
  }

  function updateWidth(nextWidthInput: string) {
    setPrintWidthInput(nextWidthInput);

    const nextWidth = parsePositiveDecimalInput(nextWidthInput);
    if (typeof design?.width === "number" && typeof design.height === "number" && nextWidth !== null) {
      setPrintHeightInput(
        formatEditableNumber(calculateLockedHeightFromWidth(design.width, design.height, nextWidth)),
      );
    }
  }

  function updateHeight(nextHeightInput: string) {
    setPrintHeightInput(nextHeightInput);

    const nextHeight = parsePositiveDecimalInput(nextHeightInput);
    if (typeof design?.width === "number" && typeof design.height === "number" && nextHeight !== null) {
      setPrintWidthInput(
        formatEditableNumber(calculateLockedWidthFromHeight(design.width, design.height, nextHeight)),
      );
    }
  }

  const sizeLabel =
    parsedPrintWidthInches !== null && parsedPrintHeightInches !== null
      ? formatPrintRequestItemSizeLabel(parsedPrintWidthInches, parsedPrintHeightInches)
      : "Size not set";
  const qualityClass = sizeAssessment
    ? `print-requests-item-quality is-${sizeAssessment.qualityLevel}`
    : "print-requests-item-quality is-unavailable";
  const quantityError = parsedQuantity === null ? "Quantity must be at least 1." : null;
  const canSave = (sizeAssessment?.canSave ?? true) && parsedQuantity !== null;
  const saveDraft = useCallback(async () => {
    if (
      parsedQuantity === null ||
      parsedPrintWidthInches === null ||
      parsedPrintHeightInches === null
    ) {
      return;
    }

    const payload = {
      quantity: parsedQuantity,
      printWidthInches: parsedPrintWidthInches,
      printHeightInches: parsedPrintHeightInches,
    };

    onAutosaveStateChange("saving");

    try {
      await onUpdate(item, payload);
      lastSavedSignatureRef.current = buildItemSignature(
        parsedQuantity,
        parsedPrintWidthInches,
        parsedPrintHeightInches,
      );
      onAutosaveStateChange("saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save item changes.";
      onAutosaveStateChange("failed", message, () => saveDraftRef.current());
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

  /**
   * Autosave only fires when focus leaves one of the quantity/width/height inputs (blur), not on
   * every keystroke — moving focus to another field in this card (or clicking a stepper) still
   * counts as leaving the input, but mid-edit typing (delete/backspace/retype) never triggers a
   * save until the user is done with that field.
   */
  const handleFieldBlur = useCallback(() => {
    if (readOnly || !canSave || !hasUnsavedDraft()) {
      return;
    }

    void saveDraft();
  }, [canSave, hasUnsavedDraft, readOnly, saveDraft]);

  /** Pressing Enter commits the field immediately instead of waiting for blur. */
  const handleFieldKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      event.currentTarget.blur();
    },
    [],
  );

  return (
    <>
      <Card className="print-requests-item-card">
        <div className="print-requests-item-card-summary">
          <div className="print-requests-item-card-summary-main">
            <DesignThumbnailPanel
              alt={`${title} thumbnail`}
              catalogPath={thumbPath}
              className="print-requests-item-card-thumbnail"
              fallbackLabel="Thumbnail unavailable"
              imageFit="contain"
              interactive={Boolean(previewUrl)}
              loadingLabel="Loading thumbnail"
              onImageClick={() => setIsLightboxOpen(true)}
            />

            <div className="print-requests-item-card-summary-copy">
              <strong className="print-requests-item-card-title">{title}</strong>
              <span className="print-requests-item-card-qty">Qty {item.quantity}</span>
              <span className="print-requests-item-card-size">{sizeLabel}</span>
            </div>
          </div>

          {readOnly ? null : (
            <div className="print-requests-item-card-summary-actions">
              <Button
                aria-label={`Duplicate ${title}`}
                onClick={() => onDuplicate(item)}
                size="sm"
                variant="secondary"
                type="button"
              >
                <CopyPlus aria-hidden="true" size={16} strokeWidth={2} />
              </Button>
              {isConfirmingRemove ? (
                <>
                  <Button
                    aria-label={`Cancel removing ${title}`}
                    onClick={() => setIsConfirmingRemove(false)}
                    size="sm"
                    variant="ghost"
                    type="button"
                  >
                    <X aria-hidden="true" size={16} strokeWidth={2} />
                  </Button>
                  <Button
                    aria-label={`Confirm remove ${title}`}
                    onClick={() => onRemove(item)}
                    size="sm"
                    variant="danger"
                    type="button"
                  >
                    Confirm
                  </Button>
                </>
              ) : (
                <Button
                  aria-label={`Remove ${title}`}
                  onClick={() => setIsConfirmingRemove(true)}
                  size="sm"
                  variant="danger"
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
                </Button>
              )}
            </div>
          )}
        </div>

        {readOnly ? null : (
          <div className="print-requests-item-card-form">
            <div className="print-requests-item-controls">
              <div className="print-requests-item-quantity-control">
                <span className="print-requests-item-control-label">Quantity</span>
                <div className="print-requests-item-stepper">
                  <button
                    aria-label={`Decrease quantity for ${title}`}
                    className="print-requests-item-stepper-button"
                    onClick={() => stepQuantity((parsedQuantity ?? 1) - 1)}
                    type="button"
                  >
                    <Minus aria-hidden="true" size={16} strokeWidth={2} />
                  </button>
                  <input
                    aria-label={`Quantity for ${title}`}
                    className="print-requests-number-input"
                    inputMode="numeric"
                    min={1}
                    name={`quantity-${item.id}`}
                    onBlur={handleFieldBlur}
                    onChange={(event) => setQuantityInput(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={handleFieldKeyDown}
                    type="number"
                    value={quantityInput}
                  />
                  <button
                    aria-label={`Increase quantity for ${title}`}
                    className="print-requests-item-stepper-button"
                    onClick={() => stepQuantity((parsedQuantity ?? 0) + 1)}
                    type="button"
                  >
                    <Plus aria-hidden="true" size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <TextInput
                label="Width"
                name={`printWidthInches-${item.id}`}
                className="print-requests-number-input"
                inputMode="decimal"
                min={0.01}
                onBlur={handleFieldBlur}
                onChange={(event) => updateWidth(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={handleFieldKeyDown}
                step={0.01}
                type="number"
                value={printWidthInput}
              />

              <TextInput
                label="Height"
                name={`printHeightInches-${item.id}`}
                className="print-requests-number-input"
                inputMode="decimal"
                min={0.01}
                onBlur={handleFieldBlur}
                onChange={(event) => updateHeight(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={handleFieldKeyDown}
                step={0.01}
                type="number"
                value={printHeightInput}
              />
            </div>

            <div className="print-requests-item-quality-row">
              <span className={qualityClass}>
                {sizeAssessment
                  ? `${sizeAssessment.qualityLabel} (${sizeAssessment.effectiveDpi} DPI)`
                  : "DPI unavailable"}
              </span>
              <span className="print-requests-item-aspect-lock">Aspect ratio locked</span>
            </div>

            {quantityError ? (
              <p className="auth-message auth-message-error" role="alert">
                {quantityError}
              </p>
            ) : sizeAssessment?.errorMessage ? (
              <p className="auth-message auth-message-error" role="alert">
                {sizeAssessment.errorMessage}
              </p>
            ) : sizeAssessment?.warningMessage ? (
              <p className="auth-message auth-message-warning" role="status">
                {sizeAssessment.warningMessage}
              </p>
            ) : null}
          </div>
        )}
      </Card>

      <DesignPreviewLightbox
        alt={`${title} preview`}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        previewUrl={previewUrl ?? null}
      />
    </>
  );
}
