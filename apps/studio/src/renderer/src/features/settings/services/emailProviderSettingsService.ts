import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import {
  EMAIL_PROVIDER_SETTINGS_DOC_ID,
  resolveEmailProviderSettings,
  type EmailProviderSettings,
} from "@fresh-prints/shared/constants/emailProviders.constants";
import { db, functions } from "../../../config/firebase";

export const emailProviderSettingsService = {
  subscribe(
    onData: (settings: EmailProviderSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", EMAIL_PROVIDER_SETTINGS_DOC_ID),
      (snapshot) => onData(resolveEmailProviderSettings(snapshot.data())),
      (error) => onError(error.message),
    );
  },

  async update(settings: EmailProviderSettings): Promise<EmailProviderSettings> {
    const callable = httpsCallable<EmailProviderSettings, EmailProviderSettings>(
      functions,
      "updateEmailProviderSettings",
    );
    const response = await callable(settings);
    return resolveEmailProviderSettings(response.data);
  },
};
