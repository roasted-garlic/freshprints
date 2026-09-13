import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

import {
  DEFAULT_PRINT_REQUEST_WIDTH_MAX_INCHES,
  PRINT_INCHES_DECIMAL_PLACES,
} from "@fresh-prints/shared/constants/printSize.constants";
import {
  STANDARD_PRINT_SIZE_WIDTH_MAX_INCHES,
  STANDARD_PRINT_SIZE_WIDTH_MIN_INCHES,
  buildDefaultStandardPrintSizesSettings,
  type StandardPrintSizeGroupConfig,
  type StandardPrintSizePlacementConfig,
  type StandardPrintSizePresetKey,
  type StandardPrintSizesSettings,
} from "@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants";
import {
  resolvePrintRequestDefaultWidthInches,
  STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES,
} from "@fresh-prints/shared/utils/printRequestItemSizing";
import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { useStandardPrintSizesSettings } from "../hooks/useStandardPrintSizesSettings";

const STANDARD_PRINT_SIZE_WIDTH_STEP_INCHES = 0.25;
const DEFAULT_PRINT_REQUEST_WIDTH_STEP_INCHES = 0.01;

function roundPresetWidth(value: number): number {
  const factor = 10 ** PRINT_INCHES_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}

function clampPresetWidth(value: number): number {
  return roundPresetWidth(
    Math.min(
      STANDARD_PRINT_SIZE_WIDTH_MAX_INCHES,
      Math.max(STANDARD_PRINT_SIZE_WIDTH_MIN_INCHES, value),
    ),
  );
}

function stepPresetWidth(current: number, delta: number): number {
  return clampPresetWidth(current + delta);
}

function roundDefaultPrintRequestWidth(value: number): number {
  const factor = 10 ** PRINT_INCHES_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}

function clampDefaultPrintRequestWidth(value: number): number {
  return roundDefaultPrintRequestWidth(
    Math.min(
      DEFAULT_PRINT_REQUEST_WIDTH_MAX_INCHES,
      Math.max(STANDARD_PRINT_SIZE_WIDTH_MIN_INCHES, value),
    ),
  );
}

function formatDefaultPrintRequestWidth(value: number): string {
  return clampDefaultPrintRequestWidth(value).toFixed(PRINT_INCHES_DECIMAL_PLACES);
}

function isPartialDefaultPrintRequestWidthInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return /^\d*(\.\d{0,2})?$/.test(trimmed);
}

function parseDefaultPrintRequestWidthInput(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue || !isPartialDefaultPrintRequestWidthInput(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return clampDefaultPrintRequestWidth(parsedValue);
}

function stepDefaultPrintRequestWidth(current: number, delta: number): number {
  return clampDefaultPrintRequestWidth(current + delta);
}

function parsePresetWidthInput(value: string): number | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return clampPresetWidth(parsedValue);
}

function cloneSettings(settings: StandardPrintSizesSettings): StandardPrintSizesSettings {
  return {
    version: settings.version,
    defaultPrintRequestWidthInches: settings.defaultPrintRequestWidthInches,
    placements: settings.placements.map((placement) => ({
      ...placement,
      groups: placement.groups.map((group) => ({
        ...group,
        presets: group.presets.map((preset) => ({ ...preset })),
      })),
    })),
  };
}

function updatePlacement(
  settings: StandardPrintSizesSettings,
  placementId: StandardPrintSizePlacementConfig["id"],
  updater: (placement: StandardPrintSizePlacementConfig) => StandardPrintSizePlacementConfig,
): StandardPrintSizesSettings {
  return {
    ...settings,
    placements: settings.placements.map((placement) =>
      placement.id === placementId ? updater(placement) : placement,
    ),
  };
}

function updatePresetWidth(
  settings: StandardPrintSizesSettings,
  placementId: StandardPrintSizePlacementConfig["id"],
  groupId: StandardPrintSizeGroupConfig["id"],
  presetKey: StandardPrintSizePresetKey,
  nextWidth: number,
): StandardPrintSizesSettings {
  return updatePlacement(settings, placementId, (entry) => ({
    ...entry,
    groups: entry.groups.map((entryGroup) =>
      entryGroup.id !== groupId
        ? entryGroup
        : {
            ...entryGroup,
            presets: entryGroup.presets.map((entryPreset) =>
              entryPreset.key === presetKey
                ? { ...entryPreset, widthInches: clampPresetWidth(nextWidth) }
                : entryPreset,
            ),
          },
    ),
  }));
}

