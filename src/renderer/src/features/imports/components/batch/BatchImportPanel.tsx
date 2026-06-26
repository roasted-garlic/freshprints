import { isElectronDesktop } from "../../../../shared/utils/isElectronDesktop";
import { Button } from "../../../../shared/components/Button";
import { Card } from "../../../../shared/components/Card";
import type { UseBatchImportReturn } from "../../types/batchImportHook.types";
import { BatchImportDiscoverySummary } from "./BatchImportDiscoverySummary";
import { BatchImportProgressPanel } from "./BatchImportProgressPanel";
import { BatchImportResultPanel } from "./BatchImportResultPanel";
import { BatchImportSourceActions } from "./BatchImportSourceActions";

interface BatchImportPanelProps {
  batchImport: UseBatchImportReturn;
  disabled?: boolean;
}

export function BatchImportPanel({ batchImport, disabled = false }: BatchImportPanelProps) {
  const isDesktop = isElectronDesktop();
  const {
    canUpload,
    cancelImport,
    discoveryResult,
    error,
    excludeAllValidatedFiles,
    excludedFilePaths,
    includeAllValidatedFiles,
    isBusy,
    phase,
    progress,
    selectFolder,
    selectMultiplePngs,
    selectZip,
    sourceType,
    toggleFileIncluded,
    uploadBatch,
    uploadReport,
    warning,
  } = batchImport;

  const showDiscoveryProgress =
    phase === "selecting" || phase === "discovering" || phase === "uploading";
  const showDiscoverySummary = phase === "ready-to-upload" && discoveryResult !== null;
  const showResult = phase === "completed" && uploadReport !== null;
  const showError = phase === "error" && Boolean(error);
  const sourcesDisabled = disabled || phase !== "idle";

  return (
    <section aria-labelledby="batch-import-heading" className="batch-import-panel">
      <Card className="imports-phase-card imports-method-card">
        <div className="batch-import-header">
          <div className="batch-import-header-copy">
            <p className="eyebrow">Batch import</p>
            <h2 id="batch-import-heading">Multiple files</h2>
            <p>Discover, validate, upload, and queue many PNG designs for AI Processing.</p>
          </div>

          {isDesktop ? (
            <BatchImportSourceActions
              disabled={sourcesDisabled}
              isBusy={isBusy}
              onSelectFolder={() => {
                void selectFolder();
              }}
              onSelectMultiplePngs={() => {
                void selectMultiplePngs();
              }}
              onSelectZip={() => {
                void selectZip();
              }}
            />
          ) : (
            <p className="auth-message">
              Batch import is only available in the Fresh Prints desktop app.
            </p>
          )}
        </div>
      </Card>

      {showDiscoveryProgress ? (
        <BatchImportProgressPanel
          hookPhase={phase}
          onCancel={
            phase === "discovering"
              ? () => {
                  void cancelImport();
                }
              : undefined
          }
          progress={progress}
          sourceType={sourceType}
        />
      ) : null}

      {showDiscoverySummary && discoveryResult ? (
        <BatchImportDiscoverySummary
          canUpload={canUpload}
          discoveryResult={discoveryResult}
          excludedFilePaths={new Set(excludedFilePaths)}
          isBusy={isBusy}
          onCancelImport={() => {
            void cancelImport();
          }}
          onExcludeAllValidatedFiles={excludeAllValidatedFiles}
          onIncludeAllValidatedFiles={includeAllValidatedFiles}
          onToggleFileIncluded={toggleFileIncluded}
          onUpload={() => {
            void uploadBatch();
          }}
          warning={warning}
        />
      ) : null}

      {showResult && uploadReport ? (
        <BatchImportResultPanel
          onCancelImport={() => {
            void cancelImport();
          }}
          uploadReport={uploadReport}
          warning={warning}
        />
      ) : null}

      {showError ? (
        <Card aria-live="assertive" className="batch-import-error-panel" role="alert">
          <p className="eyebrow">Batch import error</p>
          <h3>Unable to continue</h3>
          <p className="auth-message auth-message-error">{error}</p>
          {warning ? (
            <p className="auth-message auth-message-warning" role="status">
              {warning}
            </p>
          ) : null}
          <div className="batch-import-actions-row">
            <Button
              onClick={() => {
                void cancelImport();
              }}
              variant="secondary"
            >
              Cancel Upload
            </Button>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
