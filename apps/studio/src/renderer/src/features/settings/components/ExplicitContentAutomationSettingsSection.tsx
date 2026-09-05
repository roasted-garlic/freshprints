import { TagChipInput } from "../../../shared/components/TagChipInput";
import {
  EXPLICIT_CONTENT_AUTOMATION_TERM_MAX_LENGTH,
  EXPLICIT_CONTENT_AUTOMATION_TERMS_MAX_COUNT,
} from "@fresh-prints/shared/constants/explicitContentAutomation.constants";

interface ExplicitContentAutomationSettingsSectionProps {
  canEdit: boolean;
  termsInput: string;
  onChange: (nextValue: string) => void;
}

/**
 * Owner/admin vocabulary for Autonomous Explicit Content classification.
 * Saved with AI Enrichment settings (settings/aiEnrichment.explicitContentAutomationTerms).
 */
export function ExplicitContentAutomationSettingsSection({
  canEdit,
  termsInput,
  onChange,
}: ExplicitContentAutomationSettingsSectionProps) {
  return (
    <section className="settings-section" aria-labelledby="explicit-content-automation-heading">
      <div className="settings-section-header">
        <h2 className="settings-section-title" id="explicit-content-automation-heading">
          Explicit Content Automation
        </h2>
        <p className="settings-section-description">
          Words or phrases that automatically mark otherwise-approved catalog designs as Explicit
          Content. Matching is deterministic (not semantic AI judgment). Staff can still edit
          Explicit Content per design.
        </p>
      </div>

      <TagChipInput
        adjustmentHint="Add, edit, or remove terms. An empty list disables automatic Explicit classification (no hidden fallback)."
        disabled={!canEdit}
        label="Automation vocabulary"
        maxTagLength={EXPLICIT_CONTENT_AUTOMATION_TERM_MAX_LENGTH}
        maxTags={EXPLICIT_CONTENT_AUTOMATION_TERMS_MAX_COUNT}
        name="explicitContentAutomationTerms"
        onChange={onChange}
        value={termsInput}
      />

      {!canEdit ? (
        <p className="settings-section-status">Only owners and admins can edit this vocabulary.</p>
      ) : null}
    </section>
  );
}
