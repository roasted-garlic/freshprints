import { useEffect, useRef, useState } from "react";

import {
  PORTAL_CATALOG_ALGOLIA_ATTRIBUTES_FOR_FACETING,
  PORTAL_CATALOG_ALGOLIA_SEARCHABLE_ATTRIBUTES,
} from "@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { studioAlgoliaCatalogSearchService } from "../../designs/services/studioAlgoliaCatalogSearchService";
import {
  getPortalCatalogAlgoliaReconcileTarget,
  reconcilePortalCatalogAlgoliaIndex,
  type PortalCatalogAlgoliaReconcileTarget,
  type ReconcilePortalCatalogAlgoliaIndexResponse,
} from "../../designs/services/portalCatalogAlgoliaReconcileAdminService";

interface PreviewState {
  targetKey: string;
  response: ReconcilePortalCatalogAlgoliaIndexResponse;
  currentHitCount: number | null;
}

type BusyAction = "preview" | "apply" | null;

function formatRequestError(action: "Preview" | "Apply"): string {
  return `${action} failed. Verify the reviewed production configuration and try again.`;
}

function getTargetKey(target: PortalCatalogAlgoliaReconcileTarget): string {
  return `${target.projectId}|${target.appId}|${target.indexName}|${target.isProductionTarget}|${target.isSearchConfigured}`;
}

function hasFiniteReconcileCounts(response: ReconcilePortalCatalogAlgoliaIndexResponse): boolean {
  return (
    Number.isFinite(response.scanned) &&
    Number.isFinite(response.upserted) &&
    response.scanned >= 0 &&
    response.upserted >= 0
  );
}

function TargetIdentity({ target }: { target: PortalCatalogAlgoliaReconcileTarget }) {
  return (
    <dl className="settings-form-grid">
      <div>
        <dt>Firebase project</dt>
        <dd>
          <code>{target.projectId || "Unavailable"}</code>
        </dd>
      </div>
      <div>
        <dt>Algolia app</dt>
        <dd>
          <code>{target.appId || "Unavailable"}</code>
        </dd>
      </div>
      <div>
        <dt>Algolia index</dt>
        <dd>
          <code>{target.indexName || "Unavailable"}</code>
        </dd>
      </div>
    </dl>
  );
}

