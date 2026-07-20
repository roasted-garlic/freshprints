import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  CUSTOMER_UPLOAD_QUOTA_SETTINGS_DOC_ID,
  parseCustomerUploadQuotaSettingsInput,
  resolveCustomerUploadQuotaSettings,
  type CustomerUploadQuotaSettings,
} from "../../packages/shared/src/constants/customerUpload/customerUploadQuotaSettings.constants";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

export const updateCustomerUploadQuotaSettings = onCall(
  async (request): Promise<CustomerUploadQuotaSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || caller.role !== "owner") {
      throw permissionDenied("Only active owners can update customer upload quotas.");
    }

    const parsed = parseCustomerUploadQuotaSettingsInput(request.data);
    if (!parsed) {
      throw invalidArgument(
        "All six quota fields must be positive integers within allowed bounds.",
      );
    }

    const settings: CustomerUploadQuotaSettings = {
      ...parsed,
      updatedBy: request.auth.uid,
    };
    await adminDb.collection("settings").doc(CUSTOMER_UPLOAD_QUOTA_SETTINGS_DOC_ID).set({
      ...settings,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return resolveCustomerUploadQuotaSettings(settings);
  },
);
