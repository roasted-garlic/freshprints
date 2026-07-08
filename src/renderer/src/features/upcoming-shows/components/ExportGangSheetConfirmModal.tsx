import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { formatUpcomingShowTitle } from "../utils/upcomingShowDisplay";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type {
  ExportGangSheetPngResult,
  GangSheetExportImageStep,
  GangSheetExportProgressEvent,
} from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";

interface ExportGangSheetConfirmModalProps {
  show: UpcomingShow;
  gangSheetWidthInches: number;
  isExporting: boolean;
  error: string | null;
  result: ExportGangSheetPngResult | null;
  progress: GangSheetExportProgressEvent | null;
  onConfirm: () => void;
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

export function ExportGangSheetConfirmModal({
  show,
  gangSheetWidthInches,
  isExporting,
  error,
  result,
  progress,
  onConfirm,
  onClose,
}: ExportGangSheetConfirmModalProps) {
  const hasResult = result !== null && !result.canceled;

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="export-gang-sheet-title" className="modal-panel" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Export</p>
            <h3 id="export-gang-sheet-title">Export Gang Sheet — "{formatUpcomingShowTitle(show)}"</h3>
          </div>
          <button
            aria-label="Close gang sheet export"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          {error ? <ErrorState message={error} title="Gang sheet export failed" /> : null}

          {isExporting ? (
            <div className="export-show-progress">
              <p className="export-show-progress-label">
                {progress ? formatProgressLabel(progress) : "Preparing gang sheet export..."}
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
          ) : hasResult && result ? (
            <div className="export-show-result">
              <p>
                Placed {result.placedImageCount} image{result.placedImageCount === 1 ? "" : "s"} onto{" "}
                {result.savedFilePaths.length} gang sheet{result.savedFilePaths.length === 1 ? "" : "s"}.
              </p>
              {result.savedFilePaths.length > 0 ? (
                <ul>
                  {result.savedFilePaths.map((path) => (
                    <li key={path}>{path}</li>
                  ))}
                </ul>
              ) : null}
              {result.warnings.length > 0 ? (
                <div className="export-show-warnings">
                  <p>
                    {result.warnings.length} warning{result.warnings.length === 1 ? "" : "s"} — see the
                    saved _GANG_SHEET_WARNINGS.txt file for details.
                  </p>
                  <ul>
                    {result.warnings.map((warning) => (
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
              This will download each allocated design at the size set during the print request stage
              (300 DPI), repeat it by allocated quantity, and auto-nest every copy onto one or more{" "}
              {gangSheetWidthInches}" wide transparent-background gang sheet PNGs for cutting. Designs
              too wide for the sheet are skipped and reported as warnings. Original assets are never
              modified.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} size="sm" variant="secondary">
            {hasResult ? "Close" : "Cancel"}
          </Button>
          {!hasResult ? (
            <Button disabled={isExporting} onClick={onConfirm} size="sm" variant="primary">
              {isExporting ? "Exporting..." : "Export Gang Sheet"}
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>
    </div>
  );
}
