import { onRequest } from "firebase-functions/v2/https";

import {
  PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE,
  PORTAL_OG_IMAGE_FIT_CONTAIN,
  pickLibraryOgRotatedIndex,
  resolvePortalSocialMetaSettings,
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  type PortalLibraryOgRotationInterval,
} from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import {
  BRAND_LOGO_SETTINGS_DOC_ID,
  resolveBrandLogoSettings,
} from "../../packages/shared/src/constants/brand/brandLogoSettings.constants";
import { adminDb, adminStorage } from "./lib/admin";
import {
  buildPortalOgShareImageFunctionUrl,
  normalizeStorageObjectPath,
  resolveFirebaseProjectId,
} from "./lib/portalOgUrls";

const SIGNED_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PortalGlobalOpenGraphResponse {
  ogTitle: string;
  ogDescription: string;
  /** Absolute HTTPS image URL for crawlers, or null to use Portal brand logo. */
  imageUrl: string | null;
  letterboxOgImages: boolean;
  globalOgImageSource: "library" | "logo";
}

async function resolveSignedImageUrl(storagePath: string): Promise<string | null> {
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

async function resolveUploadedPortalLogoUrl(): Promise<string | null> {
  try {
    const snap = await adminDb.collection("settings").doc(BRAND_LOGO_SETTINGS_DOC_ID).get();
    const settings = resolveBrandLogoSettings(snap.data());
    const url = settings.portalFull?.downloadUrl?.trim();
    return url && url.startsWith("https://") ? url : null;
  } catch {
    return null;
  }
}

async function resolveLibraryImageUrl(
  letterbox: boolean,
  rotationSalt: number,
  interval: PortalLibraryOgRotationInterval,
): Promise<string | null> {
  const snapshot = await adminDb
    .collection("designs")
    .where("status", "==", "ready")
    .orderBy("createdAt", "desc")
    .limit(PORTAL_GLOBAL_OG_LIBRARY_SAMPLE_SIZE)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const docs = snapshot.docs;
  const index = pickLibraryOgRotatedIndex(docs.length, Date.now(), rotationSalt, interval);
  const data = docs[index]?.data() ?? {};
  const designId = docs[index]?.id ?? "";
  if (!designId) {
    return null;
  }

  if (letterbox) {
    const projectId = resolveFirebaseProjectId();
    if (!projectId) {
      return null;
    }
    return buildPortalOgShareImageFunctionUrl({
      projectId,
      designId,
      fit: PORTAL_OG_IMAGE_FIT_CONTAIN,
      backgroundHex: data.artworkBackgroundHex,
    });
  }

  const imagePath =
    (typeof data.previewPath === "string" && data.previewPath.trim()) ||
    (typeof data.thumbnailPath === "string" && data.thumbnailPath.trim()) ||
    "";
  return imagePath ? resolveSignedImageUrl(imagePath) : null;
}

/**
 * Public GET for Portal non-design Open Graph (home, login, etc.).
 * Prefer this from Portal metadata so crawlers do not depend on App Hosting Admin ADC.
 */
export const getPortalGlobalOpenGraph = onRequest(
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

    try {
      const settingsSnap = await adminDb
        .collection("settings")
        .doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID)
        .get();
      const settings = resolvePortalSocialMetaSettings(settingsSnap.data());

      let imageUrl: string | null = null;
      if (settings.globalOgImageSource === "library") {
        imageUrl = await resolveLibraryImageUrl(
          settings.letterboxOgImages,
          settings.libraryOgRotationSalt,
          settings.libraryOgRotationInterval,
        );
      } else {
        imageUrl = await resolveUploadedPortalLogoUrl();
      }

      const payload: PortalGlobalOpenGraphResponse = {
        ogTitle: settings.ogTitle,
        ogDescription: settings.ogDescription,
        imageUrl,
        letterboxOgImages: settings.letterboxOgImages,
        globalOgImageSource: settings.globalOgImageSource,
      };

      response.set("Cache-Control", "public, max-age=300");
      response.status(200).json(payload);
    } catch {
      response.status(500).json({ error: "internal" });
    }
  },
);
