import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  ETSY_RECOMMENDATION_COLLECTION,
  ETSY_RECOMMENDATION_ROUTE,
  ETSY_RECOMMENDATION_SCHEMA_VERSION,
} from "../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import type {
  SubmitEtsyRecommendationRequestRequest,
  SubmitEtsyRecommendationRequestResponse,
} from "../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";
import {
  buildEtsyRecommendationCanonicalQuery,
  buildEtsyRecommendationSearchUrl,
} from "../../packages/shared/src/utils/etsyRecommendationQueryBuilder";
import {
  answersForFirestore,
  parseEtsyRecommendationAnswers,
} from "../../packages/shared/src/utils/etsyRecommendationValidation";

import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
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
  throw internal("Unable to save your Etsy search right now.");
}

export const submitEtsyRecommendationRequest = onCall(
  async (request): Promise<SubmitEtsyRecommendationRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = (request.data ?? {}) as SubmitEtsyRecommendationRequestRequest;
      const answers = parseEtsyRecommendationAnswers(data.answers);
      const confirmReplaceActive = data.confirmReplaceActive === true;
      const canonicalQuery = buildEtsyRecommendationCanonicalQuery(answers);
      const etsySearchUrl = buildEtsyRecommendationSearchUrl(canonicalQuery);

      const activeQuery = await adminDb
        .collection(ETSY_RECOMMENDATION_COLLECTION)
        .where("customerId", "==", portalCustomer.customerId)
        .where("status", "==", "active")
        .limit(5)
        .get();

      if (!activeQuery.empty && !confirmReplaceActive) {
        throw failedPrecondition(
          "You already have an active Etsy search. Confirm to replace it with this new search.",
        );
      }

      let requestId = "";
      let replacedActive = false;

      await adminDb.runTransaction(async (tx) => {
        const activeDocs = activeQuery.docs as QueryDocumentSnapshot[];
        if (activeDocs.length > 0) {
          replacedActive = true;
          const primary = activeDocs[0];
          requestId = primary.id;
          tx.update(primary.ref, {
            schemaVersion: ETSY_RECOMMENDATION_SCHEMA_VERSION,
            route: ETSY_RECOMMENDATION_ROUTE,
            status: "active",
            answers: answersForFirestore(answers),
            canonicalQuery,
            etsySearchUrl,
            updatedAt: FieldValue.serverTimestamp(),
          });
          for (const extra of activeDocs.slice(1)) {
            tx.update(extra.ref, {
              status: "cancelled",
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
          return;
        }

        const ref = adminDb.collection(ETSY_RECOMMENDATION_COLLECTION).doc();
        requestId = ref.id;
        tx.set(ref, {
          id: ref.id,
          schemaVersion: ETSY_RECOMMENDATION_SCHEMA_VERSION,
          customerId: portalCustomer.customerId,
          customerUid: portalCustomer.customerUid,
          route: ETSY_RECOMMENDATION_ROUTE,
          status: "active",
          answers: answersForFirestore(answers),
          canonicalQuery,
          etsySearchUrl,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return {
        requestId,
        canonicalQuery,
        etsySearchUrl,
        replacedActive,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
