import { Upload } from "lucide-react";
import { Link } from "react-router-dom";

import type {
  ImportIpcError,
  ImportOriginalUploadResult,
  ValidateSelectedPngFileResult,
} from "../../../../../../shared/types/import/importIpc.types";
import { getDesignLibraryPath } from "../../designs/constants/designLibraryFilters";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { formatFileSize } from "../../../shared/utils/formatFileSize";
import type { SinglePngImportPhase } from "../hooks/useSinglePngImport";
import {
  formatPrintInchesDisplay,
  getImportWarningMessageClassName,
  getPrintSizeAcceptanceLabel,
} from "../utils/importPrintSizeDisplay";
import { ImportPngPreview } from "./ImportPngPreview";

interface ImportResultPanelProps {
  canUpload: boolean;
  isUploading: boolean;
  onUpload: () => void;
  phase: SinglePngImportPhase;
  previewDataUrl: string | null;
  selectionCanceled: boolean;
  uploadError: string | null;
  uploadResult: ImportOriginalUploadResult | null;
  uploadWarning: string | null;
  validationError: ImportIpcError | null;
  validationResult: ValidateSelectedPngFileResult | null;
}

function getPhaseMessage(phase: SinglePngImportPhase): string | null {
  switch (phase) {
    case "selecting":
      return "Selecting PNG file...";
    case "validating":
      return "Validating PNG file...";
    case "uploading":
      return "Uploading the original PNG, generating derivatives, and updating the design catalog record...";
    default:
      return null;
  }
}

function formatFinalStatusLabel(status: ImportOriginalUploadResult["finalStatus"]): string {
  switch (status) {
    case "ready":
      return "ready";
    case "processing":
      return "processing";
    default:
      return "imported";
  }
}

