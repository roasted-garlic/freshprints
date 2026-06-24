import type { BatchDiscoveryCompleteEvent } from "../../../../../../../shared/types/import/batchImport.types";

import { Upload } from "lucide-react";

import { Badge } from "../../../../shared/components/Badge";
import { Button } from "../../../../shared/components/Button";
import { Card } from "../../../../shared/components/Card";
import {
  countExcludedValidatedFiles,
  countFilesWithDiscoveryWarnings,
  countIncludedValidatedFiles,
  getBatchSourceTypeLabel,
  getRejectedManifestFiles,
  getValidatedManifestFiles,
} from "../../utils/batchImportDisplay";
import { BatchImportFileList } from "./BatchImportFileList";

interface BatchImportDiscoverySummaryProps {
  canUpload: boolean;
  discoveryResult: BatchDiscoveryCompleteEvent;
  excludedFilePaths: ReadonlySet<string>;
  isBusy: boolean;
  onCancelImport: () => void;
  onExcludeAllValidatedFiles: () => void;
  onIncludeAllValidatedFiles: () => void;
  onToggleFileIncluded: (filePath: string) => void;
  onUpload: () => void;
  warning: string | null;
}

export function BatchImportDiscoverySummary({
  canUpload,
  discoveryResult,
  excludedFilePaths,
  isBusy,
  onCancelImport,
  onExcludeAllValidatedFiles,
  onIncludeAllValidatedFiles,
  onToggleFileIncluded,
  onUpload,
  warning,
}: BatchImportDiscoverySummaryProps) {
  const validatedFiles = getValidatedManifestFiles(discoveryResult);
  const rejectedFiles = getRejectedManifestFiles(discoveryResult);
  const filesWithWarningsCount = countFilesWithDiscoveryWarnings(discoveryResult.files);
  const excludedCount = countExcludedValidatedFiles(validatedFiles, excludedFilePaths);
  const includedCount = countIncludedValidatedFiles(validatedFiles, excludedFilePaths);

  return (
    <Card aria-live="polite" className="batch-import-summary-panel">
      <div className="batch-import-progress-meta">
        <p className="eyebrow">Discovery complete</p>
        <Badge variant="info">{getBatchSourceTypeLabel(discoveryResult.sourceType)}</Badge>
      </div>

      <h3>Ready to upload</h3>

      {discoveryResult.truncated ? (
        <p className="auth-message auth-message-warning" role="status">
          Discovery stopped at the batch file limit. Some files were not scanned.
        </p>
      ) : null}

      {warning ? (
        <p className="auth-message auth-message-warning" role="status">
          {warning}
        </p>
      ) : null}

      <dl className="batch-import-summary-stats">
        <div className="batch-import-summary-stat">
          <dt>Discovered</dt>
          <dd>{discoveryResult.summary.discovered}</dd>
        </div>
        <div className="batch-import-summary-stat">
          <dt>Validated</dt>
          <dd>{discoveryResult.summary.validated}</dd>
        </div>
        <div className="batch-import-summary-stat">
          <dt>Rejected</dt>
          <dd>{discoveryResult.summary.rejected}</dd>
        </div>
        <div className="batch-import-summary-stat">
          <dt>Files with warnings</dt>
          <dd>{filesWithWarningsCount}</dd>
        </div>
        <div className="batch-import-summary-stat">
          <dt>Excluded</dt>
          <dd>{excludedCount}</dd>
        </div>
      </dl>

      <div className="batch-import-file-lists">
        <div className="batch-import-validated-section">
          <div className="batch-import-validated-header">
            <h4>Validated files</h4>
            {validatedFiles.length > 0 ? (
              <div className="batch-import-validated-bulk-actions">
                <Button onClick={onIncludeAllValidatedFiles} size="sm" variant="ghost">
                  Include all
                </Button>
                <Button onClick={onExcludeAllValidatedFiles} size="sm" variant="ghost">
                  Exclude all
                </Button>
              </div>
            ) : null}
          </div>
          <BatchImportFileList
            emptyMessage="No validated PNG files were found."
            excludedFilePaths={excludedFilePaths}
            files={validatedFiles}
            onToggleFileIncluded={onToggleFileIncluded}
            title=""
            variant="validated"
          />
        </div>
        <BatchImportFileList
          emptyMessage="No rejected files."
          files={rejectedFiles}
          title="Rejected files"
          variant="rejected"
        />
      </div>

      <div className="batch-import-actions-row">
        <Button
          className="button-leading-icon"
          disabled={!canUpload || isBusy}
          onClick={onUpload}
        >
          <Upload aria-hidden="true" size={16} strokeWidth={2} />
          {isBusy
            ? "Uploading..."
            : `Upload batch${includedCount > 0 ? ` (${includedCount} file${includedCount === 1 ? "" : "s"})` : ""}`}
        </Button>
        <Button disabled={isBusy} onClick={onCancelImport} variant="secondary">
          Cancel Upload
        </Button>
      </div>
    </Card>
  );
}
