'use client';

import { useEffect, useId, useState } from 'react';

import {
  normalizeArtworkBackgroundHex,
  resolveArtworkBackgroundHex,
} from '@fresh-prints/shared/constants/design/artworkBackground.constants';
import {
  findPortalArtworkPreviewShirtColorByHex,
  PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS,
} from '@fresh-prints/shared/constants/design/portalArtworkPreviewShirtColors.constants';

interface CatalogArtworkBackgroundPreviewPickerProps {
  /** Current temporary preview hex (`#rrggbb`). */
  previewHex: string;
  /** Design’s saved default (resolved) — used for Reset. */
  designDefaultHex: string;
  onPreviewHexChange: (hex: string) => void;
}

function isLightMatHex(hex: string): boolean {
  return hex === '#ffffff' || hex === '#f5f0e6' || hex === '#e5e7eb' || hex === '#f5c6d0' || hex === '#d6c3a8';
}

export function CatalogArtworkBackgroundPreviewPicker({
  previewHex,
  designDefaultHex,
  onPreviewHexChange,
}: CatalogArtworkBackgroundPreviewPickerProps) {
  const titleId = useId();
  const customInputId = useId();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [hexAtOpen, setHexAtOpen] = useState(resolveArtworkBackgroundHex(previewHex));
  const [customHexDraft, setCustomHexDraft] = useState(resolveArtworkBackgroundHex(previewHex));
  const [customHexError, setCustomHexError] = useState<string | null>(null);

  const resolvedPreview = resolveArtworkBackgroundHex(previewHex);
  const paletteMatch = findPortalArtworkPreviewShirtColorByHex(resolvedPreview);
  const designDefaultResolved = resolveArtworkBackgroundHex(designDefaultHex);
  const triggerLabel = paletteMatch?.label ?? `Custom ${resolvedPreview}`;

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    setCustomHexDraft(resolvedPreview);
    setCustomHexError(null);
  }, [isPickerOpen, resolvedPreview]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeKeepingPreview();
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isPickerOpen, resolvedPreview]);

  function openPicker() {
    const current = resolveArtworkBackgroundHex(previewHex);
    setHexAtOpen(current);
    setCustomHexDraft(current);
    setCustomHexError(null);
    setIsPickerOpen(true);
  }

  function closeKeepingPreview() {
    setIsPickerOpen(false);
    setCustomHexError(null);
  }

  function cancelPicker() {
    onPreviewHexChange(hexAtOpen);
    setCustomHexDraft(hexAtOpen);
    setCustomHexError(null);
    setIsPickerOpen(false);
  }

  function selectPaletteHex(hex: string) {
    const normalized = resolveArtworkBackgroundHex(hex);
    setCustomHexError(null);
    setCustomHexDraft(normalized);
    onPreviewHexChange(normalized);
  }

  function applyCustomHex(): boolean {
    const normalized = normalizeArtworkBackgroundHex(customHexDraft);
    if (!normalized) {
      setCustomHexError('Enter a valid hex color like #2c2d2d');
      return false;
    }
    setCustomHexError(null);
    setCustomHexDraft(normalized);
    onPreviewHexChange(normalized);
    return true;
  }

  function resetToDesignDefault() {
    setCustomHexError(null);
    setCustomHexDraft(designDefaultResolved);
    onPreviewHexChange(designDefaultResolved);
  }

  function donePicker() {
    const normalizedDraft = normalizeArtworkBackgroundHex(customHexDraft);
    if (customHexDraft.trim() && !normalizedDraft) {
      setCustomHexError('Enter a valid hex color like #2c2d2d');
      return;
    }
    if (normalizedDraft) {
      onPreviewHexChange(normalizedDraft);
    }
    closeKeepingPreview();
  }

  return (
    <>
      <button
        aria-expanded={isPickerOpen}
        aria-haspopup="dialog"
        aria-label={`Preview background: ${triggerLabel}`}
        className="design-details-bg-trigger"
        onClick={openPicker}
        title="Background Color (preview only)"
        type="button"
      >
        <span
          aria-hidden="true"
          className={[
            'design-details-bg-trigger-swatch',
            isLightMatHex(resolvedPreview) ? 'is-light' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ backgroundColor: resolvedPreview }}
        />
        <span className="design-details-bg-trigger-label">Background</span>
      </button>

      {isPickerOpen ? (
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="modal-overlay modal-overlay-blur design-details-bg-picker-overlay"
          onClick={closeKeepingPreview}
          role="dialog"
        >
          <div
            className="modal-panel design-details-bg-picker-panel"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            <div className="design-details-bg-picker-header">
              <h2 className="design-details-bg-picker-title" id={titleId}>
                Background Color
              </h2>
              <button
                aria-label="Close background picker"
                className="modal-close-button"
                onClick={closeKeepingPreview}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <p className="design-details-bg-picker-hint">
              Preview this design on another background. Pick a shirt color or enter a hex —
              preview only; nothing is saved.
            </p>

            <div
              aria-label="Shirt colors"
              className="design-details-bg-picker-swatches"
              role="listbox"
            >
              {PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS.map((color) => {
                const selected = paletteMatch?.id === color.id;
                return (
                  <button
                    aria-label={color.label}
                    aria-selected={selected}
                    className={[
                      'design-details-bg-picker-swatch',
                      selected ? 'is-selected' : '',
                      isLightMatHex(color.hex) ? 'is-light' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={color.id}
                    onClick={() => selectPaletteHex(color.hex)}
                    role="option"
                    style={{ backgroundColor: color.hex }}
                    title={`${color.label} (${color.hex})`}
                    type="button"
                  />
                );
              })}
            </div>

            <div className="design-details-bg-picker-custom">
              <label className="design-details-bg-picker-custom-label" htmlFor={customInputId}>
                Custom hex
              </label>
              <div className="design-details-bg-picker-custom-row">
                <input
                  aria-invalid={customHexError ? true : undefined}
                  className="design-details-bg-picker-custom-input"
                  id={customInputId}
                  onChange={(event) => {
                    setCustomHexDraft(event.target.value);
                    setCustomHexError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyCustomHex();
                    }
                  }}
                  placeholder="#2c2d2d"
                  spellCheck={false}
                  value={customHexDraft}
                />
                <button
                  className="portal-button portal-button-secondary portal-button-sm"
                  onClick={() => applyCustomHex()}
                  type="button"
                >
                  Apply
                </button>
              </div>
              {customHexError ? (
                <p className="design-details-bg-picker-error" role="alert">
                  {customHexError}
                </p>
              ) : null}
            </div>

            <div className="design-details-bg-picker-footer">
              <button
                className="portal-button portal-button-ghost portal-button-sm"
                disabled={resolvedPreview === designDefaultResolved}
                onClick={resetToDesignDefault}
                type="button"
              >
                Reset to design
              </button>
              <div className="design-details-bg-picker-footer-actions">
                <button
                  className="portal-button portal-button-secondary portal-button-sm"
                  onClick={cancelPicker}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="portal-button portal-button-primary portal-button-sm"
                  onClick={donePicker}
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
