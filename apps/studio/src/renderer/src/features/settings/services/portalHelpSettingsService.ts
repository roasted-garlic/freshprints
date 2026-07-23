import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import {
  PORTAL_HELP_SETTINGS_DOC_ID,
  resolvePortalHelpSettings,
  type PortalHelpSettings,
  type PortalHelpSettingsInput,
} from "@fresh-prints/shared/constants/portal/portalHelpSettings.constants";
import { db, functions } from "../../../config/firebase";

export type PortalHelpSettingsLoad =
  | { status: "missing"; settings: PortalHelpSettings }
  | { status: "loaded"; settings: PortalHelpSettings };

export const portalHelpSettingsService = {
  subscribe(
    onData: (load: PortalHelpSettingsLoad) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", PORTAL_HELP_SETTINGS_DOC_ID),
      (snapshot) => {
        if (!snapshot.exists()) {
          onData({
            status: "missing",
            settings: resolvePortalHelpSettings(undefined),
          });
          return;
        }
        onData({
          status: "loaded",
          settings: resolvePortalHelpSettings(snapshot.data()),
        });
      },
      (error) => onError(error.message),
    );
  },

  async update(settings: PortalHelpSettingsInput): Promise<PortalHelpSettings> {
    const callable = httpsCallable<PortalHelpSettingsInput, PortalHelpSettings>(
      functions,
      "updatePortalHelpSettings",
    );
    const response = await callable({
      faqs: settings.faqs,
      videos: settings.videos,
    });
    return resolvePortalHelpSettings(response.data);
  },
};
