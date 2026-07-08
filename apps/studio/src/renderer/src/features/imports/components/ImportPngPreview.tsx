import { ImageOff } from "lucide-react";

interface ImportPngPreviewProps {
  alt: string;
  onPreviewClick?: () => void;
  previewDataUrl: string | null;
}

export function ImportPngPreview({ alt, onPreviewClick, previewDataUrl }: ImportPngPreviewProps) {
  const isClickable = Boolean(previewDataUrl && onPreviewClick);

  return (
    <div className="import-png-preview">
      {previewDataUrl ? (
        <button
          aria-label="Open preview"
          className="import-png-preview-button"
          disabled={!isClickable}
          onClick={onPreviewClick}
          type="button"
        >
          <img alt={alt} className="import-png-preview-image" src={previewDataUrl} />
        </button>
      ) : (
        <div aria-hidden="true" className="import-png-preview-fallback">
          <ImageOff size={32} strokeWidth={1.5} />
          <span>Preview unavailable</span>
        </div>
      )}
    </div>
  );
}
