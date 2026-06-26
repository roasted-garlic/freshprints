import type { ChangeEvent, ReactNode } from "react";

import { Badge } from "../../../shared/components/Badge";
import { Select, type SelectOption } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { TextInput } from "../../../shared/components/TextInput";
import type { DesignFormValues } from "../types/designForm.types";
import { formatDesignStatusLabel, getDesignStatusBadgeVariant } from "../utils/designStatusDisplay";
import { DesignPrintSettingsFields } from "./DesignPrintSettingsFields";

interface DesignFormFieldsProps {
  categoryOptions: SelectOption[];
  children?: ReactNode;
  designId?: string;
  error?: string | null;
  formValues: DesignFormValues;
  isArchived?: boolean;
  onChange: (field: keyof DesignFormValues, value: string) => void;
  onPrintSettingsChange: (updates: Partial<DesignFormValues>) => void;
}

export function DesignFormFields({
  categoryOptions,
  children,
  designId,
  error,
  formValues,
  isArchived = false,
  onChange,
  onPrintSettingsChange,
}: DesignFormFieldsProps) {
  function handleFieldChange(field: keyof DesignFormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
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

      <TextInput
        label="Description"
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
        label="Tags"
        name="tagsInput"
        onChange={(nextValue) => onChange("tagsInput", nextValue)}
        value={formValues.tagsInput}
      />

      <div className="design-form-status-field">
        <span className="design-form-status-label" id="design-form-status-label">
          Status
        </span>
        <Badge aria-labelledby="design-form-status-label" variant={getDesignStatusBadgeVariant(formValues.status)}>
          {formatDesignStatusLabel(formValues.status)}
        </Badge>
      </div>

      {isArchived ? (
        <p className="auth-message auth-message-warning" role="status">
          This design is archived. Metadata edits will not restore it.
        </p>
      ) : null}

      <DesignPrintSettingsFields formValues={formValues} onChange={onPrintSettingsChange} />

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {children}
    </div>
  );
}
