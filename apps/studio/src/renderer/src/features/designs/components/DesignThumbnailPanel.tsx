import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { ImageIcon } from "lucide-react";

import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { useDesignDerivativeUrl } from "../hooks/useDesignDerivativeUrl";

interface DesignThumbnailPanelProps {
  alt: string;
  catalogPath?: string;
  className?: string;
  decorative?: boolean;
  fallbackLabel?: string;
  imageFit?: "contain" | "cover";
  interactive?: boolean;
  borderless?: boolean;
  loadingLabel?: string;
  onImageClick?: (imageUrl: string) => void;
}

function isDirectRenderableUrl(path: string): boolean {
  return (
    path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")
  );
}

export function DesignThumbnailPanel({
  alt,
  catalogPath,
  className = "",
  decorative = false,
  fallbackLabel = "Preview Pending",
  imageFit = "contain",
  interactive = false,
  borderless = false,
  loadingLabel = "Loading preview",
  onImageClick,
}: DesignThumbnailPanelProps) {
  const trimmedPath = catalogPath?.trim() ?? "";
  const isDirectUrl = trimmedPath.length > 0 && isDirectRenderableUrl(trimmedPath);
  const { status, url } = useDesignDerivativeUrl(isDirectUrl ? undefined : trimmedPath || undefined);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const unavailableDescriptionId = useId();

  const resolvedUrl = isDirectUrl ? trimmedPath : url;
  const isResolvingUrl = !isDirectUrl && trimmedPath.length > 0 && status === "loading";
  const hasResolvedUrl = Boolean(resolvedUrl) && !imageLoadFailed;
  const isUnavailable = !trimmedPath || (!isResolvingUrl && !hasResolvedUrl);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [resolvedUrl, trimmedPath]);

  const panelClassName = [
    "design-thumbnail-panel",
    hasResolvedUrl ? "design-thumbnail-panel--resolved" : "",
    borderless ? "design-thumbnail-panel--borderless" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const imageAlt = decorative ? "" : alt;
  const isImageInteractive = interactive && Boolean(onImageClick) && hasResolvedUrl;

  const imageClassName = [
    "design-thumbnail-panel-image",
    imageFit === "cover" ? "design-thumbnail-panel-image--cover" : "",
    isImageInteractive ? "design-thumbnail-panel-image--interactive" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleImageClick() {
    if (!resolvedUrl || !onImageClick) {
      return;
    }

    onImageClick(resolvedUrl);
  }

  function handleImageKeyDown(event: KeyboardEvent<HTMLImageElement>) {
    if (!isImageInteractive) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleImageClick();
    }
  }

  return (
    <div
      aria-describedby={!decorative && isUnavailable ? unavailableDescriptionId : undefined}
      aria-hidden={decorative || undefined}
      aria-label={!decorative && !isUnavailable && !isResolvingUrl ? alt : undefined}
      aria-busy={isResolvingUrl || undefined}
      className={panelClassName}
      role={!decorative && isUnavailable ? "img" : undefined}
    >
      {hasResolvedUrl && resolvedUrl ? (
        <img
          alt={imageAlt}
          className={imageClassName}
          decoding="async"
          onClick={isImageInteractive ? handleImageClick : undefined}
          onError={() => setImageLoadFailed(true)}
          onKeyDown={isImageInteractive ? handleImageKeyDown : undefined}
          role={isImageInteractive ? "button" : undefined}
          src={resolvedUrl}
          tabIndex={isImageInteractive ? 0 : undefined}
        />
      ) : null}

      {isResolvingUrl ? (
        <div className="design-thumbnail-panel-state">
          <LoadingSpinner label={loadingLabel} />
        </div>
      ) : null}

      {isUnavailable ? (
        <div className="design-thumbnail-panel-state design-thumbnail-panel-fallback">
          <ImageIcon aria-hidden="true" className="design-thumbnail-panel-icon" size={28} strokeWidth={1.75} />
          <span
            className="design-thumbnail-panel-label"
            id={!decorative ? unavailableDescriptionId : undefined}
          >
            {fallbackLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
