import { useCallback, useMemo, useRef, useState, useEffect } from "react";

import { FileImage } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { isElectronDesktop } from "../../../shared/utils/isElectronDesktop";
import { BatchImportPanel } from "../components/batch/BatchImportPanel";
import { ImportMethodCardOverlay } from "../components/ImportMethodCardOverlay";
import { ImportResultPanel } from "../components/ImportResultPanel";
import { ImportSessionSettingsHeaderAccessory } from "../components/ImportSessionSettingsHeaderAccessory";
import { ImportSessionSettingsModal } from "../components/ImportSessionSettingsModal";
import { useBatchImport } from "../hooks/useBatchImport";
import { useImportSessionSettings } from "../hooks/useImportSessionSettings";
import { useSinglePngImport } from "../hooks/useSinglePngImport";
import { enqueueImportedDesignsForBackgroundAi } from "../services/importAiBackgroundQueue";
import type { ImportSessionSettings } from "../constants/importSessionSettings";

function getSelectButtonLabel(
  isBusy: boolean,
  phase: ReturnType<typeof useSinglePngImport>["phase"],
): string {
  if (!isBusy) {
    return "Single Image";
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
  const sessionSettings = useImportSessionSettings();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const getSessionSettings = useCallback((): ImportSessionSettings => {
    return {
      halftoneMode: sessionSettings.halftoneMode,
      backgroundMode: sessionSettings.backgroundMode,
    };
  }, [sessionSettings.halftoneMode, sessionSettings.backgroundMode]);

  const batchImport = useBatchImport({ getSessionSettings });
  const {
    canUpload,
    cancelImport: cancelSingleImport,
    isBusy,
    isWorkflowActive: isSingleWorkflowActive,
    phase,
    previewDataUrl,
    selectAndValidatePng,
    selectionCanceled,
    setItemBackgroundOverride,
    setItemHalftoneOverride,
    suggestDarkArtworkBackground,
    itemBackgroundOverride,
    itemHalftoneOverride,
    uploadError,
    uploadResult,
    uploadValidatedPng,
    uploadWarning,
    validationError,
    validationResult,
  } = useSinglePngImport({ getSessionSettings });

  const singleAutoStartRef = useRef<string | null>(null);
  const openSettings = useCallback(() => setSettingsModalOpen(true), []);

  const headerAccessory = useMemo(
    () => <ImportSessionSettingsHeaderAccessory onOpenSettings={openSettings} />,
    [openSettings],
  );

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Imports",
        description:
          "Import single PNG files or run batch discovery from multiple files, folders, or ZIP archives.",
        search: null,
        primaryAction: null,
        accessory: headerAccessory,
      }),
      [headerAccessory],
    ),
  );

  useEffect(() => {
    if (!uploadResult?.pipelineSuccess || !uploadResult.designId) {
      return;
    }
    if (singleAutoStartRef.current === uploadResult.designId) {
      return;
    }
    singleAutoStartRef.current = uploadResult.designId;
    enqueueImportedDesignsForBackgroundAi([uploadResult.designId]);
  }, [uploadResult]);

  const showCancelSingleImport =
    uploadResult === null &&
    (isSingleWorkflowActive ||
      validationResult !== null ||
      validationError !== null ||
      uploadError !== null ||
      selectionCanceled);

  const isUploading = phase === "uploading";
  const singleImportBlocked = isBatchImportBlockingSingleImport(batchImport.phase);
  const batchImportBlocked = isSingleWorkflowActive || isBusy;
  const singleImportBlockingMessage = "Cancel batch import before using single PNG import.";
  const batchImportBlockingMessage = "Cancel the single PNG import before starting a batch import.";
  const singleMethodCardHasOverlay = singleImportBlocked || showCancelSingleImport;
  const settingsDisabled = batchImport.phase === "uploading" || isUploading;

  return (
    <main className="page-layout page-layout-shell imports-page">
      <p className="imports-session-status" title={sessionSettings.summaryText}>
        {sessionSettings.summaryText}
      </p>

      <div className="imports-entry-grid">
        <Card
          className={`imports-phase-card imports-method-card${
            singleMethodCardHasOverlay ? " imports-method-card--covered" : ""
          }`}
        >
          <div className="imports-phase-card-content">
            <div>
              <p className="eyebrow">Single import</p>
              <h2>One PNG</h2>
              <p>Validate, preview, upload, and send to AI Processing.</p>
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

          {singleImportBlocked ? (
            <ImportMethodCardOverlay message={singleImportBlockingMessage} />
          ) : showCancelSingleImport ? (
            <ImportMethodCardOverlay>
              <Button
                onClick={() => {
                  void cancelSingleImport();
                }}
                variant="secondary"
              >
                Cancel Upload
              </Button>
            </ImportMethodCardOverlay>
          ) : null}
        </Card>

        <BatchImportPanel
          backgroundMode={sessionSettings.backgroundMode}
          batchImport={batchImport}
          blockingMessage={batchImportBlocked ? batchImportBlockingMessage : null}
          disabled={batchImportBlocked}
          halftoneMode={sessionSettings.halftoneMode}
        />
      </div>

      <ImportResultPanel
        backgroundMode={sessionSettings.backgroundMode}
        canUpload={canUpload}
        halftoneMode={sessionSettings.halftoneMode}
        isUploading={isUploading}
        itemBackgroundOverride={itemBackgroundOverride}
        itemHalftoneOverride={itemHalftoneOverride}
        onItemBackgroundOverrideChange={setItemBackgroundOverride}
        onItemHalftoneOverrideChange={setItemHalftoneOverride}
        onUpload={() => {
          void uploadValidatedPng();
        }}
        phase={phase}
        previewDataUrl={previewDataUrl}
        selectionCanceled={selectionCanceled}
        suggestDarkArtworkBackground={suggestDarkArtworkBackground}
        uploadError={uploadError}
        uploadResult={uploadResult}
        uploadWarning={uploadWarning}
        validationError={validationError}
        validationResult={validationResult}
      />

      <ImportSessionSettingsModal
        backgroundMode={sessionSettings.backgroundMode}
        disabled={settingsDisabled}
        halftoneMode={sessionSettings.halftoneMode}
        isOpen={settingsModalOpen}
        onBackgroundModeChange={sessionSettings.setBackgroundMode}
        onClose={() => setSettingsModalOpen(false)}
        onHalftoneModeChange={sessionSettings.setHalftoneMode}
      />
    </main>
  );
}
