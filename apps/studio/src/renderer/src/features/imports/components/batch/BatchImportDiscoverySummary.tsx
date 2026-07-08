import { useState } from "react";
import type { ReactNode } from "react";

import type { BatchDiscoveryCompleteEvent } from "@fresh-prints/shared/types/import/batchImport.types";
import type { ImportPngWarning } from "@fresh-prints/shared/types/import/importIpc.types";

import { ExternalLink, Upload, X } from "lucide-react";

import { Badge } from "../../../../shared/components/Badge";
import { Button } from "../../../../shared/components/Button";
import { Card } from "../../../../shared/components/Card";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../../shared/components/Modal";
import {
  countExcludedValidatedFiles,
  countFilesWithDiscoveryWarnings,
  countIncludedValidatedFiles,
  getBatchSourceTypeLabel,
  getRejectedManifestFiles,
  getValidatedManifestFiles,
} from "../../utils/batchImportDisplay";
import { buildDiscoverySummaryHelpText } from "@fresh-prints/shared/utils/batchDiscoverySummary";
import { BatchImportFileList } from "./BatchImportFileList";

interface BatchImportDiscoverySummaryProps {
  canUpload: boolean;
  discoveryResult: BatchDiscoveryCompleteEvent;
  excludedFilePaths: ReadonlySet<string>;
  isBusy: boolean;
  onExcludeAllValidatedFiles: () => void;
  onIncludeAllValidatedFiles: () => void;
  onToggleFileIncluded: (filePath: string) => void;
  onUpload: () => void;
  warning: string | null;
}

interface NormalizedWarningSummary {
  count: number;
  message: string;
}

const OMITTED_VALIDATED_ROW_WARNING_CODES = new Set<ImportPngWarning["code"]>([
  "PRINT_SIZE_NORMALIZED",
]);

function formatFileCount(value: number): string {
  return `${value} file${value === 1 ? "" : "s"}`;
}

function getNormalizedWarningSummaries(
  files: ReturnType<typeof getValidatedManifestFiles>,
): NormalizedWarningSummary[] {
  const warningsByMessage = new Map<string, number>();

  for (const file of files) {
    for (const warning of file.validation?.warnings ?? []) {
      if (warning.code !== "PRINT_SIZE_NORMALIZED") {
        continue;
      }

      warningsByMessage.set(warning.message, (warningsByMessage.get(warning.message) ?? 0) + 1);
    }
  }

  return Array.from(warningsByMessage.entries()).map(([message, count]) => ({
    count,
    message,
  }));
}

