import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { formatUpcomingShowTitle } from "../utils/upcomingShowDisplay";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type {
  ExportShowZipResult,
  ShowExportImageStep,
  ShowExportProgressEvent,
} from "@fresh-prints/shared/types/export/showExportIpc.types";

interface ExportShowConfirmModalProps {
  show: UpcomingShow;
  isExporting: boolean;
  error: string | null;
  result: ExportShowZipResult | null;
  progress: ShowExportProgressEvent | null;
  multiplyByQuantity: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const STEP_LABELS: Record<ShowExportImageStep, string> = {
  downloading: "Downloading original image",
  resizing: "Resizing to print size",
  adding_to_zip: "Adding to zip",
};

function formatProgressLabel(progress: ShowExportProgressEvent): string {
  return `${progress.imageIndex} of ${progress.imageTotal} images — ${STEP_LABELS[progress.step]}`;
}

export function ExportShowConfirmModal({
  show,
  isExporting,
  error,
  result,
  progress,
  multiplyByQuantity,
  onConfirm,
  onClose,
}: ExportShowConfirmModalProps) {
  const hasResult = result !== null && !result.canceled;

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="export-show-title" className="modal-panel" role="dialog">
        <ModalHeader>
          <div>
            <p className="eyebrow">Export</p>
            <h3 id="export-show-title">
              {multiplyByQuantity ? "Export x(Qty)" : "Export"} "{formatUpcomingShowTitle(show)}"
            </h3>
          </div>
          <button
            aria-label="Close export"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          {error ? <ErrorState message={error} title="Export failed" /> : null}

          {isExporting ? (
            <div className="export-show-progress">
              <p className="export-show-progress-label">
                {progress ? formatProgressLabel(progress) : "Preparing export..."}
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
                Exported {result.exportedImageCount} image{result.exportedImageCount === 1 ? "" : "s"}
                {result.savedFilePath ? ` to ${result.savedFilePath}` : ""}.
              </p>
              {result.warnings.length > 0 ? (
                <div className="export-show-warnings">
                  <p>
                    {result.warnings.length} warning{result.warnings.length === 1 ? "" : "s"} — see
                    EXPORT_WARNINGS.txt inside the zip for details.
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
              {multiplyByQuantity
                ? "This will download each allocated design at the size set during the print request stage (300 DPI), then package one file per allocated unit (not one file per design) into a single zip file for this show. Original assets are never modified."
                : "This will download each allocated design at the size set during the print request stage (300 DPI), then package the images into a single zip file for this show. Original assets are never modified."}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} size="sm" variant="secondary">
            {hasResult ? "Close" : "Cancel"}
          </Button>
          {!hasResult ? (
            <Button disabled={isExporting} onClick={onConfirm} size="sm" variant="primary">
              {isExporting ? "Exporting..." : multiplyByQuantity ? "Export x(Qty)" : "Export"}
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>
    </div>
  );
}
