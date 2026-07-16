import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { ETSY_RECOMMENDATION_COLLECTION } from "../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import type {
  EtsyRecommendationRequestIdRequest,
  EtsyRecommendationRequestIdResponse,
} from "../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";

import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  notFound,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { requirePortalCustomer } from "./lib/etsy/requirePortalCustomer";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to update this Etsy search right now.");
}

async function transitionOwnActiveRequest(
  uid: string,
  requestIdRaw: unknown,
  nextStatus: "completed" | "cancelled",
): Promise<EtsyRecommendationRequestIdResponse> {
  if (typeof requestIdRaw !== "string" || !requestIdRaw.trim()) {
    throw invalidArgument("A request id is required.");
  }
  const requestId = requestIdRaw.trim();
  const portalCustomer = await requirePortalCustomer(uid);
  const ref = adminDb.collection(ETSY_RECOMMENDATION_COLLECTION).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw notFound("That Etsy search could not be found.");
  }
  const data = snap.data() ?? {};
  if (data.customerUid !== portalCustomer.customerUid) {
    throw permissionDenied("You do not have access to this Etsy search.");
  }
  if (data.status !== "active") {
    throw failedPrecondition(`Only active Etsy searches can be marked ${nextStatus}.`);
  }
  await ref.update({
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { requestId, status: nextStatus };
}

export const completeEtsyRecommendationRequest = onCall(
  async (request): Promise<EtsyRecommendationRequestIdResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const data = (request.data ?? {}) as EtsyRecommendationRequestIdRequest;
      return await transitionOwnActiveRequest(request.auth.uid, data.requestId, "completed");
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const cancelEtsyRecommendationRequest = onCall(
  async (request): Promise<EtsyRecommendationRequestIdResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const data = (request.data ?? {}) as EtsyRecommendationRequestIdRequest;
      return await transitionOwnActiveRequest(request.auth.uid, data.requestId, "cancelled");
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
