import { useEffect, useState } from "react";
import { WandSparkles, X } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import type { CachedGangSheetSheetMeta, GangSheetExportImageStep, GangSheetExportProgressEvent, GenerateGangSheetPngResult } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import type { ShowExportImageWarning } from "@fresh-prints/shared/types/export/showExportIpc.types";
import { formatGangSheetLengthInches } from "@fresh-prints/shared/utils/showExportFilename";

const STEP_LABELS: Record<GangSheetExportImageStep, string> = { downloading: "Downloading production artwork", resizing: "Resizing to print size", nesting: "Nesting images", compositing: "Compositing gang sheet" };

export function GeneratePrintRequestGangSheetModal(props: {
  requestName: string;
  sheetWidthInches: number;
  isGenerating: boolean;
  isExporting: boolean;
  error: string | null;
  progress: GangSheetExportProgressEvent | null;
  generated: GenerateGangSheetPngResult | null;
  sheets: CachedGangSheetSheetMeta[];
  warnings: ShowExportImageWarning[];
  lastSavedPaths: string[];
  onGenerate: () => void;
  onExport: () => void;
  onDownload: (sheetIndex: number) => void;
  onClose: () => void;
}) {
  const busy = props.isGenerating || props.isExporting;
  const hasGenerated = Boolean(props.generated && props.sheets.length);
  const [areWarningsVisible, setAreWarningsVisible] = useState(true);
  const warningSignature = props.warnings
    .map((warning) => `${warning.fileName}:${warning.reason}:${warning.message}`)
    .join("|");

  useEffect(() => {
    setAreWarningsVisible(true);
  }, [warningSignature]);

  return <div className="modal-overlay modal-overlay-blur"><Modal aria-labelledby="generate-print-request-gang-sheet-title" className="modal-panel export-gang-sheet-modal" role="dialog"><ModalHeader><div><p className="eyebrow">Gang sheet</p><h3 id="generate-print-request-gang-sheet-title">{hasGenerated ? "Export" : "Generate"} Standard — "{props.requestName}"</h3></div><button aria-label="Close gang sheet dialog" className="icon-button icon-button-md icon-button-ghost" disabled={busy} onClick={props.onClose} type="button"><X aria-hidden="true" size={18} /></button></ModalHeader><ModalBody>{props.error ? <ErrorState message={props.error} title="Gang sheet action failed" /> : null}{props.isGenerating ? <div className="export-show-progress"><p className="export-show-progress-label">{props.progress ? `${props.progress.imageIndex} of ${props.progress.imageTotal} images — ${STEP_LABELS[props.progress.step]}` : "Preparing gang sheet…"}</p>{props.progress ? <div aria-valuemax={props.progress.imageTotal} aria-valuemin={0} aria-valuenow={props.progress.imageIndex} className="export-show-progress-bar" role="progressbar"><div className="export-show-progress-bar-fill" style={{ width: `${Math.min(100, (props.progress.imageIndex / Math.max(1, props.progress.imageTotal)) * 100)}%` }} /></div> : null}</div> : hasGenerated && props.generated ? <div className="export-show-result"><p>Generated {props.generated.placedImageCount} image{props.generated.placedImageCount === 1 ? "" : "s"} onto {props.sheets.length} Standard gang sheet{props.sheets.length === 1 ? "" : "s"}.</p><div className="gang-sheet-preview-list-scroll"><ul className="gang-sheet-preview-list">{props.sheets.map((sheet) => <li className="gang-sheet-preview-row" key={sheet.fileName}><div><strong>Sheet {sheet.sheetIndex} of {sheet.sheetTotal}</strong><p className="print-requests-modal-hint">{sheet.fileName} · {formatGangSheetLengthInches(sheet.lengthInches)}"</p></div><Button disabled={busy} onClick={() => props.onDownload(sheet.sheetIndex)} size="sm" variant="secondary">Download</Button></li>)}</ul></div>{props.lastSavedPaths.length > 0 ? <p>Exported {props.lastSavedPaths.length} file{props.lastSavedPaths.length === 1 ? "" : "s"}.</p> : null}{props.warnings.length > 0 && areWarningsVisible ? <div className="export-show-warnings"><div className="export-show-warnings-header"><p>{props.warnings.length} warning{props.warnings.length === 1 ? "" : "s"}.</p><button aria-label="Dismiss gang sheet warnings" className="icon-button icon-button-sm icon-button-ghost" onClick={() => setAreWarningsVisible(false)} type="button"><X aria-hidden="true" size={16} /></button></div><ul>{props.warnings.map((warning) => <li key={`${warning.fileName}-${warning.reason}`}>{warning.fileName}: {warning.message}</li>)}</ul></div> : null}</div> : <p className="print-requests-modal-hint">Standard mode uses the request's saved quantities and dimensions at 300 DPI. The request name is included in each filename and rendered sheet label. Cached output stays local to this request on this computer.</p>}</ModalBody><ModalFooter><Button disabled={busy} onClick={props.onClose} size="sm" variant="secondary">Close</Button>{hasGenerated ? <><Button disabled={busy} onClick={props.onGenerate} size="sm" variant="secondary">Regenerate</Button><Button disabled={busy} onClick={props.onExport} size="sm" variant="primary">{props.isExporting ? "Exporting…" : "Export gang sheets"}</Button></> : <Button className="button-leading-icon" disabled={busy} onClick={props.onGenerate} size="sm" variant="success-outline"><WandSparkles aria-hidden="true" size={16} />Generate</Button>}</ModalFooter></Modal></div>;
}
