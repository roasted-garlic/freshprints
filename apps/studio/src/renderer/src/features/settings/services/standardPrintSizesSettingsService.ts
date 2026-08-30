import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import {
  STANDARD_PRINT_SIZES_SETTINGS_DOC_ID,
  resolveStandardPrintSizesSettings,
  type StandardPrintSizesSettings,
} from "@fresh-prints/shared/constants/printSize/standardPrintSizesSettings.constants";
import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

export const standardPrintSizesSettingsService = {
  subscribe(
    onData: (settings: StandardPrintSizesSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", STANDARD_PRINT_SIZES_SETTINGS_DOC_ID),
      (snapshot) => onData(resolveStandardPrintSizesSettings(snapshot.data())),
      (error) => onError(error.message),
    );
  },

  async update(settings: StandardPrintSizesSettings): Promise<StandardPrintSizesSettings> {
    const response = await callTracedFunction<
      StandardPrintSizesSettings,
      StandardPrintSizesSettings
    >("updateStandardPrintSizesSettings", {
      source: "standardPrintSizesSettingsService.update",
    })(settings);
    return resolveStandardPrintSizesSettings(response);
  },
};
