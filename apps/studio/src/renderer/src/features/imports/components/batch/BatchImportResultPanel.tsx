import { useState } from "react";
import type { ReactNode } from "react";

import { ExternalLink, X } from "lucide-react";
import { Link } from "react-router-dom";

import { getAiReviewPath } from "../../../designs/constants/designLibraryFilters";
import { Button } from "../../../../shared/components/Button";
import { Card } from "../../../../shared/components/Card";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../../shared/components/Modal";
import type {
  BatchImportUploadFileResult,
  BatchImportUploadReport,
} from "../../types/batchImportOrchestration.types";

interface BatchImportResultPanelProps {
  uploadReport: BatchImportUploadReport | null;
  warning: string | null;
}

interface FileWarningSummary {
  fileName: string;
  relativePath?: string;
  warnings: NonNullable<BatchImportUploadFileResult["warnings"]>;
}

function formatWarningCount(value: number): string {
  return `${value} warning${value === 1 ? "" : "s"}`;
}

function getFileWarningSummaries(files: BatchImportUploadFileResult[]): FileWarningSummary[] {
  return files
    .filter((file) => (file.warnings?.length ?? 0) > 0)
    .map((file) => ({
      fileName: file.fileName,
      relativePath: file.relativePath,
      warnings: file.warnings ?? [],
    }));
}

function buildNonValidationWarningMessage(
  summary: BatchImportUploadReport["summary"],
): string | null {
  const messages: string[] = [];

  if (summary.failedImports > 0) {
    messages.push(`${summary.failedImports} file(s) failed to import. See the upload report for details.`);
  }

  if (summary.derivativeFailedCount > 0) {
    messages.push(
      `${summary.derivativeFailedCount} design(s) were imported without completed derivatives.`,
    );
  }

  return messages.length > 0 ? messages.join(" ") : null;
}

