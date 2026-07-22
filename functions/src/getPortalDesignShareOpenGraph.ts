import { onRequest } from "firebase-functions/v2/https";

import {
  PORTAL_OG_IMAGE_FIT_CONTAIN,
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  resolvePortalSocialMetaSettings,
} from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import { adminDb, adminStorage } from "./lib/admin";
import {
  buildPortalOgShareImageFunctionUrl,
  isValidPortalOgDesignId,
  normalizeStorageObjectPath,
  resolveFirebaseProjectId,
} from "./lib/portalOgUrls";

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PortalDesignShareOpenGraphResponse {
  designId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  letterboxOgImages: boolean;
}

async function resolveShareImageUrl(storagePath: string): Promise<string | null> {
  const objectPath = normalizeStorageObjectPath(storagePath);
  if (!objectPath) {
    return null;
  }

  try {
    const file = adminStorage.bucket().file(objectPath);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + SIGNED_URL_TTL_MS,
    });
    return url;
  } catch {
    return null;
  }
}

async function loadLetterboxPreference(): Promise<boolean> {
  try {
    const settingsSnap = await adminDb
      .collection("settings")
      .doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID)
      .get();
    return resolvePortalSocialMetaSettings(settingsSnap.data()).letterboxOgImages;
  } catch {
    return true;
  }
}

/**
 * Public GET for Portal share-page Open Graph. Crawlers (and local Portal without ADC)
 * need title / description / image without Firebase Admin on the Next.js host.
 *
 * Query: `?designId=`
 */
export const getPortalDesignShareOpenGraph = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "GET") {
      response.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const raw =
      typeof request.query.designId === "string" ? request.query.designId.trim() : "";
    if (!raw || !isValidPortalOgDesignId(raw)) {
      response.status(400).json({ error: "invalid_design_id" });
      return;
    }

    try {
      const snapshot = await adminDb.collection("designs").doc(raw).get();
      if (!snapshot.exists) {
        response.status(404).json({ error: "not_found" });
        return;
      }

      const data = snapshot.data() ?? {};
      if (data.status !== "ready" || typeof data.title !== "string" || !data.title.trim()) {
        response.status(404).json({ error: "not_ready" });
        return;
      }

      const title = data.title.trim();
      const description =
        typeof data.description === "string" && data.description.trim()
          ? data.description.trim()
          : title;

      const imagePath =
        (typeof data.previewPath === "string" && data.previewPath.trim()) ||
        (typeof data.thumbnailPath === "string" && data.thumbnailPath.trim()) ||
        "";

      const letterboxOgImages = await loadLetterboxPreference();
      let imageUrl: string | null = null;

      if (imagePath) {
        if (letterboxOgImages) {
          const projectId = resolveFirebaseProjectId();
          imageUrl = projectId
            ? buildPortalOgShareImageFunctionUrl({
                projectId,
                designId: raw,
                fit: PORTAL_OG_IMAGE_FIT_CONTAIN,
                backgroundHex: data.artworkBackgroundHex,
              })
            : await resolveShareImageUrl(imagePath);
        } else {
          imageUrl = await resolveShareImageUrl(imagePath);
        }
      }

      const payload: PortalDesignShareOpenGraphResponse = {
        designId: raw,
        title,
        description,
        imageUrl,
        letterboxOgImages,
      };

      response.set("Cache-Control", "public, max-age=300");
      response.status(200).json(payload);
    } catch {
      response.status(500).json({ error: "internal" });
    }
  },
);
