'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { Repeat } from 'lucide-react';

import type { StandardPrintSizesSettings } from '@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants';
import { resolveStandardSizePresetKeyAfterManualSizeChange } from '@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { SetPrintRequestItemArtworkEnhanceModeResponse } from '@fresh-prints/shared/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types';
import {
  resolveActiveArtworkPixelDimensions,
  resolveArtworkEnhanceMode,
  resolveInteractiveUpscaleToggleEligibility,
} from '@fresh-prints/shared/utils/interactiveArtworkEnhance';
import {
  assessPrintRequestItemSize,
  calculateLockedHeightFromWidth,
  calculateLockedWidthFromHeight,
} from '@fresh-prints/shared/utils/printRequestItemSizing';
import {
  PortalStandardPrintSizesModal,
  resolveStandardPrintSizeCardLabel,
} from './PortalStandardPrintSizesModal';
import { CatalogPreviewLightbox } from '../../catalog/components/CatalogPreviewLightbox';
import { CatalogThumbnailPanel } from '../../catalog/components/CatalogThumbnailPanel';
import { useCatalogDerivativeUrl } from '../../catalog/hooks/useCatalogDerivativeUrl';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { CopyIcon, TrashIcon } from '../../shared/components/PortalIcons';
import { HoverBubbleTooltip } from '../../shared/components/HoverBubbleTooltip';
import { PortalToggle } from '../../shared/components/PortalToggle';
import { isOptimisticPrintRequestItemId } from '../utils/optimisticPrintRequestItemId';
import { resolveArtworkEnhanceCallableErrorMessage } from '../utils/artworkEnhanceCallableErrorMessage';
import { setPrintRequestItemArtworkEnhanceModeService } from '../services/setPrintRequestItemArtworkEnhanceModeService';
import { shouldAcceptIncomingItemProp } from '../utils/itemPropSyncGuard';
import { usePortalInteractiveUpscaleEnabled } from '../hooks/usePortalInteractiveUpscaleEnabled';
import { resolveSavedDraftReconciliation } from './resolveSavedDraftReconciliation';
import {
  resolvePrintRequestItemPersistenceHealth,
  type PrintRequestItemPersistenceHealth,
} from '@fresh-prints/shared/utils/printRequestItemPersistenceHealth';

interface PortalPrintRequestItemDesign {
  id: string;
  title: string;
  width: number;
  height: number;
  thumbnailPath?: string;
  previewPath?: string;
  artworkBackgroundHex?: string;
  printWidthInches?: number;
  printHeightInches?: number;
  updatedAtMs?: number;
  interactiveEnhancedOriginalPath?: string;
  interactiveEnhancedWidthPx?: number;
  interactiveEnhancedHeightPx?: number;
  interactiveEnhanceGeneratedAt?: unknown;
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
  interactiveEnhancedProductionStoragePath?: string | null;
  interactiveEnhancedWidthPx?: number | null;
  interactiveEnhancedHeightPx?: number | null;
  interactiveEnhanceGeneratedAt?: unknown;
  /** True when sourced from Assisted Creation approved proof (badge: Custom). */
  fromAssistedCreation?: boolean;
}

