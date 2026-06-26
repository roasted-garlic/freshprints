import { useMemo, useState } from "react";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Select } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import {
  BASE_AI_TAG_EXCLUSIONS,
  OPENAI_VISION_MODEL_OPTIONS,
  resolveClientVisionModelId,
} from "../constants/aiEnrichmentSettingsConstants";
import {
  formatAdditionalTagExclusionsInput,
  parseAdditionalTagExclusionsInput,
  useAiEnrichmentSettings,
} from "../hooks/useAiEnrichmentSettings";

export function SettingsPage() {
  const { user } = useAuth();
  const canManageSettings = permissionService.canManageSettings(user);
  const {
    additionalTagExclusions,
    error,
    isLoading,
    isSaving,
    saveError,
    saveSettings,
    visionModelId,
  } = useAiEnrichmentSettings();
  const [draftVisionModelId, setDraftVisionModelId] = useState<string | null>(null);
  const [draftAdditionalTagExclusions, setDraftAdditionalTagExclusions] = useState<string[] | null>(
    null,
  );

  const selectedVisionModelId = draftVisionModelId ?? visionModelId;
  const selectedAdditionalTagExclusions = draftAdditionalTagExclusions ?? additionalTagExclusions;
  const additionalTagExclusionsInput = formatAdditionalTagExclusionsInput(selectedAdditionalTagExclusions);
  const hasUnsavedChanges =
    (draftVisionModelId !== null && draftVisionModelId !== visionModelId) ||
    (draftAdditionalTagExclusions !== null &&
      formatAdditionalTagExclusionsInput(draftAdditionalTagExclusions) !==
        formatAdditionalTagExclusionsInput(additionalTagExclusions));

  const shellHeaderConfig = useMemo(
    () => ({
      title: "Settings",
      description: "Configure platform settings and AI enrichment preferences.",
    }),
    [],
  );

  useShellHeaderConfig(shellHeaderConfig);

  async function handleSaveSettings() {
    await saveSettings({
      visionModelId: resolveClientVisionModelId(selectedVisionModelId),
      additionalTagExclusions: parseAdditionalTagExclusionsInput(additionalTagExclusionsInput),
    });
    setDraftVisionModelId(null);
    setDraftAdditionalTagExclusions(null);
  }

  return (
    <main className="page-layout page-layout-shell settings-page">
      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {saveError ? (
        <p className="auth-message auth-message-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <section aria-labelledby="ai-enrichment-settings-title" className="card settings-section">
        <header className="settings-section-header">
          <h2 className="settings-section-title" id="ai-enrichment-settings-title">
            AI Enrichment
          </h2>
          <p className="settings-section-description">
            Choose the OpenAI vision model and team tag exclusions used for catalog title,
            description, category, tags, and OCR. Applies on the next AI processing run.
          </p>
        </header>

        {isLoading ? (
          <p className="settings-section-status">Loading AI enrichment settings…</p>
        ) : (
          <div className="settings-form-grid">
            <Select
              disabled={!canManageSettings || isSaving}
              label="Vision model"
              name="visionModelId"
              onChange={(event) => setDraftVisionModelId(event.target.value)}
              options={OPENAI_VISION_MODEL_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              value={selectedVisionModelId}
            />

            <p className="settings-field-hint">
              {OPENAI_VISION_MODEL_OPTIONS.find((option) => option.value === selectedVisionModelId)
                ?.hint ?? selectedVisionModelId}
            </p>

            <div className="settings-tag-exclusions-block">
              <h3 className="settings-subsection-title">Tag exclusions</h3>
              <p className="settings-field-hint">
                Built-in exclusions always apply. Add team-specific single-word tags to block from AI
                suggestions.
              </p>

              <div className="settings-tag-chip-row" aria-label="Built-in tag exclusions">
                {BASE_AI_TAG_EXCLUSIONS.map((tag: string) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>

              <TagChipInput
                adjustmentHint="Single-word lowercase tags only. Duplicates and built-in exclusions are ignored."
                disabled={!canManageSettings || isSaving}
                label="Additional exclusions"
                name="additionalTagExclusions"
                onChange={(value) =>
                  setDraftAdditionalTagExclusions(parseAdditionalTagExclusionsInput(value))
                }
                value={additionalTagExclusionsInput}
              />
            </div>

            {canManageSettings ? (
              <div className="settings-form-actions">
                <Button
                  disabled={!hasUnsavedChanges || isSaving}
                  onClick={() => void handleSaveSettings()}
                  variant="primary"
                >
                  {isSaving ? "Saving…" : "Save AI enrichment settings"}
                </Button>
              </div>
            ) : (
              <p className="settings-section-status">
                Only owners and admins can change AI enrichment settings.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
