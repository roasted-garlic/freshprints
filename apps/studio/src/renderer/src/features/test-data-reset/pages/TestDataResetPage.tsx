import { Check, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  OPERATIONAL_WIPE_CONFIRMATION_PHRASE,
  type OperationalWipeTarget,
  type WipeOperationalTestDataResponse,
} from "@fresh-prints/shared/types/admin/wipeOperationalTestData.types";
import {
  ALL_OPERATIONAL_WIPE_TARGETS,
  applyOperationalWipeTargetToggle,
  CUSTOM_REQUESTS_WIPE_PRESET_TARGETS,
  CUSTOMER_UPLOADS_WIPE_PRESET_TARGETS,
  DESIGNS_WIPE_PRESET_TARGETS,
  ETSY_WIPE_PRESET_TARGETS,
  EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS,
  PRINT_REQUESTS_WIPE_PRESET_TARGETS,
} from "@fresh-prints/shared/utils/operationalWipeTargets";

import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import {
  clearLegacyStaffInboxAckLocalStorage,
} from "../../staff-inbox/services/staffInboxAckLegacyLocalStore";
import { RetentionMaintenancePanel } from "../components/RetentionMaintenancePanel";
import { TestDataResetErrorBoundary } from "../components/TestDataResetErrorBoundary";
import { OPERATIONAL_WIPE_TARGET_OPTIONS } from "../constants/wipeTargetOptions";
import { wipeOperationalTestData } from "../services/wipeOperationalTestDataService";
import {
  getStudioFirebaseProjectId,
  isOperationalWipeUiEnabled,
} from "../utils/operationalWipeUiGate";

type ConfirmStep = "closed" | "designsWarning" | "phrase";