interface PortalPrintRequestItemCardProps {
  design?: PortalPrintRequestItemDesign | null;
  upload?: PortalPrintRequestItemUpload | null;
  item: PrintRequestItem;
  printRequestId?: string;
  readOnly?: boolean;
  /**
   * Read-only catalog reuse: ready `CatalogDesign` when still in catalog;
   * `null` when designId exists but design is gone; omit for non-catalog lines.
   */
  catalogReuseDesign?: CatalogDesign | null;
  isAddingToRequest?: boolean;
  /** When false, qty-up and Duplicate are disabled (request full or Cap A exhausted). Qty-down / remove stay enabled. */
  canAddPrints?: boolean;
  exhaustedHelperText?: string | null;
  exhaustedStatusText?: string | null;
  onAddToRequest?: (design: CatalogDesign) => void;
  onDuplicate: (item: PrintRequestItem) => void;
  onRemove: (item: PrintRequestItem) => void;
  /**
   * Bump when a remove confirm is cancelled after qty was typed to 0,
   * so the input restores to the saved item quantity.
   */
  quantityResetKey?: number;
  /**
   * Resolves to the server-accepted quantity (not necessarily the requested `input.quantity` —
   * the server may clamp it). `saveDraft` uses the returned value, not the locally typed one, to
   * reconcile its own draft state (Plan Section 21.1/21.4, Fix 1).
   */
  standardPrintSizesSettings: StandardPrintSizesSettings;
  onUpdate: (
    item: PrintRequestItem,
    input: {
      quantity: number;
      printWidthInches: number;
      printHeightInches: number;
      standardSizePresetKey?: string | null;
    },
  ) => Promise<{ quantity: number }>;
  onArtworkEnhanceModeChanged?: (
    item: PrintRequestItem,
    result: SetPrintRequestItemArtworkEnhanceModeResponse,
  ) => void;
  onAutosaveStateChange: (
    status: 'saving' | 'saved' | 'failed',
    message?: string,
    retry?: () => Promise<void>,
  ) => void;
  onPersistenceHealthChange?: (itemId: string, health: PrintRequestItemPersistenceHealth) => void;
  onRegisterFlush?: (itemId: string, flush: (() => Promise<boolean>) | null) => void;
  /**
   * When provided, preview opens via the parent-owned lightbox collection (item.id identity).
   * Local CatalogPreviewLightbox is omitted.
   */
  onOpenLightbox?: (itemId: string) => void;
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

  return null;
}

function resolveInitialWidth(item: PrintRequestItem): number {
  return typeof item.printWidthInches === 'number' && item.printWidthInches > 0
    ? item.printWidthInches
    : Number.NaN;
}

