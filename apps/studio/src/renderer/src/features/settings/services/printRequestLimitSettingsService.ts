import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import {
  PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID,
  resolvePrintRequestLimitSettings,
  type PrintRequestLimitSettings,
} from "@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants";
import { db, functions } from "../../../config/firebase";

export const printRequestLimitSettingsService = {
  subscribe(
    onData: (settings: PrintRequestLimitSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID),
      (snapshot) => onData(resolvePrintRequestLimitSettings(snapshot.data())),
      (error) => onError(error.message),
    );
  },

  async update(settings: PrintRequestLimitSettings): Promise<PrintRequestLimitSettings> {
    const callable = httpsCallable<
      { maxQuantityPerShowPerCustomer: number },
      PrintRequestLimitSettings
    >(functions, "updatePrintRequestLimitSettings");
    // Server mirrors L into legacy Cap A for one-release rollback.
    const response = await callable({
      maxQuantityPerShowPerCustomer: settings.maxQuantityPerShowPerCustomer,
    });
    return resolvePrintRequestLimitSettings(response.data);
  },
};
