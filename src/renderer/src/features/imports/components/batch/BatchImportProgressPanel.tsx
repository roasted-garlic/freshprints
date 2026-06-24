import type { BatchImportSourceType } from "../../../../../../../shared/types/import/batchImport.types";

import { Badge } from "../../../../shared/components/Badge";
import { Button } from "../../../../shared/components/Button";
import { Card } from "../../../../shared/components/Card";
import { ProgressBar } from "../../../../shared/components/ProgressBar";
import type { BatchImportHookPhase, BatchImportHookProgress } from "../../types/batchImportHook.types";
import {
  calculateProgressPercent,
  getBatchProgressPhaseLabel,
  getBatchSourceTypeLabel,
} from "../../utils/batchImportDisplay";

interface BatchImportProgressPanelProps {
  hookPhase: BatchImportHookPhase;
  onCancel?: () => void;
  progress: BatchImportHookProgress | null;
  sourceType: BatchImportSourceType | null;
}

function getProgressPhase(
  hookPhase: BatchImportHookPhase,
  progress: BatchImportHookProgress | null,
): BatchImportHookProgress["phase"] | "selecting" {
  if (hookPhase === "selecting") {
    return "selecting";
  }

  return progress?.phase ?? "discovering";
}

export function BatchImportProgressPanel({
  hookPhase,
  onCancel,
  progress,
  sourceType,
}: BatchImportProgressPanelProps) {
  const progressPhase = getProgressPhase(hookPhase, progress);
  const completedCount = progress?.completedCount ?? 0;
  const totalCount = progress?.totalCount ?? 0;
  const percent = calculateProgressPercent(completedCount, totalCount);
  const showCounts = totalCount > 0 || hookPhase === "uploading";

  return (
    <Card aria-live="polite" className="batch-import-progress-panel">
      <div className="batch-import-progress-meta">
        <p className="eyebrow">Batch progress</p>
        {sourceType ? <Badge variant="info">{getBatchSourceTypeLabel(sourceType)}</Badge> : null}
      </div>

      <h3>{getBatchProgressPhaseLabel(progressPhase)}</h3>

      {progress?.currentFileName ? (
        <p className="batch-import-progress-current">
          Current file: <strong>{progress.currentFileName}</strong>
        </p>
      ) : hookPhase === "selecting" ? (
        <p className="batch-import-progress-current">Waiting for file or folder selection...</p>
      ) : null}

      {progress?.stepLabel ? (
        <p className="auth-message">{progress.stepLabel}</p>
      ) : null}

      {showCounts ? (
        <div className="batch-import-progress-stats">
          <span>
            {completedCount} / {totalCount} processed
          </span>
          <span>{progress?.successCount ?? 0} succeeded</span>
          <span>{progress?.failureCount ?? 0} failed</span>
        </div>
      ) : null}

      {hookPhase === "selecting" ? (
        <ProgressBar label="Batch import selection progress" value={0} />
      ) : (
        <ProgressBar label="Batch import progress" value={percent} />
      )}

      {onCancel ? (
        <div className="batch-import-actions-row">
          <Button onClick={onCancel} variant="secondary">
            Cancel Upload
          </Button>
        </div>
      ) : null}

      {hookPhase === "uploading" ? (
        <p className="auth-message">
          Upload cancellation is not available while files are uploading. Wait for the current
          batch to finish, then use Cancel Upload to return to idle.
        </p>
      ) : null}
    </Card>
  );
}
