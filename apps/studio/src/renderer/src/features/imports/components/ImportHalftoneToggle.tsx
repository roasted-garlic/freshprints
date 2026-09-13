import type { ImportHalftoneMode } from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import type { ImportItemHalftoneOverride } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import { resolveImportItemHalftoneEffective } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";

interface ImportHalftoneToggleProps {
  disabled?: boolean;
  halftoneMode: ImportHalftoneMode;
  itemHalftoneOverride?: ImportItemHalftoneOverride;
  onChange?: (value: ImportItemHalftoneOverride) => void;
}

export function ImportHalftoneToggle({
  disabled = false,
  halftoneMode,
  itemHalftoneOverride = "auto",
  onChange,
}: ImportHalftoneToggleProps) {
  const isActive = resolveImportItemHalftoneEffective({
    halftoneMode,
    itemHalftoneOverride,
  });
  const isInteractive = Boolean(onChange) && !disabled;

  return (
    <button
      aria-label={isActive ? "Halftone on" : "Halftone off"}
      aria-pressed={isActive}
      className={
        "import-preview-control-option import-halftone-toggle" +
        (isActive ? " is-selected" : "")
      }
      disabled={!isInteractive}
      onClick={() => {
        if (!onChange) {
          return;
        }
        onChange(isActive ? "off" : "on");
      }}
      type="button"
    >
      Halftone
    </button>
  );
}
