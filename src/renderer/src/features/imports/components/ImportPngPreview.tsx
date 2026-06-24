import { ImageOff } from "lucide-react";

interface ImportPngPreviewProps {
  alt: string;
  previewDataUrl: string | null;
}

export function ImportPngPreview({ alt, previewDataUrl }: ImportPngPreviewProps) {
  return (
    <div className="import-png-preview">
      {previewDataUrl ? (
        <img alt={alt} className="import-png-preview-image" src={previewDataUrl} />
      ) : (
        <div aria-hidden="true" className="import-png-preview-fallback">
          <ImageOff size={32} strokeWidth={1.5} />
          <span>Preview unavailable</span>
        </div>
      )}
    </div>
  );
}
