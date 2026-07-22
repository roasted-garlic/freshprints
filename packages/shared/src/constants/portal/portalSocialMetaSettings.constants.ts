/** Firestore `settings/{id}` doc for Portal Open Graph defaults. */
export const PORTAL_SOCIAL_META_SETTINGS_DOC_ID = "portalSocialMeta";

export const PORTAL_SOCIAL_META_TITLE_MAX_LENGTH = 120;
export const PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH = 300;

/**
 * Defaults match Portal brand copy when settings doc is missing.
 * Kept in shared so Studio + Functions + Portal resolve the same fallbacks.
 */
export const DEFAULT_PORTAL_SOCIAL_META_TITLE = "Fresh Prints Request Portal";
export const DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION =
  "Browse the design library and submit print requests for Fresh Prints shows.";

/** Global non-design URLs: brand logo vs interval-rotated ready library image. */
export type PortalGlobalOgImageSource = "library" | "logo";

/**
 * How often the global library OG image index advances (plus salt).
 * UTC-aligned buckets — not “every share” (Facebook/WhatsApp cache by page URL).
 */
export type PortalLibraryOgRotationInterval =
  | "daily"
  | "hourly"
  | "5min"
  | "1min"
  | "30s";

export const PORTAL_LIBRARY_OG_ROTATION_INTERVALS: readonly PortalLibraryOgRotationInterval[] = [
  "daily",
  "hourly",
  "5min",
  "1min",
  "30s",
] as const;

/** Owner can bump this from Studio to force a new library pick without waiting for the next interval. */
export const PORTAL_LIBRARY_OG_ROTATION_SALT_MAX = 1_000_000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_FIVE_MIN = 5 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_THIRTY_SEC = 30 * 1000;

export interface PortalSocialMetaSettings {
  ogTitle: string;
  ogDescription: string;
  /**
   * When true, design (and library) OG images are letterboxed onto a 1200×630 canvas
   * so Facebook’s wide preview shows the full artwork.
   */
  letterboxOgImages: boolean;
  /** Non-design Portal URLs: rotate library designs on an interval, or always use brand logo. */
  globalOgImageSource: PortalGlobalOgImageSource;
  /** Library OG rotation cadence when `globalOgImageSource` is `library` (default hourly). */
  libraryOgRotationInterval: PortalLibraryOgRotationInterval;
  /**
   * Added into the rotation index so Studio can force a different library design
   * for testing without waiting for the next interval bucket.
   */
  libraryOgRotationSalt: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_PORTAL_SOCIAL_META_SETTINGS: Readonly<PortalSocialMetaSettings> = {
  ogTitle: DEFAULT_PORTAL_SOCIAL_META_TITLE,
  ogDescription: DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION,
  letterboxOgImages: true,
  globalOgImageSource: "library",
  libraryOgRotationInterval: "hourly",
  libraryOgRotationSalt: 0,
};

function clampText(value: unknown, maxLength: number, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return fallback;
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength).trimEnd() : trimmed;
}

function resolveLetterboxOgImages(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return DEFAULT_PORTAL_SOCIAL_META_SETTINGS.letterboxOgImages;
}

function resolveGlobalOgImageSource(value: unknown): PortalGlobalOgImageSource {
  if (value === "logo" || value === "library") {
    return value;
  }
  return DEFAULT_PORTAL_SOCIAL_META_SETTINGS.globalOgImageSource;
}

export function isPortalLibraryOgRotationInterval(
  value: unknown,
): value is PortalLibraryOgRotationInterval {
  return (
    value === "daily" ||
    value === "hourly" ||
    value === "5min" ||
    value === "1min" ||
    value === "30s"
  );
}

function resolveLibraryOgRotationInterval(value: unknown): PortalLibraryOgRotationInterval {
  if (isPortalLibraryOgRotationInterval(value)) {
    return value;
  }
  return DEFAULT_PORTAL_SOCIAL_META_SETTINGS.libraryOgRotationInterval;
}

function resolveLibraryOgRotationSalt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PORTAL_SOCIAL_META_SETTINGS.libraryOgRotationSalt;
  }
  const truncated = Math.trunc(value);
  if (truncated < 0) {
    return 0;
  }
  if (truncated > PORTAL_LIBRARY_OG_ROTATION_SALT_MAX) {
    return PORTAL_LIBRARY_OG_ROTATION_SALT_MAX;
  }
  return truncated;
}

export function resolvePortalSocialMetaSettings(value: unknown): PortalSocialMetaSettings {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const settings: PortalSocialMetaSettings = {
    ogTitle: clampText(data.ogTitle, PORTAL_SOCIAL_META_TITLE_MAX_LENGTH, DEFAULT_PORTAL_SOCIAL_META_TITLE),
    ogDescription: clampText(
      data.ogDescription,
      PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH,
      DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION,
    ),
    letterboxOgImages: resolveLetterboxOgImages(data.letterboxOgImages),
    globalOgImageSource: resolveGlobalOgImageSource(data.globalOgImageSource),
    libraryOgRotationInterval: resolveLibraryOgRotationInterval(data.libraryOgRotationInterval),
    libraryOgRotationSalt: resolveLibraryOgRotationSalt(data.libraryOgRotationSalt),
  };
  if (data.updatedAt !== undefined) {
    settings.updatedAt = data.updatedAt;
  }
  if (typeof data.updatedBy === "string" && data.updatedBy.trim()) {
    settings.updatedBy = data.updatedBy.trim();
  }
  return settings;
}

