import {
  PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID,
  resolvePrintRequestLimitSettings,
  type PrintRequestLimitSettings,
} from "../../../packages/shared/src/constants/printRequest/printRequestLimitSettings.constants";
import { adminDb } from "./admin";

export async function loadPrintRequestLimitSettings(): Promise<PrintRequestLimitSettings> {
  const snapshot = await adminDb
    .collection("settings")
    .doc(PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID)
    .get();
  return resolvePrintRequestLimitSettings(snapshot.data());
}
