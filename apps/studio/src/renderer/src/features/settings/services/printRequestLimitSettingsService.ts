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
    const response = await callTracedFunction<
      {
        maxQuantityPerPrintRequest: number;
        maxQuantityPerShowPerCustomer: number;
        linkPrintRequestAndCustomerShowLimits: boolean;
      },
      PrintRequestLimitSettings
    >("updatePrintRequestLimitSettings", {
      source: "printRequestLimitSettingsService.update",
    })({
      maxQuantityPerPrintRequest: settings.maxQuantityPerPrintRequest,
      maxQuantityPerShowPerCustomer: settings.maxQuantityPerShowPerCustomer,
      linkPrintRequestAndCustomerShowLimits: settings.linkPrintRequestAndCustomerShowLimits,
    });
    return resolvePrintRequestLimitSettings(response);
  },
};
