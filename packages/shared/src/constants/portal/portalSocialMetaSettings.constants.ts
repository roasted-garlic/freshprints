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

export interface PortalSocialMetaSettings {
  ogTitle: string;
  ogDescription: string;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_PORTAL_SOCIAL_META_SETTINGS: Readonly<PortalSocialMetaSettings> = {
  ogTitle: DEFAULT_PORTAL_SOCIAL_META_TITLE,
  ogDescription: DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION,
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

export function resolvePortalSocialMetaSettings(value: unknown): PortalSocialMetaSettings {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const settings: PortalSocialMetaSettings = {
    ogTitle: clampText(data.ogTitle, PORTAL_SOCIAL_META_TITLE_MAX_LENGTH, DEFAULT_PORTAL_SOCIAL_META_TITLE),
    ogDescription: clampText(
      data.ogDescription,
      PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH,
      DEFAULT_PORTAL_SOCIAL_META_DESCRIPTION,
    ),
  };
  if (data.updatedAt !== undefined) {
    settings.updatedAt = data.updatedAt;
  }
  if (typeof data.updatedBy === "string" && data.updatedBy.trim()) {
    settings.updatedBy = data.updatedBy.trim();
  }
  return settings;
}

export function parsePortalSocialMetaSettingsInput(
  value: unknown,
): { ogTitle: string; ogDescription: string } | null {
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
  return { ogTitle, ogDescription };
}
