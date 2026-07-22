import { onCall } from "firebase-functions/v2/https";

import type {
  GetCustomerUploadDailyQuotaRequest,
  GetCustomerUploadDailyQuotaResponse,
} from "../../packages/shared/src/types/customerUpload/customerUploadDailyQuota.types";
import { parseCustomerUploadPurpose } from "../../packages/shared/src/utils/customerUploadPurpose";

import { readDailyQuota } from "./lib/customerUploadRateLimit";
import { invalidArgument, unauthenticated } from "./lib/errors";
import { isAnonymousAuthToken } from "./lib/catalogDonationUploader";
import { requirePortalCustomer } from "./lib/portalCustomer";

export const getCustomerUploadDailyQuota = onCall(
  async (request): Promise<GetCustomerUploadDailyQuotaResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    let purpose;
    try {
      const data = (request.data ?? {}) as GetCustomerUploadDailyQuotaRequest;
      purpose = parseCustomerUploadPurpose(data.purpose);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid purpose.");
    }

    const isGuest = isAnonymousAuthToken(request.auth.token);
    if (isGuest) {
      if (purpose !== "catalog_donation") {
        throw invalidArgument("Guest quota is only available for catalog donations.");
      }
      return readDailyQuota(request.auth.uid, purpose, "guest");
    }

    await requirePortalCustomer(request.auth.uid);
    return readDailyQuota(request.auth.uid, purpose, "customer");
  },
);
