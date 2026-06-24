import type { ChangeEvent, ReactNode } from "react";

import { Select, type SelectOption } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import type { DesignFormValues } from "../types/designForm.types";
import { editableCatalogDesignStatuses } from "../types/designStatus.types";
import { formatDesignStatusLabel } from "../utils/designStatusDisplay";
import { DesignPrintSettingsFields } from "./DesignPrintSettingsFields";

interface DesignFormFieldsProps {
  canEditStatus: boolean;
  categoryOptions: SelectOption[];
  children?: ReactNode;
  designId?: string;
  error?: string | null;
  formValues: DesignFormValues;
  onChange: (field: keyof DesignFormValues, value: string) => void;
  onPrintSettingsChange: (updates: Partial<DesignFormValues>) => void;
}

const statusOptions = editableCatalogDesignStatuses.map((status) => ({
  label: formatDesignStatusLabel(status),
  value: status,
}));

export function DesignFormFields({
  canEditStatus,
  categoryOptions,
  children,
  designId,
  error,
  formValues,
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

      <TextInput
        label="Tags"
        name="tagsInput"
        onChange={handleFieldChange("tagsInput")}
        value={formValues.tagsInput}
      />
      <p className="design-form-hint">Separate tags with commas. Tags are stored lowercase.</p>

      {canEditStatus ? (
        <Select
          label="Status"
          name="status"
          onChange={(event) => onChange("status", event.target.value)}
          options={statusOptions}
          value={formValues.status}
        />
      ) : (
        <TextInput
          label="Status"
          name="status"
          readOnly
          value={formatDesignStatusLabel(formValues.status)}
        />
      )}

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