function BatchResultDetailModal({
  children,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
      <Modal aria-labelledby="batch-result-detail-modal-title" className="batch-import-detail-modal">
        <ModalHeader>
          <div>
            <p className="eyebrow">Batch import</p>
            <h2 id="batch-result-detail-modal-title">{title}</h2>
          </div>

          <button
            aria-label="Close details"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>

        <ModalBody>{children}</ModalBody>

        <ModalFooter>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export function BatchImportResultPanel({
  uploadReport,
  warning,
}: BatchImportResultPanelProps) {
  const [isWarningDetailsOpen, setIsWarningDetailsOpen] = useState(false);

  if (!uploadReport) {
    return null;
  }

  const { summary } = uploadReport;
  const hasDerivativeFailures = summary.derivativeFailedCount > 0;
  const allDerivativesComplete =
    summary.successfulImports > 0 && summary.derivativeFailedCount === 0;
  const fileWarningSummaries = getFileWarningSummaries(uploadReport.files);
  const nonValidationWarningMessage = buildNonValidationWarningMessage(summary);

  const derivativeFailureFiles = uploadReport.files.filter(
    (file) => file.importSuccess === true && file.pipelineSuccess === false,
  );

  return (
    <Card aria-live="polite" className="batch-import-result-panel">
      <div className="batch-import-result-summary">
        <p className="eyebrow">Batch import complete</p>
        <h3>Upload summary</h3>

        {nonValidationWarningMessage ? (
          <p className="auth-message auth-message-warning" role="status">
            {nonValidationWarningMessage}
          </p>
        ) : allDerivativesComplete ? (
          <p className="auth-message auth-message-success">
            Designs were imported with derivatives complete. AI processing starts in the
            background so you can keep importing. Open AI Processing anytime to watch progress.
          </p>
        ) : hasDerivativeFailures ? (
          <p className="auth-message auth-message-warning">
            Batch upload finished with partial derivative success. Designs with complete
            derivatives start AI in the background; incomplete ones stay on Processing until fixed.
          </p>
        ) : (
          <p className="auth-message auth-message-success">
            Batch upload finished. AI processing starts in the background for imported designs.
          </p>
        )}

        {summary.warningsCount > 0 ? (
          <div className="batch-import-result-pills" role="status">
            {fileWarningSummaries.length > 0 ? (
              <button
                className="batch-import-detail-pill batch-import-detail-pill-warning"
                onClick={() => setIsWarningDetailsOpen(true)}
                type="button"
              >
                {summary.warningsCount} Validation warning
                {summary.warningsCount === 1 ? "" : "s"}
                <ExternalLink aria-hidden="true" size={12} strokeWidth={2.2} />
              </button>
            ) : (
              <span className="batch-import-detail-pill batch-import-detail-pill-warning">
                {warning ?? formatWarningCount(summary.warningsCount)}
              </span>
            )}
          </div>
        ) : null}

        <dl className="batch-import-summary-stats">
          <div className="batch-import-summary-stat">
            <dt>Designs imported</dt>
            <dd>{summary.successfulImports}</dd>
          </div>
          <div className="batch-import-summary-stat">
            <dt>Derivatives complete</dt>
            <dd>{summary.derivativeCompleteCount}</dd>
          </div>
          <div className="batch-import-summary-stat">
            <dt>Derivatives failed</dt>
            <dd>{summary.derivativeFailedCount}</dd>
          </div>
          <div className="batch-import-summary-stat">
            <dt>Failed imports</dt>
            <dd>{summary.failedImports}</dd>
          </div>
          <div className="batch-import-summary-stat">
            <dt>Skipped by user</dt>
            <dd>{summary.userSkippedCount}</dd>
          </div>
          <div className="batch-import-summary-stat">
            <dt>Skipped files</dt>
            <dd>{summary.skippedFiles}</dd>
          </div>
          {summary.derivativeSkippedCount > 0 ? (
            <div className="batch-import-summary-stat">
              <dt>Skipped derivatives</dt>
              <dd>{summary.derivativeSkippedCount}</dd>
            </div>
          ) : null}
          <div className="batch-import-summary-stat">
            <dt>Warnings</dt>
            <dd>{summary.warningsCount}</dd>
          </div>
        </dl>
      </div>

      <div className="batch-import-actions-row">
        <Link className="button button-primary button-md" to={getAiReviewPath()}>
          Open AI Processing
        </Link>
      </div>

      {summary.failedFiles.length > 0 ? (
        <div className="batch-import-failed-list">
          <h4>Failed imports</h4>
          <ul>
            {summary.failedFiles.map((file) => (
              <li key={file.fileName}>
                <strong>{file.fileName}</strong>
                <span>{file.errorMessage}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {derivativeFailureFiles.length > 0 ? (
        <div className="batch-import-failed-list">
          <h4>Derivative failures</h4>
          <ul>
            {derivativeFailureFiles.map((file) => (
              <li key={`${file.fileName}-derivative`}>
                <strong>{file.fileName}</strong>
                <span>{file.derivativeError ?? "Derivative processing did not complete."}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <BatchResultDetailModal
        isOpen={isWarningDetailsOpen}
        onClose={() => setIsWarningDetailsOpen(false)}
        title="Validation warnings"
      >
        <p className="batch-import-summary-help">
          {formatWarningCount(summary.warningsCount)} recorded across{" "}
          {fileWarningSummaries.length} file{fileWarningSummaries.length === 1 ? "" : "s"}.
        </p>
        <div className="batch-import-warning-card-grid">
          {fileWarningSummaries.map((file) => (
            <article className="batch-import-warning-card" key={file.relativePath ?? file.fileName}>
              <div className="batch-import-warning-card-header">
                <h3>{file.fileName}</h3>
                <span>{formatWarningCount(file.warnings.length)}</span>
              </div>
              {file.relativePath && file.relativePath !== file.fileName ? (
                <p className="batch-import-warning-path">{file.relativePath}</p>
              ) : null}
              <ul>
                {file.warnings.map((fileWarning, index) => (
                  <li key={`${fileWarning.code}-${fileWarning.message}-${index}`}>
                    <span className="batch-import-warning-code">{fileWarning.code}</span>
                    <span>{fileWarning.message}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </BatchResultDetailModal>
    </Card>
  );
}