function resolveInitialHeight(item: PrintRequestItem): number {
  return typeof item.printHeightInches === 'number' && item.printHeightInches > 0
    ? item.printHeightInches
    : Number.NaN;
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

/** Monotonic ms marker for a prop update, so a stale reload can be told apart from a genuine
 * newer external edit even when both carry a signature that differs from the last saved one. */
function resolveItemUpdatedAtMs(item: PrintRequestItem): number | null {
  return typeof item.updatedAt?.toMillis === 'function' ? item.updatedAt.toMillis() : null;
}

export function PortalPrintRequestItemCard({
  design,
  upload,
  item,
  printRequestId,
  readOnly = false,
  catalogReuseDesign,
  isAddingToRequest = false,
  canAddPrints = true,
  exhaustedStatusText = null,
  onAddToRequest,
  onDuplicate,
  onRemove,
  quantityResetKey = 0,
  onUpdate,
  onArtworkEnhanceModeChanged,
  onAutosaveStateChange,
  onPersistenceHealthChange,
  onRegisterFlush,
  onOpenLightbox,
  standardPrintSizesSettings,
}: PortalPrintRequestItemCardProps) {
  const portalInteractiveUpscaleEnabled = usePortalInteractiveUpscaleEnabled();
  const blockedStatusText = exhaustedStatusText;
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
  const [quantityInput, setQuantityInputState] = useState(String(item.quantity));
  /**
   * Live mirror of `quantityInput`, updated synchronously on every change (Plan Section 22.2,
   * Amendment 4, Fix 1 revised). `saveDraft`'s success handler previously read `quantityInput` only
   * via its own closure — the value captured when THAT invocation started — so a newer edit issued
   * while an earlier save was still in flight could be silently overwritten when the earlier
   * (superseded) save completed and unconditionally wrote back its own accepted value. This ref lets
   * a completing save recognize whether the input it is about to write back is still live/current,
   * or has already been superseded by a newer edit — see `setQuantityInput` below and its use in
   * `saveDraft`'s success handler.
   */
  const quantityInputRef = useRef(String(item.quantity));
  function setQuantityInput(value: string) {
    quantityInputRef.current = value;
    setQuantityInputState(value);
  }
  const [printWidthInput, setPrintWidthInput] = useState(
    formatEditableNumber(resolveInitialWidth(item)),
  );
  const [printHeightInput, setPrintHeightInput] = useState(
    formatEditableNumber(resolveInitialHeight(item)),
  );
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isStandardSizesModalOpen, setIsStandardSizesModalOpen] = useState(false);
  const [standardSizePresetKey, setStandardSizePresetKey] = useState<string | undefined>(
    item.standardSizePresetKey,
  );
  const { url: previewUrl } = useCatalogDerivativeUrl(previewPath, design?.updatedAtMs);
  const lastSavedSignatureRef = useRef(
    buildItemSignature(
      item.quantity,
      resolveInitialWidth(item),
      resolveInitialHeight(item),
      item.standardSizePresetKey,
    ),
  );
  /**
   * Newest `item.updatedAt` this card has accepted (from a save's own success branch or a
   * genuinely newer incoming prop). A separate, unguarded `reloadWorkingItems` elsewhere in the
   * app (e.g. CurrentRequestDrawer's own remove/error-path reloads) can still deliver a stale
   * prop — carrying a pre-save `updatedAt` — for this same item after this card already saved a
   * newer value. Comparing against this monotonic timestamp (not just the value signature) lets
   * the effect below tell "stale reload of pre-save data" apart from "genuine newer external
   * edit" (Plan Section 19.2 item 2 / 19.1 second contributing cause).
   */
  const lastAcceptedUpdatedAtMsRef = useRef(resolveItemUpdatedAtMs(item));
  const saveDraftRef = useRef<() => Promise<boolean>>(async () => false);
  const saveDebounceRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isTogglingEnhance, setIsTogglingEnhance] = useState(false);
  const [enhanceToggleMode, setEnhanceToggleMode] = useState<'baseline' | 'enhanced' | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enhanceResultPixels, setEnhanceResultPixels] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [hiddenDpiWarningKey, setHiddenDpiWarningKey] = useState<string | null>(null);

  useEffect(() => {
    const nextWidth = resolveInitialWidth(item);
    const nextHeight = resolveInitialHeight(item);
    const incomingSignature = buildItemSignature(
      item.quantity,
      nextWidth,
      nextHeight,
      item.standardSizePresetKey,
    );

    // A signature mismatch alone doesn't prove this is a genuinely newer external change — a
    // stale reload (e.g. from a different mounted consumer's own reloadWorkingItems call) can
    // deliver a prop carrying pre-save values with a signature that also differs from the last
    // saved one. shouldAcceptIncomingItemProp distinguishes "stale reload of pre-save data" from
    // "genuine newer external edit" via a monotonic updatedAt comparison (Plan Section 19.2 item
    // 2 / 19.1 second contributing cause); falls back to signature-only behavior when either
    // side lacks updatedAt (e.g. optimistic rows).
    const incomingUpdatedAtMs = resolveItemUpdatedAtMs(item);
    const lastAcceptedUpdatedAtMs = lastAcceptedUpdatedAtMsRef.current;
    if (
      !shouldAcceptIncomingItemProp({
        incomingSignature,
        lastSavedSignature: lastSavedSignatureRef.current,
        incomingUpdatedAtMs,
        lastAcceptedUpdatedAtMs,
      })
    ) {
      return;
    }

    setQuantityInput(String(item.quantity));
    setPrintWidthInput(formatEditableNumber(nextWidth));
    setPrintHeightInput(formatEditableNumber(nextHeight));
    setStandardSizePresetKey(item.standardSizePresetKey);
    if (!onOpenLightbox) {
      setIsLightboxOpen(false);
    }
    lastSavedSignatureRef.current = incomingSignature;
    if (incomingUpdatedAtMs !== null) {
      lastAcceptedUpdatedAtMsRef.current = incomingUpdatedAtMs;
    }
  }, [design, item, onOpenLightbox, upload]);

  useEffect(() => {
    if (quantityResetKey < 1) {
      return;
    }
    setQuantityInput(String(item.quantity));
  }, [item.quantity, quantityResetKey]);

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

    return { width: active.widthPx, height: active.heightPx };
  }, [artworkEnhanceMode, baselineAspectPixels, design, enhanceResultPixels, upload]);
  const aspectPixels = activeAspectPixels ?? baselineAspectPixels;

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
        interactiveEnhanceGeneratedAt: interactiveMarker,
        enhancedWidthPx:
          design?.interactiveEnhancedWidthPx ??
          upload?.interactiveEnhancedWidthPx ??
          enhanceResultPixels?.width,
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

  const showUpscaleToggle =
    portalInteractiveUpscaleEnabled && Boolean(upscaleToggleEligibility);

  async function applyArtworkEnhanceMode(
    mode: 'baseline' | 'enhanced',
    confirmFirstEnhance = false,
  ) {
    if (!printRequestId || isTogglingEnhance) {
      return;
    }

    setIsTogglingEnhance(true);
    setEnhanceToggleMode(mode);
    setEnhanceError(null);

    try {
      const result = await setPrintRequestItemArtworkEnhanceModeService.setMode({
        printRequestId,
        itemId: item.id,
        mode,
        confirmFirstEnhance,
      });

      onArtworkEnhanceModeChanged?.(item, result);
      if (result.artworkEnhanceMode === 'enhanced') {
        setEnhanceResultPixels({
          width: result.widthPx,
          height: result.heightPx,
        });
      } else {
        setEnhanceResultPixels(null);
      }
    } catch (error) {
      setEnhanceError(resolveArtworkEnhanceCallableErrorMessage(error));
    } finally {
      setIsTogglingEnhance(false);
      setEnhanceToggleMode(null);
    }
  }

  async function handleUpscaleToggle(nextMode: 'baseline' | 'enhanced') {
    if (nextMode === artworkEnhanceMode) {
      return;
    }

    const confirmFirstEnhance =
      nextMode === 'enhanced' && upscaleToggleEligibility?.state === 'available';

    await applyArtworkEnhanceMode(nextMode, confirmFirstEnhance);
  }

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

  const isOptimisticItem = isOptimisticPrintRequestItemId(item.id);
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
  const dpiHoverBubbleTone = sizeAssessment?.errorMessage ? 'error' : 'warning';

  useEffect(() => {
    if (!dpiWarningCalloutKey || hiddenDpiWarningKey === dpiWarningCalloutKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHiddenDpiWarningKey(dpiWarningCalloutKey);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [dpiWarningCalloutKey, hiddenDpiWarningKey]);
  const canSave =
    !isOptimisticItem && (sizeAssessment?.canSave ?? true) && parsedQuantity !== null;
  /** Request submitted / non-editable — hide editors (catalog reuse path). */
  const showItemEditors = !readOnly;
  /**
   * Size/qty stay editable while the duplicate is preparing; Duplicate/Remove stay locked
   * until the real id exists (callables reject pending ids).
   */
  const actionsDisabled = isOptimisticItem;
  const wasOptimisticRef = useRef(isOptimisticItem);

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

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (isOptimisticPrintRequestItemId(item.id)) {
      return false;
    }

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

    // The exact quantity-input string THIS invocation is submitting (Plan Section 22.2, Amendment
    // 4) — captured here, not read again later, so the completing save's success handler can tell
    // whether the field still reflects what it originally sent, or has since been superseded by a
    // newer edit issued while this call was in flight.
    const submittedQuantityInput = quantityInput;

    saveInFlightRef.current = true;
    setIsSaving(true);
    setIsFailed(false);
    onAutosaveStateChange('saving');

    try {
      const { quantity: acceptedQuantity } = await onUpdate(item, {
        quantity: parsedQuantity,
        printWidthInches: parsedPrintWidthInches,
        printHeightInches: parsedPrintHeightInches,
        standardSizePresetKey: standardSizePresetKey ?? null,
      });

      // Reconcile against the server-ACCEPTED quantity, not the locally typed/requested value —
      // closes the "server clamped 7 down to 5 but the field kept showing 7" gap (Plan Section
      // 21.1). This is applied directly and synchronously here, by the very component that
      // requested the save, instead of relying on the async prop-sync effect to carry the
      // correction for this card's own in-flight edit.
      //
      // Plan Section 22.2 (Amendment 4): only apply this write if the field still shows what THIS
      // save submitted (`quantityInputRef.current === submittedQuantityInput`). If the user has
      // typed/stepped a newer value while this save was awaiting its server round trip, that newer
      // value is live in `quantityInputRef` already, and it has its own save either in flight or
      // about to be scheduled — this (now-superseded) save's job is only to record its own accepted
      // value in `lastSavedSignatureRef` bookkeeping, never to overwrite a newer, still-pending edit
      // the user has since made.
      const isStillLive = quantityInputRef.current === submittedQuantityInput;
      if (isStillLive) {
        const reconciliation = resolveSavedDraftReconciliation({
          acceptedQuantity,
          printWidthInches: parsedPrintWidthInches,
          printHeightInches: parsedPrintHeightInches,
          currentQuantityInput: quantityInputRef.current,
          buildSignature: buildItemSignature,
          standardSizePresetKey,
        });
        if (reconciliation.quantityInput !== quantityInputRef.current) {
          setQuantityInput(reconciliation.quantityInput);
        }
        lastSavedSignatureRef.current = reconciliation.lastSavedSignature;
      } else {
        // A newer edit superseded this save before it resolved — only record that THIS save's own
        // submitted value was accepted, without touching the (newer, still-live) visible input.
        lastSavedSignatureRef.current = buildItemSignature(
          acceptedQuantity,
          parsedPrintWidthInches,
          parsedPrintHeightInches,
          standardSizePresetKey,
        );
      }
      // This save's own correction was just applied directly above (not via the prop-sync
      // effect), so the timestamp stamped here only needs to prevent a genuinely STALE prop
      // (older than this save) from later overwriting it — it does not need to, and must not,
      // block the corrected `item` prop this same save produces from eventually landing (that
      // prop will carry a real server updatedAt newer than whatever this card last accepted
      // before this save, so a stale-reload rejection here does not create a new stuck state).
      lastAcceptedUpdatedAtMsRef.current = Date.now();
      setIsFailed(false);
      onAutosaveStateChange('saved');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save item changes.';
      setIsFailed(true);
      onAutosaveStateChange('failed', message, async () => {
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
    quantityInput,
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
      standardSizePresetKey,
    ) !== lastSavedSignatureRef.current;

  const persistenceHealth = resolvePrintRequestItemPersistenceHealth({
    isOptimistic: isOptimisticItem,
    isSaving,
    isFailed,
    isDirty,
    canSave,
  });

  useEffect(() => {
    onPersistenceHealthChange?.(item.id, persistenceHealth);
  }, [item.id, onPersistenceHealthChange, persistenceHealth]);

  useEffect(() => {
    const wasOptimistic = wasOptimisticRef.current;
    wasOptimisticRef.current = isOptimisticItem;
    if (wasOptimistic && !isOptimisticItem) {
      void saveDraftRef.current();
    }
  }, [isOptimisticItem]);

  function stepQuantity(nextQuantity: number) {
    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setQuantityInput('');
      return;
    }

    setQuantityInput(String(Math.floor(nextQuantity)));
    if (canSave) {
      scheduleSave();
    }
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

  const handleFieldBlur = useCallback(() => {
    if (!showItemEditors) {
      return;
    }

    const trimmedQty = quantityInput.trim();
    const parsedZero = Number.parseInt(trimmedQty, 10);
    if (trimmedQty === '0' || (Number.isFinite(parsedZero) && parsedZero === 0)) {
      if (saveDebounceRef.current !== null) {
        window.clearTimeout(saveDebounceRef.current);
        saveDebounceRef.current = null;
      }
      onRemove(item);
      return;
    }

    if (parsedQuantity === null) {
      setQuantityInput(String(item.quantity));
      return;
    }

    if (!canSave) {
      return;
    }

    void saveDraft();
  }, [canSave, item, onRemove, parsedQuantity, quantityInput, saveDraft, showItemEditors]);

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
      <article
        aria-busy={isOptimisticItem || undefined}
        className={`portal-request-item-editor-card${isOptimisticItem ? ' is-preparing' : ''}`}
        data-print-request-item-id={item.id}
      >
        <div className="portal-request-item-editor-header">
          <div
            className={`portal-request-item-editor-thumb-wrap${
              isTogglingEnhance ? ' is-enhancing' : ''
            }`}
          >
            <CatalogThumbnailPanel
              alt={`${title} preview`}
              artworkBackgroundHex={design?.artworkBackgroundHex}
              catalogPath={previewPath}
              className="design-card-thumbnail"
              contentVersion={design?.updatedAtMs}
              fallbackLabel="Preview unavailable"
              interactive={Boolean(previewUrl) && !isTogglingEnhance}
              loadingLabel="Loading preview"
              onImageClick={() => {
                if (onOpenLightbox) {
                  onOpenLightbox(item.id);
                  return;
                }
                setIsLightboxOpen(true);
              }}
            />
            {isTogglingEnhance ? (
              <div
                aria-live="polite"
                className={`portal-request-item-enhance-overlay${
                  enhanceToggleMode === 'baseline' ? ' is-removing' : ''
                }`}
                role="status"
              >
                <span className="portal-request-item-enhance-overlay-label">
                  {enhanceToggleMode === 'baseline' ? 'Removing upscale…' : 'Upscaling…'}
                </span>
              </div>
            ) : null}
            <span
              className={`portal-request-item-source-badge${
                isUploadItem
                  ? upload?.fromAssistedCreation
                    ? ' is-custom'
                    : ' is-uploaded'
                  : ' is-library'
              }`}
            >
              {isUploadItem
                ? upload?.fromAssistedCreation
                  ? 'Custom'
                  : 'Uploaded'
                : 'Library'}
            </span>
          </div>

          <div className="portal-request-item-editor-body">
            <h2>{title}</h2>

            {isOptimisticItem ? (
              <p className="portal-request-item-preparing" role="status">
                Preparing duplicate… You can edit size and quantity now.
              </p>
            ) : null}

            {!showItemEditors ? (
              <p className="portal-muted">Qty {item.quantity}</p>
            ) : null}
          </div>
        </div>

        {showCatalogReuse ? (
          <div className="portal-request-item-editor-actions portal-request-item-reuse-actions">
            {catalogReuseDesign ? (
              <>
                <button
                  aria-label={`Request ${title} Again`}
                  className="portal-button portal-button-primary portal-button-sm portal-button-leading-icon"
                  disabled={isAddingToRequest || !canAddPrints}
                  onClick={() => onAddToRequest?.(catalogReuseDesign)}
                  title={
                    !canAddPrints && blockedStatusText
                      ? blockedStatusText
                      : undefined
                  }
                  type="button"
                >
                  {isAddingToRequest ? (
                    'Adding…'
                  ) : (
                    <>
                      <Repeat aria-hidden size={14} />
                      Request Again
                    </>
                  )}
                </button>
                {!canAddPrints && blockedStatusText ? (
                  <p className="portal-muted portal-request-item-quota-hint">
                    {blockedStatusText}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="portal-muted portal-request-item-unavailable" role="status">
                No longer in catalog
              </p>
            )}
          </div>
        ) : null}

        {showItemEditors ? (
          <>
            <button
              className={`portal-request-standard-size-trigger${
                standardSizePresetKey ? ' is-selected' : ''
              }`}
              onClick={() => setIsStandardSizesModalOpen(true)}
              type="button"
            >
              {resolveStandardPrintSizeCardLabel(standardPrintSizesSettings, standardSizePresetKey)}
            </button>

            <div
              className={`portal-request-item-metrics-grid${
                showUpscaleToggle ? ' has-upscale' : ''
              }`}
            >
              <div
                className={`portal-request-item-size-row${
                  showUpscaleToggle ? ' has-upscale' : ''
                }`}
              >
                {showUpscaleToggle ? (
                  <div className="portal-request-item-field portal-request-item-upscale-field">
                    <span className="portal-request-item-field-label">Upscale</span>
                    <div
                      className="portal-request-item-upscale-toggle-wrap"
                      title={upscaleToggleEligibility?.helperText}
                    >
                      <PortalToggle
                        checked={displayedArtworkEnhanceMode === 'enhanced'}
                        disabled={isTogglingEnhance || !upscaleToggleEligibility?.toggleEnabled}
                        label="Upscale"
                        name={`artworkEnhanceMode-${item.id}`}
                        onChange={(checked) => {
                          void handleUpscaleToggle(checked ? 'enhanced' : 'baseline');
                        }}
                      />
                    </div>
                  </div>
                ) : null}

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

            <div className="portal-request-item-meta-row">
              {sizeAssessment ? (
                <HoverBubbleTooltip bubble={dpiHoverBubble} tone={dpiHoverBubbleTone}>
                  <span
                    aria-label={
                      dpiHoverBubble ??
                      `${sizeAssessment.qualityLabel}, ${sizeAssessment.effectiveDpi} DPI`
                    }
                    className={`portal-request-item-dpi-badge is-${sizeAssessment.qualityLevel}`}
                    tabIndex={dpiHoverBubble ? 0 : undefined}
                  >
                    {sizeAssessment.effectiveDpi} DPI
                  </span>
                </HoverBubbleTooltip>
              ) : (
                <span className="portal-request-item-dpi-badge is-unavailable">DPI unavailable</span>
              )}

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
                  disabled={!canAddPrints}
                  onClick={() => stepQuantity((parsedQuantity ?? 0) + 1)}
                  tabIndex={-1}
                  title={
                    !canAddPrints && blockedStatusText
                      ? blockedStatusText
                      : undefined
                  }
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
            </div>

            {enhanceError ? (
              <p className="portal-request-item-field-callout is-error" role="alert">
                {enhanceError}
              </p>
            ) : null}

            {sizeAssessment?.errorMessage ? (
              <p
                className="portal-request-item-field-callout is-error portal-request-item-field-error"
                role="alert"
              >
                {sizeAssessment.errorMessage}
              </p>
            ) : showDpiWarningCallout && sizeAssessment?.warningMessage ? (
              <p
                className="portal-request-item-field-callout is-warning portal-request-item-field-error"
                role="status"
              >
                {sizeAssessment.warningMessage}
              </p>
            ) : null}

            <div className="portal-request-item-editor-actions">
              <button
                className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon"
                disabled={actionsDisabled || !canAddPrints}
                onClick={() => onDuplicate(item)}
                tabIndex={-1}
                title={
                  actionsDisabled
                    ? 'Preparing duplicate…'
                    : !canAddPrints && blockedStatusText
                      ? blockedStatusText
                      : undefined
                }
                type="button"
              >
                <CopyIcon size={14} />
                Duplicate
              </button>

              <button
                className="portal-button portal-button-danger portal-button-sm portal-button-leading-icon"
                disabled={actionsDisabled}
                onClick={() => onRemove(item)}
                tabIndex={-1}
                title={actionsDisabled ? 'Preparing duplicate…' : undefined}
                type="button"
              >
                <TrashIcon size={14} />
                Remove
              </button>
            </div>
          </>
        ) : null}
      </article>

      {!onOpenLightbox ? (
        <CatalogPreviewLightbox
          alt={`${title} preview`}
          artworkBackgroundHex={design?.artworkBackgroundHex}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          previewUrl={previewUrl}
        />
      ) : null}

      {aspectPixels ? (
        <PortalStandardPrintSizesModal
          approvedMaxPrintHeightInches={upload?.approvedMaxPrintHeightInches}
          approvedMaxPrintWidthInches={upload?.approvedMaxPrintWidthInches}
          currentPrintHeightInches={parsedPrintHeightInches ?? resolveInitialHeight(item)}
          currentPrintWidthInches={parsedPrintWidthInches ?? resolveInitialWidth(item)}
          isOpen={isStandardSizesModalOpen}
          onApply={({ printHeightInches, printWidthInches, standardSizePresetKey: nextPresetKey }) => {
            void (async () => {
              if (
                portalInteractiveUpscaleEnabled &&
                nextPresetKey === null &&
                artworkEnhanceMode === 'enhanced'
              ) {
                await applyArtworkEnhanceMode('baseline');
              }

              setPrintWidthInput(formatEditableNumber(printWidthInches));
              setPrintHeightInput(formatEditableNumber(printHeightInches));
              setStandardSizePresetKey(nextPresetKey ?? undefined);
              scheduleSave();
            })();
          }}
          onClose={() => setIsStandardSizesModalOpen(false)}
          pixelHeight={aspectPixels.height}
          pixelWidth={aspectPixels.width}
          settings={standardPrintSizesSettings}
          wasUpscaled={upload?.wasUpscaled}
        />
      ) : null}
    </>
  );
}