function TestDataResetPageContent() {
  const { user } = useAuth();
  const canWipe = permissionService.canWipeOperationalTestData(user);
  const wipeUiEnabled = isOperationalWipeUiEnabled();
  const projectId = getStudioFirebaseProjectId();

  const [selectedTargets, setSelectedTargets] = useState<OperationalWipeTarget[]>([
    ...PRINT_REQUESTS_WIPE_PRESET_TARGETS,
  ]);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("closed");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [acknowledgeDesignCatalogWipe, setAcknowledgeDesignCatalogWipe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WipeOperationalTestDataResponse | null>(null);
  const [phraseCopied, setPhraseCopied] = useState(false);

  const copyConfirmationPhrase = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(OPERATIONAL_WIPE_CONFIRMATION_PHRASE);
      setPhraseCopied(true);
      window.setTimeout(() => setPhraseCopied(false), 1500);
    } catch {
      setPhraseCopied(false);
    }
  }, []);

  const shellHeaderConfig = useMemo(
    () => ({
      title: "Test Data Reset",
      description:
        "Selectively wipe operational Firestore data for scratch testing on the allowlisted project.",
    }),
    [],
  );
  useShellHeaderConfig(shellHeaderConfig);

  const phraseMatches = confirmationPhrase.trim() === OPERATIONAL_WIPE_CONFIRMATION_PHRASE;
  const hasSelection = selectedTargets.length > 0;
  const includesDesigns = selectedTargets.includes("designs");

  const selectedSummary = useMemo(() => {
    return OPERATIONAL_WIPE_TARGET_OPTIONS.filter((option) => selectedTargets.includes(option.id)).map(
      (option) => option.label,
    );
  }, [selectedTargets]);

  const openConfirm = useCallback(() => {
    setError(null);
    setConfirmationPhrase("");
    setAcknowledgeDesignCatalogWipe(false);

    if (includesDesigns) {
      setConfirmStep("designsWarning");
      return;
    }

    setConfirmStep("phrase");
  }, [includesDesigns]);

  const closeConfirm = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setConfirmStep("closed");
    setConfirmationPhrase("");
    setAcknowledgeDesignCatalogWipe(false);
    setPhraseCopied(false);
  }, [isSubmitting]);

  const continueFromDesignsWarning = useCallback(() => {
    setAcknowledgeDesignCatalogWipe(true);
    setConfirmationPhrase("");
    setConfirmStep("phrase");
  }, []);

  const runWipe = useCallback(async () => {
    if (!phraseMatches || !hasSelection) {
      return;
    }

    if (includesDesigns && !acknowledgeDesignCatalogWipe) {
      setError("Acknowledge the design catalog wipe confirmation before continuing.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await wipeOperationalTestData({
        confirmationPhrase: OPERATIONAL_WIPE_CONFIRMATION_PHRASE,
        targets: selectedTargets,
        acknowledgeDesignCatalogWipe: includesDesigns ? true : undefined,
      });

      // Firestore wipe deletes staffInboxAcks; clear any leftover legacy localStorage key.
      if (user?.id) {
        clearLegacyStaffInboxAckLocalStorage(user.id);
      }

      // Generated gang sheet PNGs live only on this machine — clear them when queue data is wiped.
      const clearsLocalGangSheetCache =
        selectedTargets.includes("printRequests") ||
        selectedTargets.includes("showQueueAttachments") ||
        selectedTargets.includes("upcomingShows");

      if (clearsLocalGangSheetCache && window.freshPrints?.export?.clearAllGangSheetCache) {
        try {
          await window.freshPrints.export.clearAllGangSheetCache();
        } catch {
          // Best-effort; Firestore wipe already succeeded.
        }
      }

      setLastResult(result);
      setConfirmStep("closed");
      setConfirmationPhrase("");
      setAcknowledgeDesignCatalogWipe(false);
      setPhraseCopied(false);
    } catch (wipeError) {
      setError(wipeError instanceof Error ? wipeError.message : "Unable to wipe test data.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    acknowledgeDesignCatalogWipe,
    hasSelection,
    includesDesigns,
    phraseMatches,
    selectedTargets,
    user?.id,
  ]);

  if (!wipeUiEnabled) {
    return (
      <main className="page-layout page-layout-shell test-data-reset-page">
        <section className="card test-data-reset-section">
          <h2 className="test-data-reset-title">Not available on this project</h2>
          <p className="test-data-reset-copy">
            Test Data Reset is only enabled for allowlisted development projects (currently{" "}
            <code>fresh-prints-dev</code>). This Studio build is connected to <code>{projectId || "unknown"}</code>.
          </p>
        </section>
      </main>
    );
  }

  if (!canWipe) {
    return (
      <main className="page-layout page-layout-shell test-data-reset-page">
        <section className="card test-data-reset-section">
          <h2 className="test-data-reset-title">Owner access required</h2>
          <p className="test-data-reset-copy">Only owners can wipe operational test data.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-layout page-layout-shell test-data-reset-page">
      <RetentionMaintenancePanel />

      <section className="card test-data-reset-section test-data-reset-danger">
        <header className="test-data-reset-header">
          <h2 className="test-data-reset-title">Operational wipe</h2>
          <p className="test-data-reset-copy">
            Project <code>{projectId}</code>. Permanently deletes selected operational data. Accounts,
            categories, tags, and settings are kept. Use presets for common groups; expand a target for the
            full delete list.
          </p>
        </header>

        <details className="test-data-reset-help">
          <summary>What stays vs what presets cover</summary>
          <div className="test-data-reset-columns">
            <div>
              <h3 className="test-data-reset-subtitle">Always kept</h3>
              <ul className="test-data-reset-list">
                <li>Auth accounts, users, customers, usernames</li>
                <li>Categories and tags</li>
                <li>Settings (AI, email providers, show queue)</li>
              </ul>
            </div>
            <div>
              <h3 className="test-data-reset-subtitle">Preset notes</h3>
              <ul className="test-data-reset-list">
                <li>Print Requests — keeps upcoming shows; clears inbox acks</li>
                <li>Custom Requests — also clears acks, notifications, email jobs</li>
                <li>Etsy — also clears overlays, suggestion requests, inert leftovers</li>
                <li>Designs + prints — extra catalog confirm, then phrase</li>
                <li>All (-) Designs — all ops targets; keeps catalog + design Storage</li>
              </ul>
            </div>
          </div>
        </details>

        <div className="test-data-reset-presets">
          <Button
            onClick={() => setSelectedTargets([...PRINT_REQUESTS_WIPE_PRESET_TARGETS])}
            type="button"
            variant="secondary"
          >
            Print Requests
          </Button>
          <Button
            onClick={() => setSelectedTargets([...ETSY_WIPE_PRESET_TARGETS])}
            type="button"
            variant="secondary"
          >
            Etsy
          </Button>
          <Button
            onClick={() => setSelectedTargets([...CUSTOM_REQUESTS_WIPE_PRESET_TARGETS])}
            type="button"
            variant="secondary"
          >
            Custom Requests
          </Button>
          <Button
            onClick={() => setSelectedTargets([...CUSTOMER_UPLOADS_WIPE_PRESET_TARGETS])}
            type="button"
            variant="secondary"
          >
            Customer Uploads
          </Button>
          <Button
            onClick={() => setSelectedTargets([...DESIGNS_WIPE_PRESET_TARGETS])}
            type="button"
            variant="secondary"
          >
            Designs + prints
          </Button>
          <Button
            onClick={() => setSelectedTargets([...EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS])}
            type="button"
            variant="secondary"
          >
            All (-) Designs
          </Button>
          <Button
            onClick={() => setSelectedTargets([...ALL_OPERATIONAL_WIPE_TARGETS])}
            type="button"
            variant="secondary"
          >
            Select all
          </Button>
          <Button onClick={() => setSelectedTargets([])} type="button" variant="ghost">
            Clear
          </Button>
        </div>

        <fieldset className="test-data-reset-targets">
          <legend className="test-data-reset-subtitle">Targets</legend>
          {OPERATIONAL_WIPE_TARGET_OPTIONS.map((option) => (
            <div className="test-data-reset-target" key={option.id}>
              <Checkbox
                checked={selectedTargets.includes(option.id)}
                id={`wipe-target-${option.id}`}
                label={option.label}
                name={`wipe-target-${option.id}`}
                onChange={(event) => {
                  try {
                    // Capture before setState — currentTarget can be null inside async updaters.
                    const checked = event.currentTarget.checked;
                    setSelectedTargets((current) =>
                      applyOperationalWipeTargetToggle(current, option.id, checked),
                    );
                    setError(null);
                  } catch (toggleError) {
                    setError(
                      toggleError instanceof Error
                        ? toggleError.message
                        : "Unable to update wipe target selection.",
                    );
                  }
                }}
              />
              <p className="test-data-reset-target-summary">{option.summary}</p>
              <details className="test-data-reset-target-details">
                <summary>What this deletes</summary>
                <p className="test-data-reset-target-description">{option.description}</p>
              </details>
            </div>
          ))}
        </fieldset>

        {error && confirmStep === "closed" ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {lastResult ? (
          <div className="test-data-reset-result" role="status">
            <h3 className="test-data-reset-subtitle">Last wipe result</h3>
            <p className="test-data-reset-copy">
              Targets:{" "}
              {(Array.isArray(lastResult.targets) ? lastResult.targets : []).join(", ") || "(none)"}
            </p>
            <ul className="test-data-reset-list">
              {Object.entries(
                lastResult.deleted && typeof lastResult.deleted === "object"
                  ? lastResult.deleted
                  : {},
              ).map(([collectionName, count]) => (
                <li key={collectionName}>
                  {collectionName}: {count} deleted
                </li>
              ))}
              {(Array.isArray(lastResult.targets) ? lastResult.targets : []).includes("sequences") ||
              (Array.isArray(lastResult.targets) ? lastResult.targets : []).includes(
                "printRequests",
              ) ||
              lastResult.internalSequenceReset ? (
                <>
                  <li>
                    Customer request sequences reset to 1: {lastResult.customersReset ?? 0} customer
                    {(lastResult.customersReset ?? 0) === 1 ? "" : "s"} (totalPrintRequests set to 0)
                  </li>
                  <li>
                    Internal counters/printRequests document:{" "}
                    {lastResult.internalSequenceReset === false ? "not removed" : "deleted"}
                  </li>
                </>
              ) : null}
              {(lastResult.designsRequestStatsReset ?? 0) > 0 ? (
                <li>Design request stats reset: {lastResult.designsRequestStatsReset}</li>
              ) : null}
              {(lastResult.showsAllocationTotalsReset ?? 0) > 0 ||
              (Array.isArray(lastResult.targets) ? lastResult.targets : []).includes(
                "printRequests",
              ) ||
              (Array.isArray(lastResult.targets) ? lastResult.targets : []).includes(
                "showQueueAttachments",
              ) ? (
                <li>
                  Upcoming show allocatedQuantity zeroed: {lastResult.showsAllocationTotalsReset ?? 0}{" "}
                  show
                  {(lastResult.showsAllocationTotalsReset ?? 0) === 1 ? "" : "s"}
                  {" "}(productionStatus full → open when applicable)
                </li>
              ) : null}
              {(lastResult.storageFilesDeleted ?? 0) > 0 ||
              (Array.isArray(lastResult.targets) ? lastResult.targets : []).includes("designs") ||
              (Array.isArray(lastResult.targets) ? lastResult.targets : []).includes(
                "customerUploads",
              ) ? (
                <li>Storage files deleted: {lastResult.storageFilesDeleted ?? 0}</li>
              ) : null}
            </ul>
            <p className="test-data-reset-copy">
              Reload Studio and Portal pages so lists refresh. Staff inbox Done history (`staffInboxAcks`)
              is cleared in Firestore when print requests, show-queue attachments, or upcoming shows are
              wiped.
            </p>
          </div>
        ) : null}

        <div className="test-data-reset-actions">
          <Button disabled={!hasSelection || isSubmitting} onClick={openConfirm} type="button" variant="danger">
            Wipe selected…
          </Button>
        </div>
      </section>

      {confirmStep === "designsWarning" ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="test-data-reset-designs-title"
            className="modal-panel modal-panel-md test-data-reset-confirm-modal"
            role="dialog"
          >
            <ModalHeader>
              <h2 id="test-data-reset-designs-title">Wipe the design catalog?</h2>
            </ModalHeader>
            <ModalBody>
              <p className="test-data-reset-copy">
                You selected <strong>Designs</strong>. This permanently deletes:
              </p>
              <ul className="test-data-reset-list">
                <li>Every design document in Firestore</li>
                <li>Storage originals, thumbnails, and previews</li>
                <li>Print Requests (required first — already included)</li>
              </ul>
              <p className="test-data-reset-copy">
                Categories, tags, accounts, and settings are kept. This cannot be undone.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button onClick={closeConfirm} type="button" variant="secondary">
                Cancel
              </Button>
              <Button onClick={continueFromDesignsWarning} type="button" variant="danger">
                Continue to final confirm
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      {confirmStep === "phrase" ? (
        <div className="modal-overlay modal-overlay-blur">
          <Modal
            aria-labelledby="test-data-reset-confirm-title"
            className="modal-panel modal-panel-md test-data-reset-confirm-modal"
            role="dialog"
          >
            <ModalHeader>
              <h2 id="test-data-reset-confirm-title">Confirm operational wipe</h2>
            </ModalHeader>
            <ModalBody>
              <p className="test-data-reset-copy">
                This cannot be undone. Project <code>{projectId}</code>.
              </p>
              <p className="test-data-reset-copy">
                Selected: <strong>{selectedSummary.join(", ") || "none"}</strong>
              </p>
              {includesDesigns ? (
                <p className="test-data-reset-copy">
                  Design catalog wipe was acknowledged. Storage originals/thumbnails/previews will be deleted.
                </p>
              ) : null}
              <label className="form-field" htmlFor="test-data-reset-confirm-input">
                <span className="form-label test-data-reset-confirm-phrase-label">
                  <span>
                    Type <code>{OPERATIONAL_WIPE_CONFIRMATION_PHRASE}</code> to confirm
                  </span>
                  <button
                    aria-label="Copy confirmation phrase"
                    className="icon-button icon-button-sm icon-button-ghost"
                    disabled={isSubmitting}
                    onClick={(event) => {
                      event.preventDefault();
                      void copyConfirmationPhrase();
                    }}
                    type="button"
                  >
                    {phraseCopied ? (
                      <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                    ) : (
                      <Copy aria-hidden="true" size={15} strokeWidth={2.2} />
                    )}
                  </button>
                </span>
                <input
                  autoComplete="off"
                  className="form-input"
                  disabled={isSubmitting}
                  id="test-data-reset-confirm-input"
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setConfirmationPhrase(value);
                  }}
                  spellCheck={false}
                  type="text"
                  value={confirmationPhrase}
                />
              </label>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button disabled={isSubmitting} onClick={closeConfirm} type="button" variant="secondary">
                Cancel
              </Button>
              <Button
                disabled={!phraseMatches || isSubmitting}
                onClick={() => void runWipe()}
                type="button"
                variant="danger"
              >
                {isSubmitting ? "Wiping…" : "Wipe now"}
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}
    </main>
  );
}

export function TestDataResetPage() {
  return (
    <TestDataResetErrorBoundary>
      <TestDataResetPageContent />
    </TestDataResetErrorBoundary>
  );
}
