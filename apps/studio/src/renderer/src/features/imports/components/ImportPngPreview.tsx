import { ImageOff } from "lucide-react";

import type {
  ImportItemBackgroundOverride,
  ImportItemHalftoneOverride,
} from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import { resolveImportPreviewBackgroundCssHex } from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";
import type {
  ImportArtworkBackgroundMode,
  ImportHalftoneMode,
} from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";

import { ImportPreviewControls } from "./ImportPreviewControls";

interface ImportPngPreviewProps {
  alt: string;
  autoSuggestsDark?: boolean;
  backgroundMode?: ImportArtworkBackgroundMode;
  halftoneMode?: ImportHalftoneMode;
  itemBackgroundOverride?: ImportItemBackgroundOverride;
  itemHalftoneOverride?: ImportItemHalftoneOverride;
  onItemBackgroundOverrideChange?: (value: ImportItemBackgroundOverride) => void;
  onItemHalftoneOverrideChange?: (value: ImportItemHalftoneOverride) => void;
  onPreviewClick?: () => void;
  previewDataUrl: string | null;
  showBackgroundPicker?: boolean;
}

export function ImportPngPreview({
  alt,
  autoSuggestsDark = false,
  backgroundMode = "auto",
  halftoneMode = "normal",
  itemBackgroundOverride = "auto",
  itemHalftoneOverride = "auto",
  onItemBackgroundOverrideChange,
  onItemHalftoneOverrideChange,
  onPreviewClick,
  previewDataUrl,
  showBackgroundPicker = false,
}: ImportPngPreviewProps) {
  const isClickable = Boolean(previewDataUrl && onPreviewClick);
  const matHex = resolveImportPreviewBackgroundCssHex({
    backgroundMode,
    halftoneMode,
    autoSuggestsDark,
    itemBackgroundOverride,
    itemHalftoneOverride,
  });

  const showControls =
    showBackgroundPicker ||
    Boolean(onItemBackgroundOverrideChange) ||
    Boolean(onItemHalftoneOverrideChange);

  return (
    <div className="import-png-preview-shell">
      {showControls ? (
        <ImportPreviewControls
          autoSuggestsDark={autoSuggestsDark}
          backgroundMode={backgroundMode}
          backgroundPickerDisabled={!previewDataUrl}
          halftoneMode={halftoneMode}
          itemBackgroundOverride={itemBackgroundOverride}
          itemHalftoneOverride={itemHalftoneOverride}
          onItemBackgroundOverrideChange={onItemBackgroundOverrideChange}
          onItemHalftoneOverrideChange={onItemHalftoneOverrideChange}
          showBackgroundPicker={
            showBackgroundPicker && Boolean(onItemBackgroundOverrideChange)
          }
        />
      ) : null}
      <div className="import-png-preview" style={{ background: matHex }}>
        {previewDataUrl ? (
          <button
            aria-label="Open preview"
            className="import-png-preview-button"
            disabled={!isClickable}
            onClick={onPreviewClick}
            style={{ background: matHex }}
            type="button"
          >
            <img
              alt={alt}
              className="import-png-preview-image"
              src={previewDataUrl}
              style={{ background: matHex }}
            />
          </button>
        ) : (
          <div aria-hidden="true" className="import-png-preview-fallback">
            <ImageOff size={32} strokeWidth={1.5} />
            <span>Preview unavailable</span>
          </div>
        )}
      </div>
    </div>
  );
}
