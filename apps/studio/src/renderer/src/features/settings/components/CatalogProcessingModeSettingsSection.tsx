import { useState } from "react";

import {
  CATALOG_WORKFLOW_MODE_LABELS,
  CATALOG_WORKFLOW_MODES,
  ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE,
  type CatalogWorkflowMode,
} from "@fresh-prints/shared/constants/catalogWorkflowMode.constants";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Select } from "../../../shared/components/Select";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { catalogWorkflowModeService } from "../services/catalogWorkflowModeService";

interface CatalogProcessingModeSettingsSectionProps {
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled: boolean;
  isLoading: boolean;
}

export function CatalogProcessingModeSettingsSection({
  catalogWorkflowMode,
  catalogAutonomousLiveEnabled,
  isLoading,
}: CatalogProcessingModeSettingsSectionProps) {
  const { user } = useAuth();
  const canManage = permissionService.canManageCatalogWorkflowMode(user);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");

  async function saveMode(nextMode: CatalogWorkflowMode, enableLive?: boolean) {
    setIsSaving(true);
    setError(null);
    try {
      await catalogWorkflowModeService.updateMode({
        catalogWorkflowMode: nextMode,
        catalogAutonomousLiveEnabled: enableLive,
        confirmationPhrase: enableLive ? confirmationPhrase : undefined,
      });
      setLiveModalOpen(false);
      setConfirmationPhrase("");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to update Catalog Processing Mode.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleModeChange(value: string) {
    const next = value as CatalogWorkflowMode;
    void saveMode(next, next === "autonomous" ? false : false);
  }

  return (
    <section aria-labelledby="catalog-processing-mode-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="catalog-processing-mode-title">
          Catalog Processing Mode
        </h2>
        <p className="settings-section-description">
          Server-authoritative operating mode for AI enrichment outcomes. Missing or invalid
          settings always fall back to Manual Review. Live Autonomous publication requires a
          separate typed confirmation and remains off by default.
        </p>
      </header>

      {isLoading ? (
        <p className="settings-section-status">Loading Catalog Processing Mode…</p>
      ) : (
        <div className="settings-form-grid">
          <div className="settings-control-item">
            <Select
              disabled={!canManage || isSaving}
              label="Active mode"
              name="catalogWorkflowMode"
              onChange={(event) => handleModeChange(event.target.value)}
              options={CATALOG_WORKFLOW_MODES.map((mode) => ({
                label: CATALOG_WORKFLOW_MODE_LABELS[mode],
                value: mode,
              }))}
              value={catalogWorkflowMode}
            />
            <p className="settings-field-hint">
              Current: {CATALOG_WORKFLOW_MODE_LABELS[catalogWorkflowMode]}
              {catalogAutonomousLiveEnabled ? " · Live Autonomous ON" : " · Live Autonomous OFF"}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <Badge variant="info">
                Catalog Processing: {CATALOG_WORKFLOW_MODE_LABELS[catalogWorkflowMode]}
              </Badge>
              <Badge variant={catalogAutonomousLiveEnabled ? "success" : "default"}>
                Live gate: {catalogAutonomousLiveEnabled ? "ON" : "OFF"}
              </Badge>
            </div>
          </div>

          {canManage && catalogWorkflowMode === "autonomous" && !catalogAutonomousLiveEnabled ? (
            <div className="settings-control-item">
              <Button
                disabled={isSaving}
                onClick={() => setLiveModalOpen(true)}
                type="button"
                variant="secondary"
              >
                Enable live Autonomous…
              </Button>
              <p className="settings-field-hint">
                Mode = Autonomous with live gate OFF still records would-auto-approve and routes to
                Needs Review.
              </p>
            </div>
          ) : null}

          {canManage && catalogAutonomousLiveEnabled ? (
            <div className="settings-control-item">
              <Button
                disabled={isSaving}
                onClick={() => void saveMode(catalogWorkflowMode, false)}
                type="button"
                variant="secondary"
              >
                Disable live Autonomous
              </Button>
            </div>
          ) : null}

          {!canManage ? (
            <p className="settings-section-status">
              Only the owner can change Catalog Processing Mode or live Autonomous.
            </p>
          ) : null}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}

      {liveModalOpen ? (
        <div
          aria-modal="true"
          className="modal-overlay modal-overlay-blur"
          role="dialog"
          onClick={() => {
            setLiveModalOpen(false);
            setConfirmationPhrase("");
          }}
        >
          <div onClick={(event) => event.stopPropagation()} role="presentation">
            <Modal aria-labelledby="enable-autonomous-title">
              <ModalHeader>
                <h3 id="enable-autonomous-title">Enable live Autonomous</h3>
              </ModalHeader>
              <ModalBody>
                <p>
                  This allows qualifying designs to become catalog-ready without staff approval when
                  Mode is Autonomous. Type <strong>{ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE}</strong>{" "}
                  to confirm. Implementation of this setting is not itself authorization for
                  production use.
                </p>
                <label className="settings-field-label" htmlFor="enable-autonomous-phrase">
                  Confirmation phrase
                </label>
                <input
                  autoComplete="off"
                  className="settings-text-input"
                  id="enable-autonomous-phrase"
                  onChange={(event) => setConfirmationPhrase(event.target.value)}
                  value={confirmationPhrase}
                />
              </ModalBody>
              <ModalFooter>
                <Button
                  onClick={() => {
                    setLiveModalOpen(false);
                    setConfirmationPhrase("");
                  }}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  disabled={confirmationPhrase !== ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE || isSaving}
                  onClick={() => void saveMode("autonomous", true)}
                  type="button"
                >
                  Enable
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        </div>
      ) : null}
    </section>
  );
}
