import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

import {
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  PORTAL_STATIC_OG_IMAGE_MAX_BYTES,
  buildPortalStaticOgImageStoragePath,
  isAllowedPortalStaticOgImageContentType,
  resolvePortalSocialMetaSettings,
  type PortalSocialMetaSettings,
  type PortalSocialMetaSettingsInput,
  type PortalStaticOgImageContentType,
  type PortalStaticOgImageInput,
} from "@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants";
import { db, storage } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";
import { buildPortalSocialMetaSettingsPayload } from "./portalSocialMetaSettingsPayload";

export { buildPortalSocialMetaSettingsPayload } from "./portalSocialMetaSettingsPayload";

function newObjectId(): string {
  return crypto.randomUUID();
}

export const portalSocialMetaSettingsService = {
  subscribe(
    onData: (settings: PortalSocialMetaSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", PORTAL_SOCIAL_META_SETTINGS_DOC_ID),
      (snapshot) => onData(resolvePortalSocialMetaSettings(snapshot.data())),
      (error) => onError(error.message),
    );
  },

  async update(settings: PortalSocialMetaSettingsInput): Promise<PortalSocialMetaSettings> {
    const response = await callTracedFunction<PortalSocialMetaSettingsInput, PortalSocialMetaSettings>(
      "updatePortalSocialMetaSettings",
      { source: "portalSocialMetaSettingsService.update" },
    )(buildPortalSocialMetaSettingsPayload(settings));
    return resolvePortalSocialMetaSettings(response);
  },

  /**
   * Upload a Static Image candidate to Storage. Finalize happens on Save via
   * `updatePortalSocialMetaSettings` (title + description + image mode activate together).
   */
  async uploadStaticOgImage(file: File): Promise<{ storagePath: string }> {
    if (!isAllowedPortalStaticOgImageContentType(file.type)) {
      throw new Error("Static Open Graph image must be PNG, JPEG, or WebP.");
    }
    if (file.size <= 0 || file.size > PORTAL_STATIC_OG_IMAGE_MAX_BYTES) {
      throw new Error(
        `Static Open Graph image must be at most ${Math.floor(PORTAL_STATIC_OG_IMAGE_MAX_BYTES / (1024 * 1024))} MB.`,
      );
    }

    const contentType = file.type as PortalStaticOgImageContentType;
    const storagePath = buildPortalStaticOgImageStoragePath(newObjectId(), contentType);
    await uploadBytes(ref(storage, storagePath), file, { contentType });
    return { storagePath };
  },
};

export type { PortalStaticOgImageInput };
