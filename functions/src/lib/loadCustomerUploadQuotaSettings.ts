import {
  CUSTOMER_UPLOAD_QUOTA_SETTINGS_DOC_ID,
  resolveCustomerUploadQuotaSettings,
  type CustomerUploadQuotaSettings,
} from "../../../packages/shared/src/constants/customerUpload/customerUploadQuotaSettings.constants";
import { adminDb } from "./admin";

export async function loadCustomerUploadQuotaSettings(): Promise<CustomerUploadQuotaSettings> {
  const snapshot = await adminDb
    .collection("settings")
    .doc(CUSTOMER_UPLOAD_QUOTA_SETTINGS_DOC_ID)
    .get();
  return resolveCustomerUploadQuotaSettings(snapshot.data());
}
