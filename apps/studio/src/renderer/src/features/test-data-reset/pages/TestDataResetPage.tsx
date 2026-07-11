import { useCallback, useMemo, useState } from "react";

import {
  OPERATIONAL_WIPE_CONFIRMATION_PHRASE,
  type OperationalWipeTarget,
  type WipeOperationalTestDataResponse,
} from "@fresh-prints/shared/types/admin/wipeOperationalTestData.types";
import {
  ALL_OPERATIONAL_WIPE_TARGETS,
  applyOperationalWipeTargetToggle,
  PRINT_REQUEST_RESET_PRESET_TARGETS,
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
import { OPERATIONAL_WIPE_TARGET_OPTIONS } from "../constants/wipeTargetOptions";
import { wipeOperationalTestData } from "../services/wipeOperationalTestDataService";
import {
  getStudioFirebaseProjectId,
  isOperationalWipeUiEnabled,
} from "../utils/operationalWipeUiGate";

type ConfirmStep = "closed" | "designsWarning" | "phrase";

export function TestDataResetPage() {
  const { user } = useAuth();
  const canManage = permissionService.canManageSettings(user);
  const wipeUiEnabled = isOperationalWipeUiEnabled();
  const projectId = getStudioFirebaseProjectId();

  const [selectedTargets, setSelectedTargets] = useState<OperationalWipeTarget[]>([
    ...PRINT_REQUEST_RESET_PRESET_TARGETS,
  ]);
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>("closed");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [acknowledgeDesignCatalogWipe, setAcknowledgeDesignCatalogWipe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<WipeOperationalTestDataResponse | null>(null);

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

  if (!canManage) {
    return (
      <main className="page-layout page-layout-shell test-data-reset-page">
        <section className="card test-data-reset-section">
          <h2 className="test-data-reset-title">Admin access required</h2>
          <p className="test-data-reset-copy">Only owners and admins can wipe operational test data.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-layout page-layout-shell test-data-reset-page">
      <section className="card test-data-reset-section test-data-reset-danger">
        <header className="test-data-reset-header">
          <h2 className="test-data-reset-title">Operational wipe</h2>
          <p className="test-data-reset-copy">
            Project <code>{projectId}</code>. This permanently deletes selected operational data. Customer and
            staff accounts, categories, tags, and settings are kept. Designs and Storage assets are kept unless
            you explicitly select Designs.
          </p>
        </header>

        <div className="test-data-reset-columns">
          <div>
            <h3 className="test-data-reset-subtitle">Always kept</h3>
            <ul className="test-data-reset-list">
              <li>Auth accounts, users, customers, usernames</li>
              <li>Categories and tags</li>
              <li>Settings (AI enrichment, show queue defaults)</li>
            </ul>
          </div>
          <div>
            <h3 className="test-data-reset-subtitle">Selectable</h3>
            <ul className="test-data-reset-list">
              <li>Print requests &amp; items (+ queue attachments)</li>
              <li>Show queue attachments / gang sheets</li>
              <li>Upcoming shows</li>
              <li>Request name sequences</li>
              <li>Design request stats</li>
              <li>Designs + Storage originals/thumbnails/previews</li>
            </ul>
          </div>
        </div>

        <div className="test-data-reset-presets">
          <Button
            onClick={() => setSelectedTargets([...PRINT_REQUEST_RESET_PRESET_TARGETS])}
            type="button"
            variant="secondary"
          >
            Print-request reset (keep shows)
          </Button>
          <Button
            onClick={() => setSelectedTargets([...ALL_OPERATIONAL_WIPE_TARGETS])}
            type="button"
            variant="secondary"
          >
            Select all
          </Button>
          <Button onClick={() => setSelectedTargets([])} type="button" variant="ghost">
            Clear selection
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
                onChange={(event) =>
                  setSelectedTargets((current) =>
                    applyOperationalWipeTargetToggle(current, option.id, event.currentTarget.checked),
                  )
                }
              />
              <p className="test-data-reset-target-description">{option.description}</p>
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
            <p className="test-data-reset-copy">Targets: {lastResult.targets.join(", ")}</p>
            <ul className="test-data-reset-list">
              {Object.entries(lastResult.deleted).map(([collectionName, count]) => (
                <li key={collectionName}>
                  {collectionName}: {count} deleted
                </li>
              ))}
              {lastResult.targets.includes("sequences") ||
              lastResult.targets.includes("printRequests") ||
              lastResult.internalSequenceReset ? (
                <>
                  <li>
                    Customer request sequences reset to 1: {lastResult.customersReset} customer
                    {lastResult.customersReset === 1 ? "" : "s"} (totalPrintRequests set to 0)
                  </li>
                  <li>
                    Internal counters/printRequests document:{" "}
                    {lastResult.internalSequenceReset === false ? "not removed" : "deleted"}
                  </li>
                </>
              ) : null}
              {lastResult.designsRequestStatsReset > 0 ? (
                <li>Design request stats reset: {lastResult.designsRequestStatsReset}</li>
              ) : null}
              {lastResult.showsAllocationTotalsReset > 0 ||
              lastResult.targets.includes("printRequests") ||
              lastResult.targets.includes("showQueueAttachments") ? (
                <li>
                  Upcoming show allocatedQuantity zeroed: {lastResult.showsAllocationTotalsReset} show
                  {lastResult.showsAllocationTotalsReset === 1 ? "" : "s"}
                  {" "}(productionStatus full → open when applicable)
                </li>
              ) : null}
              {lastResult.storageFilesDeleted > 0 || lastResult.targets.includes("designs") ? (
                <li>Storage files deleted: {lastResult.storageFilesDeleted}</li>
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
                <li>Print requests &amp; items (required first — already included)</li>
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
                <span className="form-label">
                  Type <code>{OPERATIONAL_WIPE_CONFIRMATION_PHRASE}</code> to confirm
                </span>
                <input
                  autoComplete="off"
                  className="form-input"
                  disabled={isSubmitting}
                  id="test-data-reset-confirm-input"
                  onChange={(event) => setConfirmationPhrase(event.currentTarget.value)}
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