export type PortalSocialMetaSettingsInput = {
  ogTitle: string;
  ogDescription: string;
  letterboxOgImages: boolean;
  globalOgImageSource: PortalGlobalOgImageSource;
  libraryOgRotationInterval: PortalLibraryOgRotationInterval;
  libraryOgRotationSalt: number;
};

export function parsePortalSocialMetaSettingsInput(
  value: unknown,
): PortalSocialMetaSettingsInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (typeof data.ogTitle !== "string" || typeof data.ogDescription !== "string") {
    return null;
  }
  const ogTitle = data.ogTitle.trim().replace(/\s+/g, " ");
  const ogDescription = data.ogDescription.trim().replace(/\s+/g, " ");
  if (
    !ogTitle ||
    !ogDescription ||
    ogTitle.length > PORTAL_SOCIAL_META_TITLE_MAX_LENGTH ||
    ogDescription.length > PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH
  ) {
    return null;
  }

  // Missing toggles → defaults (backward compatible with title/description-only clients).
  const letterboxOgImages =
    typeof data.letterboxOgImages === "boolean"
      ? data.letterboxOgImages
      : DEFAULT_PORTAL_SOCIAL_META_SETTINGS.letterboxOgImages;
  if (data.globalOgImageSource !== undefined && data.globalOgImageSource !== "library" && data.globalOgImageSource !== "logo") {
    return null;
  }
  const globalOgImageSource =
    data.globalOgImageSource === "logo" || data.globalOgImageSource === "library"
      ? data.globalOgImageSource
      : DEFAULT_PORTAL_SOCIAL_META_SETTINGS.globalOgImageSource;

  if (
    data.libraryOgRotationInterval !== undefined &&
    !isPortalLibraryOgRotationInterval(data.libraryOgRotationInterval)
  ) {
    return null;
  }
  const libraryOgRotationInterval = resolveLibraryOgRotationInterval(data.libraryOgRotationInterval);

  if (data.libraryOgRotationSalt !== undefined) {
    if (
      typeof data.libraryOgRotationSalt !== "number" ||
      !Number.isFinite(data.libraryOgRotationSalt) ||
      !Number.isInteger(data.libraryOgRotationSalt) ||
      data.libraryOgRotationSalt < 0 ||
      data.libraryOgRotationSalt > PORTAL_LIBRARY_OG_ROTATION_SALT_MAX
    ) {
      return null;
    }
  }
  const libraryOgRotationSalt =
    typeof data.libraryOgRotationSalt === "number"
      ? data.libraryOgRotationSalt
      : DEFAULT_PORTAL_SOCIAL_META_SETTINGS.libraryOgRotationSalt;

  return {
    ogTitle,
    ogDescription,
    letterboxOgImages,
    globalOgImageSource,
    libraryOgRotationInterval,
    libraryOgRotationSalt,
  };
}

/** Newest-ready sample size for global OG image rotation. */
export const PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE = 40;

export function libraryOgRotationIntervalMs(interval: PortalLibraryOgRotationInterval): number {
  switch (interval) {
    case "daily":
      return MS_PER_DAY;
    case "hourly":
      return MS_PER_HOUR;
    case "5min":
      return MS_PER_FIVE_MIN;
    case "1min":
      return MS_PER_MINUTE;
    case "30s":
      return MS_PER_THIRTY_SEC;
  }
}

/**
 * Pick a stable index into a sample for the given UTC-aligned interval bucket.
 * `rotationSalt` shifts the pick so Studio can force a new design without waiting.
 */
export function pickLibraryOgRotatedIndex(
  sampleSize: number,
  nowMs: number = Date.now(),
  rotationSalt: number = 0,
  interval: PortalLibraryOgRotationInterval = "hourly",
): number {
  if (sampleSize <= 0) {
    return 0;
  }
  const bucket = Math.floor(nowMs / libraryOgRotationIntervalMs(interval));
  const salt = Number.isFinite(rotationSalt) ? Math.trunc(rotationSalt) : 0;
  const raw = bucket + salt;
  return ((raw % sampleSize) + sampleSize) % sampleSize;
}

/**
 * Pick a stable hourly index into a sample (cache-friendly rotation).
 * Thin wrapper around `pickLibraryOgRotatedIndex(..., "hourly")`.
 */
export function pickHourlyRotatedIndex(
  sampleSize: number,
  nowMs: number = Date.now(),
  rotationSalt: number = 0,
): number {
  return pickLibraryOgRotatedIndex(sampleSize, nowMs, rotationSalt, "hourly");
}

/** Query value for letterboxed OG image Function URLs (Facebook cache separation). */
export const PORTAL_OG_IMAGE_FIT_CONTAIN = "contain";
export const PORTAL_OG_IMAGE_FIT_RAW = "raw";

/**
 * Default letterbox canvas background hex (no `#`) — Portal `--color-artwork-preview-bg`.
 * Prefer per-design `artworkBackgroundHex` when building URLs; this remains the fallback.
 */
export const PORTAL_OG_LETTERBOX_BG_HEX = "e5e7eb";
