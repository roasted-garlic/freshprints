import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";

interface ImportSessionSettingsFormProps {
  backgroundMode: ImportArtworkBackgroundMode;
  disabled?: boolean;
  halftoneMode: ImportHalftoneMode;
  onBackgroundModeChange: (mode: ImportArtworkBackgroundMode) => void;
  onHalftoneModeChange: (mode: ImportHalftoneMode) => void;
}

const HALFTONE_OPTIONS: Array<{ mode: ImportHalftoneMode; label: string; hint: string }> = [
  {
    mode: "normal",
    label: "Normal",
    hint: "Do not mark imported designs as halftone.",
  },
  {
    mode: "all_halftones",
    label: "All halftones",
    hint: "Mark every design as halftone (staff decision). Uses a dark preview mat unless background is overridden.",
  },
];

const BACKGROUND_OPTIONS: Array<{
  mode: ImportArtworkBackgroundMode;
  label: string;
  hint: string;
}> = [
  {
    mode: "auto",
    label: "Auto",
    hint: "Code detects light artwork that needs a dark mat. Not a halftone setting.",
  },
  {
    mode: "all_light",
    label: "All light",
    hint: "Force the default light preview mat for every design.",
  },
  {
    mode: "all_dark",
    label: "All dark",
    hint: "Force the dark preview mat for every design. Does not mark designs as halftone.",
  },
];

/** Shared form body for Imports session settings (modal). Applies to single and batch. */
export function ImportSessionSettingsForm({
  backgroundMode,
  disabled = false,
  halftoneMode,
  onBackgroundModeChange,
  onHalftoneModeChange,
}: ImportSessionSettingsFormProps) {
  return (
    <div className="import-session-settings-form">
      <div className="import-session-settings-group">
        <p className="import-session-settings-label" id="import-session-halftone-label">
          Halftone
        </p>
        <p className="import-session-settings-help">
          Production / filter property — not the same as preview background. Applies to single and
          batch imports on this page visit.
        </p>
        <div
          aria-labelledby="import-session-halftone-label"
          className="import-session-settings-options"
          role="radiogroup"
        >
          {HALFTONE_OPTIONS.map((option) => (
            <button
              aria-checked={halftoneMode === option.mode}
              className={`import-session-settings-option${
                halftoneMode === option.mode ? " is-selected" : ""
              }`}
              disabled={disabled}
              key={option.mode}
              onClick={() => onHalftoneModeChange(option.mode)}
              role="radio"
              type="button"
            >
              <span>{option.label}</span>
              <span className="import-session-settings-option-hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="import-session-settings-group">
        <p className="import-session-settings-label" id="import-session-background-label">
          Artwork background
        </p>
        <p className="import-session-settings-help">
          Preview mat for visibility (e.g. white line art). Dark mat does not mean halftone. Applies
          to single and batch imports on this page visit.
        </p>
        <div
          aria-labelledby="import-session-background-label"
          className="import-session-settings-options"
          role="radiogroup"
        >
          {BACKGROUND_OPTIONS.map((option) => (
            <button
              aria-checked={backgroundMode === option.mode}
              className={`import-session-settings-option${
                backgroundMode === option.mode ? " is-selected" : ""
              }`}
              disabled={disabled}
              key={option.mode}
              onClick={() => onBackgroundModeChange(option.mode)}
              role="radio"
              type="button"
            >
              <span>{option.label}</span>
              <span className="import-session-settings-option-hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
