import { onCall } from "firebase-functions/v2/https";

import type {
  GetCustomerUploadDailyQuotaRequest,
  GetCustomerUploadDailyQuotaResponse,
} from "../../packages/shared/src/types/customerUpload/customerUploadDailyQuota.types";
import { parseCustomerUploadPurpose } from "../../packages/shared/src/utils/customerUploadPurpose";

import { readDailyQuota } from "./lib/customerUploadRateLimit";
import { invalidArgument, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";

export const getCustomerUploadDailyQuota = onCall(
  async (request): Promise<GetCustomerUploadDailyQuotaResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    await requirePortalCustomer(request.auth.uid);

    let purpose;
    try {
      const data = (request.data ?? {}) as GetCustomerUploadDailyQuotaRequest;
      purpose = parseCustomerUploadPurpose(data.purpose);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid purpose.");
    }

    return readDailyQuota(request.auth.uid, purpose);
  },
);
