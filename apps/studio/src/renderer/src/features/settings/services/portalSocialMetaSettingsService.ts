import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import {
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  resolvePortalSocialMetaSettings,
  type PortalSocialMetaSettings,
  type PortalSocialMetaSettingsInput,
} from "@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants";
import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

export function buildPortalSocialMetaSettingsPayload(
  settings: PortalSocialMetaSettingsInput,
): PortalSocialMetaSettingsInput {
  return {
    ogTitle: settings.ogTitle,
    ogDescription: settings.ogDescription,
    letterboxOgImages: settings.letterboxOgImages,
    globalOgImageSource: settings.globalOgImageSource,
    libraryOgRotationInterval: settings.libraryOgRotationInterval,
    libraryOgRotationSalt: settings.libraryOgRotationSalt,
  };
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
};
