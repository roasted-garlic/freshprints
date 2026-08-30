import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import type {
  ImportItemBackgroundOverride,
  ImportItemHalftoneOverride,
} from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";

import { ImportArtworkBackgroundQuickPicker } from "./ImportArtworkBackgroundQuickPicker";
import { ImportHalftoneToggle } from "./ImportHalftoneToggle";

interface ImportPreviewControlsProps {
  autoSuggestsDark: boolean;
  backgroundMode: ImportArtworkBackgroundMode;
  backgroundPickerDisabled?: boolean;
  controlsDisabled?: boolean;
  halftoneMode: ImportHalftoneMode;
  itemBackgroundOverride: ImportItemBackgroundOverride;
  itemHalftoneOverride?: ImportItemHalftoneOverride;
  layout?: "stacked" | "inline";
  onItemBackgroundOverrideChange?: (value: ImportItemBackgroundOverride) => void;
  onItemHalftoneOverrideChange?: (value: ImportItemHalftoneOverride) => void;
  showBackgroundPicker?: boolean;
}

export function ImportPreviewControls({
  autoSuggestsDark,
  backgroundMode,
  backgroundPickerDisabled = false,
  controlsDisabled = false,
  halftoneMode,
  itemBackgroundOverride,
  itemHalftoneOverride = "auto",
  layout = "stacked",
  onItemBackgroundOverrideChange,
  onItemHalftoneOverrideChange,
  showBackgroundPicker = true,
}: ImportPreviewControlsProps) {
  const showHalftone = Boolean(onItemHalftoneOverrideChange);
  const showBackground =
    showBackgroundPicker && Boolean(onItemBackgroundOverrideChange);

  if (!showBackground && !showHalftone) {
    return null;
  }

  return (
    <div
      className={
        "import-preview-controls" + (layout === "inline" ? " is-inline" : "")
      }
    >
      {showBackground ? (
        <ImportArtworkBackgroundQuickPicker
          autoSuggestsDark={autoSuggestsDark}
          backgroundMode={backgroundMode}
          className="import-preview-controls-bg-picker"
          disabled={backgroundPickerDisabled || controlsDisabled}
          halftoneMode={halftoneMode}
          itemHalftoneOverride={itemHalftoneOverride}
          onChange={onItemBackgroundOverrideChange!}
          value={itemBackgroundOverride}
        />
      ) : null}
      {showHalftone ? (
        <ImportHalftoneToggle
          disabled={controlsDisabled}
          halftoneMode={halftoneMode}
          itemHalftoneOverride={itemHalftoneOverride}
          onChange={onItemHalftoneOverrideChange}
        />
      ) : null}
    </div>
  );
}
