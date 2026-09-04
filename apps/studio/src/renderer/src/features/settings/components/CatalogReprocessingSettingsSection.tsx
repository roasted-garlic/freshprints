import { useEffect, useState } from "react";

import {
  CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT,
  CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT,
  CATALOG_REPROCESS_TARGET_TYPES,
  catalogReprocessTargetLabel,
  type CatalogReprocessTargetType,
} from "@fresh-prints/shared/constants/catalogReprocess.constants";
import {
  CATALOG_WORKFLOW_MODE_LABELS,
  type CatalogWorkflowMode,
} from "@fresh-prints/shared/constants/catalogWorkflowMode.constants";
import type { PreviewCatalogReprocessJobResponse } from "@fresh-prints/shared/types/admin/catalogReprocess.types";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import {
  catalogReprocessService,
  type CatalogReprocessJobListItem,
} from "../services/catalogReprocessService";

interface CatalogReprocessingSettingsSectionProps {
  catalogWorkflowMode?: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled?: boolean;
}

export function CatalogReprocessingSettingsSection({
  catalogWorkflowMode = "manual",
  catalogAutonomousLiveEnabled = false,
}: CatalogReprocessingSettingsSectionProps) {
  const { user } = useAuth();
  const canManage = permissionService.canManageCatalogReprocessing(user);
  const environment = catalogReprocessService.getEnvironment();
  const [jobs, setJobs] = useState<CatalogReprocessJobListItem[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [previewByTarget, setPreviewByTarget] = useState<
    Partial<Record<CatalogReprocessTargetType, PreviewCatalogReprocessJobResponse>>
  >({});
  const [phraseByTarget, setPhraseByTarget] = useState<
    Partial<Record<CatalogReprocessTargetType, string>>
  >({});
  const [canaryIdsByTarget, setCanaryIdsByTarget] = useState<
    Partial<Record<CatalogReprocessTargetType, string>>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyTarget, setBusyTarget] = useState<CatalogReprocessTargetType | null>(null);

  useEffect(() => {
    if (!canManage) {
      return;
    }
    return catalogReprocessService.subscribeRecentJobs(setJobs, setJobsError);
  }, [canManage]);

  async function handlePreview(targetType: CatalogReprocessTargetType) {
    setBusyTarget(targetType);
    setActionError(null);
    try {
      const preview = await catalogReprocessService.preview(targetType);
      setPreviewByTarget((prev) => ({ ...prev, [targetType]: preview }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setBusyTarget(null);
    }
  }

  async function handleStart(targetType: CatalogReprocessTargetType) {
    const phrase = phraseByTarget[targetType]?.trim() ?? "";
    const canaryRaw = canaryIdsByTarget[targetType]?.trim() ?? "";
    const canaryDesignIds =
      targetType === "ready_catalog" && canaryRaw
        ? canaryRaw
            .split(/[\s,]+/)
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined;
    setBusyTarget(targetType);
    setActionError(null);
    try {
      await catalogReprocessService.start({
        targetType,
        confirmationPhrase: phrase,
        ...(canaryDesignIds?.length ? { canaryDesignIds } : {}),
      });
      setPhraseByTarget((prev) => ({ ...prev, [targetType]: "" }));
      const preview = await catalogReprocessService.preview(targetType);
      setPreviewByTarget((prev) => ({ ...prev, [targetType]: preview }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Start failed.");
    } finally {
      setBusyTarget(null);
    }
  }

  async function handlePause(jobId: string) {
    setActionError(null);
    try {
      await catalogReprocessService.pause(jobId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Pause failed.");
    }
  }

  async function handleResume(jobId: string) {
    setActionError(null);
    try {
      await catalogReprocessService.resume(jobId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Resume failed.");
    }
  }

  async function handleRetryFailures(jobId: string) {
    setActionError(null);
    try {
      await catalogReprocessService.retryFailures(jobId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Retry failures failed.");
    }
  }

  return (
    <section aria-labelledby="catalog-reprocessing-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="catalog-reprocessing-title">
          Catalog Reprocessing
        </h2>
        <p className="settings-section-description">
          Owner-only durable bulk reprocessing. Jobs continue on the server if Studio disconnects.
          Start requires Shadow mode and live Autonomous OFF when the target is enabled.
        </p>
      </header>

      <div className="settings-form-grid">
        <p className="settings-field-hint">
          Environment:{" "}
          <Badge variant={environment.isProduction ? "danger" : "info"}>
            {environment.environmentLabel}
          </Badge>{" "}
          <code>{environment.projectId}</code>
        </p>
        <p className="settings-field-hint">
          Catalog Processing Mode:{" "}
          <Badge variant="info">{CATALOG_WORKFLOW_MODE_LABELS[catalogWorkflowMode]}</Badge>
          {" · "}
          Live Autonomous:{" "}
          <Badge variant={catalogAutonomousLiveEnabled ? "danger" : "info"}>
            {catalogAutonomousLiveEnabled ? "ON" : "OFF"}
          </Badge>
        </p>

        {!canManage ? (
          <p className="settings-section-status">
            Only the owner can preview or start Catalog Reprocessing.
          </p>
        ) : (
          CATALOG_REPROCESS_TARGET_TYPES.map((targetType: CatalogReprocessTargetType) => {
            const enabled = catalogReprocessService.isTargetEnabled(targetType);
            const preview = previewByTarget[targetType];
            const requiredPhrase = catalogReprocessService.requiredPhrase(targetType);
            const phrase = phraseByTarget[targetType] ?? "";
            const startAllowed =
              enabled &&
              catalogWorkflowMode === "shadow" &&
              !catalogAutonomousLiveEnabled &&
              phrase === requiredPhrase;

            return (
              <div className="settings-control-item" key={targetType}>
                <h3 className="settings-subsection-title">
                  Reprocess {catalogReprocessTargetLabel(targetType)}
                </h3>
                {!enabled ? (
                  <>
                    <Button disabled type="button" variant="secondary">
                      Start (unavailable)
                    </Button>
                    <p className="settings-field-hint">
                      {catalogReprocessService.unavailableReason(targetType)}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="settings-control-grid">
                      <Button
                        disabled={busyTarget === targetType}
                        onClick={() => void handlePreview(targetType)}
                        type="button"
                        variant="secondary"
                      >
                        Preview
                      </Button>
                      <Button
                        disabled={!startAllowed || busyTarget === targetType}
                        onClick={() => void handleStart(targetType)}
                        type="button"
                        variant="primary"
                      >
                        Start
                      </Button>
                    </div>
                    <label className="form-field">
                      <span className="form-label">Confirmation phrase</span>
                      <input
                        className="form-input"
                        onChange={(event) =>
                          setPhraseByTarget((prev) => ({
                            ...prev,
                            [targetType]: event.target.value,
                          }))
                        }
                        placeholder={requiredPhrase}
                        type="text"
                        value={phrase}
                      />
                    </label>
                    <p className="settings-field-hint">
                      Type exactly <code>{requiredPhrase}</code>. Server also requires Shadow mode
                      and live Autonomous OFF.
                    </p>
                    {targetType === "ready_catalog" && enabled ? (
                      <label className="form-field">
                        <span className="form-label">
                          Canary design IDs (optional, comma-separated)
                        </span>
                        <input
                          className="form-input"
                          onChange={(event) =>
                            setCanaryIdsByTarget((prev) => ({
                              ...prev,
                              [targetType]: event.target.value,
                            }))
                          }
                          placeholder="2–3 Ready design IDs for bounded canary Start"
                          type="text"
                          value={canaryIdsByTarget[targetType] ?? ""}
                        />
                      </label>
                    ) : null}
                    {preview ? (
                      <div className="settings-field-hint" role="status">
                        <p>
                          Eligible: <strong>{preview.eligibleCount}</strong>
                          {preview.activeJobId
                            ? ` · Active job: ${preview.activeJobId}`
                            : " · No active job"}
                        </p>
                        {preview.inventory ? (
                          <>
                            <p>
                              Already current ({CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT}/
                              {CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT}):{" "}
                              {preview.inventory.alreadyCurrentPipelineCount} · Missing profile:{" "}
                              {preview.inventory.missingProfileCount}
                            </p>
                            <p>
                              Notes: {preview.inventory.aiReviewNotes.designsWithNonEmptyNotes}{" "}
                              non-empty / {preview.inventory.aiReviewNotes.designsScanned} scanned →{" "}
                              <code>{preview.inventory.aiReviewNotes.recommendation}</code>
                            </p>
                          </>
                        ) : null}
                        {preview.readyInventory ? (
                          <>
                            <p>
                              Already current ({CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT}/
                              {CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT}):{" "}
                              {preview.readyInventory.alreadyCurrentPipelineCount} · Missing profile:{" "}
                              {preview.readyInventory.missingProfileCount}
                            </p>
                            <p>
                              Tag density — zero: {preview.readyInventory.tagDensityBuckets.zeroTags}{" "}
                              · low: {preview.readyInventory.tagDensityBuckets.lowTags} · high:{" "}
                              {preview.readyInventory.tagDensityBuckets.highTags}
                            </p>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })
        )}

        {actionError ? (
          <p className="form-error" role="alert">
            {actionError}
          </p>
        ) : null}

        {canManage ? (
          <div className="settings-control-item">
            <h3 className="settings-subsection-title">Recent jobs</h3>
            {jobsError ? (
              <p className="form-error" role="alert">
                {jobsError}
              </p>
            ) : null}
            {jobs.length === 0 ? (
              <p className="settings-section-status">No Catalog Reprocessing jobs yet.</p>
            ) : (
              <ul className="settings-simple-list">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <code>{job.id}</code> — {job.targetType} — {job.status} — processed{" "}
                    {job.processed}/{job.totalEligible}
                    {job.status === "running" || job.status === "pending" ? (
                      <>
                        {" "}
                        <Button
                          onClick={() => void handlePause(job.id)}
                          type="button"
                          variant="secondary"
                        >
                          Pause
                        </Button>
                      </>
                    ) : null}
                    {job.status === "paused" ? (
                      <>
                        {" "}
                        <Button
                          onClick={() => void handleResume(job.id)}
                          type="button"
                          variant="secondary"
                        >
                          Resume
                        </Button>
                      </>
                    ) : null}
                    {(job.status === "completed" || job.status === "failed" || job.status === "paused") &&
                    (job.failed ?? 0) > 0 ? (
                      <>
                        {" "}
                        <Button
                          onClick={() => void handleRetryFailures(job.id)}
                          type="button"
                          variant="secondary"
                        >
                          Retry failures
                        </Button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
