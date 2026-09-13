import {
  STANDARD_PRINT_SIZES_SETTINGS_DOC_ID,
  resolveStandardPrintSizesSettings,
  type StandardPrintSizesSettings,
} from "../../../packages/shared/src/constants/printSize/standardPrintSizesSettings.constants";
import { adminDb } from "./admin";

export async function loadStandardPrintSizesSettings(): Promise<StandardPrintSizesSettings> {
  const snapshot = await adminDb
    .collection("settings")
    .doc(STANDARD_PRINT_SIZES_SETTINGS_DOC_ID)
    .get();
  return resolveStandardPrintSizesSettings(snapshot.data());
}
