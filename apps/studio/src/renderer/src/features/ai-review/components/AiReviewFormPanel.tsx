import { Badge } from "../../../shared/components/Badge";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Select, type SelectOption } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { TextInput } from "../../../shared/components/TextInput";
import { Toggle } from "../../../shared/components/Toggle";
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
    </div>
  );
}
