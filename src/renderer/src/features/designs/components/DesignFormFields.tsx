import type { ChangeEvent, ReactNode } from "react";

import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Select, type SelectOption } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { TextInput } from "../../../shared/components/TextInput";
import type { CatalogTag } from "../types/catalogTag.types";
import type { DesignFormValues } from "../types/designForm.types";

interface DesignFormFieldsProps {
  approvedTags: CatalogTag[];
  categoryOptions: SelectOption[];
  children?: ReactNode;
  designId?: string;
  error?: string | null;
  formValues: DesignFormValues;
  isArchived?: boolean;
  onChange: (field: keyof DesignFormValues, value: string) => void;
}

export function DesignFormFields({
  approvedTags,
  categoryOptions,
  children,
  designId,
  error,
  formValues,
  isArchived = false,
  onChange,
}: DesignFormFieldsProps) {
  function handleFieldChange(field: keyof DesignFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(field, event.target.value);
    };
  }

  return (
    <div className="design-form-fields">
      {designId ? (
        <TextInput label="Design ID" name="designId" readOnly value={designId} />
      ) : null}

      <TextInput
        label="Title"
        name="title"
        onChange={handleFieldChange("title")}
        required
        value={formValues.title}
      />

      <AutoResizeTextarea
        label="Description"
        maxAutoHeightPx={320}
        name="description"
        onChange={handleFieldChange("description")}
        value={formValues.description}
      />

      <Select
        label="Category"
        name="categoryId"
        onChange={(event) => onChange("categoryId", event.target.value)}
        options={categoryOptions}
        value={formValues.categoryId}
      />

      <TagChipInput
        approvedTags={approvedTags}
        label="Tags"
        name="tagsInput"
        onChange={(nextValue) => onChange("tagsInput", nextValue)}
        value={formValues.tagsInput}
      />

      {isArchived ? (
        <p className="auth-message auth-message-warning" role="status">
          This design is archived. Metadata edits will not restore it.
        </p>
      ) : null}

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {children}
    </div>
  );
}