function formatNormalizedWarningSize(message: string): string {
  return message
    .replace(/^Print size normalized to /, "")
    .replace(/\.$/, "");
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="batch-import-summary-stat batch-import-summary-stat-compact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function BatchDetailModal({
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
      <Modal aria-labelledby="batch-detail-modal-title" className="batch-import-detail-modal">
        <ModalHeader>
          <div>
            <p className="eyebrow">Batch import</p>
            <h2 id="batch-detail-modal-title">{title}</h2>
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

export function BatchImportDiscoverySummary({
  canUpload,
  discoveryResult,
  excludedFilePaths,
  isBusy,
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
  const normalizedWarningSummaries = getNormalizedWarningSummaries(validatedFiles);
  const normalizedFilesCount = normalizedWarningSummaries.reduce(
    (total, summary) => total + summary.count,
    0,
  );
  const [isDiscoveryDetailsOpen, setIsDiscoveryDetailsOpen] = useState(false);
  const [isNormalizationDetailsOpen, setIsNormalizationDetailsOpen] = useState(false);

  return (
    <Card aria-live="polite" className="batch-import-summary-panel">
      <div className="batch-import-ready-header">
        <div className="batch-import-ready-copy">
          <div className="batch-import-progress-meta">
            <p className="eyebrow">Discovery complete</p>
            <Badge variant="info">{getBatchSourceTypeLabel(discoveryResult.sourceType)}</Badge>
          </div>
        </div>

        <Button
          className="button-leading-icon"
          disabled={!canUpload || isBusy}
          onClick={onUpload}
        >
          <Upload aria-hidden="true" size={16} strokeWidth={2} />
          {isBusy
            ? "Uploading..."
            : `Upload batch${includedCount > 0 ? ` (${formatFileCount(includedCount)})` : ""}`}
        </Button>
      </div>

      <dl className="batch-import-summary-stats batch-import-summary-stats-compact">
        <SummaryStat label="Ready" value={includedCount} />
        <SummaryStat label="Rejected" value={rejectedFiles.length} />
        {normalizedFilesCount > 0 ? (
          <SummaryStat label="Normalized" value={normalizedFilesCount} />
        ) : null}
        {excludedCount > 0 ? <SummaryStat label="Excluded" value={excludedCount} /> : null}
        <SummaryStat label="Total found" value={discoveryResult.summary.discovered} />
      </dl>

      {warning ? (
        <p className="auth-message auth-message-warning" role="status">
          {warning}
        </p>
      ) : null}

      <BatchDetailModal
        isOpen={isDiscoveryDetailsOpen}
        onClose={() => setIsDiscoveryDetailsOpen(false)}
        title="Discovery details"
      >
        <p className="batch-import-summary-help">{buildDiscoverySummaryHelpText()}</p>
        <dl className="batch-import-summary-stats batch-import-summary-stats-details">
          <SummaryStat label="Processed" value={discoveryResult.summary.processed} />
          <SummaryStat label="Validated" value={discoveryResult.summary.validated} />
          <SummaryStat label="Files with warnings" value={filesWithWarningsCount} />
          <SummaryStat label="Excluded" value={excludedCount} />
          {discoveryResult.summary.skippedByLimit > 0 ? (
            <SummaryStat label="Skipped by limit" value={discoveryResult.summary.skippedByLimit} />
          ) : null}
          {discoveryResult.folderDiscovery ? (
            <>
              <SummaryStat label="Loose PNGs" value={discoveryResult.folderDiscovery.loosePngsFound} />
              <SummaryStat label="ZIPs found" value={discoveryResult.folderDiscovery.zipsFound} />
              <SummaryStat
                label="ZIPs processed"
                value={discoveryResult.folderDiscovery.zipsProcessed}
              />
              {discoveryResult.folderDiscovery.zipsSkippedByLimit > 0 ? (
                <SummaryStat
                  label="ZIPs skipped"
                  value={discoveryResult.folderDiscovery.zipsSkippedByLimit}
                />
              ) : null}
              {discoveryResult.folderDiscovery.zipsSkippedOther > 0 ? (
                <SummaryStat
                  label="ZIP errors"
                  value={discoveryResult.folderDiscovery.zipsSkippedOther}
                />
              ) : null}
              <SummaryStat
                label="Nested ZIPs not opened"
                value={discoveryResult.folderDiscovery.nestedZipsNotOpened}
              />
            </>
          ) : null}
        </dl>
      </BatchDetailModal>

      <BatchDetailModal
        isOpen={isNormalizationDetailsOpen}
        onClose={() => setIsNormalizationDetailsOpen(false)}
        title="Normalized files"
      >
        <p className="batch-import-summary-help">
          {formatFileCount(normalizedFilesCount)} normalized to print-ready sizes.
        </p>
        {normalizedWarningSummaries.length > 0 ? (
          <dl className="batch-import-normalized-card-grid">
            {normalizedWarningSummaries.map((summary) => (
              <div className="batch-import-normalized-card" key={summary.message}>
                <dt>{formatFileCount(summary.count)}</dt>
                <dd>{formatNormalizedWarningSize(summary.message)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </BatchDetailModal>

      <div
        className={
          rejectedFiles.length > 0
            ? "batch-import-file-lists"
            : "batch-import-file-lists batch-import-file-lists-single"
        }
      >
        <div className="batch-import-validated-section">
          <div className="batch-import-validated-header">
            <div className="batch-import-ready-pills">
              <button
                className="batch-import-detail-pill"
                onClick={() => setIsDiscoveryDetailsOpen(true)}
                type="button"
              >
                Discovery details
                <ExternalLink aria-hidden="true" size={12} strokeWidth={2.2} />
              </button>
              {normalizedFilesCount > 0 ? (
                <button
                  className="batch-import-detail-pill batch-import-detail-pill-success"
                  onClick={() => setIsNormalizationDetailsOpen(true)}
                  type="button"
                >
                  {normalizedFilesCount} Normalized
                  <ExternalLink aria-hidden="true" size={12} strokeWidth={2.2} />
                </button>
              ) : null}
            </div>
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
            jobId={discoveryResult.jobId}
            omittedWarningCodes={OMITTED_VALIDATED_ROW_WARNING_CODES}
            onToggleFileIncluded={onToggleFileIncluded}
            title=""
            variant="validated"
          />
        </div>
        {rejectedFiles.length > 0 ? (
          <BatchImportFileList files={rejectedFiles} title="Rejected files" variant="rejected" />
        ) : null}
      </div>
    </Card>
  );
}
