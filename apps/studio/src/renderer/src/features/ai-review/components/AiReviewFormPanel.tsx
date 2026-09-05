import { Badge } from "../../../shared/components/Badge";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Select, type SelectOption } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { TextInput } from "../../../shared/components/TextInput";
import { Toggle } from "../../../shared/components/Toggle";
import { ArtworkBackgroundFields } from "../../designs/components/ArtworkBackgroundFields";
import type { CatalogTag } from "../../designs/types/catalogTag.types";
import type { Design } from "../../designs/types/design.types";
import type { AiReviewDraftForm } from "../types/aiReviewInbox.types";

interface AiReviewFormPanelProps {
  approvedTags: CatalogTag[];
  canEdit: boolean;
  categoryOptions: { label: string; value: string }[];
  design: Design | null;
  draftForm: AiReviewDraftForm;
  onChange: (field: keyof AiReviewDraftForm, value: string | boolean) => void;
  onHalftoneChange: (value: boolean) => void;
  onInputFocusChange: (isFocused: boolean) => void;
}

function formatSubmitter(design: Design | null): string {
  const value = design?.halftoneSubmitterResponse?.value;
  if (!value || value === "unanswered") {
    return "Unanswered";
  }
  if (value === "yes") {
    return "Yes";
  }
  if (value === "no") {
    return "No";
  }
  return "Not sure";
}

function formatStaffDecision(design: Design | null): string {
  const value = design?.halftoneStaffDecision?.value;
  if (typeof value !== "boolean") {
    return "Not set";
  }
  return value ? "Halftone" : "Not halftone";
}