export function StandardPrintSizesSettingsSection() {
  const { error, isLoading, isSaving, save, saved, settings } = useStandardPrintSizesSettings();
  const [draft, setDraft] = useState<StandardPrintSizesSettings>(settings);
  const [defaultWidthInput, setDefaultWidthInput] = useState(() =>
    formatDefaultPrintRequestWidth(resolvePrintRequestDefaultWidthInches(settings)),
  );
  const defaultWidthInputFocusedRef = useRef(false);

  useEffect(() => {
    setDraft(cloneSettings(settings));
  }, [settings]);

  useEffect(() => {
    if (defaultWidthInputFocusedRef.current) {
      return;
    }
    setDefaultWidthInput(
      formatDefaultPrintRequestWidth(resolvePrintRequestDefaultWidthInches(draft)),
    );
  }, [draft]);

  if (isLoading) {
    return (
      <p aria-live="polite" className="settings-section-status">
        Loading standard print sizes…
      </p>
    );
  }

  return (
    <section aria-labelledby="standard-print-sizes-settings-title" className="card settings-section">
      <header className="settings-section-header standard-print-sizes-settings-header">
        <div className="standard-print-sizes-settings-header-copy">
          <h2 className="settings-section-title" id="standard-print-sizes-settings-title">
            Standard Print Sizes
          </h2>
          <p className="settings-section-description">
            Configure preset target widths for Print Request Standard Size pickers in Studio and
            Portal. Heights are always calculated from each artwork&apos;s aspect ratio.
          </p>
        </div>
        <Button
          className="standard-print-sizes-settings-header-action"
          disabled={isSaving}
          onClick={() => void save(draft)}
          type="button"
          variant="primary"
        >
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </header>

      <div className="settings-form-grid">
        <fieldset className="settings-quota-fieldset standard-print-sizes-default-width">
          <legend>Default Print Request Width</legend>
          <p className="settings-section-description">
            Used for new items added to Print Requests. Existing items are not resized when this
            value changes.
          </p>
          <label className="standard-print-sizes-settings-preset-row" htmlFor="default-print-request-width">
            <span className="standard-print-sizes-settings-preset-label">Width (inches)</span>
            <div className="print-requests-item-stepper">
              <button
                aria-label="Decrease default print request width"
                className="print-requests-item-stepper-button"
                disabled={isSaving}
                onClick={() => {
                  const nextWidth = stepDefaultPrintRequestWidth(
                    resolvePrintRequestDefaultWidthInches(draft),
                    -DEFAULT_PRINT_REQUEST_WIDTH_STEP_INCHES,
                  );
                  setDraft((current) => ({
                    ...current,
                    defaultPrintRequestWidthInches: nextWidth,
                  }));
                  setDefaultWidthInput(formatDefaultPrintRequestWidth(nextWidth));
                }}
                type="button"
              >
                <Minus aria-hidden size={14} strokeWidth={2} />
              </button>
              <input
                aria-label="Default print request width in inches"
                className="print-requests-number-input print-requests-item-stepper-input"
                disabled={isSaving}
                id="default-print-request-width"
                inputMode="decimal"
                name="default-print-request-width"
                onChange={(event) => {
                  const nextText = event.target.value;
                  if (!isPartialDefaultPrintRequestWidthInput(nextText)) {
                    return;
                  }
                  setDefaultWidthInput(nextText);
                  const nextWidth = parseDefaultPrintRequestWidthInput(nextText);
                  if (nextWidth === null) {
                    return;
                  }
                  setDraft((current) => ({
                    ...current,
                    defaultPrintRequestWidthInches: nextWidth,
                  }));
                }}
                onBlur={() => {
                  defaultWidthInputFocusedRef.current = false;
                  const parsed = parseDefaultPrintRequestWidthInput(defaultWidthInput);
                  const resolved = parsed ?? resolvePrintRequestDefaultWidthInches(draft);
                  const clamped = clampDefaultPrintRequestWidth(resolved);
                  setDraft((current) => ({
                    ...current,
                    defaultPrintRequestWidthInches: clamped,
                  }));
                  setDefaultWidthInput(formatDefaultPrintRequestWidth(clamped));
                }}
                onFocus={(event) => {
                  defaultWidthInputFocusedRef.current = true;
                  event.currentTarget.select();
                }}
                type="text"
                value={defaultWidthInput}
              />
              <button
                aria-label="Increase default print request width"
                className="print-requests-item-stepper-button"
                disabled={isSaving}
                onClick={() => {
                  const nextWidth = stepDefaultPrintRequestWidth(
                    resolvePrintRequestDefaultWidthInches(draft),
                    DEFAULT_PRINT_REQUEST_WIDTH_STEP_INCHES,
                  );
                  setDraft((current) => ({
                    ...current,
                    defaultPrintRequestWidthInches: nextWidth,
                  }));
                  setDefaultWidthInput(formatDefaultPrintRequestWidth(nextWidth));
                }}
                type="button"
              >
                <Plus aria-hidden size={14} strokeWidth={2} />
              </button>
            </div>
          </label>
          <p className="settings-section-description">
            Valid range: {STANDARD_PRINT_SIZE_WIDTH_MIN_INCHES}–{DEFAULT_PRINT_REQUEST_WIDTH_MAX_INCHES}{" "}
            inches (two decimal places). Fallback when unset:{" "}
            {STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES.toFixed(PRINT_INCHES_DECIMAL_PLACES)} inches.
          </p>
        </fieldset>

        <div className="standard-print-sizes-settings-grid">
          {draft.placements.map((placement) => (
            <article
              key={placement.id}
              className={`standard-print-sizes-settings-placement-card${
                placement.enabled ? "" : " is-disabled"
              }`}
            >
              <div className="standard-print-sizes-settings-placement-header">
                <Checkbox
                  checked={placement.enabled}
                  label={placement.label}
                  name={`standard-print-size-placement-${placement.id}`}
                  onChange={(event) =>
                    setDraft((current) =>
                      updatePlacement(current, placement.id, (entry) => ({
                        ...entry,
                        enabled: event.target.checked,
                      })),
                    )
                  }
                />
              </div>

              {placement.groups.map((group) => (
                <fieldset
                  key={`${placement.id}-${group.id}`}
                  className="settings-quota-fieldset standard-print-sizes-settings-group"
                  disabled={isSaving || !placement.enabled}
                >
                  <legend>{group.label}</legend>
                  <ul className="standard-print-sizes-settings-presets">
                    {group.presets.map((preset) => (
                      <li key={preset.key} className="standard-print-sizes-settings-preset-row">
                        <Checkbox
                          checked={preset.enabled}
                          label={preset.label}
                          name={`standard-print-size-${preset.key}`}
                          onChange={(event) =>
                            setDraft((current) =>
                              updatePlacement(current, placement.id, (entry) => ({
                                ...entry,
                                groups: entry.groups.map((entryGroup) =>
                                  entryGroup.id !== group.id
                                    ? entryGroup
                                    : {
                                        ...entryGroup,
                                        presets: entryGroup.presets.map((entryPreset) =>
                                          entryPreset.key === preset.key
                                            ? { ...entryPreset, enabled: event.target.checked }
                                            : entryPreset,
                                        ),
                                      },
                                ),
                              })),
                            )
                          }
                        />
                        <label
                          className="settings-field-label standard-print-sizes-settings-width-field"
                          htmlFor={`standard-print-size-width-${preset.key}`}
                        >
                          Width (in)
                          <div className="print-requests-item-stepper standard-print-sizes-settings-width-stepper">
                            <button
                              aria-label={`Decrease ${preset.label} width`}
                              className="print-requests-item-stepper-button"
                              disabled={isSaving || !placement.enabled || !preset.enabled}
                              onClick={() =>
                                setDraft((current) =>
                                  updatePresetWidth(
                                    current,
                                    placement.id,
                                    group.id,
                                    preset.key,
                                    stepPresetWidth(
                                      preset.widthInches,
                                      -STANDARD_PRINT_SIZE_WIDTH_STEP_INCHES,
                                    ),
                                  ),
                                )
                              }
                              type="button"
                            >
                              <Minus aria-hidden size={14} strokeWidth={2} />
                            </button>
                            <input
                              aria-label={`${preset.label} width in inches`}
                              className="print-requests-number-input print-requests-item-stepper-input"
                              disabled={isSaving || !placement.enabled || !preset.enabled}
                              id={`standard-print-size-width-${preset.key}`}
                              inputMode="decimal"
                              name={`standard-print-size-width-${preset.key}`}
                              onChange={(event) => {
                                const nextWidth = parsePresetWidthInput(event.target.value);
                                if (nextWidth === null) {
                                  return;
                                }
                                setDraft((current) =>
                                  updatePresetWidth(
                                    current,
                                    placement.id,
                                    group.id,
                                    preset.key,
                                    nextWidth,
                                  ),
                                );
                              }}
                              onFocus={(event) => event.currentTarget.select()}
                              type="text"
                              value={preset.widthInches}
                            />
                            <button
                              aria-label={`Increase ${preset.label} width`}
                              className="print-requests-item-stepper-button"
                              disabled={isSaving || !placement.enabled || !preset.enabled}
                              onClick={() =>
                                setDraft((current) =>
                                  updatePresetWidth(
                                    current,
                                    placement.id,
                                    group.id,
                                    preset.key,
                                    stepPresetWidth(
                                      preset.widthInches,
                                      STANDARD_PRINT_SIZE_WIDTH_STEP_INCHES,
                                    ),
                                  ),
                                )
                              }
                              type="button"
                            >
                              <Plus aria-hidden size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ))}
            </article>
          ))}
        </div>

        <div className="settings-form-actions">
          <Button
            disabled={isSaving}
            onClick={() => setDraft(buildDefaultStandardPrintSizesSettings())}
            type="button"
            variant="secondary"
          >
            Reset to defaults
          </Button>
          <Button disabled={isSaving} onClick={() => void save(draft)} type="button" variant="primary">
            {isSaving ? "Saving…" : "Save standard print sizes"}
          </Button>
        </div>

        {saved && !error ? (
          <p aria-live="polite" className="auth-message auth-message-success">
            Standard print sizes saved.
          </p>
        ) : null}
        {error ? (
          <p className="auth-message auth-message-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
