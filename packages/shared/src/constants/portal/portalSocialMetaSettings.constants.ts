/** Firestore `settings/{id}` doc for Portal Open Graph defaults. */
export const PORTAL_SOCIAL_META_SETTINGS_DOC_ID = "portalSocialMeta";

export const PORTAL_SOCIAL_META_TITLE_MAX_LENGTH = 120;
export const PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH = 300;

/**
 * Defaults match Portal brand copy when settings doc is missing.
 * Kept in shared so Studio + Functions + Portal resolve the same fallbacks.
 */
export const DEFAULT_PORTAL_SOCIAL_META_TITLE = "Fresh Prints Whatnot Request Portal";
export const DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION =
  "Browse the design library and submit print requests for Fresh Prints Whatnot shows.";

/** Global non-design URLs: brand logo, interval-rotated library, or a fixed static image. */
export type PortalGlobalOgImageSource = "library" | "logo" | "static";

/** How the static Global OG asset was selected when last saved. */
export type PortalStaticOgImageKind = "upload" | "design";

/**
 * Resolved static Global OG asset snapshot persisted at Save.
 * `downloadUrl` / `storagePath` remain for Studio preview + upload cleanup.
 * Crawler-facing Global OG Static always letterboxes via `getPortalOgShareImage`
 * (`designId` from `sourceDesignId`, or validated upload `staticPath`) — never raw URLs.
 */
export interface PortalStaticOgImageSnapshot {
  kind: PortalStaticOgImageKind;
  storagePath: string | null;
  downloadUrl: string | null;
  sourceDesignId: string | null;
}

/** Client → callable payload for changing or retaining the static OG asset. */
export type PortalStaticOgImageInput =
  | { kind: "upload"; storagePath: string }
  | { kind: "design"; sourceDesignId: string }
  | { kind: "retain" };

/** Max upload size for static Global OG images (5 MiB) — keep in sync with storage.rules. */
export const PORTAL_STATIC_OG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PORTAL_STATIC_OG_IMAGE_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type PortalStaticOgImageContentType =
  (typeof PORTAL_STATIC_OG_IMAGE_CONTENT_TYPES)[number];

const STATIC_OG_OBJECT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATIC_OG_EXT_BY_CONTENT_TYPE: Record<PortalStaticOgImageContentType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

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
   * Does **not** apply to Global OG Static Image mode — Static always letterboxes.
   */
  letterboxOgImages: boolean;
  /** Non-design Portal URLs: rotate library designs, brand logo, or a fixed static image. */
  globalOgImageSource: PortalGlobalOgImageSource;
  /** Library OG rotation cadence when `globalOgImageSource` is `library` (default hourly). */
  libraryOgRotationInterval: PortalLibraryOgRotationInterval;
  /**
   * Added into the rotation index so Studio can force a different library design
   * for testing without waiting for the next interval bucket.
   */
  libraryOgRotationSalt: number;
  /**
   * Resolved static OG asset when mode is (or was) `static`.
   * Retained when temporarily switching to library/logo so owners can switch back without re-upload.
   */
  staticOgImage: PortalStaticOgImageSnapshot | null;
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
  staticOgImage: null,
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
  if (value === "logo" || value === "library" || value === "static") {
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

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function resolvePortalStaticOgImageSnapshot(
  value: unknown,
): PortalStaticOgImageSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (data.kind !== "upload" && data.kind !== "design") {
    return null;
  }
  const storagePath = normalizeOptionalString(data.storagePath);
  const downloadUrl = normalizeOptionalString(data.downloadUrl);
  if (!storagePath && !downloadUrl) {
    return null;
  }
  if (downloadUrl && !downloadUrl.startsWith("https://")) {
    return null;
  }
  return {
    kind: data.kind,
    storagePath,
    downloadUrl,
    sourceDesignId: normalizeOptionalString(data.sourceDesignId),
  };
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
    staticOgImage: resolvePortalStaticOgImageSnapshot(data.staticOgImage),
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
  /**
   * Required when switching to / saving `static` without an existing snapshot.
   * `{ kind: "retain" }` keeps the previous resolved snapshot.
   */
  staticOgImage?: PortalStaticOgImageInput;
};

function isPortalStaticOgImageContentType(value: string): value is PortalStaticOgImageContentType {
  return (PORTAL_STATIC_OG_IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

/** Build Storage object path: `portal-social-meta/static-og/{uuid}.{ext}` (no leading slash). */
export function buildPortalStaticOgImageStoragePath(
  objectId: string,
  contentType: PortalStaticOgImageContentType,
): string {
  const id = objectId.trim().toLowerCase();
  if (!STATIC_OG_OBJECT_ID_PATTERN.test(id)) {
    throw new Error("Static OG object id must be a UUID.");
  }
  return `portal-social-meta/static-og/${id}.${STATIC_OG_EXT_BY_CONTENT_TYPE[contentType]}`;
}

/**
 * Normalize and validate a client-provided static OG upload path.
 * Returns the canonical path or null when invalid.
 */
export function parsePortalStaticOgImageStoragePath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/^\/+/, "").toLowerCase();
  const match = /^portal-social-meta\/static-og\/([0-9a-f-]{36})\.(png|jpg|jpeg|webp)$/.exec(
    normalized,
  );
  if (!match) {
    return null;
  }
  const objectId = match[1] ?? "";
  const ext = match[2] === "jpeg" ? "jpg" : (match[2] ?? "");
  if (!STATIC_OG_OBJECT_ID_PATTERN.test(objectId) || !ext) {
    return null;
  }
  return `portal-social-meta/static-og/${objectId}.${ext}`;
}

export function portalStaticOgImageContentTypeFromPath(
  storagePath: string,
): PortalStaticOgImageContentType | null {
  const lower = storagePath.trim().toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

export function isAllowedPortalStaticOgImageContentType(
  value: unknown,
): value is PortalStaticOgImageContentType {
  return typeof value === "string" && isPortalStaticOgImageContentType(value);
}

function parsePortalStaticOgImageInput(value: unknown): PortalStaticOgImageInput | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (data.kind === "retain") {
    return { kind: "retain" };
  }
  if (data.kind === "upload") {
    const storagePath = parsePortalStaticOgImageStoragePath(data.storagePath);
    if (!storagePath) {
      return null;
    }
    return { kind: "upload", storagePath };
  }
  if (data.kind === "design") {
    if (typeof data.sourceDesignId !== "string") {
      return null;
    }
    const sourceDesignId = data.sourceDesignId.trim();
    if (!sourceDesignId || sourceDesignId.length > 128 || !/^[A-Za-z0-9_-]+$/.test(sourceDesignId)) {
      return null;
    }
    return { kind: "design", sourceDesignId };
  }
  return null;
}

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
  if (
    data.globalOgImageSource !== undefined &&
    data.globalOgImageSource !== "library" &&
    data.globalOgImageSource !== "logo" &&
    data.globalOgImageSource !== "static"
  ) {
    return null;
  }
  const globalOgImageSource =
    data.globalOgImageSource === "logo" ||
    data.globalOgImageSource === "library" ||
    data.globalOgImageSource === "static"
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

  const staticOgImage = parsePortalStaticOgImageInput(data.staticOgImage);
  if (staticOgImage === null) {
    return null;
  }

  const input: PortalSocialMetaSettingsInput = {
    ogTitle,
    ogDescription,
    letterboxOgImages,
    globalOgImageSource,
    libraryOgRotationInterval,
    libraryOgRotationSalt,
  };
  if (staticOgImage !== undefined) {
    input.staticOgImage = staticOgImage;
  }
  return input;
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
