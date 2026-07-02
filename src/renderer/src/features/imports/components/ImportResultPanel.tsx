import { useState } from "react";

import { Upload, X } from "lucide-react";
import { Link } from "react-router-dom";

import type {
  ImportIpcError,
  ImportPngWarning,
  ImportOriginalUploadResult,
  ValidateSelectedPngFileResult,
} from "../../../../../../shared/types/import/importIpc.types";
import { getAiReviewPath } from "../../designs/constants/designLibraryFilters";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { formatFileSize } from "../../../shared/utils/formatFileSize";
import type { SinglePngImportPhase } from "../hooks/useSinglePngImport";
import {
  formatPrintInchesDisplay,
  getImportWarningMessageClassName,
} from "../utils/importPrintSizeDisplay";
import { ImportPreviewLightbox } from "./ImportPreviewLightbox";
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

function getResolutionQualityLabel(
  acceptanceLevel: ValidateSelectedPngFileResult["printSizeAssessment"]["acceptanceLevel"],
): string {
  switch (acceptanceLevel) {
    case "accept":
      return "Optimal";
    case "warn":
      return "Good";
    case "small_format":
      return "Bad";
    case "terrible":
      return "Terrible";
    case "reject":
      return "Rejected";
    default:
      return acceptanceLevel;
  }
}

function formatPrintSizeDisplay(validationResult: ValidateSelectedPngFileResult): string {
  return `${formatPrintInchesDisplay(
    validationResult.printSizeAssessment.suggestedPrintWidthInches,
  )} in x ${formatPrintInchesDisplay(
    validationResult.printSizeAssessment.suggestedPrintHeightInches,
  )} in`;
}

function getVisibleValidationWarnings(
  validationResult: ValidateSelectedPngFileResult,
): ImportPngWarning[] {
  return validationResult.warnings.filter((warning) => warning.code !== "PRINT_SIZE_NORMALIZED");
}

function getNormalizedPrintSizeWarning(
  validationResult: ValidateSelectedPngFileResult,
): ImportPngWarning | undefined {
  return validationResult.warnings.find((warning) => warning.code === "PRINT_SIZE_NORMALIZED");
}

function ValidationDetails({
  validationResult,
}: {
  validationResult: ValidateSelectedPngFileResult;
}) {
  return (
    <>
      <div className="import-validation-heading">
        <p className="eyebrow">Validation</p>
        <Badge variant={validationResult.valid ? "success" : "danger"}>
          {validationResult.valid ? "Passed" : "Failed"}
        </Badge>
      </div>

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
          <dt>Print size</dt>
          <dd>{formatPrintSizeDisplay(validationResult)}</dd>
        </div>
        <div>
          <dt>Resolution</dt>
          <dd>{getResolutionQualityLabel(validationResult.printSizeAssessment.acceptanceLevel)}</dd>
        </div>
      </dl>

      {validationResult.warnings.length === 0 ? (
        <p className="auth-message auth-message-success">No validation warnings.</p>
      ) : null}
    </>
  );
}

function NormalizedPrintSizeNotice({
  validationResult,
}: {
  validationResult: ValidateSelectedPngFileResult;
}) {
  const normalizedWarning = getNormalizedPrintSizeWarning(validationResult);

  if (!normalizedWarning) {
    return null;
  }

  return (
    <p
      className={`${getImportWarningMessageClassName(normalizedWarning.code)} import-normalized-print-size-message`}
    >
      Print size normalized to {formatPrintSizeDisplay(validationResult)}.
    </p>
  );
}

