import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { HoverBubbleTooltip } from "../../../shared/components/HoverBubbleTooltip";
import { Toggle } from "../../../shared/components/Toggle";
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
import {
  resolveActiveArtworkPixelDimensions,
  resolveArtworkEnhanceMode,
  resolveInteractiveUpscaleToggleEligibility,
} from "@fresh-prints/shared/utils/interactiveArtworkEnhance";
import type { SetPrintRequestItemArtworkEnhanceModeResponse } from "@fresh-prints/shared/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types";
import type { UpdatePrintRequestItemInput } from "../services/printRequestService";
import { setPrintRequestItemArtworkEnhanceModeService } from "../services/setPrintRequestItemArtworkEnhanceModeService";
import { resolvePrintRequestItemArtworkBackground } from "../utils/resolvePrintRequestItemArtworkBackground";
import {
  StandardPrintSizesModal,
} from "./StandardPrintSizesModal";
import { resolveStandardPrintSizeCardLabel } from "../utils/standardPrintSizeLabels";
import { resolveArtworkEnhanceCallableErrorMessage } from "../utils/artworkEnhanceCallableErrorMessage";

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
  interactiveEnhancedProductionStoragePath?: string | null;
  interactiveEnhancedWidthPx?: number | null;
  interactiveEnhancedHeightPx?: number | null;
  interactiveEnhanceGeneratedAt?: unknown;
}

