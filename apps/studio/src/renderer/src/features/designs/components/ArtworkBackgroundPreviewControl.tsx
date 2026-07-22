import { useEffect, useId, useRef, useState } from "react";

import type { ArtworkBackgroundPreset } from "../types/designForm.types";
import type { ArtworkBackgroundFieldsValues } from "./ArtworkBackgroundFields";
import { resolveFormArtworkBackgroundHex } from "../utils/designFormMapper";

const PRESET_BUTTONS: { label: string; value: ArtworkBackgroundPreset }[] = [
  { label: "Grey", value: "grey" },
  { label: "Dark", value: "lightBlack" },
  { label: "White", value: "white" },
  { label: "Custom", value: "custom" },
];

interface ArtworkBackgroundPreviewControlProps {
  disabled?: boolean;
  isSaving?: boolean;
  onChange: (values: ArtworkBackgroundFieldsValues) => void;
  values: ArtworkBackgroundFieldsValues;
}

export function ArtworkBackgroundPreviewControl({
  disabled = false,
  isSaving = false,
  onChange,
  values,
}: ArtworkBackgroundPreviewControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  /** Local "Custom" mode so the hex field appears before a valid color is saved. */
  const [isChoosingCustom, setIsChoosingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState(values.artworkBackgroundCustomHex);
  const [localError, setLocalError] = useState<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const showCustomField = values.artworkBackgroundPreset === "custom" || isChoosingCustom;
  const previewBg = resolveFormArtworkBackgroundHex({
    title: "",
    description: "",
    categoryId: "",
    tagsInput: "",
    ...values,
    ...(isChoosingCustom && customDraft.trim()
      ? { artworkBackgroundPreset: "custom" as const, artworkBackgroundCustomHex: customDraft }
      : {}),
  });

  useEffect(() => {
    setCustomDraft(values.artworkBackgroundCustomHex);
    if (values.artworkBackgroundPreset !== "custom") {
      setIsChoosingCustom(false);
    }
  }, [values.artworkBackgroundCustomHex, values.artworkBackgroundPreset]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setLocalError(null);
        if (values.artworkBackgroundPreset !== "custom") {
          setIsChoosingCustom(false);
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setLocalError(null);
        if (values.artworkBackgroundPreset !== "custom") {
          setIsChoosingCustom(false);
        }
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, values.artworkBackgroundPreset]);

  useEffect(() => {
    if (!isOpen || !showCustomField) {
      return;
    }
    customInputRef.current?.focus();
    customInputRef.current?.select();
  }, [isOpen, showCustomField]);

  function applyCustomHex() {
    const trimmed = customDraft.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
      setLocalError("Enter a valid #RRGGBB color, then Apply.");
      return;
    }
    const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    setLocalError(null);
    setCustomDraft(normalized);
    onChange({
      artworkBackgroundPreset: "custom",
      artworkBackgroundCustomHex: normalized,
    });
    setIsChoosingCustom(false);
    setIsOpen(false);
  }

  return (
    <div className="artwork-bg-preview-control" ref={shellRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Artwork background"
        className="artwork-bg-preview-control-trigger"
        disabled={disabled || isSaving}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span
          aria-hidden="true"
          className="artwork-bg-preview-control-swatch"
          style={{ backgroundColor: previewBg }}
        />
        <span className="artwork-bg-preview-control-label">BG</span>
      </button>

      {isOpen ? (
        <div
          className="artwork-bg-preview-control-menu"
          id={menuId}
          role="dialog"
          aria-label="Choose artwork background"
        >
          <p className="artwork-bg-preview-control-hint">
            Preview mat and AI analysis canvas. Saved on the design.
          </p>
          <div className="artwork-bg-preview-control-presets" role="group" aria-label="Presets">
            {PRESET_BUTTONS.map((preset) => {
              const isActive =
                preset.value === "custom"
                  ? showCustomField
                  : !isChoosingCustom && values.artworkBackgroundPreset === preset.value;

              return (
                <button
                  className={
                    isActive
                      ? "artwork-bg-preview-control-preset artwork-bg-preview-control-preset--active"
                      : "artwork-bg-preview-control-preset"
                  }
                  disabled={disabled || isSaving}
                  key={preset.value}
                  onClick={() => {
                    if (preset.value === "custom") {
                      setIsChoosingCustom(true);
                      setLocalError(null);
                      return;
                    }
                    setIsChoosingCustom(false);
                    setLocalError(null);
                    onChange({
                      artworkBackgroundPreset: preset.value,
                      artworkBackgroundCustomHex: "",
                    });
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {showCustomField ? (
            <label className="artwork-bg-preview-control-custom">
              <span>Custom hex</span>
              <input
                disabled={disabled || isSaving}
                onChange={(event) => {
                  setCustomDraft(event.target.value);
                  setLocalError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyCustomHex();
                  }
                }}
                placeholder="#ffffff"
                ref={customInputRef}
                type="text"
                value={customDraft}
              />
              <button disabled={disabled || isSaving} onClick={applyCustomHex} type="button">
                Apply
              </button>
            </label>
          ) : null}
          {localError ? (
            <p className="artwork-bg-preview-control-error" role="alert">
              {localError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
