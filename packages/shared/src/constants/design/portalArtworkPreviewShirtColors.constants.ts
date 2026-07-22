import {
  ARTWORK_BACKGROUND_PRESET_GREY,
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  normalizeArtworkBackgroundHex,
} from "./artworkBackground.constants";

/**
 * Customer-facing temporary preview mats for Portal design details.
 * Staff-persisted defaults (app grey / light black) plus common garment colors
 * suitable as DTF/print mock backgrounds (no neon spam).
 */
export interface PortalArtworkPreviewShirtColor {
  /** Stable id for React keys / selection. */
  id: string;
  /** Short customer-facing label. */
  label: string;
  /** `#rrggbb` lowercase. */
  hex: string;
}

export const PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS: readonly PortalArtworkPreviewShirtColor[] = [
  { id: "app-grey", label: "App grey", hex: ARTWORK_BACKGROUND_PRESET_GREY },
  { id: "light-black", label: "Light black", hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK },
  { id: "white", label: "White", hex: "#ffffff" },
  { id: "soft-black", label: "Soft black", hex: "#1a1a1a" },
  { id: "heather", label: "Heather grey", hex: "#9ca3af" },
  { id: "charcoal", label: "Charcoal", hex: "#4b5563" },
  { id: "cream", label: "Cream", hex: "#f5f0e6" },
  { id: "navy", label: "Navy", hex: "#1e3a5f" },
  { id: "royal", label: "Royal blue", hex: "#2f5aa8" },
  { id: "forest", label: "Forest", hex: "#1f4d3a" },
  { id: "burgundy", label: "Burgundy", hex: "#7f1d1d" },
  { id: "red", label: "Red", hex: "#b91c1c" },
  { id: "soft-pink", label: "Soft pink", hex: "#f5c6d0" },
  { id: "mustard", label: "Mustard", hex: "#c4a035" },
  { id: "olive", label: "Olive", hex: "#556b2f" },
  { id: "sand", label: "Sand", hex: "#d6c3a8" },
] as const;

/** Find a palette entry by normalized hex, if any. */
export function findPortalArtworkPreviewShirtColorByHex(
  hex: unknown,
): PortalArtworkPreviewShirtColor | undefined {
  const normalized = normalizeArtworkBackgroundHex(hex);
  if (!normalized) {
    return undefined;
  }
  return PORTAL_ARTWORK_PREVIEW_SHIRT_COLORS.find((entry) => entry.hex === normalized);
}
