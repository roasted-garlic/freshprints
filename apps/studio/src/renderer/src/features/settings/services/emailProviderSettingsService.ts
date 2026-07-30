import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import {
  EMAIL_PROVIDER_SETTINGS_DOC_ID,
  resolveEmailProviderSettings,
  type EmailProviderSettings,
} from "@fresh-prints/shared/constants/emailProviders.constants";
import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

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
    const response = await callTracedFunction<EmailProviderSettings, EmailProviderSettings>(
      "updateEmailProviderSettings",
      { source: "emailProviderSettingsService.update" },
    )(settings);
    return resolveEmailProviderSettings(response);
  },
};
