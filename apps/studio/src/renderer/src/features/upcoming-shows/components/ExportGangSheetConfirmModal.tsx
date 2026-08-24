import { useEffect, useMemo, useRef, useState } from "react";
import { WandSparkles, X } from "lucide-react";

import type { GangSheetLayoutMode } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import { Button } from "../../../shared/components/Button";
import { ErrorState } from "../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { getGangSheetLayoutModeOption, GANG_SHEET_LAYOUT_MODE_OPTIONS } from "../utils/gangSheetLayoutModeOptions";
import { formatUpcomingShowTitle } from "../utils/upcomingShowDisplay";
import { formatInchesForFilename } from "@fresh-prints/shared/utils/showExportFilename";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type {
  CachedGangSheetSheetMeta,
  GangSheetExportImageStep,
  GangSheetExportProgressEvent,
  GenerateGangSheetPngResult,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";
import type { GangSheetSheetCountPreview } from "../hooks/useExportGangSheetPng";

interface ExportGangSheetConfirmModalProps {
  show: UpcomingShow;
  gangSheetWidthInches: number;
  isGenerating: boolean;
  isExporting: boolean;
  error: string | null;
  generated: GenerateGangSheetPngResult | null;
  sheets: CachedGangSheetSheetMeta[];
  warnings: ShowExportImageWarning[];
  lastSavedPaths: string[];
  progress: GangSheetExportProgressEvent | null;
  sheetCountPreview: GangSheetSheetCountPreview | null;
  isPreparing: boolean;
  layoutMode: GangSheetLayoutMode;
  hasGeneratedForLayout: boolean;
  onGenerate: () => void;
  onExport: () => void;
  onDownloadSheet: (sheetIndex: number) => void;
  onLayoutModeChange: (mode: GangSheetLayoutMode) => void;
  onClose: () => void;
}

const STEP_LABELS: Record<GangSheetExportImageStep, string> = {
  downloading: "Downloading original image",
  resizing: "Resizing to print size",
  nesting: "Nesting images onto the gang sheet",
  compositing: "Compositing gang sheet",
};

function formatElapsed(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;

  if (minutes <= 0) {
    return `${remainder}s`;
  }

  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}

function formatProgressLabel(progress: GangSheetExportProgressEvent, elapsedSeconds: number): string {
  const elapsed = `Elapsed ${formatElapsed(elapsedSeconds)}`;

  if (progress.step === "compositing" && progress.sheetIndex && progress.sheetTotal) {
    return `Compositing sheet ${progress.sheetIndex} of ${progress.sheetTotal} — ${elapsed}`;
  }

  if (progress.step === "nesting") {
    return `Nesting ${progress.imageTotal} images — ${elapsed}`;
  }

  return `${progress.imageIndex} of ${progress.imageTotal} images — ${STEP_LABELS[progress.step]} — ${elapsed}`;
}

function getProgressPercent(progress: GangSheetExportProgressEvent): number {
  if (progress.step === "compositing" && progress.sheetIndex && progress.sheetTotal) {
    return Math.min(100, ((progress.sheetIndex - 0.35) / progress.sheetTotal) * 100);
  }

  if (progress.step === "nesting") {
    return 92;
  }

  if (progress.imageTotal <= 0) {
    return 0;
  }

  return Math.min(90, (progress.imageIndex / progress.imageTotal) * 90);
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTotalLength(totalInches: number): string {
  const inchesLabel = formatInchesForFilename(totalInches);
  const feetLabel = Number((totalInches / 12).toFixed(2)).toString();
  return `${inchesLabel}″ total (${feetLabel} ft)`;
}

function estimatedSheetCount(
  preview: GangSheetSheetCountPreview | null,
  layoutMode: GangSheetLayoutMode,
): number | null {
  if (!preview) {
    return null;
  }

  return layoutMode === "grouped_by_customer" ? preview.groupedSheets : preview.efficiencySheets;
}

export function ExportGangSheetConfirmModal({
  show,
  gangSheetWidthInches,
  isGenerating,
  isExporting,
  error,
  generated,
  sheets,
  warnings,
  lastSavedPaths,
  progress,
  sheetCountPreview,
  isPreparing,
  layoutMode,
  hasGeneratedForLayout,
  onGenerate,
  onExport,
  onDownloadSheet,
  onLayoutModeChange,
  onClose,
}: ExportGangSheetConfirmModalProps) {
  const isBusy = isGenerating || isExporting || isPreparing;
  const hasGenerated = hasGeneratedForLayout && Boolean(generated) && sheets.length > 0;
  const layoutOption = getGangSheetLayoutModeOption(layoutMode);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const generateStartedAtRef = useRef<number | null>(null);
  const compositingStartedAtRef = useRef<number | null>(null);
  const lastSheetIndexRef = useRef<number | null>(null);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);

  const totalLengthInches = useMemo(
    () => sheets.reduce((sum, sheet) => sum + sheet.lengthInches, 0),
    [sheets],
  );
  const estimatedSheets = estimatedSheetCount(sheetCountPreview, layoutMode);

  useEffect(() => {
    if (!isGenerating) {
      generateStartedAtRef.current = null;
      compositingStartedAtRef.current = null;
      lastSheetIndexRef.current = null;
      setElapsedSeconds(0);
      setEtaSeconds(null);
      return;
    }

    if (generateStartedAtRef.current === null) {
      generateStartedAtRef.current = Date.now();
    }

    const intervalId = window.setInterval(() => {
      const startedAt = generateStartedAtRef.current;
      if (startedAt) {
        setElapsedSeconds((Date.now() - startedAt) / 1000);
      }
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating || !progress || progress.step !== "compositing" || !progress.sheetIndex || !progress.sheetTotal) {
      return;
    }

    if (compositingStartedAtRef.current === null) {
      compositingStartedAtRef.current = Date.now();
      lastSheetIndexRef.current = progress.sheetIndex;
      return;
    }

    if (lastSheetIndexRef.current === progress.sheetIndex) {
      return;
    }

    lastSheetIndexRef.current = progress.sheetIndex;
    const completedSheets = progress.sheetIndex - 1;

    if (completedSheets <= 0 || !compositingStartedAtRef.current) {
      return;
    }

    const elapsedCompositingMs = Date.now() - compositingStartedAtRef.current;
    const averageMsPerSheet = elapsedCompositingMs / completedSheets;
    const remainingSheets = progress.sheetTotal - completedSheets;
    setEtaSeconds((averageMsPerSheet * remainingSheets) / 1000);
  }, [isGenerating, progress]);

  const progressPercent = progress ? getProgressPercent(progress) : Math.min(8, elapsedSeconds);
  const progressMax =
    progress?.step === "compositing" && progress.sheetTotal
      ? progress.sheetTotal
      : (progress?.imageTotal ?? 100);
  const progressNow =
    progress?.step === "compositing" && progress.sheetIndex
      ? progress.sheetIndex
      : (progress?.imageIndex ?? 0);

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
            aria-labelledby="export-gang-sheet-title"
            className="modal-panel export-gang-sheet-modal"
            role="dialog"
          >
        <ModalHeader>
          <div>
            <p className="eyebrow">Gang sheets</p>
            <h3 id="export-gang-sheet-title">
              {hasGenerated ? "Export" : "Generate"} {layoutOption.titlePhrase} — "
              {formatUpcomingShowTitle(show)}"
            </h3>
          </div>
          <button
            aria-label="Close gang sheet dialog"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isGenerating || isExporting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          {error ? <ErrorState message={error} title="Gang sheet action failed" /> : null}

          {!isGenerating ? (
            <div
              aria-label="Gang sheet layout"
              className="gang-sheet-layout-mode-picker"
              role="radiogroup"
            >
              {GANG_SHEET_LAYOUT_MODE_OPTIONS.map((option) => (
                <button
                  aria-checked={layoutMode === option.mode}
                  className={`gang-sheet-layout-mode-option${layoutMode === option.mode ? " is-selected" : ""}`}
                  disabled={isBusy}
                  key={option.mode}
                  onClick={() => onLayoutModeChange(option.mode)}
                  role="radio"
                  type="button"
                >
                  <span>{option.label}</span>
                  <span className="export-menu-option-hint">{option.hint}</span>
                </button>
              ))}
            </div>
          ) : null}

          {isGenerating ? (
            <div className="export-show-progress">
              <p className="export-show-progress-label">
                {progress
                  ? formatProgressLabel(progress, elapsedSeconds)
                  : `Preparing gang sheet generation... — Elapsed ${formatElapsed(elapsedSeconds)}`}
              </p>
              {etaSeconds !== null && progress?.step === "compositing" ? (
                <p className="print-requests-modal-hint">
                  About {formatElapsed(etaSeconds)} remaining (estimate)
                </p>
              ) : (
                <p className="print-requests-modal-hint">
                  Large sheets can take a while — the timer keeps running so you know Studio is still
                  working.
                </p>
              )}
              <div
                aria-valuemax={progressMax}
                aria-valuemin={0}
                aria-valuenow={progressNow}
                className="export-show-progress-bar"
                role="progressbar"
              >
                <div
                  className="export-show-progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : isPreparing ? (
            <div className="gang-sheet-modal-preparing">
              <LoadingSpinner />
              <p className="export-show-progress-label">Loading gang sheets…</p>
              <p className="print-requests-modal-hint">
                Checking for a cached layout for this option. This usually only takes a moment.
              </p>
            </div>
          ) : hasGenerated && generated ? (
            <div className="export-show-result">
              <p>
                Generated {generated.placedImageCount} image
                {generated.placedImageCount === 1 ? "" : "s"} onto {sheets.length} gang sheet
                {sheets.length === 1 ? "" : "s"} · {formatByteSize(generated.totalByteSize)}
              </p>
              <p className="print-requests-modal-hint">{formatTotalLength(totalLengthInches)}</p>
              <ul className="gang-sheet-preview-list">
                {sheets.map((sheet) => (
                  <li className="gang-sheet-preview-row" key={sheet.fileName}>
                    <div>
                      <strong>
                        Sheet {sheet.sheetIndex} of {sheet.sheetTotal}
                      </strong>
                      <p className="print-requests-modal-hint">
                        Length {formatInchesForFilename(sheet.lengthInches)}″ ·{" "}
                        {formatByteSize(sheet.byteSize)}
                      </p>
                      <p className="print-requests-modal-hint">{sheet.fileName}</p>
                    </div>
                    <Button
                      disabled={isBusy}
                      onClick={() => onDownloadSheet(sheet.sheetIndex)}
                      size="sm"
                      variant="secondary"
                    >
                      Download
                    </Button>
                  </li>
                ))}
              </ul>
              {lastSavedPaths.length > 0 ? (
                <div>
                  <p>Exported {lastSavedPaths.length} file{lastSavedPaths.length === 1 ? "" : "s"}:</p>
                  <ul>
                    {lastSavedPaths.map((path) => (
                      <li key={path}>{path}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {warnings.length > 0 ? (
                <div className="export-show-warnings">
                  <p>
                    {warnings.length} warning{warnings.length === 1 ? "" : "s"} — a warnings text file
                    is included when you export all sheets.
                  </p>
                  <ul>
                    {warnings.map((warning) => (
                      <li key={`${warning.fileName}-${warning.reason}`}>
                        {warning.fileName}: {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <p>{layoutOption.modalSummary}</p>
              <p className="print-requests-modal-hint">
                Choose Standard or Grouped by customer above, then generate. Designs are downloaded at
                print-request size (300 DPI) and nested onto {gangSheetWidthInches}" wide transparent PNGs,
                then cached on this computer. Designs too wide for the sheet are skipped and listed as
                warnings.
              </p>
              {estimatedSheets !== null ? (
                <p className="print-requests-modal-hint">
                  Estimated sheets for this layout: {estimatedSheets}. Count is informational only.
                </p>
              ) : null}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isGenerating || isExporting} onClick={onClose} size="sm" variant="secondary">
            Close
          </Button>
          {hasGenerated ? (
            <>
              <Button disabled={isBusy} onClick={onGenerate} size="sm" variant="secondary">
                {isGenerating ? "Regenerating..." : "Regenerate"}
              </Button>
              <Button disabled={isBusy} onClick={onExport} size="sm" variant="primary">
                {isExporting ? "Exporting..." : "Export gang sheets"}
              </Button>
            </>
          ) : (
            <Button
              className="button-leading-icon"
              disabled={isBusy}
              onClick={onGenerate}
              size="sm"
              variant="success-outline"
            >
              <WandSparkles aria-hidden="true" size={16} strokeWidth={2} />
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
