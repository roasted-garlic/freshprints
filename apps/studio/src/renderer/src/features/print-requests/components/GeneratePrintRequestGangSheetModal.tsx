import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Minus, Plus, WandSparkles, X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type {
  CachedGangSheetSheetMeta,
  GangSheetExportImageStep,
  GangSheetExportProgressEvent,
  GenerateGangSheetPngResult,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { StaffArtwork } from "@fresh-prints/shared/types/staffArtwork/staffArtwork.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";
import { formatGangSheetLengthInches } from "@fresh-prints/shared/utils/showExportFilename";

import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import type { Design } from "../../designs/types/design.types";
import type { StudioCustomerUploadSummary } from "../../customer-uploads/services/customerUploadReadService";
import { resolvePrintRequestItemArtworkBackground } from "../utils/resolvePrintRequestItemArtworkBackground";
import {
  buildPrintRequestGangSheetExportQuantities,
  buildPrintRequestGangSheetSelection,
  getPrintRequestGangSheetItemLabel,
  mergePrintRequestGangSheetExportQuantities,
  normalizeExportQuantity,
  resolvePrintRequestGangSheetExportItems,
  sumPrintRequestGangSheetExportQuantity,
} from "../utils/printRequestGangSheetSelection";
import { PrintRequestItemsPreviewLightbox } from "./PrintRequestItemsPreviewLightbox";
import type { PrintRequestItemUploadSummary } from "./PrintRequestItemCard";

const STEP_LABELS: Record<GangSheetExportImageStep, string> = {
  downloading: "Downloading production artwork",
  resizing: "Resizing to print size",
  nesting: "Nesting images",
  compositing: "Compositing gang sheet",
};

function formatRequestedDimension(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? `${value}"` : "size unavailable";
}

function resolveItemSourceLabel(item: PrintRequestItem): string {
  if (item.sourceType === "customer_upload" || item.customerUploadId) return "Customer upload";
  if (item.sourceType === "staff_artwork" || item.staffArtworkId) return "Staff Artwork";
  return "Catalog design";
}

function resolveItemDisplayLabel(input: {
  item: PrintRequestItem;
  design?: Design;
  upload: StudioCustomerUploadSummary | null | undefined;
  staffArtwork: StaffArtwork | null | undefined;
}): string {
  const { item, design, upload, staffArtwork } = input;
  return (
    design?.title?.trim() ||
    staffArtwork?.title?.trim() ||
    upload?.originalFilename?.trim() ||
    getPrintRequestGangSheetItemLabel(item)
  );
}

function resolveItemPreview(input: {
  item: PrintRequestItem;
  design?: Design;
  upload: StudioCustomerUploadSummary | null | undefined;
  staffArtwork: StaffArtwork | null | undefined;
}): { catalogPath?: string; artworkBackgroundHex?: string } {
  const { item, design, upload, staffArtwork } = input;
  if (staffArtwork) {
    return {
      catalogPath: staffArtwork.previewStoragePath || staffArtwork.thumbnailStoragePath || undefined,
      artworkBackgroundHex: resolvePrintRequestItemArtworkBackground(undefined, {
        artworkBackgroundHex: staffArtwork.artworkBackgroundHex,
      }),
    };
  }
  if (upload) {
    return {
      catalogPath: upload.previewStoragePath || upload.thumbnailStoragePath || undefined,
      // Upload read summaries do not include mat color; use the Print Request item snapshot.
      artworkBackgroundHex: resolvePrintRequestItemArtworkBackground(undefined, {
        artworkBackgroundHex: item.artworkBackgroundHex,
      }),
    };
  }
  if (design) {
    return {
      catalogPath: design.previewPath || design.thumbnailPath || undefined,
      artworkBackgroundHex: resolvePrintRequestItemArtworkBackground(design),
    };
  }
  return {
    catalogPath: item.previewStoragePath || item.thumbnailStoragePath || undefined,
    artworkBackgroundHex: item.artworkBackgroundHex,
  };
}

function resolveLightboxUploadSummary(input: {
  item: PrintRequestItem;
  upload: StudioCustomerUploadSummary | null | undefined;
  staffArtwork: StaffArtwork | null | undefined;
}): PrintRequestItemUploadSummary | null {
  const { item, upload, staffArtwork } = input;
  if (staffArtwork) {
    return {
      title: staffArtwork.title || item.titleSnapshot || "Staff Artwork",
      previewPath: staffArtwork.previewStoragePath,
      thumbnailPath: staffArtwork.thumbnailStoragePath,
      artworkBackgroundHex: staffArtwork.artworkBackgroundHex,
    };
  }
  if (upload) {
    return {
      title: upload.originalFilename?.trim() || item.titleSnapshot || "Uploaded artwork",
      previewPath: upload.previewStoragePath,
      thumbnailPath: upload.thumbnailStoragePath,
    };
  }
  if (item.titleSnapshot || item.previewStoragePath || item.thumbnailStoragePath) {
    return {
      title: item.titleSnapshot || "Artwork",
      previewPath: item.previewStoragePath ?? null,
      thumbnailPath: item.thumbnailStoragePath ?? null,
      artworkBackgroundHex: item.artworkBackgroundHex,
    };
  }
  return null;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest(
      "button, input, textarea, select, a, [data-gang-sheet-preview], [data-gang-sheet-qty]",
    ),
  );
}

