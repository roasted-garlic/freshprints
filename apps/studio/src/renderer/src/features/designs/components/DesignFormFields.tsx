import type { ChangeEvent, ReactNode } from "react";

import { syncHalftoneTagInList } from "@fresh-prints/shared/utils/halftoneReviewState";

import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Select, type SelectOption } from "../../../shared/components/Select";
import { TagChipInput } from "../../../shared/components/TagChipInput";
import { TextInput } from "../../../shared/components/TextInput";
import { Toggle } from "../../../shared/components/Toggle";
import { ARTWORK_PLACEMENT_SELECT_OPTIONS } from "../constants/artworkPlacement";
import type { CatalogTag } from "../types/catalogTag.types";
import type { DesignFormValues } from "../types/designForm.types";
import { formatTagsInput, tryParseTagsInput } from "../utils/designFormMapper";
import { ArtworkBackgroundFields } from "./ArtworkBackgroundFields";

interface DesignFormFieldsProps {
  approvedTags: CatalogTag[];
  categoryOptions: SelectOption[];
  children?: ReactNode;
  designId?: string;
  error?: string | null;
  formValues: DesignFormValues;
  isArchived?: boolean;
  onChange: (field: keyof DesignFormValues, value: string) => void;
  /** Dedicated boolean setter for the "Explicit Content" toggle. */
  onExplicitContentChange: (checked: boolean) => void;
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
  onExplicitContentChange,
}: DesignFormFieldsProps) {
  const parsedTags = tryParseTagsInput(formValues.tagsInput);
  const isHalftone = parsedTags.some((tag) => tag.trim().toLowerCase() === "halftone");

  function handleFieldChange(field: keyof DesignFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(field, event.target.value);
    };
  }

  function handleHalftoneChange(checked: boolean) {
    onChange("tagsInput", formatTagsInput(syncHalftoneTagInList(parsedTags, checked)));
    onChange("artworkBackgroundPreset", checked ? "lightBlack" : "grey");
    onChange("artworkBackgroundCustomHex", "");
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
        searchEmptyMessage="No categories found"
        searchPlaceholder="Search categories..."
        searchable
        value={formValues.categoryId}
      />

      <TagChipInput
        approvedTags={approvedTags}
        label="Tags"
        name="tagsInput"
        onChange={(nextValue) => onChange("tagsInput", nextValue)}
        value={formValues.tagsInput}
      />

      <Select
        label="Placement"
        name="artworkPlacement"
        onChange={(event) => onChange("artworkPlacement", event.target.value)}
        options={ARTWORK_PLACEMENT_SELECT_OPTIONS}
        value={formValues.artworkPlacement ?? ""}
      />

      <div className="design-form-halftone-row">
        <div className="design-form-halftone-copy">
          <p className="design-form-halftone-label">Halftone</p>
          <p className="design-form-hint">
            Turns the canonical <code>halftone</code> tag on or off without typing it.
          </p>
        </div>
        <Toggle
          checked={isHalftone}
          label="Halftone"
          name="editDesignHalftone"
          onChange={handleHalftoneChange}
          tone="success"
        />
      </div>

      <div className="design-form-halftone-row">
        <div className="design-form-halftone-copy">
          <p className="design-form-halftone-label">Explicit Content</p>
          <p className="design-form-hint">
            Staff-only classification. Portal blurs and censors this design by default.
          </p>
        </div>
        <Toggle
          checked={formValues.isExplicitContent ?? false}
          label="Explicit Content"
          name="editDesignExplicitContent"
          onChange={onExplicitContentChange}
        />
      </div>

      {formValues.isExplicitContent ? (
        <TagChipInput
          adjustmentHint="Shown only while Explicit Content is on. Terms stay saved if Explicit is later turned off."
          label="Words/phrases to censor"
          name="censoredTermsInput"
          onChange={(nextValue) => onChange("censoredTermsInput", nextValue)}
          value={formValues.censoredTermsInput ?? ""}
        />
      ) : null}

      <ArtworkBackgroundFields
        onChange={onChange}
        values={{
          artworkBackgroundPreset: formValues.artworkBackgroundPreset,
          artworkBackgroundCustomHex: formValues.artworkBackgroundCustomHex,
        }}
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
