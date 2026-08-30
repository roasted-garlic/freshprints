'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import {
  STANDARD_PRINT_SIZE_PLACEMENT_ORDER,
  findStandardPrintSizePreset,
  formatStandardPrintSizeSelectionLabel,
  getDefaultStandardPrintSizeGroupId,
  listEnabledStandardPrintSizePlacements,
  shouldShowStandardPrintSizeGroupSubTabs,
  type StandardPrintSizeGroupId,
  type StandardPrintSizePlacementId,
  type StandardPrintSizePresetKey,
  type StandardPrintSizesSettings,
} from '@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants';
import { applyStandardPrintSizePreset } from '@fresh-prints/shared/utils/applyStandardPrintSizePreset';
import { formatPrintRequestItemSizeLabel } from '@fresh-prints/shared/utils/printRequestItemSizing';

interface PortalStandardPrintSizesModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StandardPrintSizesSettings;
  currentPrintWidthInches: number;
  currentPrintHeightInches: number;
  pixelWidth: number;
  pixelHeight: number;
  approvedMaxPrintWidthInches?: number | null;
  approvedMaxPrintHeightInches?: number | null;
  wasUpscaled?: boolean | null;
  onApply: (input: {
    printWidthInches: number;
    printHeightInches: number;
    standardSizePresetKey: StandardPrintSizePresetKey;
  }) => void;
}

function formatInch(value: number): string {
  return `${value}"`;
}

