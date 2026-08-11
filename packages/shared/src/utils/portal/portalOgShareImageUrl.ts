import {
  PORTAL_OG_IMAGE_FIT_CONTAIN,
  PORTAL_OG_LETTERBOX_BG_HEX,
  parsePortalStaticOgImageStoragePath,
} from "../../constants/portal/portalSocialMetaSettings.constants";
import { artworkBackgroundHexForOgQuery } from "../../constants/design/artworkBackground.constants";

/**
 * Absolute public URL for the OG share image Cloud Function.
 * Stable for crawlers: no auth, no short-lived signed Storage URLs.
 * `bg` is a CDN/Facebook cache-bust; the Function paints from the design document
 * (design mode) or Portal grey mat (static upload mode).
 *
 * Exactly one of `designId` or `staticStoragePath` is required.
 */
export function buildPortalOgShareImageFunctionUrl(params: {
  projectId: string;
  designId?: string;
  /** Canonical `portal-social-meta/static-og/{uuid}.{ext}` path for Static Upload letterbox. */
  staticStoragePath?: string;
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
    fit: PORTAL_OG_IMAGE_FIT_CONTAIN,
    bg,
  });
  if (designId) {
    query.set("designId", designId);
  } else if (staticPath) {
    query.set("staticPath", staticPath);
  }
  return `https://us-central1-${params.projectId}.cloudfunctions.net/getPortalOgShareImage?${query.toString()}`;
}
