import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import { useDesignDerivativeUrl } from "../../designs/hooks/useDesignDerivativeUrl";
import type { Design } from "../../designs/types/design.types";
import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { StandardPrintSizesSettings } from "@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants";
import { resolveStandardSizePresetKeyAfterManualSizeChange } from "@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants";
import { resolvePrintRequestItemSourcePill } from "@fresh-prints/shared/utils/printRequestItemSource";
import {
  assessPrintRequestItemSize,
  calculateLockedHeightFromWidth,
  calculateLockedWidthFromHeight,
  formatPrintRequestItemSizeLabel,
} from "@fresh-prints/shared/utils/printRequestItemSizing";
import {
  resolvePrintRequestItemPersistenceHealth,
  type PrintRequestItemPersistenceHealth,
} from "@fresh-prints/shared/utils/printRequestItemPersistenceHealth";
import type { UpdatePrintRequestItemInput } from "../services/printRequestService";
import { resolvePrintRequestItemArtworkBackground } from "../utils/resolvePrintRequestItemArtworkBackground";
import {
  StandardPrintSizesModal,
} from "./StandardPrintSizesModal";
import { resolveStandardPrintSizeCardLabel } from "../utils/standardPrintSizeLabels";

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
  fromAssistedCreation?: boolean;
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
  onPersistenceHealthChange?: (itemId: string, health: PrintRequestItemPersistenceHealth) => void;
  onRegisterFlush?: (itemId: string, flush: (() => Promise<boolean>) | null) => void;
  standardPrintSizesSettings: StandardPrintSizesSettings;
  /** When true, hides edit/remove/duplicate controls because the request is locked while queued to a show. */
  readOnly?: boolean;
}

function resolveInitialWidth(item: PrintRequestItem): number {
  return typeof item.printWidthInches === "number" && item.printWidthInches > 0
    ? item.printWidthInches
    : Number.NaN;
}

