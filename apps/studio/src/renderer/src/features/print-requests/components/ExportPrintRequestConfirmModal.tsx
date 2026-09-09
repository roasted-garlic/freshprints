import { X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type { ShowExportImageStep, ExportShowZipResult, ShowExportProgressEvent } from "@fresh-prints/shared/types/export/showExportIpc.types";

const STEP_LABELS: Record<ShowExportImageStep, string> = {
  downloading: "Downloading production artwork",
  resizing: "Resizing to print size",
  adding_to_zip: "Adding to zip",
};

export function ExportPrintRequestConfirmModal(props: {
  requestName: string;
  multiplyByQuantity: boolean;
  isExporting: boolean;
  error: string | null;
  result: ExportShowZipResult | null;
  progress: ShowExportProgressEvent | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const hasResult = props.result !== null && !props.result.canceled;
  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal aria-labelledby="export-print-request-title" className="modal-panel" role="dialog">
        <ModalHeader>
          <div><p className="eyebrow">Export request images</p><h3 id="export-print-request-title">{props.multiplyByQuantity ? "Export x(Qty)" : "Export"} "{props.requestName}"</h3></div>
          <button aria-label="Close export" className="icon-button icon-button-md icon-button-ghost" disabled={props.isExporting} onClick={props.onClose} type="button"><X aria-hidden="true" size={18} /></button>
        </ModalHeader>
        <ModalBody>
          {props.error ? <ErrorState message={props.error} title="Export failed" /> : null}
          {props.isExporting ? <div className="export-show-progress"><p className="export-show-progress-label">{props.progress ? `${props.progress.imageIndex} of ${props.progress.imageTotal} images — ${STEP_LABELS[props.progress.step]}` : "Preparing export…"}</p>{props.progress ? <div aria-valuemax={props.progress.imageTotal} aria-valuemin={0} aria-valuenow={props.progress.imageIndex} className="export-show-progress-bar" role="progressbar"><div className="export-show-progress-bar-fill" style={{ width: `${(props.progress.imageIndex / props.progress.imageTotal) * 100}%` }} /></div> : null}</div> : hasResult && props.result ? <div className="export-show-result"><p>Exported {props.result.exportedImageCount} image{props.result.exportedImageCount === 1 ? "" : "s"}{props.result.savedFilePath ? ` to ${props.result.savedFilePath}` : ""}.</p>{props.result.warnings.length > 0 ? <div className="export-show-warnings"><p>{props.result.warnings.length} warning{props.result.warnings.length === 1 ? "" : "s"} included in the zip.</p><ul>{props.result.warnings.map((warning) => <li key={`${warning.fileName}-${warning.reason}`}>{warning.fileName}: {warning.message}</li>)}</ul></div> : null}</div> : <p className="print-requests-modal-hint">Artwork uses each request item's saved size and quantity at 300 DPI. No show allocation is required.</p>}
        </ModalBody>
        <ModalFooter><Button disabled={props.isExporting} onClick={props.onClose} size="sm" variant="secondary">{hasResult ? "Close" : "Cancel"}</Button>{!hasResult ? <Button disabled={props.isExporting} onClick={props.onConfirm} size="sm" variant="primary">{props.isExporting ? "Exporting…" : props.multiplyByQuantity ? "Export x(Qty)" : "Export"}</Button> : null}</ModalFooter>
      </Modal>
    </div>
  );
}
