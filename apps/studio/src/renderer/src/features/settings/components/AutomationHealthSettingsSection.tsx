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
  categoryGap?: number;
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

  const rows: Array<[string, number]> = [
    ["Analyzed", asCount(health.analyzed)],
    ["Would auto-approve", asCount(health.wouldAutoApprove)],
    ["Actually auto-approved", asCount(health.actuallyAutoApproved)],
    ["Verifier invoked", asCount(health.verifierInvoked)],
    ["Verifier confirmed", asCount(health.verifierConfirmed)],
    ["Verifier unresolved", asCount(health.verifierUnresolved)],
    ["Routed to Needs Review", asCount(health.routedNeedsReview)],
    ["Retries", asCount(health.retries)],
    ["Failures", asCount(health.failures)],
    ["Category-gap cases", asCount(health.categoryGap)],
  ];

  return (
    <section aria-labelledby="automation-health-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="automation-health-title">
          Automation Health
        </h2>
        <p className="settings-section-description">
          Lightweight counters for Catalog Processing Mode and recent reprocessing job state. Not a
          full analytics dashboard.
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