export function GeneratePrintRequestGangSheetModal(props: {
  requestId: string;
  requestName: string;
  items: PrintRequestItem[];
  designById: ReadonlyMap<string, Design>;
  uploadSummariesById: ReadonlyMap<string, StudioCustomerUploadSummary | null>;
  staffArtworkById: ReadonlyMap<string, StaffArtwork | null>;
  sheetWidthInches: number;
  isGenerating: boolean;
  isExporting: boolean;
  error: string | null;
  progress: GangSheetExportProgressEvent | null;
  generated: GenerateGangSheetPngResult | null;
  sheets: CachedGangSheetSheetMeta[];
  warnings: ShowExportImageWarning[];
  lastSavedPaths: string[];
  onGenerate: (items: PrintRequestItem[]) => void;
  onExport: () => void;
  onDownload: (sheetIndex: number) => void;
  onClose: () => void;
}) {
  const busy = props.isGenerating || props.isExporting;
  const hasGenerated = Boolean(props.generated && props.sheets.length);
  const [areWarningsVisible, setAreWarningsVisible] = useState(true);
  const [lightboxItemId, setLightboxItemId] = useState<string | null>(null);
  const itemIdsSignature = props.items.map((item) => item.id).join("\u0000");
  const previousRequestIdRef = useRef(props.requestId);
  const previousItemIdsSignatureRef = useRef(itemIdsSignature);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() =>
    buildPrintRequestGangSheetSelection(props.items),
  );
  const [exportQuantities, setExportQuantities] = useState<Map<string, number>>(() =>
    buildPrintRequestGangSheetExportQuantities(props.items),
  );
  const warningSignature = props.warnings
    .map((warning) => `${warning.fileName}:${warning.reason}:${warning.message}`)
    .join("|");

  const designByIdMutable = useMemo(() => new Map(props.designById), [props.designById]);

  useEffect(() => {
    setAreWarningsVisible(true);
  }, [warningSignature]);

  useEffect(() => {
    const requestChanged = previousRequestIdRef.current !== props.requestId;
    const itemListChanged = previousItemIdsSignatureRef.current !== itemIdsSignature;
    if (requestChanged) {
      setSelectedItemIds(buildPrintRequestGangSheetSelection(props.items));
      setExportQuantities(buildPrintRequestGangSheetExportQuantities(props.items));
      setLightboxItemId(null);
    } else if (itemListChanged) {
      const previousItemIds = new Set(previousItemIdsSignatureRef.current.split("\u0000").filter(Boolean));
      const currentItemIds = new Set(props.items.map((item) => item.id));
      setSelectedItemIds((current) => {
        const next = new Set([...current].filter((itemId) => currentItemIds.has(itemId)));
        for (const itemId of currentItemIds) {
          if (!previousItemIds.has(itemId)) next.add(itemId);
        }
        return next;
      });
      setExportQuantities((current) => mergePrintRequestGangSheetExportQuantities(props.items, current));
      setLightboxItemId((current) => (current && currentItemIds.has(current) ? current : null));
    }
    previousRequestIdRef.current = props.requestId;
    previousItemIdsSignatureRef.current = itemIdsSignature;
  }, [itemIdsSignature, props.items, props.requestId]);

  const exportItems = resolvePrintRequestGangSheetExportItems(
    props.items,
    selectedItemIds,
    exportQuantities,
  );
  const exportPrintCount = sumPrintRequestGangSheetExportQuantity(
    props.items,
    selectedItemIds,
    exportQuantities,
  );
  const allItemsSelected = props.items.length > 0 && exportItems.length === props.items.length;
  const someItemsSelected = exportItems.length > 0 && !allItemsSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someItemsSelected;
    }
  }, [someItemsSelected]);

  const toggleItem = (itemId: string, checked: boolean) => {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      if (checked) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  };

  const setItemExportQuantity = (itemId: string, nextQuantity: number) => {
    const item = props.items.find((candidate) => candidate.id === itemId);
    const fallback = item?.quantity ?? 1;
    setExportQuantities((current) => {
      const next = new Map(current);
      next.set(itemId, normalizeExportQuantity(nextQuantity, fallback));
      return next;
    });
    setSelectedItemIds((current) => {
      if (current.has(itemId)) return current;
      const next = new Set(current);
      next.add(itemId);
      return next;
    });
  };

  const handleGenerate = () => {
    const currentSelection = resolvePrintRequestGangSheetExportItems(
      props.items,
      selectedItemIds,
      exportQuantities,
    );
    if (currentSelection.length > 0) {
      props.onGenerate(currentSelection);
    }
  };

  const handleRowClick = (itemId: string, isSelected: boolean, event: ReactMouseEvent<HTMLLIElement>) => {
    if (busy || isInteractiveTarget(event.target)) {
      return;
    }
    toggleItem(itemId, !isSelected);
  };

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="generate-print-request-gang-sheet-title"
        className="modal-panel export-gang-sheet-modal"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Gang sheet</p>
            <h3 id="generate-print-request-gang-sheet-title">
              {hasGenerated ? "Export" : "Generate"} Standard — &quot;{props.requestName}&quot;
            </h3>
          </div>
          <button
            aria-label="Close gang sheet dialog"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={busy}
            onClick={props.onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </ModalHeader>
        <ModalBody>
          {props.error ? <ErrorState message={props.error} title="Gang sheet action failed" /> : null}
          {props.isGenerating ? (
            <div className="export-show-progress">
              <p className="export-show-progress-label">
                {props.progress
                  ? `${props.progress.imageIndex} of ${props.progress.imageTotal} images — ${STEP_LABELS[props.progress.step]}`
                  : "Preparing gang sheet…"}
              </p>
              {props.progress ? (
                <div
                  aria-valuemax={props.progress.imageTotal}
                  aria-valuemin={0}
                  aria-valuenow={props.progress.imageIndex}
                  className="export-show-progress-bar"
                  role="progressbar"
                >
                  <div
                    className="export-show-progress-bar-fill"
                    style={{
                      width: `${Math.min(100, (props.progress.imageIndex / Math.max(1, props.progress.imageTotal)) * 100)}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : hasGenerated && props.generated ? (
            <div className="export-show-result">
              <p>
                Generated {props.generated.placedImageCount} image{props.generated.placedImageCount === 1 ? "" : "s"} onto {props.sheets.length} Standard gang sheet{props.sheets.length === 1 ? "" : "s"}.
              </p>
              <div className="gang-sheet-preview-list-scroll">
                <ul className="gang-sheet-preview-list">
                  {props.sheets.map((sheet) => (
                    <li className="gang-sheet-preview-row" key={sheet.fileName}>
                      <div>
                        <strong>Sheet {sheet.sheetIndex} of {sheet.sheetTotal}</strong>
                        <p className="print-requests-modal-hint">
                          {sheet.fileName} · {formatGangSheetLengthInches(sheet.lengthInches)}&quot;
                        </p>
                      </div>
                      <Button disabled={busy} onClick={() => props.onDownload(sheet.sheetIndex)} size="sm" variant="secondary">
                        Download
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
              {props.lastSavedPaths.length > 0 ? (
                <p>Exported {props.lastSavedPaths.length} file{props.lastSavedPaths.length === 1 ? "" : "s"}.</p>
              ) : null}
              {props.warnings.length > 0 && areWarningsVisible ? (
                <div className="export-show-warnings">
                  <div className="export-show-warnings-header">
                    <p>{props.warnings.length} warning{props.warnings.length === 1 ? "" : "s"}.</p>
                    <button
                      aria-label="Dismiss gang sheet warnings"
                      className="icon-button icon-button-sm icon-button-ghost"
                      onClick={() => setAreWarningsVisible(false)}
                      type="button"
                    >
                      <X aria-hidden="true" size={16} />
                    </button>
                  </div>
                  <ul>
                    {props.warnings.map((warning) => (
                      <li key={`${warning.fileName}-${warning.reason}`}>
                        {warning.fileName}: {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="print-request-gang-sheet-selection" aria-label="Gang sheet artwork selection">
              <p className="print-requests-modal-hint">
                Select designs and set export quantities for this gang sheet only. Requested Print Request
                quantities and sizes are unchanged.
              </p>
              <div className="print-request-gang-sheet-selection-header">
                <label className="studio-checkbox" htmlFor="select-all-print-request-gang-sheet-items">
                  <input
                    aria-label="Select all artwork for gang sheet"
                    checked={allItemsSelected}
                    disabled={busy || props.items.length === 0}
                    id="select-all-print-request-gang-sheet-items"
                    onChange={(event) => {
                      setSelectedItemIds(
                        event.target.checked
                          ? buildPrintRequestGangSheetSelection(props.items)
                          : new Set(),
                      );
                    }}
                    ref={selectAllRef}
                    type="checkbox"
                  />
                  <span>Select all items</span>
                </label>
                <span aria-live="polite" className="print-requests-modal-hint">
                  {exportItems.length} of {props.items.length} selected · {exportPrintCount} print
                  {exportPrintCount === 1 ? "" : "s"}
                </span>
              </div>
              {props.items.length === 0 ? (
                <p className="print-requests-modal-hint">No artwork items are available for export.</p>
              ) : (
                <ul className="print-request-gang-sheet-selection-list">
                  {props.items.map((item) => {
                    const design = item.designId ? props.designById.get(item.designId) : undefined;
                    const upload = item.customerUploadId
                      ? props.uploadSummariesById.get(item.customerUploadId)
                      : null;
                    const staffArtwork = item.staffArtworkId
                      ? props.staffArtworkById.get(item.staffArtworkId)
                      : null;
                    const itemLabel = resolveItemDisplayLabel({ item, design, upload, staffArtwork });
                    const isSelected = selectedItemIds.has(item.id);
                    const preview = resolveItemPreview({ item, design, upload, staffArtwork });
                    const exportQuantity = normalizeExportQuantity(
                      exportQuantities.get(item.id),
                      item.quantity,
                    );
                    const quantityInputId = `print-request-gang-sheet-qty-${item.id}`;
                    const checkboxId = `print-request-gang-sheet-item-${item.id}`;
                    const canPreview = Boolean(preview.catalogPath?.trim());
                    return (
                      <li
                        className={`print-request-gang-sheet-selection-row${isSelected ? " is-selected" : ""}`}
                        key={item.id}
                        onClick={(event) => handleRowClick(item.id, isSelected, event)}
                      >
                        <input
                          aria-label={`Include ${itemLabel}`}
                          checked={isSelected}
                          className="print-request-gang-sheet-selection-checkbox"
                          disabled={busy}
                          id={checkboxId}
                          onChange={(event) => toggleItem(item.id, event.target.checked)}
                          type="checkbox"
                        />
                        <button
                          aria-label={canPreview ? `Preview ${itemLabel}` : `${itemLabel} preview unavailable`}
                          className="print-request-gang-sheet-selection-preview"
                          data-gang-sheet-preview="true"
                          disabled={busy || !canPreview}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!canPreview) return;
                            setLightboxItemId(item.id);
                          }}
                          type="button"
                        >
                          <DesignThumbnailPanel
                            alt={`${itemLabel} preview`}
                            artworkBackgroundHex={preview.artworkBackgroundHex}
                            borderless
                            catalogPath={preview.catalogPath}
                            className="print-request-gang-sheet-selection-thumb"
                            fallbackLabel="No preview"
                            imageFit="contain"
                            loadingLabel="Loading preview"
                          />
                        </button>
                        <div className="print-request-gang-sheet-selection-copy">
                          <strong>{itemLabel}</strong>
                          <small>
                            {resolveItemSourceLabel(item)} · Requested qty {item.quantity} ·{" "}
                            {formatRequestedDimension(item.printWidthInches)} ×{" "}
                            {formatRequestedDimension(item.printHeightInches)}
                          </small>
                        </div>
                        <div
                          className="print-request-gang-sheet-selection-qty"
                          data-gang-sheet-qty="true"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <span className="print-request-gang-sheet-selection-qty-label" id={`${quantityInputId}-label`}>
                            Export qty
                          </span>
                          <div className="print-requests-item-stepper">
                            <button
                              aria-label={`Decrease export quantity for ${itemLabel}`}
                              className="print-requests-item-stepper-button"
                              disabled={busy || !isSelected || exportQuantity <= 1}
                              onClick={() => setItemExportQuantity(item.id, exportQuantity - 1)}
                              type="button"
                            >
                              <Minus aria-hidden="true" size={14} strokeWidth={2} />
                            </button>
                            <input
                              aria-labelledby={`${quantityInputId}-label`}
                              className="print-requests-number-input print-requests-item-stepper-input"
                              disabled={busy || !isSelected}
                              id={quantityInputId}
                              inputMode="numeric"
                              min={1}
                              onChange={(event) =>
                                setItemExportQuantity(item.id, Number(event.target.value))
                              }
                              type="number"
                              value={exportQuantity}
                            />
                            <button
                              aria-label={`Increase export quantity for ${itemLabel}`}
                              className="print-requests-item-stepper-button"
                              disabled={busy || !isSelected || exportQuantity >= 999}
                              onClick={() => setItemExportQuantity(item.id, exportQuantity + 1)}
                              type="button"
                            >
                              <Plus aria-hidden="true" size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {props.items.length > 0 && exportItems.length === 0 ? (
                <p className="form-error" role="alert">Select at least one item to generate a gang sheet.</p>
              ) : null}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button disabled={busy} onClick={props.onClose} size="sm" variant="secondary">Close</Button>
          {hasGenerated ? (
            <>
              <Button disabled={busy} onClick={handleGenerate} size="sm" variant="secondary">Regenerate</Button>
              <Button disabled={busy} onClick={props.onExport} size="sm" variant="primary">
                {props.isExporting ? "Exporting…" : "Export gang sheets"}
              </Button>
            </>
          ) : (
            <Button
              className="button-leading-icon"
              disabled={busy || exportItems.length === 0}
              onClick={handleGenerate}
              size="sm"
              variant="success-outline"
            >
              <WandSparkles aria-hidden="true" size={16} />Generate
            </Button>
          )}
        </ModalFooter>
      </Modal>

      <PrintRequestItemsPreviewLightbox
        activeItemId={lightboxItemId}
        designById={designByIdMutable}
        items={props.items}
        onActiveItemChange={setLightboxItemId}
        onClose={() => setLightboxItemId(null)}
        resolveUpload={(item) =>
          resolveLightboxUploadSummary({
            item,
            upload: item.customerUploadId ? props.uploadSummariesById.get(item.customerUploadId) : null,
            staffArtwork: item.staffArtworkId ? props.staffArtworkById.get(item.staffArtworkId) : null,
          })
        }
      />
    </div>
  );
}