function ValidationWarnings({
  validationResult,
}: {
  validationResult: ValidateSelectedPngFileResult;
}) {
  const visibleWarnings = getVisibleValidationWarnings(validationResult);

  if (visibleWarnings.length === 0) {
    return null;
  }

  return (
    <div aria-label="Validation warnings" className="import-validation-warnings">
      <ul>
        {visibleWarnings.map((warning) => (
          <li className={getImportWarningMessageClassName(warning.code)} key={warning.code}>
            {warning.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImportUploadSummary({ uploadResult }: { uploadResult: ImportOriginalUploadResult }) {
  const isPipelineSuccess = uploadResult.pipelineSuccess;
  const derivativeStatus =
    uploadResult.derivativeStatus === "ready"
      ? "Complete"
      : uploadResult.derivativeStatus === "failed"
        ? "Failed"
        : "Skipped";

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
          <dt>Derivatives</dt>
          <dd>{derivativeStatus}</dd>
        </div>
        <div>
          <dt>Final status</dt>
          <dd>
            <code>status: {formatFinalStatusLabel(uploadResult.finalStatus)}</code>
          </dd>
        </div>
        <div>
          <dt>File size</dt>
          <dd>{formatFileSize(uploadResult.fileSizeBytes)}</dd>
        </div>
        <div>
          <dt>Firestore record</dt>
          <dd>{uploadResult.catalogRecordCreated ? "Created" : "Not created"}</dd>
        </div>
      </dl>

      <details className="import-technical-details">
        <summary>Storage and file details</summary>
        <dl className="import-validation-details import-validation-details-technical">
          <div>
            <dt>File name</dt>
            <dd>{uploadResult.fileName}</dd>
          </div>
          <div>
            <dt>Original path</dt>
            <dd>
              <code>{uploadResult.originalPath}</code>
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
        </dl>
      </details>

      {uploadResult.derivativeError ? (
        <p className="auth-message auth-message-warning" role="status">
          Derivative error: {uploadResult.derivativeError}
        </p>
      ) : null}

    </div>
  );
}

function ImportDetailsModal({
  isOpen,
  onClose,
  uploadResult,
  uploadWarning,
  validationResult,
}: {
  isOpen: boolean;
  onClose: () => void;
  uploadResult: ImportOriginalUploadResult;
  uploadWarning: string | null;
  validationResult: ValidateSelectedPngFileResult | null;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
      <Modal aria-labelledby="import-details-title" className="modal-panel-lg import-details-modal">
        <ModalHeader>
          <div>
            <p className="eyebrow">Import details</p>
            <h2 id="import-details-title">Validation and storage results</h2>
          </div>

          <button
            aria-label="Close import details"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

        <ModalBody>
          {validationResult ? <ValidationDetails validationResult={validationResult} /> : null}
          <ImportUploadSummary uploadResult={uploadResult} />
          {uploadWarning ? (
            <p className="auth-message auth-message-warning" role="status">
              {uploadWarning}
            </p>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  if (uploadResult) {
    return (
      <Card aria-live="polite" className="import-validation-result import-complete-panel">
        <div className="import-complete-preview-shell">
          {validationResult ? (
            <ImportPngPreview
              alt={`Preview of ${validationResult.fileName}`}
              onPreviewClick={() => setIsPreviewOpen(true)}
              previewDataUrl={previewDataUrl}
            />
          ) : null}

          <div className="import-complete-actions">
            <Link className="button button-primary button-md" to={getAiReviewPath()}>
              Open AI Processing
            </Link>
            <Button onClick={() => setIsDetailsOpen(true)} variant="secondary">
              View import details
            </Button>
          </div>
        </div>

        <ImportDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          uploadResult={uploadResult}
          uploadWarning={uploadWarning}
          validationResult={validationResult}
        />
        <ImportPreviewLightbox
          alt={validationResult ? `Preview of ${validationResult.fileName}` : "Import preview"}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          previewDataUrl={previewDataUrl}
          title={validationResult?.fileName ?? "Import preview"}
        />
      </Card>
    );
  }

  return (
    <Card aria-live="polite" className="import-validation-result">
      <div className="import-validation-result-layout">
        {validationResult ? (
          <div className="import-validation-preview-column">
            <ImportPngPreview
              alt={`Preview of ${validationResult.fileName}`}
              onPreviewClick={() => setIsPreviewOpen(true)}
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

        <div className="import-validation-result-main">
          {validationResult ? <ValidationDetails validationResult={validationResult} /> : null}

          {validationResult ? <NormalizedPrintSizeNotice validationResult={validationResult} /> : null}

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

          {uploadWarning ? (
            <p className="auth-message auth-message-warning" role="status">
              {uploadWarning}
            </p>
          ) : null}

          {validationResult && getVisibleValidationWarnings(validationResult).length > 0 ? (
            <ValidationWarnings validationResult={validationResult} />
          ) : null}
        </div>
      </div>
      <ImportPreviewLightbox
        alt={validationResult ? `Preview of ${validationResult.fileName}` : "Import preview"}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewDataUrl={previewDataUrl}
        title={validationResult?.fileName ?? "Import preview"}
      />
    </Card>
  );
}
