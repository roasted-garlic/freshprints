/** Firestore `settings/{id}` doc for Studio + Portal brand logo overrides. */
export const BRAND_LOGO_SETTINGS_DOC_ID = "brandLogos";

export const BRAND_LOGO_APPS = ["studio", "portal"] as const;
export type BrandLogoApp = (typeof BRAND_LOGO_APPS)[number];

export const BRAND_LOGO_SLOTS = ["full", "collapsed"] as const;
export type BrandLogoSlotKind = (typeof BRAND_LOGO_SLOTS)[number];

/** Firestore field names for each app+slot pair. */
export const BRAND_LOGO_FIELD_KEYS = [
  "studioFull",
  "studioCollapsed",
  "portalFull",
  "portalCollapsed",
] as const;
export type BrandLogoFieldKey = (typeof BRAND_LOGO_FIELD_KEYS)[number];

export const BRAND_LOGO_CONTENT_TYPE = "image/png";
/** Max upload size (2 MiB) — keep in sync with storage.rules. */
export const BRAND_LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Width/height of bundled full wordmarks (10800×4358). */
export const BRAND_LOGO_FULL_ASPECT_RATIO = 10800 / 4358;
/** Collapsed marks are effectively square. */
export const BRAND_LOGO_COLLAPSED_ASPECT_RATIO = 1;