function resolveInitialHeight(item: PrintRequestItem): number {
  return typeof item.printHeightInches === "number" && item.printHeightInches > 0
    ? item.printHeightInches
    : Number.NaN;
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

function buildItemSignature(
  quantity: number,
  width: number,
  height: number,
  standardSizePresetKey?: string | null,
): string {
  return JSON.stringify({
    quantity,
    width: Number.isFinite(width) ? Number(width.toFixed(2)) : width,
    height: Number.isFinite(height) ? Number(height.toFixed(2)) : height,
    standardSizePresetKey: standardSizePresetKey ?? null,
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
  onPersistenceHealthChange,
  onRegisterFlush,
  readOnly,
  standardPrintSizesSettings,
}: PrintRequestItemCardProps) {
  const isUploadItem = item.sourceType === "customer_upload" || Boolean(item.customerUploadId);
  const sourcePill = resolvePrintRequestItemSourcePill({
    item,
    fromAssistedCreation: upload?.fromAssistedCreation,
  });
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
    formatEditableNumber(resolveInitialWidth(item)),
  );
  const [printHeightInput, setPrintHeightInput] = useState(
    formatEditableNumber(resolveInitialHeight(item)),
  );
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isStandardSizesModalOpen, setIsStandardSizesModalOpen] = useState(false);
  const [standardSizePresetKey, setStandardSizePresetKey] = useState<string | undefined>(
    item.standardSizePresetKey,
  );
  const { url: previewUrl } = useDesignDerivativeUrl(previewPath);
  const lastSavedSignatureRef = useRef(
    buildItemSignature(
      item.quantity,
      resolveInitialWidth(item),
      resolveInitialHeight(item),
      item.standardSizePresetKey,
    ),
  );
  const saveDraftRef = useRef<() => Promise<boolean>>(async () => false);
  const saveDebounceRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  useEffect(() => {
    const nextWidth = resolveInitialWidth(item);
    const nextHeight = resolveInitialHeight(item);
    const incomingSignature = buildItemSignature(
      item.quantity,
      nextWidth,
      nextHeight,
      item.standardSizePresetKey,
    );

    if (incomingSignature === lastSavedSignatureRef.current) {
      return;
    }

    setQuantityInput(String(item.quantity));
    setPrintWidthInput(formatEditableNumber(nextWidth));
    setPrintHeightInput(formatEditableNumber(nextHeight));
    setStandardSizePresetKey(item.standardSizePresetKey);
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

  function applyManualSize(nextWidthInput: string, nextHeightInput: string) {
    const nextWidth = parsePositiveDecimalInput(nextWidthInput);
    const nextHeight = parsePositiveDecimalInput(nextHeightInput);
    if (nextWidth === null || nextHeight === null) {
      setStandardSizePresetKey(undefined);
      return;
    }
    setStandardSizePresetKey(
      resolveStandardSizePresetKeyAfterManualSizeChange({
        currentPresetKey: standardSizePresetKey,
        settings: standardPrintSizesSettings,
        printWidthInches: nextWidth,
      }),
    );
  }

  function updateWidth(nextWidthInput: string) {
    setPrintWidthInput(nextWidthInput);

    const nextWidth = parsePositiveDecimalInput(nextWidthInput);
    let nextHeightInput = printHeightInput;
    if (aspectPixels && nextWidth !== null) {
      nextHeightInput = formatEditableNumber(
        calculateLockedHeightFromWidth(aspectPixels.width, aspectPixels.height, nextWidth),
      );
      setPrintHeightInput(nextHeightInput);
    }
    applyManualSize(nextWidthInput, nextHeightInput);
  }

  function updateHeight(nextHeightInput: string) {
    setPrintHeightInput(nextHeightInput);

    const nextHeight = parsePositiveDecimalInput(nextHeightInput);
    let nextWidthInput = printWidthInput;
    if (aspectPixels && nextHeight !== null) {
      nextWidthInput = formatEditableNumber(
        calculateLockedWidthFromHeight(aspectPixels.width, aspectPixels.height, nextHeight),
      );
      setPrintWidthInput(nextWidthInput);
    }
    applyManualSize(nextWidthInput, nextHeightInput);
  }

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (
      parsedQuantity === null ||
      parsedPrintWidthInches === null ||
      parsedPrintHeightInches === null ||
      !canSave
    ) {
      return false;
    }

    const draftSignature = buildItemSignature(
      parsedQuantity,
      parsedPrintWidthInches,
      parsedPrintHeightInches,
      standardSizePresetKey,
    );

    if (draftSignature === lastSavedSignatureRef.current) {
      return true;
    }

    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return false;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    setIsFailed(false);
    onAutosaveStateChange("saving");

    try {
      await onUpdate(item, {
        quantity: parsedQuantity,
        printWidthInches: parsedPrintWidthInches,
        printHeightInches: parsedPrintHeightInches,
        standardSizePresetKey: standardSizePresetKey ?? null,
      });
      lastSavedSignatureRef.current = draftSignature;
      setIsFailed(false);
      onAutosaveStateChange("saved");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save item changes.";
      setIsFailed(true);
      onAutosaveStateChange("failed", message, async () => {
        await saveDraftRef.current();
      });
      return false;
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);

      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        void saveDraftRef.current();
      }
    }
  }, [
    canSave,
    item,
    onAutosaveStateChange,
    onUpdate,
    parsedPrintHeightInches,
    parsedPrintWidthInches,
    parsedQuantity,
    standardSizePresetKey,
  ]);

  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  useEffect(() => {
    onRegisterFlush?.(item.id, () => saveDraftRef.current());
    return () => {
      onRegisterFlush?.(item.id, null);
    };
  }, [item.id, onRegisterFlush]);

  const isDirty =
    buildItemSignature(
      parsedQuantity ?? Number.NaN,
      parsedPrintWidthInches ?? Number.NaN,
      parsedPrintHeightInches ?? Number.NaN,
    ) !== lastSavedSignatureRef.current;

  const persistenceHealth = resolvePrintRequestItemPersistenceHealth({
    isOptimistic: false,
    isSaving,
    isFailed,
    isDirty,
    canSave,
  });

  useEffect(() => {
    onPersistenceHealthChange?.(item.id, persistenceHealth);
  }, [item.id, onPersistenceHealthChange, persistenceHealth]);

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
          <div className="print-requests-item-card-thumb-wrap">
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
            <span
              className={`print-requests-item-source-badge is-${sourcePill.variant}`}
            >
              {sourcePill.label}
            </span>
          </div>

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
            <button
              className={`print-requests-standard-size-trigger${
                standardSizePresetKey ? " is-selected" : ""
              }`}
              onClick={() => setIsStandardSizesModalOpen(true)}
              type="button"
            >
              {resolveStandardPrintSizeCardLabel(standardPrintSizesSettings, standardSizePresetKey)}
            </button>

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

      {aspectPixels ? (
        <StandardPrintSizesModal
          approvedMaxPrintHeightInches={
            upload?.approvedMaxPrintHeightInches ?? design?.approvedMaxPrintHeightInches
          }
          approvedMaxPrintWidthInches={
            upload?.approvedMaxPrintWidthInches ?? design?.approvedMaxPrintWidthInches
          }
          currentPrintHeightInches={parsedPrintHeightInches ?? resolveInitialHeight(item)}
          currentPrintWidthInches={parsedPrintWidthInches ?? resolveInitialWidth(item)}
          isOpen={isStandardSizesModalOpen}
          onApply={({ printHeightInches, printWidthInches, standardSizePresetKey: nextPresetKey }) => {
            setPrintWidthInput(formatEditableNumber(printWidthInches));
            setPrintHeightInput(formatEditableNumber(printHeightInches));
            setStandardSizePresetKey(nextPresetKey);
            scheduleSave();
          }}
          onClose={() => setIsStandardSizesModalOpen(false)}
          pixelHeight={aspectPixels.height}
          pixelWidth={aspectPixels.width}
          settings={standardPrintSizesSettings}
          wasUpscaled={upload?.wasUpscaled ?? design?.wasUpscaled}
        />
      ) : null}
    </>
  );
}