export function AiReviewFormPanel({
  approvedTags,
  canEdit,
  categoryOptions,
  design,
  draftForm,
  onChange,
  onHalftoneChange,
  onInputFocusChange,
}: AiReviewFormPanelProps) {
  const selectOptions: SelectOption[] = [
    { label: "No category", value: "" },
    ...categoryOptions.filter((option) => option.value),
  ];

  function handleFocus() {
    onInputFocusChange(true);
  }

  function handleBlur() {
    onInputFocusChange(false);
  }

  return (
    <div className="ai-review-form-panel ai-review-workspace-section">
      <div className="ai-review-workspace-section-header">
        <h3 className="ai-review-workspace-section-title">Final Catalog Information</h3>
        {!canEdit ? (
          <Badge variant="default">View only</Badge>
        ) : (
          <Badge variant="warning">Unsaved until Approve</Badge>
        )}
      </div>

      <TextInput
        disabled={!canEdit}
        label="Title"
        name="aiReviewTitle"
        onBlur={handleBlur}
        onChange={(event) => onChange("title", event.target.value)}
        onFocus={handleFocus}
        required
        value={draftForm.title}
      />

      <Select
        disabled={!canEdit}
        label="Category"
        name="aiReviewCategory"
        onBlur={handleBlur}
        onChange={(event) => onChange("categoryId", event.target.value)}
        onFocus={handleFocus}
        options={selectOptions}
        searchEmptyMessage="No categories found"
        searchPlaceholder="Search categories..."
        searchable
        value={draftForm.categoryId}
      />

      <AutoResizeTextarea
        disabled={!canEdit}
        label="Description"
        name="aiReviewDescription"
        onBlur={handleBlur}
        onChange={(event) => onChange("description", event.target.value)}
        onFocus={handleFocus}
        value={draftForm.description}
      />

      <TagChipInput
        adjustmentHint={draftForm.tagsAdjustmentNote}
        approvedTags={approvedTags}
        disabled={!canEdit}
        label="Tags"
        name="aiReviewTags"
        onBlur={handleBlur}
        onChange={(nextValue) => onChange("tagsInput", nextValue)}
        onFocus={handleFocus}
        value={draftForm.tagsInput}
      />

      <div className="ai-review-halftone-panel">
        <div className="ai-review-halftone-panel-header">
          <h4 className="ai-review-halftone-title">Halftone</h4>
          <Toggle
            checked={draftForm.markAsHalftone}
            disabled={!canEdit}
            label="Halftone"
            name="aiReviewHalftone"
            onChange={onHalftoneChange}
            tone="success"
          />
        </div>
        <div className="ai-review-halftone-evidence-row">
          <span className="ai-review-halftone-chip">Customer: {formatSubmitter(design)}</span>
          <span className="ai-review-halftone-chip">
            Intake staff: {formatStaffDecision(design)}
          </span>
        </div>
        <p className="ai-review-halftone-help">
          Staff toggle is authoritative. AI suggestions never turn this on automatically. Approve
          with toggle on adds the canonical halftone tag; off removes it.
        </p>
      </div>

      <div className="ai-review-halftone-panel">
        <div className="ai-review-halftone-panel-header">
          <h4 className="ai-review-halftone-title">Explicit Content</h4>
          <Toggle
            checked={draftForm.isExplicitContent}
            disabled={!canEdit}
            label="Explicit Content"
            name="aiReviewExplicitContent"
            onChange={(value) => onChange("isExplicitContent", value)}
            tone="accent"
          />
        </div>
        <p className="ai-review-halftone-help">
          Staff can set Explicit Content manually. Catalog enrichment may also set it when an
          owner-configured word or phrase is detected in artwork text. Reprocessing may apply
          detected Explicit terms again unless this design is locked. Portal shows censored artwork
          by default in Censored mode.
        </p>
        {draftForm.isExplicitContent ? (
          <TagChipInput
            adjustmentHint="Masked in Portal titles/descriptions while customers are in Censored mode."
            disabled={!canEdit}
            label="Words/phrases to censor"
            name="aiReviewCensoredTerms"
            onBlur={handleBlur}
            onChange={(nextValue) => onChange("censoredTermsInput", nextValue)}
            onFocus={handleFocus}
            value={draftForm.censoredTermsInput}
          />
        ) : null}
        <div className="ai-review-halftone-panel-header" style={{ marginTop: "0.75rem" }}>
          <h4 className="ai-review-halftone-title">Lock Explicit setting</h4>
          <Toggle
            checked={draftForm.explicitContentAutomationLocked}
            disabled={!canEdit}
            label="Lock Explicit setting"
            name="aiReviewExplicitAutomationLock"
            onChange={(value) => onChange("explicitContentAutomationLocked", value)}
            tone="accent"
          />
        </div>
        <p className="ai-review-halftone-help">
          When locked, AI reprocessing will not change Explicit Content or censored terms for this
          design.
        </p>
      </div>

      <div className="ai-review-halftone-panel">
        <div className="ai-review-halftone-panel-header">
          <h4 className="ai-review-halftone-title">Companion designs</h4>
          <Toggle
            checked={draftForm.expectsCompanions}
            disabled={!canEdit}
            label="Expects companion design(s)"
            name="aiReviewExpectsCompanions"
            onChange={(value) => onChange("expectsCompanions", value)}
            tone="success"
          />
        </div>
        <div className="ai-review-halftone-evidence-row">
          {design?.companionSetIncomplete ? (
            <span className="ai-review-halftone-chip">Needs Companion</span>
          ) : design?.companionSetId ? (
            <span className="ai-review-halftone-chip">In companion set</span>
          ) : null}
        </div>
        <p className="ai-review-halftone-help">
          Marks that matching artwork is expected even if not uploaded yet. Link, unlink, and mark
          complete in Design Library after approval.
        </p>
      </div>

      <ArtworkBackgroundFields
        disabled={!canEdit}
        namePrefix="aiReviewArtworkBackground"
        onChange={(field, value) => onChange(field, value)}
        values={{
          artworkBackgroundPreset: draftForm.artworkBackgroundPreset,
          artworkBackgroundCustomHex: draftForm.artworkBackgroundCustomHex,
        }}
      />
    </div>
  );
}
