import { Link } from "react-router-dom";

import { getAiReviewPath } from "../../../designs/constants/designLibraryFilters";
import { Card } from "../../../../shared/components/Card";
import type { BatchImportUploadReport } from "../../types/batchImportOrchestration.types";

interface BatchImportResultPanelProps {
  uploadReport: BatchImportUploadReport | null;
  warning: string | null;
}

export function BatchImportResultPanel({
  uploadReport,
  warning,
}: BatchImportResultPanelProps) {
  if (!uploadReport) {
    return null;
  }

  const { summary } = uploadReport;
  const hasDerivativeFailures = summary.derivativeFailedCount > 0;
  const allDerivativesComplete =
    summary.successfulImports > 0 && summary.derivativeFailedCount === 0;

  const derivativeFailureFiles = uploadReport.files.filter(
    (file) => file.importSuccess === true && file.pipelineSuccess === false,
  );

  return (
    <Card aria-live="polite" className="batch-import-result-panel">
      <div className="batch-import-result-summary">
        <p className="eyebrow">Batch import complete</p>
        <h3>Upload summary</h3>

        {warning ? (
          <p className="auth-message auth-message-warning" role="status">
            {warning}
          </p>
        ) : allDerivativesComplete ? (
          <p className="auth-message auth-message-success">
            Designs were imported with derivatives complete. Open AI Processing and use Start AI or
            Process image with AI when you are ready.
          </p>
        ) : hasDerivativeFailures ? (
          <p className="auth-message auth-message-warning">
            Batch upload finished with partial derivative success. Imported designs remain on the
            Processing tab until you start AI.
          </p>
        ) : (
          <p className="auth-message auth-message-success">
            Batch upload finished. Imported designs are waiting on the Processing tab.
          </p>
        )}

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
    </Card>
  );
}
