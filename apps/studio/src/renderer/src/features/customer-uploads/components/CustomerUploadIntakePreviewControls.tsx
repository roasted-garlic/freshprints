import { useCallback, useMemo } from "react";

import type { ArtworkBackgroundSource } from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import {
  resolveImportArtworkBackgroundDecision,
  type ImportItemBackgroundOverride,
  type ImportItemHalftoneOverride,
} from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";

import { ImportPreviewControls } from "../../imports/components/ImportPreviewControls";
import { resolveCustomerUploadBackgroundOverride } from "../utils/customerUploadPreviewBackground";

interface CustomerUploadIntakePreviewControlsProps {
  artworkBackgroundHex?: string | null;
  artworkBackgroundSource?: ArtworkBackgroundSource | null;
  className?: string;
  disabled?: boolean;
  /** Explicit staff Halftone decision (authoritative boolean). */
  halftoneOn: boolean;
  onArtworkBackgroundChange: (
    hex: string | null,
    source: ArtworkBackgroundSource | null,
  ) => void;
  onHalftoneChange: (value: boolean) => void;
}

/**
 * Studio intake Halftone + Artwork Background — same pill controls as Imports
 * (`ImportPreviewControls` inline: Auto / Light / Dark / Halftone).
 */
export function CustomerUploadIntakePreviewControls({
  artworkBackgroundHex,
  artworkBackgroundSource,
  className,
  disabled = false,
  halftoneOn,
  onArtworkBackgroundChange,
  onHalftoneChange,
}: CustomerUploadIntakePreviewControlsProps) {
  const backgroundValue = useMemo(
    () => resolveCustomerUploadBackgroundOverride(artworkBackgroundHex, artworkBackgroundSource),
    [artworkBackgroundHex, artworkBackgroundSource],
  );

  const handleBackgroundChange = useCallback(
    (value: ImportItemBackgroundOverride) => {
      if (value === "auto") {
        onArtworkBackgroundChange(null, null);
        return;
      }
      const decision = resolveImportArtworkBackgroundDecision({
        backgroundMode: "auto",
        halftoneMode: "normal",
        autoSuggestsDark: false,
        itemBackgroundOverride: value,
      });
      onArtworkBackgroundChange(decision.hex, "staff_manual");
    },
    [onArtworkBackgroundChange],
  );

  const handleHalftoneChange = useCallback(
    (value: ImportItemHalftoneOverride) => {
      onHalftoneChange(value === "on");
    },
    [onHalftoneChange],
  );

  return (
    <div className={`customer-upload-intake-preview-controls ${className ?? ""}`.trim()}>
      <ImportPreviewControls
        autoSuggestsDark={false}
        backgroundMode="auto"
        controlsDisabled={disabled}
        halftoneMode="normal"
        itemBackgroundOverride={backgroundValue}
        itemHalftoneOverride={halftoneOn ? "on" : "off"}
        layout="inline"
        onItemBackgroundOverrideChange={handleBackgroundChange}
        onItemHalftoneOverrideChange={handleHalftoneChange}
      />
    </div>
  );
}
