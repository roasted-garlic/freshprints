import {
  resolveBrandLogoSettings,
  type BrandLogoSettings,
  type BrandLogoSlotRecord,
} from "./brandLogoSettings.constants";

/** localStorage key — same Firestore doc for Studio + Portal. */
export const BRAND_LOGO_SETTINGS_CACHE_KEY = "fresh-prints.brandLogoSettings.v1";

function serializeSlot(
  slot: BrandLogoSlotRecord | null | undefined,
): Record<string, unknown> | null {
  if (!slot) {
    return null;
  }
  return {
    storagePath: slot.storagePath,
    downloadUrl: slot.downloadUrl,
    contentType: slot.contentType,
    byteSize: slot.byteSize,
    ...(typeof slot.aspectRatio === "number" ? { aspectRatio: slot.aspectRatio } : {}),
    ...(typeof slot.updatedBy === "string" ? { updatedBy: slot.updatedBy } : {}),
  };
}

/** JSON-safe snapshot for localStorage (no Firestore Timestamps). */
export function serializeBrandLogoSettingsForCache(settings: BrandLogoSettings): unknown {
  return {
    studioFull: serializeSlot(settings.studioFull),
    studioCollapsed: serializeSlot(settings.studioCollapsed),
    portalFull: serializeSlot(settings.portalFull),
    portalCollapsed: serializeSlot(settings.portalCollapsed),
    portalHeader: settings.portalHeader,
    portalSidebar: settings.portalSidebar,
    portalSidebarCollapsed: settings.portalSidebarCollapsed,
    portalAuth: settings.portalAuth,
    studioSidebar: settings.studioSidebar,
    studioSidebarCollapsed: settings.studioSidebarCollapsed,
    studioLogin: settings.studioLogin,
    ...(typeof settings.updatedBy === "string" ? { updatedBy: settings.updatedBy } : {}),
  };
}

export function readBrandLogoSettingsCache(): BrandLogoSettings | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(BRAND_LOGO_SETTINGS_CACHE_KEY);
    if (!raw) {
      return null;
    }
    return resolveBrandLogoSettings(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeBrandLogoSettingsCache(settings: BrandLogoSettings): void {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      BRAND_LOGO_SETTINGS_CACHE_KEY,
      JSON.stringify(serializeBrandLogoSettingsForCache(settings)),
    );
  } catch {
    // Quota / private mode — ignore; live subscription still works.
  }
}
