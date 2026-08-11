import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  parsePortalSocialMetaSettingsInput,
  resolvePortalSocialMetaSettings,
  type PortalSocialMetaSettings,
  type PortalStaticOgImageSnapshot,
} from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import { invalidatePortalGlobalOpenGraphCache } from "./getPortalGlobalOpenGraph";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import {
  resolveStaticOgSnapshotFromDesign,
  resolveStaticOgSnapshotFromUpload,
} from "./portalStaticOgImage";

export const updatePortalSocialMetaSettings = onCall(
  async (request): Promise<PortalSocialMetaSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || caller.role !== "owner") {
      throw permissionDenied("Only active owners can update Portal social sharing settings.");
    }

    const parsed = parsePortalSocialMetaSettingsInput(request.data);
    if (!parsed) {
      throw invalidArgument(
        "ogTitle, ogDescription, and valid image toggles are required within allowed limits.",
      );
    }

    const docRef = adminDb.collection("settings").doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID);
    const existingSnap = await docRef.get();
    const existing = resolvePortalSocialMetaSettings(existingSnap.data());

    let staticOgImage: PortalStaticOgImageSnapshot | null = existing.staticOgImage;
    const staticInput = parsed.staticOgImage;

    if (staticInput?.kind === "upload") {
      staticOgImage = await resolveStaticOgSnapshotFromUpload(staticInput.storagePath, existing.staticOgImage);
    } else if (staticInput?.kind === "design") {
      staticOgImage = await resolveStaticOgSnapshotFromDesign(
        staticInput.sourceDesignId,
        existing.staticOgImage,
      );
    } else if (staticInput?.kind === "retain") {
      staticOgImage = existing.staticOgImage;
    }

    if (parsed.globalOgImageSource === "static" && !staticOgImage) {
      throw failedPrecondition(
        "Static Image mode requires an uploaded image or a ready Design Library pick.",
      );
    }

    const settings: PortalSocialMetaSettings = {
      ogTitle: parsed.ogTitle,
      ogDescription: parsed.ogDescription,
      letterboxOgImages: parsed.letterboxOgImages,
      globalOgImageSource: parsed.globalOgImageSource,
      libraryOgRotationInterval: parsed.libraryOgRotationInterval,
      libraryOgRotationSalt: parsed.libraryOgRotationSalt,
      staticOgImage,
      updatedBy: request.auth.uid,
    };

    await docRef.set({
      ...settings,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Same-instance crawlers / Portal proxies see the new title+description+image immediately.
    invalidatePortalGlobalOpenGraphCache();

    const savedSnap = await docRef.get();
    return resolvePortalSocialMetaSettings(savedSnap.data());
  },
);
