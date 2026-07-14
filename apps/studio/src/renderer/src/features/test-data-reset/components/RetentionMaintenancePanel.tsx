import { useCallback, useState } from "react";

import { Button } from "../../../shared/components/Button";
import {
  runArchiveStaleRejectedDesigns,
  runPurgeIdleCustomerUploadFullSize,
  runPurgePromotedDonationFullSize,
} from "../services/retentionMaintenanceService";

type JobKey = "rejectArchive" | "uploadPurge" | "donationPurge";

function confirmMessage(job: JobKey): string {
  switch (job) {
    case "rejectArchive":
      return "Archive rejected designs older than 7 days for real? This cannot be undone from this screen.";
    case "uploadPurge":
      return "Purge idle request-upload full-size files for real? Source and production Storage objects will be deleted.";
    case "donationPurge":
      return "Purge promoted donation full-size files (14-day cool-off) for real? Catalog design assets are kept separately.";
  }
}

export function RetentionMaintenancePanel() {
  const [busyJob, setBusyJob] = useState<JobKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<string | null>(null);

  const runJob = useCallback(async (job: JobKey, dryRun: boolean) => {
    if (!dryRun) {
      const ok = window.confirm(confirmMessage(job));
      if (!ok) {
        return;
      }
    }

    setBusyJob(job);
    setError(null);

    try {
      const result =
        job === "rejectArchive"
          ? await runArchiveStaleRejectedDesigns(dryRun)
          : job === "uploadPurge"
            ? await runPurgeIdleCustomerUploadFullSize(dryRun)
            : await runPurgePromotedDonationFullSize(dryRun);
      setLastOutput(JSON.stringify(result, null, 2));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to run retention job.");
    } finally {
      setBusyJob(null);
    }
  }, []);

  return (
    <section className="card test-data-reset-section">
      <header className="test-data-reset-header">
        <h2 className="test-data-reset-title">Retention maintenance</h2>
        <p className="test-data-reset-copy">
          Run ADR-FP-086 jobs while signed in as owner. Always start with <strong>Dry run</strong>, then{" "}
          <strong>Run for real</strong> if the counts look right.
        </p>
      </header>

      <div className="test-data-reset-columns">
        <div>
          <h3 className="test-data-reset-subtitle">Rejected designs (7-day auto-archive)</h3>
          <p className="test-data-reset-copy">
            Soft-archives designs still on Rejected whose reject clock is older than 7 days.
          </p>
          <div className="test-data-reset-actions">
            <Button
              disabled={busyJob !== null}
              onClick={() => void runJob("rejectArchive", true)}
              type="button"
              variant="secondary"
            >
              {busyJob === "rejectArchive" ? "Running…" : "Dry run"}
            </Button>
            <Button
              disabled={busyJob !== null}
              onClick={() => void runJob("rejectArchive", false)}
              type="button"
              variant="danger"
            >
              Run for real
            </Button>
          </div>
        </div>

        <div>
          <h3 className="test-data-reset-subtitle">Request upload full-size purge</h3>
          <p className="test-data-reset-copy">
            Deletes source + production for eligible print-request uploads (show finished or idle 14 days).
            Keeps thumbnail/preview.
          </p>
          <div className="test-data-reset-actions">
            <Button
              disabled={busyJob !== null}
              onClick={() => void runJob("uploadPurge", true)}
              type="button"
              variant="secondary"
            >
              {busyJob === "uploadPurge" ? "Running…" : "Dry run"}
            </Button>
            <Button
              disabled={busyJob !== null}
              onClick={() => void runJob("uploadPurge", false)}
              type="button"
              variant="danger"
            >
              Run for real
            </Button>
          </div>
        </div>

        <div>
          <h3 className="test-data-reset-subtitle">Promoted donation full-size purge</h3>
          <p className="test-data-reset-copy">
            After promote to AI Review + 14 days, deletes donation upload source + production. Catalog design
            Storage is unchanged. Keeps thumbnail/preview on the upload.
          </p>
          <div className="test-data-reset-actions">
            <Button
              disabled={busyJob !== null}
              onClick={() => void runJob("donationPurge", true)}
              type="button"
              variant="secondary"
            >
              {busyJob === "donationPurge" ? "Running…" : "Dry run"}
            </Button>
            <Button
              disabled={busyJob !== null}
              onClick={() => void runJob("donationPurge", false)}
              type="button"
              variant="danger"
            >
              Run for real
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {lastOutput ? (
        <pre className="test-data-reset-json" tabIndex={0}>
          {lastOutput}
        </pre>
      ) : null}
    </section>
  );
}
