import { onRequest } from "firebase-functions/v2/https";

import {
  PORTAL_OG_IMAGE_FIT_CONTAIN,
  PORTAL_OG_IMAGE_FIT_RAW,
} from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import { adminDb, adminStorage } from "./lib/admin";
import { composePortalOgLetterboxImage } from "./lib/portalOgImageCompose";
import { isValidPortalOgDesignId, normalizeStorageObjectPath } from "./lib/portalOgUrls";

/**
 * Public GET: returns a letterboxed 1200×630 JPEG for ready-catalog designs.
 * Query: `designId`, `fit=contain` (required for letterbox). Optional `bg` (and any other
 * unknown keys) are ignored for painting — used only as Facebook/CDN cache-busters on the URL.
 * Canvas color comes from the design’s `artworkBackgroundHex` (fallback grey).
 * `fit=raw` returns 400 — crawlers should use signed Storage URLs when letterbox is off.
 */
export const getPortalOgShareImage = onRequest(
  {
    cors: true,
    invoker: "public",
    memory: "512MiB",
  },
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const designId =
      typeof request.query.designId === "string" ? request.query.designId.trim() : "";
    const fit = typeof request.query.fit === "string" ? request.query.fit.trim() : "";

    if (!designId || !isValidPortalOgDesignId(designId)) {
      response.status(400).json({ error: "invalid_design_id" });
      return;
    }

    if (fit === PORTAL_OG_IMAGE_FIT_RAW) {
      response.status(400).json({ error: "use_signed_url_for_raw" });
      return;
    }

    if (fit !== PORTAL_OG_IMAGE_FIT_CONTAIN) {
      response.status(400).json({ error: "invalid_fit" });
      return;
    }

    try {
      const snapshot = await adminDb.collection("designs").doc(designId).get();
      if (!snapshot.exists) {
        response.status(404).json({ error: "not_found" });
        return;
      }

      const data = snapshot.data() ?? {};
      if (data.status !== "ready") {
        response.status(404).json({ error: "not_ready" });
        return;
      }

      const imagePath =
        (typeof data.previewPath === "string" && data.previewPath.trim()) ||
        (typeof data.thumbnailPath === "string" && data.thumbnailPath.trim()) ||
        "";
      const objectPath = normalizeStorageObjectPath(imagePath);
      if (!objectPath) {
        response.status(404).json({ error: "no_image" });
        return;
      }

      const [inputBytes] = await adminStorage.bucket().file(objectPath).download();
      const composed = await composePortalOgLetterboxImage(inputBytes, data.artworkBackgroundHex);

      response.set("Cache-Control", "public, max-age=3600");
      response.set("Content-Type", composed.contentType);
      if (request.method === "HEAD") {
        response.status(200).end();
        return;
      }
      response.status(200).send(composed.bytes);
    } catch {
      response.status(500).json({ error: "internal" });
    }
  },
);
