import type { ImportItemBackgroundOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import { resolveImportAutoResolvedMatLabel } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import type { ImportItemHalftoneOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";

interface ImportArtworkBackgroundQuickPickerProps {
  autoSuggestsDark: boolean;
  backgroundMode: ImportArtworkBackgroundMode;
  className?: string;
  disabled?: boolean;
  halftoneMode: ImportHalftoneMode;
  itemHalftoneOverride?: ImportItemHalftoneOverride;
  onChange: (value: ImportItemBackgroundOverride) => void;
  value: ImportItemBackgroundOverride;
}

const OPTIONS: Array<{ mode: ImportItemBackgroundOverride; label: string }> = [
  { mode: "auto", label: "Auto" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

export function ImportArtworkBackgroundQuickPicker({
  autoSuggestsDark,
  backgroundMode,
  className = "",
  disabled = false,
  halftoneMode,
  itemHalftoneOverride = "auto",
  onChange,
  value,
}: ImportArtworkBackgroundQuickPickerProps) {
  const autoResolved = resolveImportAutoResolvedMatLabel({
    backgroundMode,
    halftoneMode,
    autoSuggestsDark,
    itemHalftoneOverride,
  });

  return (
    <div
      aria-label="Artwork background"
      className={`import-artwork-bg-quick-picker ${className}`.trim()}
      role="group"
    >
      {OPTIONS.map((option) => {
        const isSelected = value === option.mode;
        const label =
          option.mode === "auto" ? `Auto · ${autoResolved}` : option.label;
        return (
          <button
            aria-pressed={isSelected}
            className={
              "import-preview-control-option import-artwork-bg-quick-picker-option" +
              (isSelected ? " is-selected" : "") +
              (option.mode === "dark" ? " is-dark-swatch" : "") +
              (option.mode === "light" ? " is-light-swatch" : "")
            }
            disabled={disabled}
            key={option.mode}
            onClick={() => onChange(option.mode)}
            type="button"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