export function PortalStandardPrintSizesModal({
  approvedMaxPrintHeightInches,
  approvedMaxPrintWidthInches,
  currentPrintHeightInches,
  currentPrintWidthInches,
  isOpen,
  onApply,
  onClose,
  pixelHeight,
  pixelWidth,
  settings,
  wasUpscaled,
}: PortalStandardPrintSizesModalProps) {
  const enabledPlacements = useMemo(
    () => listEnabledStandardPrintSizePlacements(settings),
    [settings],
  );
  const [activePlacementId, setActivePlacementId] = useState<StandardPrintSizePlacementId>(
    enabledPlacements[0]?.id ?? STANDARD_PRINT_SIZE_PLACEMENT_ORDER[0],
  );
  const [activeGroupId, setActiveGroupId] = useState<StandardPrintSizeGroupId>('adult');
  const [selectedPresetKey, setSelectedPresetKey] = useState<StandardPrintSizePresetKey | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const firstPlacement = enabledPlacements[0]?.id ?? STANDARD_PRINT_SIZE_PLACEMENT_ORDER[0];
    setActivePlacementId(firstPlacement);
    setActiveGroupId(getDefaultStandardPrintSizeGroupId(firstPlacement));
    setSelectedPresetKey(null);
  }, [enabledPlacements, isOpen]);

  const activePlacement =
    enabledPlacements.find((placement) => placement.id === activePlacementId) ??
    enabledPlacements[0];

  useEffect(() => {
    if (!activePlacement) {
      return;
    }
    const defaultGroupId = getDefaultStandardPrintSizeGroupId(activePlacement.id);
    const hasActiveGroup = activePlacement.groups.some((group) => group.id === activeGroupId);
    if (!hasActiveGroup) {
      setActiveGroupId(defaultGroupId);
    }
  }, [activeGroupId, activePlacement]);

  const activeGroup =
    activePlacement?.groups.find((group) => group.id === activeGroupId) ?? activePlacement?.groups[0];

  const showGroupSubTabs = shouldShowStandardPrintSizeGroupSubTabs(activePlacement);

  const selectedPreset = findStandardPrintSizePreset(settings, selectedPresetKey);
  const preview = selectedPreset
    ? applyStandardPrintSizePreset({
        presetWidthInches: selectedPreset.widthInches,
        pixelWidth,
        pixelHeight,
        approvedMaxPrintWidthInches: approvedMaxPrintWidthInches ?? undefined,
        approvedMaxPrintHeightInches: approvedMaxPrintHeightInches ?? undefined,
        wasUpscaled: wasUpscaled ?? undefined,
      })
    : null;

  const selectionLabel = formatStandardPrintSizeSelectionLabel(settings, selectedPresetKey);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="portal-standard-print-sizes-modal-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-panel standard-print-sizes-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header standard-print-sizes-modal-header">
          <h2 id="portal-standard-print-sizes-modal-title">Standard Sizes</h2>
          <button aria-label="Close" className="modal-close-button" onClick={onClose} type="button">
            <X aria-hidden size={18} />
          </button>
        </header>

        <div className="standard-print-sizes-tabs" role="tablist">
          {enabledPlacements.map((placement) => (
            <button
              key={placement.id}
              aria-selected={activePlacement?.id === placement.id}
              className={`standard-print-sizes-tab${
                activePlacement?.id === placement.id ? ' is-active' : ''
              }`}
              onClick={() => {
                setActivePlacementId(placement.id);
                setActiveGroupId(getDefaultStandardPrintSizeGroupId(placement.id));
                setSelectedPresetKey(null);
              }}
              role="tab"
              type="button"
            >
              {placement.label}
            </button>
          ))}
        </div>

        {showGroupSubTabs ? (
          <div
            aria-label={`${activePlacement?.label ?? 'Placement'} size groups`}
            className="standard-print-sizes-subtabs"
            role="tablist"
          >
            {activePlacement?.groups.map((group) => (
              <button
                key={group.id}
                aria-selected={activeGroup?.id === group.id}
                className={`standard-print-sizes-subtab${
                  activeGroup?.id === group.id ? ' is-active' : ''
                }`}
                onClick={() => {
                  setActiveGroupId(group.id);
                  setSelectedPresetKey(null);
                }}
                role="tab"
                type="button"
              >
                {group.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="modal-body standard-print-sizes-modal-body">
          <p className="standard-print-sizes-helper">
            Select a standard print width. Height will adjust automatically to preserve the
            artwork&apos;s proportions.
          </p>

          {activeGroup ? (
            <section
              key={`${activePlacement?.id}-${activeGroup.id}`}
              className="standard-print-sizes-group"
            >
              <h3 className="standard-print-sizes-group-title">{activeGroup.label}</h3>
              <div className="standard-print-sizes-preset-grid">
                {activeGroup.presets
                  .filter((preset) => preset.enabled)
                  .map((preset) => {
                    const isSelected = selectedPresetKey === preset.key;
                    return (
                      <button
                        key={preset.key}
                        className={`standard-print-sizes-preset-tile${
                          isSelected ? ' is-selected' : ''
                        }`}
                        onClick={() => setSelectedPresetKey(preset.key)}
                        type="button"
                      >
                        <span className="standard-print-sizes-preset-label">{preset.label}</span>
                        <span className="standard-print-sizes-preset-width">
                          {formatInch(preset.widthInches)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </section>
          ) : null}

          {preview && !preview.assessment.canSave ? (
            <p className="standard-print-sizes-error" role="alert">
              {preview.assessment.errorMessage ??
                'This preset cannot be applied with the current artwork size.'}
            </p>
          ) : null}
          {preview?.assessment.warningMessage ? (
            <p className="standard-print-sizes-warning" role="status">
              {preview.assessment.warningMessage}
            </p>
          ) : null}
        </div>

        <footer className="modal-footer standard-print-sizes-modal-footer">
          <div className="standard-print-sizes-footer-meta">
            <p>
              Current:{' '}
              {formatPrintRequestItemSizeLabel(currentPrintWidthInches, currentPrintHeightInches)}
            </p>
            {preview ? (
              <p>
                Selected:{' '}
                {formatPrintRequestItemSizeLabel(
                  preview.printWidthInches,
                  preview.printHeightInches,
                )}
                {selectionLabel ? ` · ${selectionLabel}` : ''}
              </p>
            ) : null}
          </div>
          <div className="standard-print-sizes-footer-actions">
            <button
              className="portal-button portal-button-secondary"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              disabled={!preview || !preview.assessment.canSave || !selectedPresetKey}
              onClick={() => {
                if (!preview || !selectedPresetKey) {
                  return;
                }
                onApply({
                  printWidthInches: preview.printWidthInches,
                  printHeightInches: preview.printHeightInches,
                  standardSizePresetKey: selectedPresetKey,
                });
                onClose();
              }}
              type="button"
            >
              Apply
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function resolveStandardPrintSizeCardLabel(
  settings: StandardPrintSizesSettings,
  presetKey?: string | null,
): string {
  const compact = formatStandardPrintSizeSelectionLabel(settings, presetKey, { compact: true });
  return compact ? `Standard Sizes · ${compact}` : 'Standard Sizes';
}
