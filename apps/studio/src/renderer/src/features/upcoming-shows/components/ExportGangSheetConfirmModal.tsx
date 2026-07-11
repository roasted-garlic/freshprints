import { WandSparkles, X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
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
  onGenerate: () => void;
  onExport: () => void;
  onDownloadSheet: (sheetIndex: number) => void;
  onClose: () => void;
}

const STEP_LABELS: Record<GangSheetExportImageStep, string> = {
  downloading: "Downloading original image",
  resizing: "Resizing to print size",
  nesting: "Nesting images onto the gang sheet",
  compositing: "Compositing the gang sheet image",
};

function formatProgressLabel(progress: GangSheetExportProgressEvent): string {
  return `${progress.imageIndex} of ${progress.imageTotal} images — ${STEP_LABELS[progress.step]}`;
}

function formatByteSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  onGenerate,
  onExport,
  onDownloadSheet,
  onClose,
}: ExportGangSheetConfirmModalProps) {
  const isBusy = isGenerating || isExporting;
  const hasGenerated = Boolean(generated) && sheets.length > 0;

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="export-gang-sheet-title" className="modal-panel" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Gang sheets</p>
            <h3 id="export-gang-sheet-title">
              {hasGenerated ? "Export" : "Generate"} Gang Sheets — "{formatUpcomingShowTitle(show)}"
            </h3>
          </div>
          <button
            aria-label="Close gang sheet dialog"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          {error ? <ErrorState message={error} title="Gang sheet action failed" /> : null}

          {isGenerating ? (
            <div className="export-show-progress">
              <p className="export-show-progress-label">
                {progress ? formatProgressLabel(progress) : "Preparing gang sheet generation..."}
              </p>
              {progress ? (
                <div
                  aria-valuemax={progress.imageTotal}
                  aria-valuemin={0}
                  aria-valuenow={progress.imageIndex}
                  className="export-show-progress-bar"
                  role="progressbar"
                >
                  <div
                    className="export-show-progress-bar-fill"
                    style={{ width: `${(progress.imageIndex / progress.imageTotal) * 100}%` }}
                  />
                </div>
              ) : null}
            </div>
          ) : hasGenerated && generated ? (
            <div className="export-show-result">
              <p>
                Generated {generated.placedImageCount} image
                {generated.placedImageCount === 1 ? "" : "s"} onto {sheets.length} gang sheet
                {sheets.length === 1 ? "" : "s"} {formatByteSize(generated.totalByteSize)}
              </p>
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
            <p className="print-requests-modal-hint">
              Generate downloads each allocated design at the size set during the print request stage
              (300 DPI), nests every copy onto one or more {gangSheetWidthInches}" wide transparent
              gang sheet PNGs, and stores them in a local cache on this computer. You can then
              preview each sheet&apos;s length, download individually, or export all. Designs too
              wide for the sheet are skipped and reported as warnings.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isBusy} onClick={onClose} size="sm" variant="secondary">
            Close
          </Button>
          {hasGenerated ? (
            <>
              <Button disabled={isBusy} onClick={onGenerate} size="sm" variant="secondary">
                Regenerate
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
