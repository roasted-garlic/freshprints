import {
  ARTWORK_BACKGROUND_PRESET_GREY,
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  ARTWORK_BACKGROUND_PRESET_WHITE,
} from "@fresh-prints/shared/constants/design/artworkBackground.constants";

import { Select } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import type { ArtworkBackgroundPreset } from "../types/designForm.types";
import { resolveFormArtworkBackgroundHex } from "../utils/designFormMapper";

const PRESET_OPTIONS: { label: string; value: ArtworkBackgroundPreset }[] = [
  { label: "Grey (default)", value: "grey" },
  { label: "Light black", value: "lightBlack" },
  { label: "White", value: "white" },
  { label: "Custom hex", value: "custom" },
];

export interface ArtworkBackgroundFieldsValues {
  artworkBackgroundPreset: ArtworkBackgroundPreset;
  artworkBackgroundCustomHex: string;
}

interface ArtworkBackgroundFieldsProps {
  disabled?: boolean;
  namePrefix?: string;
  onChange: (field: keyof ArtworkBackgroundFieldsValues, value: string) => void;
  values: ArtworkBackgroundFieldsValues;
}

export function ArtworkBackgroundFields({
  disabled = false,
  namePrefix = "artworkBackground",
  onChange,
  values,
}: ArtworkBackgroundFieldsProps) {
  const previewBg = resolveFormArtworkBackgroundHex({
    title: "",
    description: "",
    categoryId: "",
    tagsInput: "",
    ...values,
  });

  return (
    <fieldset className="design-form-artwork-bg" disabled={disabled}>
      <legend className="design-form-artwork-bg-legend">Artwork background</legend>
      <p className="design-form-hint">
        Mat behind the design in Studio and Portal, letterbox margins on Facebook share images, and
        the AI analysis canvas when set. Default display grey is {ARTWORK_BACKGROUND_PRESET_GREY};
        unset designs still use mid-grey for first-pass AI.
      </p>
      <Select
        disabled={disabled}
        label="Background"
        name={`${namePrefix}Preset`}
        onChange={(event) =>
          onChange("artworkBackgroundPreset", event.target.value as ArtworkBackgroundPreset)
        }
        options={PRESET_OPTIONS}
        value={values.artworkBackgroundPreset}
      />
      {values.artworkBackgroundPreset === "custom" ? (
        <TextInput
          disabled={disabled}
          label="Custom hex"
          name={`${namePrefix}CustomHex`}
          onChange={(event) => onChange("artworkBackgroundCustomHex", event.target.value)}
          placeholder="#2c2d2d"
          value={values.artworkBackgroundCustomHex}
        />
      ) : null}
      <div
        aria-hidden="true"
        className="design-form-artwork-bg-swatch"
        style={{ backgroundColor: previewBg }}
        title={previewBg}
      />
      <p className="design-form-hint">
        Presets: grey {ARTWORK_BACKGROUND_PRESET_GREY}, light black{" "}
        {ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK}, white {ARTWORK_BACKGROUND_PRESET_WHITE}.
      </p>
    </fieldset>
  );
}