const OBJECT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BrandLogoSlotRecord {
  storagePath: string;
  downloadUrl: string;
  contentType: typeof BRAND_LOGO_CONTENT_TYPE;
  byteSize: number;
  /** width / height from the uploaded asset (display linking only). */
  aspectRatio?: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

/** Display box with locked aspect ratio (both stored; UI keeps them in sync). */
export type BrandLogoDisplayBox = {
  widthPx: number;
  heightPx: number;
};

export type BrandLogoDisplayPlacementKey =
  | "portalHeader"
  | "portalSidebar"
  | "portalSidebarCollapsed"
  | "portalAuth"
  | "studioSidebar"
  | "studioSidebarCollapsed"
  | "studioLogin";

export interface BrandLogoSettings {
  studioFull?: BrandLogoSlotRecord | null;
  studioCollapsed?: BrandLogoSlotRecord | null;
  portalFull?: BrandLogoSlotRecord | null;
  portalCollapsed?: BrandLogoSlotRecord | null;
  portalHeader: BrandLogoDisplayBox;
  portalSidebar: BrandLogoDisplayBox;
  portalSidebarCollapsed: BrandLogoDisplayBox;
  portalAuth: BrandLogoDisplayBox;
  studioSidebar: BrandLogoDisplayBox;
  studioSidebarCollapsed: BrandLogoDisplayBox;
  studioLogin: BrandLogoDisplayBox;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const BRAND_LOGO_DISPLAY_SIZE_MIN_PX = 16;
export const BRAND_LOGO_DISPLAY_SIZE_MAX_PX = 400;
export const BRAND_LOGO_ASPECT_RATIO_MIN = 0.2;
export const BRAND_LOGO_ASPECT_RATIO_MAX = 8;

function boxFromHeight(heightPx: number, aspectRatio: number): BrandLogoDisplayBox {
  const height = Math.round(heightPx);
  return {
    heightPx: height,
    widthPx: Math.max(1, Math.round(height * aspectRatio)),
  };
}

/**
 * Defaults match prior hardcodes (height-first), with width derived from bundled AR.
 * `portalHeader` and `portalSidebar` default to the same box (height 52) so they
 * match out of the box; each remains an independent owner-tunable control.
 */
export const DEFAULT_BRAND_LOGO_DISPLAY_SIZES = {
  portalHeader: boxFromHeight(52, BRAND_LOGO_FULL_ASPECT_RATIO),
  portalSidebar: boxFromHeight(52, BRAND_LOGO_FULL_ASPECT_RATIO),
  portalSidebarCollapsed: boxFromHeight(36, BRAND_LOGO_COLLAPSED_ASPECT_RATIO),
  portalAuth: boxFromHeight(64, BRAND_LOGO_FULL_ASPECT_RATIO),
  studioSidebar: boxFromHeight(52, BRAND_LOGO_FULL_ASPECT_RATIO),
  studioSidebarCollapsed: boxFromHeight(36, BRAND_LOGO_COLLAPSED_ASPECT_RATIO),
  studioLogin: boxFromHeight(72, BRAND_LOGO_FULL_ASPECT_RATIO),
} as const satisfies Record<BrandLogoDisplayPlacementKey, BrandLogoDisplayBox>;

export type BrandLogoDisplaySizesInput = {
  [K in BrandLogoDisplayPlacementKey]: BrandLogoDisplayBox;
};

export type BrandLogoFinalizeInput =
  | {
      app: BrandLogoApp;
      slot: BrandLogoSlotKind;
      storagePath: string;
      /** Optional display AR (width/height); validated server-side to a safe range. */
      aspectRatio?: number;
      clear?: false;
    }
  | {
      app: BrandLogoApp;
      slot: BrandLogoSlotKind;
      clear: true;
      storagePath?: undefined;
      aspectRatio?: undefined;
    };

export function brandLogoFieldKey(app: BrandLogoApp, slot: BrandLogoSlotKind): BrandLogoFieldKey {
  if (app === "studio" && slot === "full") return "studioFull";
  if (app === "studio" && slot === "collapsed") return "studioCollapsed";
  if (app === "portal" && slot === "full") return "portalFull";
  return "portalCollapsed";
}

export function defaultBrandLogoAspectRatio(slot: BrandLogoSlotKind): number {
  return slot === "collapsed" ? BRAND_LOGO_COLLAPSED_ASPECT_RATIO : BRAND_LOGO_FULL_ASPECT_RATIO;
}

export function parseBrandLogoAspectRatio(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(raw) || raw < BRAND_LOGO_ASPECT_RATIO_MIN || raw > BRAND_LOGO_ASPECT_RATIO_MAX) {
    return null;
  }
  return raw;
}

export function resolveBrandLogoAspectRatio(
  settings: BrandLogoSettings | null | undefined,
  app: BrandLogoApp,
  slot: BrandLogoSlotKind,
): number {
  const key = brandLogoFieldKey(app, slot);
  const stored = settings?.[key]?.aspectRatio;
  if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  return defaultBrandLogoAspectRatio(slot);
}

/** Placement → which logo slot supplies aspect ratio for linked width/height edits. */
export function brandLogoPlacementSlot(
  placement: BrandLogoDisplayPlacementKey,
): { app: BrandLogoApp; slot: BrandLogoSlotKind } {
  switch (placement) {
    case "portalHeader":
    case "portalSidebar":
    case "portalAuth":
      return { app: "portal", slot: "full" };
    case "portalSidebarCollapsed":
      return { app: "portal", slot: "collapsed" };
    case "studioSidebar":
    case "studioLogin":
      return { app: "studio", slot: "full" };
    case "studioSidebarCollapsed":
      return { app: "studio", slot: "collapsed" };
  }
}

export function brandLogoBoxFromWidth(widthPx: number, aspectRatio: number): BrandLogoDisplayBox {
  const width = Math.round(widthPx);
  return {
    widthPx: width,
    heightPx: Math.max(1, Math.round(width / aspectRatio)),
  };
}

export function brandLogoBoxFromHeight(heightPx: number, aspectRatio: number): BrandLogoDisplayBox {
  return boxFromHeight(heightPx, aspectRatio);
}

export function parseBrandLogoApp(value: unknown): BrandLogoApp | null {
  return value === "studio" || value === "portal" ? value : null;
}

export function parseBrandLogoSlot(value: unknown): BrandLogoSlotKind | null {
  return value === "full" || value === "collapsed" ? value : null;
}

export function isBrandLogoObjectId(value: string): boolean {
  return OBJECT_ID_PATTERN.test(value);
}

/** Build Storage object path: `brand/{app}/{slot}/{uuid}.png` (no leading slash). */
export function buildBrandLogoStoragePath(
  app: BrandLogoApp,
  slot: BrandLogoSlotKind,
  objectId: string,
): string {
  const id = objectId.trim().toLowerCase();
  if (!isBrandLogoObjectId(id)) {
    throw new Error("Invalid brand logo object id");
  }
  return `brand/${app}/${slot}/${id}.png`;
}

/**
 * Validate a claimed storage path for an app+slot.
 * Accepts optional leading slash; returns normalized path without leading slash.
 */
export function parseBrandLogoStoragePathForSlot(
  storagePath: unknown,
  app: BrandLogoApp,
  slot: BrandLogoSlotKind,
): string | null {
  if (typeof storagePath !== "string") {
    return null;
  }
  const normalized = storagePath.trim().replace(/^\/+/, "");
  const prefix = `brand/${app}/${slot}/`;
  if (!normalized.startsWith(prefix) || !normalized.endsWith(".png")) {
    return null;
  }
  const fileName = normalized.slice(prefix.length);
  if (!fileName.toLowerCase().endsWith(".png")) {
    return null;
  }
  const objectId = fileName.slice(0, -".png".length);
  if (!isBrandLogoObjectId(objectId)) {
    return null;
  }
  if (normalized !== `brand/${app}/${slot}/${objectId.toLowerCase()}.png`) {
    return `brand/${app}/${slot}/${objectId.toLowerCase()}.png`;
  }
  return normalized;
}

export function parseBrandLogoFinalizeInput(data: unknown): BrandLogoFinalizeInput | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const app = parseBrandLogoApp(record.app);
  const slot = parseBrandLogoSlot(record.slot);
  if (!app || !slot) {
    return null;
  }
  if (record.clear === true) {
    return { app, slot, clear: true };
  }
  const storagePath = parseBrandLogoStoragePathForSlot(record.storagePath, app, slot);
  if (!storagePath) {
    return null;
  }
  if (record.aspectRatio === undefined) {
    return { app, slot, storagePath, clear: false };
  }
  const aspectRatio = parseBrandLogoAspectRatio(record.aspectRatio);
  if (aspectRatio === null) {
    return null;
  }
  return { app, slot, storagePath, aspectRatio, clear: false };
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return trimmed.startsWith("https://") && trimmed.length < 2048;
}

