import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import {
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  resolvePortalSocialMetaSettings,
  type PortalSocialMetaSettings,
} from "@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants";
import { db, functions } from "../../../config/firebase";

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

  async update(settings: Pick<PortalSocialMetaSettings, "ogTitle" | "ogDescription">): Promise<PortalSocialMetaSettings> {
    const callable = httpsCallable<
      { ogTitle: string; ogDescription: string },
      PortalSocialMetaSettings
    >(functions, "updatePortalSocialMetaSettings");
    const response = await callable({
      ogTitle: settings.ogTitle,
      ogDescription: settings.ogDescription,
    });
    return resolvePortalSocialMetaSettings(response.data);
  },
};
