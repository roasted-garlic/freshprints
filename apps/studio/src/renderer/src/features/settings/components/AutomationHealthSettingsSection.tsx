import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import {
  CATALOG_WORKFLOW_MODE_LABELS,
  type CatalogWorkflowMode,
} from "@fresh-prints/shared/constants/catalogWorkflowMode.constants";
import { Badge } from "../../../shared/components/Badge";
import { db } from "../../../config/firebase";
import {
  catalogReprocessService,
  type CatalogReprocessJobListItem,
} from "../services/catalogReprocessService";

interface AutomationHealthSettingsSectionProps {
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
  isLoading: boolean;
}

interface HealthCounters {
  analyzed?: number;
  wouldAutoApprove?: number;
  actuallyAutoApproved?: number;
  verifierInvoked?: number;
  verifierConfirmed?: number;
  verifierUnresolved?: number;
  routedNeedsReview?: number;
  retries?: number;
  failures?: number;
  publicationFailures?: number;
  categoryGap?: number;
  hardBlockerRoutings?: number;
}

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatTrackedCount(value: number | null, trackedSince: string): string {
  if (value === null) {
    return `not tracked yet (${trackedSince})`;
  }
  return String(value);
}

export function AutomationHealthSettingsSection({
  catalogWorkflowMode,
  catalogAutonomousLiveEnabled,
  isLoading,
}: AutomationHealthSettingsSectionProps) {
  const [health, setHealth] = useState<HealthCounters>({});
  const [jobs, setJobs] = useState<CatalogReprocessJobListItem[]>([]);

  useEffect(() => {
    return onSnapshot(doc(db, "settings", "catalogAutomationHealth"), (snapshot) => {
      setHealth((snapshot.data() as HealthCounters | undefined) ?? {});
    });
  }, []);

  useEffect(() => {
    return catalogReprocessService.subscribeRecentJobs(setJobs, () => undefined);
  }, []);

  const rows: Array<[string, string]> = [
    ["Analyzed", formatTrackedCount(asCount(health.analyzed), "WS1+")],
    ["Would auto-approve", formatTrackedCount(asCount(health.wouldAutoApprove), "WS1+")],
    ["Actually auto-approved", formatTrackedCount(asCount(health.actuallyAutoApproved), "WS1+")],
    ["Verifier invoked", formatTrackedCount(asCount(health.verifierInvoked), "WS1+")],
    [
      "Verifier confirmed (confirmable uncertainty only)",
      formatTrackedCount(asCount(health.verifierConfirmed), "WS1+; natural echo-confirm retired"),
    ],
    ["Verifier unresolved", formatTrackedCount(asCount(health.verifierUnresolved), "WS1+")],
    ["Routed to Needs Review", formatTrackedCount(asCount(health.routedNeedsReview), "WS1+")],
    ["Hard-blocker routings", formatTrackedCount(asCount(health.hardBlockerRoutings), "WS1+")],
    ["Retries", formatTrackedCount(asCount(health.retries), "WS1+ enqueue/vision retries")],
    ["Pipeline failures", formatTrackedCount(asCount(health.failures), "WS1+")],
    [
      "Publication failures",
      formatTrackedCount(asCount(health.publicationFailures), "WS1+ Algolia sync"),
    ],
    ["Category-gap cases", formatTrackedCount(asCount(health.categoryGap), "WS1+")],
  ];

  return (
    <section aria-labelledby="automation-health-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="automation-health-title">
          Automation Health
        </h2>
        <p className="settings-section-description">
          Lightweight counters for Catalog Processing Mode and recent reprocessing job state. Not a
          full analytics dashboard. Missing counters mean not tracked yet — not “zero events.”
          Evidence gaps / subject-specificity risks are hard Needs Review blockers (not
          confirmable by re-running the same checks).
        </p>
      </header>

      {isLoading ? (
        <p className="settings-section-status">Loading…</p>
      ) : (
        <div className="settings-form-grid">
          <p className="settings-field-hint">
            Mode:{" "}
            <Badge variant="info">{CATALOG_WORKFLOW_MODE_LABELS[catalogWorkflowMode]}</Badge>{" "}
            Live Autonomous:{" "}
            <Badge variant={catalogAutonomousLiveEnabled ? "success" : "default"}>
              {catalogAutonomousLiveEnabled ? "ON" : "OFF"}
            </Badge>
          </p>
          <ul className="settings-simple-list">
            {rows.map(([label, value]) => (
              <li key={label}>
                {label}: <strong>{value}</strong>
              </li>
            ))}
          </ul>
          <p className="settings-field-hint">
            Recent reprocess jobs:{" "}
            {jobs.length === 0
              ? "none"
              : jobs
                  .slice(0, 3)
                  .map((job) => `${job.targetType}:${job.status}`)
                  .join(", ")}
          </p>
        </div>
      )}
    </section>
  );
}
