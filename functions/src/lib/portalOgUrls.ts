import {
  PORTAL_OG_IMAGE_FIT_CONTAIN,
  PORTAL_OG_IMAGE_FIT_RAW,
  PORTAL_OG_LETTERBOX_BG_HEX,
  parsePortalStaticOgImageStoragePath,
} from "../../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import { artworkBackgroundHexForOgQuery } from "../../../packages/shared/src/constants/design/artworkBackground.constants";

const DESIGN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function isValidPortalOgDesignId(designId: string): boolean {
  return DESIGN_ID_PATTERN.test(designId);
}

export function normalizeStorageObjectPath(path: string): string {
  return path.trim().replace(/^\/+/, "");
}

/**
 * Absolute public URL for the OG share image Function.
 * `fit=contain` letterboxes; `fit=raw` is reserved for documentation — raw uses signed Storage URLs instead.
 * `bg` is a Facebook/CDN cache-bust tied to the letterbox canvas color.
 *
 * Exactly one of `designId` or `staticStoragePath` is required.
 */
export function buildPortalOgShareImageFunctionUrl(params: {
  projectId: string;
  designId?: string;
  /** Canonical `portal-social-meta/static-og/{uuid}.{ext}` path for Static Upload letterbox. */
  staticStoragePath?: string;
  fit: typeof PORTAL_OG_IMAGE_FIT_CONTAIN | typeof PORTAL_OG_IMAGE_FIT_RAW;
  /** Optional design artwork background; defaults to Portal grey. */
  backgroundHex?: unknown;
}): string {
  const designId = typeof params.designId === "string" ? params.designId.trim() : "";
  const staticPath = params.staticStoragePath
    ? parsePortalStaticOgImageStoragePath(params.staticStoragePath)
    : null;

  if (designId && staticPath) {
    throw new Error("portal_og_share_image_url_ambiguous_source");
  }
  if (!designId && !staticPath) {
    throw new Error("portal_og_share_image_url_missing_source");
  }

  const bg =
    params.backgroundHex !== undefined
      ? artworkBackgroundHexForOgQuery(params.backgroundHex)
      : PORTAL_OG_LETTERBOX_BG_HEX;
  const query = new URLSearchParams({
    fit: params.fit,
    bg,
  });
  if (designId) {
    query.set("designId", designId);
  } else if (staticPath) {
    query.set("staticPath", staticPath);
  }
  return `https://us-central1-${params.projectId}.cloudfunctions.net/getPortalOgShareImage?${query.toString()}`;
}

export function resolveFirebaseProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCP_PROJECT?.trim() ||
    ""
  );
}
