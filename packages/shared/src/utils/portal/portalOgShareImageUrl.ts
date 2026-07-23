import {
  PORTAL_OG_IMAGE_FIT_CONTAIN,
  PORTAL_OG_LETTERBOX_BG_HEX,
} from "../../constants/portal/portalSocialMetaSettings.constants";
import { artworkBackgroundHexForOgQuery } from "../../constants/design/artworkBackground.constants";

/**
 * Absolute public URL for the OG share image Cloud Function.
 * Stable for crawlers: no auth, no short-lived signed Storage URLs.
 * `bg` is a CDN/Facebook cache-bust; the Function paints from the design document.
 */
export function buildPortalOgShareImageFunctionUrl(params: {
  projectId: string;
  designId: string;
  /** Optional design artwork background; defaults to Portal grey. */
  backgroundHex?: unknown;
}): string {
  const bg =
    params.backgroundHex !== undefined
      ? artworkBackgroundHexForOgQuery(params.backgroundHex)
      : PORTAL_OG_LETTERBOX_BG_HEX;
  const query = new URLSearchParams({
    designId: params.designId,
    fit: PORTAL_OG_IMAGE_FIT_CONTAIN,
    bg,
  });
  return `https://us-central1-${params.projectId}.cloudfunctions.net/getPortalOgShareImage?${query.toString()}`;
}
