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
import { buildDiscoverySummaryHelpText } from "../../../../../../../shared/utils/batchDiscoverySummary";
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

      <p className="batch-import-summary-help" title={buildDiscoverySummaryHelpText()}>
        {buildDiscoverySummaryHelpText()}
      </p>

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
          <dt>Processed</dt>
          <dd>{discoveryResult.summary.processed}</dd>
        </div>
        {discoveryResult.summary.skippedByLimit > 0 ? (
          <div className="batch-import-summary-stat">
            <dt>Skipped by limit</dt>
            <dd>{discoveryResult.summary.skippedByLimit}</dd>
          </div>
        ) : null}
        <div className="batch-import-summary-stat">
          <dt>Validated</dt>
          <dd>{discoveryResult.summary.validated}</dd>
        </div>
        <div className="batch-import-summary-stat">
          <dt>Rejected</dt>
          <dd>{discoveryResult.summary.rejected}</dd>
        </div>
        {discoveryResult.folderDiscovery ? (
          <>
            <div className="batch-import-summary-stat">
              <dt>Loose PNGs</dt>
              <dd>{discoveryResult.folderDiscovery.loosePngsFound}</dd>
            </div>
            <div className="batch-import-summary-stat">
              <dt>ZIPs found</dt>
              <dd>{discoveryResult.folderDiscovery.zipsFound}</dd>
            </div>
            <div className="batch-import-summary-stat">
              <dt>ZIPs processed</dt>
              <dd>{discoveryResult.folderDiscovery.zipsProcessed}</dd>
            </div>
            {discoveryResult.folderDiscovery.zipsSkippedByLimit > 0 ? (
              <div className="batch-import-summary-stat">
                <dt>ZIPs skipped (batch full)</dt>
                <dd>{discoveryResult.folderDiscovery.zipsSkippedByLimit}</dd>
              </div>
            ) : null}
            {discoveryResult.folderDiscovery.zipsSkippedOther > 0 ? (
              <div className="batch-import-summary-stat">
                <dt>ZIPs skipped (other)</dt>
                <dd>{discoveryResult.folderDiscovery.zipsSkippedOther}</dd>
              </div>
            ) : null}
            <div className="batch-import-summary-stat">
              <dt>Nested ZIPs not opened</dt>
              <dd>{discoveryResult.folderDiscovery.nestedZipsNotOpened}</dd>
            </div>
          </>
        ) : null}
        <div className="batch-import-summary-stat">
          <dt>Files with warnings</dt>
          <dd>{filesWithWarningsCount}</dd>
        </div>
        <div className="batch-import-summary-stat">
          <dt>Excluded</dt>
          <dd>{excludedCount}</dd>
        </div>
      </dl>

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
    </Card>
  );
}
