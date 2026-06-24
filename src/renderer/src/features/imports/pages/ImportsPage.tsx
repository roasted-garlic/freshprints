import { useMemo } from "react";

import { FileImage } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { isElectronDesktop } from "../../../shared/utils/isElectronDesktop";
import { BatchImportPanel } from "../components/batch/BatchImportPanel";
import { ImportResultPanel } from "../components/ImportResultPanel";
import { useBatchImport } from "../hooks/useBatchImport";
import { useSinglePngImport } from "../hooks/useSinglePngImport";

function getSelectButtonLabel(
  isBusy: boolean,
  phase: ReturnType<typeof useSinglePngImport>["phase"],
): string {
  if (!isBusy) {
    return "Select PNG";
  }

  switch (phase) {
    case "selecting":
      return "Selecting...";
    case "validating":
      return "Validating...";
    default:
      return "Working...";
  }
}

function isBatchImportBlockingSingleImport(
  phase: ReturnType<typeof useBatchImport>["phase"],
): boolean {
  return (
    phase === "selecting" ||
    phase === "discovering" ||
    phase === "ready-to-upload" ||
    phase === "uploading" ||
    phase === "error"
  );
}

export function ImportsPage() {
  const isDesktop = isElectronDesktop();
  const batchImport = useBatchImport();
  const {
    canUpload,
    cancelImport: cancelSingleImport,
    isBusy,
    isWorkflowActive: isSingleWorkflowActive,
    phase,
    previewDataUrl,
    selectAndValidatePng,
    selectionCanceled,
    uploadError,
    uploadResult,
    uploadValidatedPng,
    uploadWarning,
    validationError,
    validationResult,
  } = useSinglePngImport();

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Imports",
        description:
          "Import single PNG files or run batch discovery from multiple files, folders, or ZIP archives.",
        search: null,
        primaryAction: null,
      }),
      [],
    ),
  );

  const showCancelSingleImport =
    isSingleWorkflowActive ||
    uploadResult !== null ||
    validationResult !== null ||
    validationError !== null ||
    uploadError !== null ||
    selectionCanceled;

  const isUploading = phase === "uploading";
  const singleImportBlocked = isBatchImportBlockingSingleImport(batchImport.phase);
  const batchImportBlocked = isSingleWorkflowActive || isBusy;

  return (
    <main className="page-layout page-layout-shell">
      <Card className="imports-phase-card">
        <div className="imports-phase-card-content">
          <div>
            <p className="eyebrow">Phase 3A</p>
            <h2>Single PNG import</h2>
            <p>
              Choose one PNG file to validate dimensions and DPI metadata, upload the original to
              Firebase Storage, and create a Firestore design record with <code>status: imported</code>.
            </p>
          </div>

          {isDesktop ? (
            <div className="imports-phase-actions">
              <Button
                className="button-leading-icon"
                disabled={isBusy || singleImportBlocked}
                onClick={() => {
                  void selectAndValidatePng();
                }}
              >
                <FileImage aria-hidden="true" size={16} strokeWidth={2} />
                {getSelectButtonLabel(isBusy, phase)}
              </Button>
            </div>
          ) : (
            <p className="auth-message">
              PNG selection, validation, and upload are only available in the Fresh Prints desktop
              app.
            </p>
          )}
        </div>
      </Card>

      {singleImportBlocked ? (
        <Card>
          <p className="auth-message">
            Cancel the active batch import before using single PNG import.
          </p>
        </Card>
      ) : null}

      <ImportResultPanel
        canUpload={canUpload}
        isUploading={isUploading}
        onUpload={() => {
          void uploadValidatedPng();
        }}
        phase={phase}
        previewDataUrl={previewDataUrl}
        selectionCanceled={selectionCanceled}
        uploadError={uploadError}
        uploadResult={uploadResult}
        uploadWarning={uploadWarning}
        validationError={validationError}
        validationResult={validationResult}
      />

      {showCancelSingleImport ? (
        <div className="imports-actions-row">
          <Button
            disabled={isUploading}
            onClick={() => {
              void cancelSingleImport();
            }}
            variant="secondary"
          >
            Cancel Upload
          </Button>
        </div>
      ) : null}

      {batchImportBlocked ? (
        <Card>
          <p className="auth-message">
            Cancel the single PNG import before starting a batch import.
          </p>
        </Card>
      ) : null}

      <BatchImportPanel batchImport={batchImport} disabled={batchImportBlocked} />
    </main>
  );
}
