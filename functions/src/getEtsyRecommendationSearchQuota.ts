import { onCall } from "firebase-functions/v2/https";

import type {
  GetEtsyRecommendationSearchQuotaRequest,
  GetEtsyRecommendationSearchQuotaResponse,
} from "../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";

import { invalidArgument, unauthenticated } from "./lib/errors";
import { readEtsyRecommendationSearchQuota } from "./lib/etsy/etsyRecommendationRateLimit";
import { requirePortalCustomer } from "./lib/etsy/requirePortalCustomer";

export const getEtsyRecommendationSearchQuota = onCall(
  async (request): Promise<GetEtsyRecommendationSearchQuotaResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const data = (request.data ?? {}) as GetEtsyRecommendationSearchQuotaRequest;
    if (typeof data.requestId !== "string" || !data.requestId.trim()) {
      throw invalidArgument("A request id is required.");
    }

    const requestId = data.requestId.trim();
    const portalCustomer = await requirePortalCustomer(request.auth.uid);
    const previewQuota = await readEtsyRecommendationSearchQuota({
      customerUid: portalCustomer.customerUid,
      requestId,
    });

    return { requestId, previewQuota };
  },
);