interface PrintRequestItemCardProps {
  printRequestId: string;
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
  onDesignArtworkEnhanced?: () => void | Promise<void>;
  onArtworkEnhanceModeChanged?: (result: SetPrintRequestItemArtworkEnhanceModeResponse) => void;
  /** Parent-owned lightbox open — identity is always `item.id`. */
  onOpenPreview?: () => void;
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
  printRequestId,
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
  onDesignArtworkEnhanced,
  onArtworkEnhanceModeChanged,
  onOpenPreview,
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
  const [isTogglingEnhance, setIsTogglingEnhance] = useState(false);
  const [enhanceToggleMode, setEnhanceToggleMode] = useState<"baseline" | "enhanced" | null>(null);
  const [enhanceMessage, setEnhanceMessage] = useState<string | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhanceResultPixels, setEnhanceResultPixels] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [hiddenDpiWarningKey, setHiddenDpiWarningKey] = useState<string | null>(null);
  const applyArtworkEnhanceRef = useRef<
    (mode: "baseline" | "enhanced", confirmFirstEnhance?: boolean) => Promise<void>
  >(async () => {});

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
    lastSavedSignatureRef.current = incomingSignature;
  }, [design, item, upload]);

  const parsedQuantity = parsePositiveIntegerInput(quantityInput);
  const parsedPrintWidthInches = parsePositiveDecimalInput(printWidthInput);
  const parsedPrintHeightInches = parsePositiveDecimalInput(printHeightInput);
  const artworkEnhanceMode = resolveArtworkEnhanceMode(item.artworkEnhanceMode);
  const displayedArtworkEnhanceMode = enhanceToggleMode ?? artworkEnhanceMode;
  const baselineAspectPixels = useMemo(() => resolveAspectPixels(design, upload), [design, upload]);
  const activeAspectPixels = useMemo(() => {
    if (!baselineAspectPixels) {
      return null;
    }

    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode,
      baselineWidthPx: baselineAspectPixels.width,
      baselineHeightPx: baselineAspectPixels.height,
      enhancedWidthPx:
        design?.interactiveEnhancedWidthPx ??
        upload?.interactiveEnhancedWidthPx ??
        enhanceResultPixels?.width,
      enhancedHeightPx:
        design?.interactiveEnhancedHeightPx ??
        upload?.interactiveEnhancedHeightPx ??
        enhanceResultPixels?.height,
    });

    if (!active) {
      return null;
    }

    return { width: active.widthPx, height: active.heightPx };
  }, [artworkEnhanceMode, baselineAspectPixels, design, enhanceResultPixels, upload]);
  const aspectPixels = activeAspectPixels ?? baselineAspectPixels;
  const dpiAspectPixels = activeAspectPixels;

  const sizeAssessment = useMemo(() => {
    if (!dpiAspectPixels) {
      return null;
    }

    return assessPrintRequestItemSize({
      pixelWidth: dpiAspectPixels.width,
      pixelHeight: dpiAspectPixels.height,
      printWidthInches: parsedPrintWidthInches ?? Number.NaN,
      printHeightInches: parsedPrintHeightInches ?? Number.NaN,
      approvedMaxPrintWidthInches:
        upload?.approvedMaxPrintWidthInches ?? design?.approvedMaxPrintWidthInches,
      approvedMaxPrintHeightInches:
        upload?.approvedMaxPrintHeightInches ?? design?.approvedMaxPrintHeightInches,
      wasUpscaled: upload?.wasUpscaled ?? design?.wasUpscaled,
    });
  }, [design, dpiAspectPixels, parsedPrintHeightInches, parsedPrintWidthInches, upload]);

  const sizeLabel =
    parsedPrintWidthInches !== null && parsedPrintHeightInches !== null
      ? formatPrintRequestItemSizeLabel(parsedPrintWidthInches, parsedPrintHeightInches)
      : "Size not set";
  const qualityClass = sizeAssessment
    ? `print-requests-item-quality is-${sizeAssessment.qualityLevel}`
    : "print-requests-item-quality is-unavailable";
  const canSave = (sizeAssessment?.canSave ?? true) && parsedQuantity !== null;

  const dpiWarningCalloutKey =
    sizeAssessment?.warningMessage &&
    parsedPrintWidthInches !== null &&
    parsedPrintHeightInches !== null
      ? `${item.id}:${sizeAssessment.warningMessage}:${parsedPrintWidthInches}:${parsedPrintHeightInches}`
      : null;
  const showDpiWarningCallout =
    dpiWarningCalloutKey !== null && hiddenDpiWarningKey !== dpiWarningCalloutKey;
  const dpiHoverBubble =
    sizeAssessment?.warningMessage ?? sizeAssessment?.errorMessage ?? undefined;
  const dpiHoverBubbleTone = sizeAssessment?.errorMessage ? "error" : "warning";

  useEffect(() => {
    if (!dpiWarningCalloutKey || hiddenDpiWarningKey === dpiWarningCalloutKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHiddenDpiWarningKey(dpiWarningCalloutKey);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [dpiWarningCalloutKey, hiddenDpiWarningKey]);

  const upscaleToggleEligibility = useMemo(() => {
    if (!baselineAspectPixels || readOnly) {
      return null;
    }

    const interactiveMarker =
      design?.interactiveEnhanceGeneratedAt ??
      upload?.interactiveEnhanceGeneratedAt ??
      (design?.interactiveEnhancedOriginalPath || upload?.interactiveEnhancedProductionStoragePath
        ? true
        : null);

    return resolveInteractiveUpscaleToggleEligibility({
      asset: {
        currentWidthPx: baselineAspectPixels.width,
        currentHeightPx: baselineAspectPixels.height,
        upscalePassCount: design?.upscalePassCount ?? (upload?.wasUpscaled ? 1 : 0),
        upscaleFactor: design?.upscaleFactor,
        nativeSourceWidthPx: design?.nativeProductionWidthPx,
        nativeSourceHeightPx: design?.nativeProductionHeightPx,
        interactiveEnhanceGeneratedAt: interactiveMarker,
        enhancedWidthPx:
          design?.interactiveEnhancedWidthPx ?? upload?.interactiveEnhancedWidthPx ?? enhanceResultPixels?.width,
        enhancedHeightPx:
          design?.interactiveEnhancedHeightPx ??
          upload?.interactiveEnhancedHeightPx ??
          enhanceResultPixels?.height,
      },
      printWidthInches: parsedPrintWidthInches ?? Number.NaN,
      printHeightInches: parsedPrintHeightInches ?? Number.NaN,
      artworkEnhanceMode,
    });
  }, [
    artworkEnhanceMode,
    baselineAspectPixels,
    design,
    enhanceResultPixels,
    parsedPrintHeightInches,
    parsedPrintWidthInches,
    readOnly,
    upload,
  ]);

  async function applyArtworkEnhanceMode(
    mode: "baseline" | "enhanced",
    confirmFirstEnhance = false,
  ) {
    if (!printRequestId || isTogglingEnhance) {
      return;
    }

    setIsTogglingEnhance(true);
    setEnhanceToggleMode(mode);
    setEnhanceError(null);
    setEnhanceMessage(null);

    try {
      const result = await setPrintRequestItemArtworkEnhanceModeService.setMode({
        printRequestId,
        itemId: item.id,
        mode,
        confirmFirstEnhance,
      });

      onArtworkEnhanceModeChanged?.(result);
      if (result.artworkEnhanceMode === "enhanced") {
        setEnhanceResultPixels({
          width: result.widthPx,
          height: result.heightPx,
        });
      } else {
        setEnhanceResultPixels(null);
      }
      await onDesignArtworkEnhanced?.();

      if (result.resultCode === "in_progress") {
        setEnhanceMessage(result.message ?? "Enhancement is already in progress.");
      } else if (mode === "enhanced") {
        setEnhanceMessage(result.message ?? "Enhanced resolution enabled.");
      } else {
        setEnhanceMessage(result.message ?? "Using standard artwork at the current print size.");
      }
    } catch (error) {
      setEnhanceError(resolveArtworkEnhanceCallableErrorMessage(error));
    } finally {
      setIsTogglingEnhance(false);
      setEnhanceToggleMode(null);
    }
  }

  applyArtworkEnhanceRef.current = applyArtworkEnhanceMode;

  async function handleUpscaleToggle(nextMode: "baseline" | "enhanced") {
    if (nextMode === artworkEnhanceMode) {
      return;
    }

    const confirmFirstEnhance =
      nextMode === "enhanced" && upscaleToggleEligibility?.state === "available";

    await applyArtworkEnhanceMode(nextMode, confirmFirstEnhance);
  }

  const showUpscaleToggle = Boolean(upscaleToggleEligibility);

  useEffect(() => {
    return () => {
      if (saveDebounceRef.current !== null) {
        window.clearTimeout(saveDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enhanceMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setEnhanceMessage(null);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [enhanceMessage]);

  useEffect(() => {
    setEnhanceResultPixels(null);
  }, [
    design?.interactiveEnhancedWidthPx,
    design?.interactiveEnhancedHeightPx,
    upload?.interactiveEnhancedWidthPx,
    upload?.interactiveEnhancedHeightPx,
    item.id,
  ]);

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
    <div data-print-request-item-id={item.id}>
      <Card className="print-requests-item-card">
        <div className="print-requests-item-card-header">
          <div
            className={`print-requests-item-card-thumb-wrap${
              isTogglingEnhance ? " is-enhancing" : ""
            }`}
          >
            <DesignThumbnailPanel
              alt={`${title} preview`}
              artworkBackgroundHex={artworkBackgroundHex}
              catalogPath={previewPath}
              className="print-requests-item-card-thumbnail"
              fallbackLabel="Preview unavailable"
              imageFit="contain"
              interactive={Boolean(previewUrl) && !isTogglingEnhance && Boolean(onOpenPreview)}
              loadingLabel="Loading preview"
              onImageClick={onOpenPreview}
            />
            {isTogglingEnhance ? (
              <div
                aria-live="polite"
                className={`print-requests-item-enhance-overlay${
                  enhanceToggleMode === "baseline" ? " is-removing" : ""
                }`}
                role="status"
              >
                <span className="print-requests-item-enhance-overlay-label">
                  {enhanceToggleMode === "baseline" ? "Removing upscale…" : "Upscaling…"}
                </span>
              </div>
            ) : null}
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

            <div
              className={`print-requests-item-metrics-grid${
                showUpscaleToggle ? " has-upscale" : ""
              }`}
            >
            <div
              className={`print-requests-item-size-row${
                showUpscaleToggle ? " has-upscale" : ""
              }`}
            >
              {showUpscaleToggle ? (
                <div className="print-requests-item-field print-requests-item-upscale-field">
                  <span className="print-requests-item-field-label">Upscale</span>
                  <div
                    className="print-requests-item-upscale-toggle-wrap"
                    title={upscaleToggleEligibility?.helperText}
                  >
                    <Toggle
                      checked={displayedArtworkEnhanceMode === "enhanced"}
                      disabled={
                        isTogglingEnhance || !upscaleToggleEligibility?.toggleEnabled
                      }
                      label="Upscale"
                      name={`artworkEnhanceMode-${item.id}`}
                      onChange={(checked) => {
                        void handleUpscaleToggle(checked ? "enhanced" : "baseline");
                      }}
                    />
                  </div>
                </div>
              ) : null}

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
                <HoverBubbleTooltip bubble={dpiHoverBubble} tone={dpiHoverBubbleTone}>
                  <span
                    aria-label={
                      dpiHoverBubble ??
                      `${sizeAssessment.qualityLabel}, ${sizeAssessment.effectiveDpi} DPI`
                    }
                    className={qualityClass}
                    tabIndex={dpiHoverBubble ? 0 : undefined}
                  >
                    {sizeAssessment.effectiveDpi} DPI
                  </span>
                </HoverBubbleTooltip>
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
            </div>

            {sizeAssessment?.errorMessage ? (
              <p className="auth-message auth-message-error print-requests-item-field-error" role="alert">
                {sizeAssessment.errorMessage}
              </p>
            ) : showDpiWarningCallout && sizeAssessment?.warningMessage ? (
              <p className="auth-message auth-message-warning print-requests-item-field-error" role="status">
                {sizeAssessment.warningMessage}
              </p>
            ) : null}

            {enhanceError ? (
              <p className="auth-message auth-message-error print-requests-item-field-error" role="alert">
                {enhanceError}
              </p>
            ) : enhanceMessage ? (
              <p className="auth-message auth-message-success print-requests-item-field-error" role="status">
                {enhanceMessage}
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
            void (async () => {
              if (nextPresetKey === null && artworkEnhanceMode === "enhanced") {
                await applyArtworkEnhanceMode("baseline");
              }

              setPrintWidthInput(formatEditableNumber(printWidthInches));
              setPrintHeightInput(formatEditableNumber(printHeightInches));
              setStandardSizePresetKey(nextPresetKey ?? undefined);
              scheduleSave();
            })();
          }}
          onClose={() => setIsStandardSizesModalOpen(false)}
          baselinePixelHeight={baselineAspectPixels?.height}
          baselinePixelWidth={baselineAspectPixels?.width}
          pixelHeight={aspectPixels.height}
          pixelWidth={aspectPixels.width}
          settings={standardPrintSizesSettings}
          wasUpscaled={upload?.wasUpscaled ?? design?.wasUpscaled}
        />
      ) : null}
    </div>
  );
}
