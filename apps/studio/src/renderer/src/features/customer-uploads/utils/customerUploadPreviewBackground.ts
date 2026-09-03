import type { ArtworkBackgroundSource } from "@fresh-prints/shared/types/design/artworkBackgroundSource.types";
import { ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK } from "@fresh-prints/shared/constants/design/artworkBackground.constants";
import {
  resolveImportPreviewBackgroundCssHex,
  type ImportItemBackgroundOverride,
} from "@fresh-prints/shared/utils/resolveImportArtworkBackgroundDecision";

export function resolveCustomerUploadBackgroundOverride(
  artworkBackgroundHex: string | null | undefined,
  artworkBackgroundSource: ArtworkBackgroundSource | null | undefined,
): ImportItemBackgroundOverride {
  if (!artworkBackgroundSource) {
    return "auto";
  }
  if (artworkBackgroundSource === "staff_manual") {
    if (artworkBackgroundHex === ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK) {
      return "dark";
    }
    return "light";
  }
  return "auto";
}

export function resolveCustomerUploadPreviewBackgroundHex(input: {
  artworkBackgroundHex: string | null | undefined;
  artworkBackgroundSource: ArtworkBackgroundSource | null | undefined;
  halftoneOn: boolean;
}): string {
  return resolveImportPreviewBackgroundCssHex({
    autoSuggestsDark: false,
    backgroundMode: "auto",
    halftoneMode: "normal",
    itemBackgroundOverride: resolveCustomerUploadBackgroundOverride(
      input.artworkBackgroundHex,
      input.artworkBackgroundSource,
    ),
    itemHalftoneOverride: input.halftoneOn ? "on" : "off",
  });
}
