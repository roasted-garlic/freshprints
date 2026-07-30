import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import {
  CUSTOMER_UPLOAD_QUOTA_SETTINGS_DOC_ID,
  resolveCustomerUploadQuotaSettings,
  type CustomerUploadQuotaSettings,
} from "@fresh-prints/shared/constants/customerUpload/customerUploadQuotaSettings.constants";
import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

export const customerUploadQuotaSettingsService = {
  subscribe(
    onData: (settings: CustomerUploadQuotaSettings) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(db, "settings", CUSTOMER_UPLOAD_QUOTA_SETTINGS_DOC_ID),
      (snapshot) => onData(resolveCustomerUploadQuotaSettings(snapshot.data())),
      (error) => onError(error.message),
    );
  },

  async update(settings: CustomerUploadQuotaSettings): Promise<CustomerUploadQuotaSettings> {
    const response = await callTracedFunction<CustomerUploadQuotaSettings, CustomerUploadQuotaSettings>(
      "updateCustomerUploadQuotaSettings",
      { source: "customerUploadQuotaSettingsService.update" },
    )({
      printRequestCreateBatchLimit: settings.printRequestCreateBatchLimit,
      printRequestFinalizeImageLimit: settings.printRequestFinalizeImageLimit,
      printRequestFinalizeZipLimit: settings.printRequestFinalizeZipLimit,
      donationCreateBatchLimit: settings.donationCreateBatchLimit,
      donationFinalizeImageLimit: settings.donationFinalizeImageLimit,
      donationFinalizeZipLimit: settings.donationFinalizeZipLimit,
    });
    return resolveCustomerUploadQuotaSettings(response);
  },
};
