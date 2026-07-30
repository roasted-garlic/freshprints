import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "../../../shared/components/Button";
import {
  runInventoryCatalogImageStorage,
  type InventoryCatalogImageStorageResponse,
} from "../services/catalogImageStorageInventoryService";

/**
 * Goal #12 dev-only tool: runs the already-deployed, dry-run-only `inventoryCatalogImageStorage`
 * callable and displays the JSON result for copy-out. Read-only — this panel has no delete,
 * migration, backfill, or cleanup action of any kind. Mirrors `RetentionMaintenancePanel.tsx`'s
 * exact structure (same page, same owner+dev gating already applied by the parent
 * `TestDataResetPage`, same Button/error/result conventions).
 */
export function CatalogImageStorageInventoryPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InventoryCatalogImageStorageResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const runInventory = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setCopied(false);

    try {
      const response = await runInventoryCatalogImageStorage();
      setResult(response);
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "Unable to run the catalog Storage inventory.",
      );
    } finally {
      setIsRunning(false);
    }
  }, []);

  const copyJson = useCallback(async () => {
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [result]);

  return (
    <section className="card test-data-reset-section">
      <header className="test-data-reset-header">
        <h2 className="test-data-reset-title">Run Catalog Storage Inventory</h2>
        <p className="test-data-reset-copy">
          Goal #12 dry-run-only tool. Lists Storage object counts/bytes by path family
          (originals/thumbnails/previews/display/generated assets) and classifies each object
          (referenced, orphaned candidate, purged-per-policy violation, promotion cool-off
          duplicate) against Firestore. Read-only — never deletes or modifies anything.
        </p>
      </header>

      <div className="test-data-reset-actions">
        <Button disabled={isRunning} onClick={() => void runInventory()} type="button" variant="secondary">
          {isRunning ? "Running…" : "Run Catalog Storage Inventory"}
        </Button>
        {result ? (
          <button
            aria-label="Copy Inventory JSON"
            className="icon-button icon-button-sm icon-button-ghost"
            onClick={() => void copyJson()}
            type="button"
          >
            {copied ? (
              <>
                <Check aria-hidden="true" size={15} strokeWidth={2.2} /> Copied
              </>
            ) : (
              <>
                <Copy aria-hidden="true" size={15} strokeWidth={2.2} /> Copy Inventory JSON
              </>
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="test-data-reset-result" role="status">
          <h3 className="test-data-reset-subtitle">Last inventory result</h3>
          <p className="test-data-reset-copy">
            Scanned {result.designsScanned} design doc{result.designsScanned === 1 ? "" : "s"} and{" "}
            {result.promotionsScanned} promotion record{result.promotionsScanned === 1 ? "" : "s"}.
            Total objects: {result.report.summary.totalObjects} (
            {(result.report.summary.totalBytes / 1024).toFixed(1)} KB). Referenced:{" "}
            {result.report.summary.referencedCount}, orphaned candidates:{" "}
            {result.report.summary.orphanedCandidateCount}, purge-policy violations:{" "}
            {result.report.summary.purgedPerPolicyViolationCount}, promotion cool-off duplicates:{" "}
            {result.report.summary.promotionCoolOffDuplicateCount}, missing objects:{" "}
            {result.report.summary.missingObjectCount}.
          </p>
          {result.truncatedFamilies.length > 0 ? (
            <p className="form-error" role="alert">
              Truncated families (more objects exist than one page returned — re-run or extend the
              callable's pagination before trusting these totals as complete): {result.truncatedFamilies.join(", ")}
            </p>
          ) : null}
          <pre className="test-data-reset-json" tabIndex={0}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