function parseDisplayPx(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(raw)) {
    return null;
  }
  const rounded = Math.round(raw);
  if (rounded < BRAND_LOGO_DISPLAY_SIZE_MIN_PX || rounded > BRAND_LOGO_DISPLAY_SIZE_MAX_PX) {
    return null;
  }
  return rounded;
}

export function parseBrandLogoDisplayBox(
  value: unknown,
  fallback: BrandLogoDisplayBox,
): BrandLogoDisplayBox {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }
  const record = value as Record<string, unknown>;
  const widthPx = parseDisplayPx(record.widthPx);
  const heightPx = parseDisplayPx(record.heightPx);
  if (widthPx === null || heightPx === null) {
    return { ...fallback };
  }
  return { widthPx, heightPx };
}

export function parseBrandLogoSlotRecord(value: unknown): BrandLogoSlotRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.storagePath !== "string" || !record.storagePath.trim()) {
    return null;
  }
  if (!isHttpsUrl(record.downloadUrl)) {
    return null;
  }
  if (record.contentType !== BRAND_LOGO_CONTENT_TYPE) {
    return null;
  }
  if (typeof record.byteSize !== "number" || !Number.isFinite(record.byteSize) || record.byteSize <= 0) {
    return null;
  }
  const aspectRatio =
    record.aspectRatio === undefined ? undefined : parseBrandLogoAspectRatio(record.aspectRatio);
  return {
    storagePath: record.storagePath.trim().replace(/^\/+/, ""),
    downloadUrl: record.downloadUrl.trim(),
    contentType: BRAND_LOGO_CONTENT_TYPE,
    byteSize: Math.floor(record.byteSize),
    ...(aspectRatio !== undefined && aspectRatio !== null ? { aspectRatio } : {}),
    updatedAt: record.updatedAt,
    updatedBy: typeof record.updatedBy === "string" ? record.updatedBy : undefined,
  };
}

