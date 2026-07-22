/** Portal/Studio light `--color-artwork-preview-bg` — default mat + OG letterbox. */
export const ARTWORK_BACKGROUND_PRESET_GREY = "#e5e7eb";

/** Optional dark mat for light artwork. */
export const ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK = "#2c2d2d";

/** Optional white mat for dark / halftone artwork (AI analysis + display). */
export const ARTWORK_BACKGROUND_PRESET_WHITE = "#ffffff";

/**
 * Default AI analysis canvas when `artworkBackgroundHex` is unset.
 * Intentionally different from display grey (`#e5e7eb`) so auto-processing stays mid-grey.
 */
export const AI_ANALYSIS_CANVAS_DEFAULT_HEX = "#808080";

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

/**
 * Normalize user/staff input to `#rrggbb` (lowercase), or null if invalid.
 * Accepts with or without leading `#`; trims whitespace.
 */
export function normalizeArtworkBackgroundHex(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!HEX_PATTERN.test(withHash)) {
    return null;
  }
  return withHash;
}

/** Always returns a safe CSS hex — default grey when missing/invalid. */
export function resolveArtworkBackgroundHex(value: unknown): string {
  return normalizeArtworkBackgroundHex(value) ?? ARTWORK_BACKGROUND_PRESET_GREY;
}

/** True when the resolved color is the default grey (field may be omitted in Firestore). */
export function isDefaultArtworkBackgroundHex(value: unknown): boolean {
  return resolveArtworkBackgroundHex(value) === ARTWORK_BACKGROUND_PRESET_GREY;
}

/** Six-char lowercase hex without `#` for OG URL cache-bust query params. */
export function artworkBackgroundHexForOgQuery(value: unknown): string {
  return resolveArtworkBackgroundHex(value).slice(1);
}

export function artworkBackgroundHexToRgb(value: unknown): { r: number; g: number; b: number } {
  const hex = resolveArtworkBackgroundHex(value).slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function hexToRgba(hex: string): { r: number; g: number; b: number; alpha: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
    alpha: 1,
  };
}

/**
 * Sharp-compatible background for AI analysis compositing.
 * When `artworkBackgroundHex` is missing/invalid → mid-grey `#808080` (auto-processing default).
 * When set → that exact color (including display grey `#e5e7eb` if explicitly stored — rare).
 */
export function resolveAiAnalysisBackground(
  artworkBackgroundHex?: unknown,
): { r: number; g: number; b: number; alpha: number } {
  const normalized = normalizeArtworkBackgroundHex(artworkBackgroundHex);
  if (!normalized) {
    return hexToRgba(AI_ANALYSIS_CANVAS_DEFAULT_HEX);
  }
  return hexToRgba(normalized);
}
