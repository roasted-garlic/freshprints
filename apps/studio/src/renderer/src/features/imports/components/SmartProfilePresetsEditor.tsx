import { useState } from "react";
import type { KeyboardEvent } from "react";

import type { SmartProfileEditableDimensionKey } from "@fresh-prints/shared/constants/smartProfile.constants";
import type { SmartProfileDimensionLists } from "@fresh-prints/shared/types/catalog/smartProfile.types";
import {
  SMART_PROFILE_DIMENSION_DISPLAY_ORDER,
  SMART_PROFILE_DIMENSION_LABELS,
} from "../constants/smartProfilePresets";
import {
  addSmartProfilePresetValue,
  removeSmartProfilePresetValue,
} from "../utils/smartProfilePresetEditorValues";

interface SmartProfilePresetsEditorProps {
  disabled?: boolean;
  presets?: Partial<SmartProfileDimensionLists>;
  onChange: (presets: Partial<SmartProfileDimensionLists> | undefined) => void;
}

export function SmartProfilePresetsEditor({
  disabled = false,
  presets,
  onChange,
}: SmartProfilePresetsEditorProps) {
  const populatedDimensionCount = SMART_PROFILE_DIMENSION_DISPLAY_ORDER.filter(
    (key) => (presets?.[key]?.length ?? 0) > 0,
  ).length;

  const handleDimensionChange = (key: SmartProfileEditableDimensionKey, values: string[]) => {
    const updated = { ...presets };
    if (values.length === 0) {
      delete updated[key];
    } else {
      updated[key] = values;
    }
    onChange(Object.keys(updated).length > 0 ? updated : undefined);
  };

  return (
    <div className="import-session-settings-presets-editor">
      <div className="import-session-settings-presets-intro">
        <div>
          <h3>Smart Profile presets</h3>
          <p>
            Optional session values applied to every imported design. Your presets take precedence
            when they merge with AI-generated Smart Profile data.
          </p>
        </div>
        {populatedDimensionCount > 0 ? (
          <button
            className="button button-ghost button-sm"
            disabled={disabled}
            onClick={() => onChange(undefined)}
            type="button"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="import-session-settings-presets-grid">
        {SMART_PROFILE_DIMENSION_DISPLAY_ORDER.map((key) => (
          <SmartProfilePresetDimensionEditor
            disabled={disabled}
            key={key}
            label={SMART_PROFILE_DIMENSION_LABELS[key]}
            onChange={(values) => handleDimensionChange(key, values)}
            values={presets?.[key] ?? []}
          />
        ))}
      </div>
    </div>
  );
}

interface SmartProfilePresetDimensionEditorProps {
  disabled: boolean;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}

function SmartProfilePresetDimensionEditor({
  disabled,
  label,
  values,
  onChange,
}: SmartProfilePresetDimensionEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const inputId = `import-preset-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const addValue = () => {
    const nextValues = addSmartProfilePresetValue(values, inputValue);
    if (nextValues.length !== values.length) {
      onChange(nextValues);
      setInputValue("");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addValue();
    }
  };

  return (
    <section className="import-session-settings-preset-dimension">
      <div className="import-session-settings-preset-dimension-heading">
        <label htmlFor={inputId}>{label}</label>
        {values.length > 0 ? <span>{values.length}</span> : null}
      </div>
      <div className="import-session-settings-preset-add-row form-field">
        <input
          disabled={disabled}
          id={inputId}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add value…"
          type="text"
          value={inputValue}
        />
        <button
          className="button button-secondary button-md"
          disabled={disabled || inputValue.trim().length === 0}
          onClick={addValue}
          type="button"
        >
          Add
        </button>
      </div>
      {values.length > 0 ? (
        <div className="import-session-settings-preset-chips" aria-label={`${label} values`}>
          {values.map((value) => (
            <span className="tag-chip" key={value}>
              <span className="tag-chip-label">{value}</span>
              <button
                aria-label={`Remove ${value} from ${label}`}
                className="tag-chip-remove"
                disabled={disabled}
                onClick={() => onChange(removeSmartProfilePresetValue(values, value))}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