export function parseBrandLogoDisplaySizesInput(data: unknown): BrandLogoDisplaySizesInput | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const parsed = {} as BrandLogoDisplaySizesInput;
  for (const key of Object.keys(DEFAULT_BRAND_LOGO_DISPLAY_SIZES) as BrandLogoDisplayPlacementKey[]) {
    if (!(key in record)) {
      return null;
    }
    const box = parseBrandLogoDisplayBox(record[key], DEFAULT_BRAND_LOGO_DISPLAY_SIZES[key]);
    // Reject if parse fell back due to invalid input (detect by re-checking)
    const raw = record[key];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const rawRec = raw as Record<string, unknown>;
    if (parseDisplayPx(rawRec.widthPx) === null || parseDisplayPx(rawRec.heightPx) === null) {
      return null;
    }
    parsed[key] = box;
  }
  return parsed;
}

function resolvePlacementBox(
  data: Record<string, unknown>,
  key: BrandLogoDisplayPlacementKey,
  legacyHeightKey: string,
  aspectRatio: number,
): BrandLogoDisplayBox {
  const fallback = DEFAULT_BRAND_LOGO_DISPLAY_SIZES[key];
  if (key in data) {
    return parseBrandLogoDisplayBox(data[key], fallback);
  }
  // Migrate height-only fields from the first display-size iteration.
  const legacyHeight = parseDisplayPx(data[legacyHeightKey]);
  if (legacyHeight !== null) {
    return boxFromHeight(legacyHeight, aspectRatio);
  }
  return { ...fallback };
}

export function resolveBrandLogoSettings(raw: unknown): BrandLogoSettings {
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const studioFull = parseBrandLogoSlotRecord(data.studioFull);
  const studioCollapsed = parseBrandLogoSlotRecord(data.studioCollapsed);
  const portalFull = parseBrandLogoSlotRecord(data.portalFull);
  const portalCollapsed = parseBrandLogoSlotRecord(data.portalCollapsed);

  const fullAr = (slot: BrandLogoSlotRecord | null | undefined, fallbackSlot: BrandLogoSlotKind) =>
    typeof slot?.aspectRatio === "number" && slot.aspectRatio > 0
      ? slot.aspectRatio
      : defaultBrandLogoAspectRatio(fallbackSlot);

  return {
    studioFull,
    studioCollapsed,
    portalFull,
    portalCollapsed,
    portalHeader: resolvePlacementBox(
      data,
      "portalHeader",
      "portalHeaderPx",
      fullAr(portalFull, "full"),
    ),
    portalSidebar: resolvePlacementBox(
      data,
      "portalSidebar",
      "portalSidebarPx",
      fullAr(portalFull, "full"),
    ),
    portalSidebarCollapsed: resolvePlacementBox(
      data,
      "portalSidebarCollapsed",
      "portalSidebarCollapsedPx",
      fullAr(portalCollapsed, "collapsed"),
    ),
    portalAuth: resolvePlacementBox(data, "portalAuth", "portalAuthPx", fullAr(portalFull, "full")),
    studioSidebar: resolvePlacementBox(
      data,
      "studioSidebar",
      "studioSidebarPx",
      fullAr(studioFull, "full"),
    ),
    studioSidebarCollapsed: resolvePlacementBox(
      data,
      "studioSidebarCollapsed",
      "studioSidebarCollapsedPx",
      fullAr(studioCollapsed, "collapsed"),
    ),
    studioLogin: resolvePlacementBox(
      data,
      "studioLogin",
      "studioLoginPx",
      fullAr(studioFull, "full"),
    ),
    updatedAt: data.updatedAt,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

export function resolveBrandLogoDownloadUrl(
  settings: BrandLogoSettings | null | undefined,
  app: BrandLogoApp,
  slot: BrandLogoSlotKind,
  fallbackUrl: string,
): string {
  const key = brandLogoFieldKey(app, slot);
  const record = settings?.[key];
  const url = record?.downloadUrl?.trim();
  return url && url.startsWith("https://") ? url : fallbackUrl;
}

/** Flatten display boxes for Firestore write (and delete legacy height-only keys). */
export const LEGACY_BRAND_LOGO_HEIGHT_FIELD_KEYS = [
  "portalHeaderPx",
  "portalSidebarPx",
  "portalSidebarCollapsedPx",
  "portalAuthPx",
  "studioSidebarPx",
  "studioSidebarCollapsedPx",
  "studioLoginPx",
] as const;
