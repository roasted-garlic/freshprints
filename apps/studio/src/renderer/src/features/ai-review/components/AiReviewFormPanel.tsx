import { Badge } from "../../../shared/components/Badge";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Select, type SelectOption } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { TextInput } from "../../../shared/components/TextInput";
import type { CatalogTag } from "../../designs/types/catalogTag.types";
import type { AiReviewDraftForm } from "../types/aiReviewInbox.types";

interface AiReviewFormPanelProps {
  approvedTags: CatalogTag[];
  canEdit: boolean;
  categoryOptions: { label: string; value: string }[];
  draftForm: AiReviewDraftForm;
  onChange: (field: keyof AiReviewDraftForm, value: string) => void;
  onInputFocusChange: (isFocused: boolean) => void;
}

export function AiReviewFormPanel({
  approvedTags,
  canEdit,
  categoryOptions,
  draftForm,
  onChange,
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
    </div>
  );
}