export function PortalCatalogAlgoliaReconcileSettingsSection() {
  const { user } = useAuth();
  const canView = permissionService.canViewAdministrativeSettings(user);
  const target = getPortalCatalogAlgoliaReconcileTarget();
  const targetKey = getTargetKey(target);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [applyConfirmed, setApplyConfirmed] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconcilePortalCatalogAlgoliaIndexResponse | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  // Preview authorization is deliberately local to this mounted section. Navigation, remount,
  // reload, or target changes therefore discard it without persisting an APPLY-ready state.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      inFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    setPreview(null);
    setApplyConfirmed(false);
    setResult(null);
    setError(null);
  }, [targetKey]);

  if (!canView) {
    return null;
  }

  const previewIsCurrent =
    target.isProductionTarget &&
    preview?.targetKey === targetKey &&
    preview.response.dryRun === true &&
    preview.response.cleared === false &&
    hasFiniteReconcileCounts(preview.response);
  const isBusy = busyAction !== null;

  async function handlePreview() {
    if (!target.isProductionTarget || inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setBusyAction("preview");
    setError(null);
    setResult(null);
    setPreview(null);
    setApplyConfirmed(false);
    try {
      const response = await reconcilePortalCatalogAlgoliaIndex({ dryRun: true });
      if (!response.dryRun || response.cleared || !hasFiniteReconcileCounts(response)) {
        throw new Error("Unexpected non-dry-run response.");
      }
      let currentHitCount: number | null = null;
      if (target.isSearchConfigured) {
        currentHitCount = await studioAlgoliaCatalogSearchService.getCurrentIndexHitCount();
      }
      if (!mountedRef.current) {
        return;
      }
      const latestTarget = getPortalCatalogAlgoliaReconcileTarget();
      if (getTargetKey(latestTarget) !== targetKey || !latestTarget.isProductionTarget) {
        setPreview(null);
        setApplyConfirmed(false);
        setError("The reviewed production target changed. Run a fresh Preview.");
        return;
      }
      setPreview({ targetKey, response, currentHitCount });
    } catch {
      if (mountedRef.current) {
        setPreview(null);
        setApplyConfirmed(false);
        setError(formatRequestError("Preview"));
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  }

  async function handleApply() {
    if (!previewIsCurrent || !applyConfirmed || inFlightRef.current) {
      return;
    }
    const latestTarget = getPortalCatalogAlgoliaReconcileTarget();
    if (getTargetKey(latestTarget) !== targetKey || !latestTarget.isProductionTarget) {
      setPreview(null);
      setApplyConfirmed(false);
      setError("The reviewed production target changed. Run a fresh Preview.");
      return;
    }
    inFlightRef.current = true;
    setBusyAction("apply");
    setError(null);
    setResult(null);
    try {
      const response = await reconcilePortalCatalogAlgoliaIndex({ dryRun: false });
      if (response.dryRun || !response.cleared || !hasFiniteReconcileCounts(response)) {
        throw new Error("Unexpected APPLY response.");
      }
      if (!mountedRef.current) {
        return;
      }
      setResult(response);
      // Require a new Preview before another APPLY, even after success.
      setPreview(null);
      setApplyConfirmed(false);
    } catch {
      if (mountedRef.current) {
        setResult(null);
        setPreview(null);
        setApplyConfirmed(false);
        setError(formatRequestError("Apply"));
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  }

  return (
    <section aria-labelledby="portal-catalog-algolia-reconcile-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="portal-catalog-algolia-reconcile-title">
          Algolia Reconcile
        </h2>
        <p className="settings-section-description">
          Owner/admin-only production catalog reconciliation. Preview is read-only; Apply clears and
          rebuilds the reviewed Portal catalog index from Ready Firestore designs.
        </p>
      </header>

      <div className="settings-form-grid">
        <div className="settings-control-item">
          <h3 className="settings-subsection-title">Reviewed production target</h3>
          <TargetIdentity target={target} />
          {target.isProductionTarget ? (
            <p className="settings-field-hint">
              <Badge variant="success">Target verified</Badge>
            </p>
          ) : (
            <p className="auth-message auth-message-error" role="alert">
              This build is not configured for the reviewed production target. Preview and Apply are
              disabled.
            </p>
          )}
        </div>

        <div className="settings-control-item">
          <h3 className="settings-subsection-title">Proposed APPLY contract</h3>
          <p className="settings-field-hint">
            These are the deterministic post-APPLY settings contract, not a live-settings read. Legacy
            tag fields are intentionally absent.
          </p>
          <p className="settings-field-hint">
            Searchable attributes: <code>{PORTAL_CATALOG_ALGOLIA_SEARCHABLE_ATTRIBUTES.join(", ")}</code>
          </p>
          <p className="settings-field-hint">
            Facets: <code>{PORTAL_CATALOG_ALGOLIA_ATTRIBUTES_FOR_FACETING.join(", ")}</code>
          </p>
        </div>

        <div className="settings-form-actions">
          <Button
            disabled={!target.isProductionTarget || isBusy}
            onClick={() => void handlePreview()}
            variant="secondary"
          >
            {busyAction === "preview" ? "Previewing…" : "Preview (read-only)"}
          </Button>
        </div>

        {preview ? (
          <div className="settings-control-item" role="status">
            <h3 className="settings-subsection-title">Current Preview</h3>
            <p className="settings-field-hint">
              Firestore Ready designs scanned: <strong>{preview.response.scanned}</strong> · proposed
              records: <strong>{preview.response.upserted}</strong>
            </p>
            <p className="settings-field-hint">
              Current Algolia hits: <strong>{preview.currentHitCount ?? "Unavailable"}</strong> (search-only
              <code>nbHits</code>)
            </p>
            <p className="settings-field-hint">
              Preview is current for this target. Apply remains a separate destructive operation.
            </p>
            <div className="form-field">
              <span className="form-label">Explicit Apply confirmation</span>
              <span className="form-checkbox">
                <input
                  checked={applyConfirmed}
                  disabled={isBusy}
                  id="portal-catalog-algolia-apply-confirmation"
                  onChange={(event) => setApplyConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <label htmlFor="portal-catalog-algolia-apply-confirmation">
                  I understand Apply clears and rebuilds the reviewed production index.
                </label>
              </span>
            </div>
            <div className="settings-form-actions">
              <Button
                disabled={!previewIsCurrent || !applyConfirmed || isBusy}
                onClick={() => void handleApply()}
                variant="danger"
              >
                {busyAction === "apply" ? "Applying…" : "Apply reconcile"}
              </Button>
            </div>
          </div>
        ) : null}

        {result ? (
          <p className="settings-section-status" role="status">
            Apply complete: scanned {result.scanned}, upserted {result.upserted}; index cleared and rebuilt.
            Run a fresh Preview for another operation.
          </p>
        ) : null}

        {error ? (
          <p className="auth-message auth-message-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