function ValidationDetails({
  validationResult,
}: {
  validationResult: ValidateSelectedPngFileResult;
}) {
  return (
    <>
      <p className="eyebrow">Validation</p>
      <h3>{validationResult.valid ? "PNG passed validation" : "PNG validation failed"}</h3>

      <dl className="import-validation-details">
        <div>
          <dt>File name</dt>
          <dd>{validationResult.fileName}</dd>
        </div>
        <div>
          <dt>File size</dt>
          <dd>{formatFileSize(validationResult.fileSizeBytes)}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>
            {validationResult.width} x {validationResult.height} px
          </dd>
        </div>
        <div>
          <dt>DPI metadata</dt>
          <dd>
            {validationResult.hasDpiMetadata
              ? `${validationResult.dpiX ?? "—"} x ${validationResult.dpiY ?? "—"} (${validationResult.dpiSource ?? "unknown"})`
              : "Not present"}
          </dd>
        </div>
        <div>
          <dt>Print size assessment</dt>
          <dd>
            {getPrintSizeAcceptanceLabel(validationResult.printSizeAssessment.acceptanceLevel)}
            {" · "}
            {formatPrintInchesDisplay(validationResult.printSizeAssessment.suggestedPrintWidthInches)}
            {" in × "}
            {formatPrintInchesDisplay(validationResult.printSizeAssessment.suggestedPrintHeightInches)}
            {" in at "}
            {validationResult.printSizeAssessment.targetDpi}
            {" DPI"}
          </dd>
        </div>
        <div>
          <dt>Effective DPI</dt>
          <dd>{validationResult.printSizeAssessment.suggestedEffectiveDpi}</dd>
        </div>
      </dl>

      {validationResult.warnings.length > 0 ? (
        <div className="import-validation-warnings">
          <h4>Warnings</h4>
          <ul>
            {validationResult.warnings.map((warning) => (
              <li className={getImportWarningMessageClassName(warning.code)} key={warning.code}>
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="auth-message auth-message-success">No validation warnings.</p>
      )}
    </>
  );
}

function ImportUploadSummary({ uploadResult }: { uploadResult: ImportOriginalUploadResult }) {
  const isPipelineSuccess = uploadResult.pipelineSuccess;

  return (
    <div className="import-upload-feedback">
      <p className="eyebrow">Import complete</p>
      <h3>
        {isPipelineSuccess ? "Design imported with derivatives" : "Design created with partial success"}
      </h3>

      <p
        className={
          isPipelineSuccess
            ? "auth-message auth-message-success"
            : "auth-message auth-message-warning"
        }
      >
        {isPipelineSuccess
          ? "The original PNG, thumbnail, and preview are stored. The design is waiting for AI review."
          : "The original PNG was uploaded and a Firestore catalog record was created, but derivative processing did not complete. The design remains imported."}
      </p>

      <dl className="import-validation-details">
        <div>
          <dt>Design title</dt>
          <dd>{uploadResult.designTitle}</dd>
        </div>
        <div>
          <dt>Design ID</dt>
          <dd>{uploadResult.designId}</dd>
        </div>
        <div>
          <dt>Original uploaded</dt>
          <dd>Yes</dd>
        </div>
        <div>
          <dt>Original path</dt>
          <dd>
            <code>{uploadResult.originalPath}</code>
          </dd>
        </div>
        <div>
          <dt>Firestore record</dt>
          <dd>{uploadResult.catalogRecordCreated ? "Created" : "Not created"}</dd>
        </div>
        <div>
          <dt>Derivatives</dt>
          <dd>
            {uploadResult.derivativeStatus === "ready"
              ? "Complete"
              : uploadResult.derivativeStatus === "failed"
                ? "Failed"
                : "Skipped"}
          </dd>
        </div>
        {uploadResult.thumbnailPath ? (
          <div>
            <dt>Thumbnail path</dt>
            <dd>
              <code>{uploadResult.thumbnailPath}</code>
            </dd>
          </div>
        ) : null}
        {uploadResult.previewPath ? (
          <div>
            <dt>Preview path</dt>
            <dd>
              <code>{uploadResult.previewPath}</code>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Final status</dt>
          <dd>
            <code>status: {formatFinalStatusLabel(uploadResult.finalStatus)}</code>
          </dd>
        </div>
        <div>
          <dt>File name</dt>
          <dd>{uploadResult.fileName}</dd>
        </div>
        <div>
          <dt>File size</dt>
          <dd>{formatFileSize(uploadResult.fileSizeBytes)}</dd>
        </div>
      </dl>

      {uploadResult.derivativeError ? (
        <p className="auth-message auth-message-warning" role="status">
          Derivative error: {uploadResult.derivativeError}
        </p>
      ) : null}

      <Link
        className="button button-primary button-md"
        to={getDesignLibraryPath({ status: "imported" })}
      >
        Open Design Library
      </Link>
    </div>
  );
}

export function ImportResultPanel({
  canUpload,
  isUploading,
  onUpload,
  phase,
  previewDataUrl,
  selectionCanceled,
  uploadError,
  uploadResult,
  uploadWarning,
  validationError,
  validationResult,
}: ImportResultPanelProps) {
  const phaseMessage = getPhaseMessage(phase);

  if (phaseMessage) {
    return (
      <Card aria-live="polite">
        <p className="auth-message">{phaseMessage}</p>
      </Card>
    );
  }

  if (selectionCanceled) {
    return (
      <Card aria-live="polite">
        <p className="auth-message">File selection was canceled.</p>
      </Card>
    );
  }

  if (validationError && !validationResult) {
    return (
      <Card aria-live="polite" className="import-validation-result">
        <p className="eyebrow">Validation</p>
        <p className="auth-message auth-message-error" role="alert">
          {validationError.message}
        </p>
      </Card>
    );
  }

  if (!validationResult && !uploadResult) {
    return null;
  }

  return (
    <Card aria-live="polite" className="import-validation-result">
      <div className="import-validation-result-layout">
        <div className="import-validation-result-main">
          {validationResult ? <ValidationDetails validationResult={validationResult} /> : null}

          {uploadError ? (
            <div className="import-upload-feedback">
              <p className="eyebrow">Upload</p>
              <p className="auth-message auth-message-error" role="alert">
                {uploadError}
              </p>
              {uploadWarning ? (
                <p className="auth-message auth-message-warning" role="status">
                  {uploadWarning}
                </p>
              ) : null}
            </div>
          ) : null}

          {uploadResult ? (
            <>
              <ImportUploadSummary uploadResult={uploadResult} />
              {uploadWarning ? (
                <p className="auth-message auth-message-warning" role="status">
                  {uploadWarning}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {validationResult ? (
          <div className="import-validation-preview-column">
            <ImportPngPreview
              alt={`Preview of ${validationResult.fileName}`}
              previewDataUrl={previewDataUrl}
            />

            {canUpload || isUploading ? (
              <Button
                className="button-leading-icon import-validation-preview-upload"
                disabled={isUploading}
                onClick={onUpload}
              >
                <Upload aria-hidden="true" size={16} strokeWidth={2} />
                {isUploading ? "Uploading..." : "Upload PNG"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
