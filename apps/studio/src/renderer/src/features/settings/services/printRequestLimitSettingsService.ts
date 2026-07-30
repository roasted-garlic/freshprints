import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import {
  PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID,
  resolvePrintRequestLimitSettings,
  type PrintRequestLimitSettings,
} from "@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants";
import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

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
    // Server mirrors L into legacy Cap A for one-release rollback.
    const response = await callTracedFunction<
      { maxQuantityPerShowPerCustomer: number },
      PrintRequestLimitSettings
    >("updatePrintRequestLimitSettings", {
      source: "printRequestLimitSettingsService.update",
    })({
      maxQuantityPerShowPerCustomer: settings.maxQuantityPerShowPerCustomer,
    });
    return resolvePrintRequestLimitSettings(response);
  },
};
