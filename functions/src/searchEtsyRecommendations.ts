import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

import {
  ETSY_RECOMMENDATION_COLLECTION,
  ETSY_RECOMMENDATION_ROUTE,
} from "../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import type {
  SearchEtsyRecommendationsRequest,
  SearchEtsyRecommendationsResponse,
} from "../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";
import { buildEtsyRecommendationSearchUrl } from "../../packages/shared/src/utils/etsyRecommendationQueryBuilder";
import {
  assertEtsyRecommendationSchemaVersion,
  parseEtsyRecommendationAnswers,
} from "../../packages/shared/src/utils/etsyRecommendationValidation";

import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  notFound,
  permissionDenied,
  unauthenticated,
  unavailable,
} from "./lib/errors";
import {
  assertNoCustomEtsySearchParams,
  executeEtsyRecommendationApiSearch,
  persistEtsyRecommendationApiSearchSnapshot,
} from "./lib/etsy/etsyRecommendationApiSearchCore";
import type { EtsyClient } from "./lib/etsy/etsyClient.types";
import { createLiveEtsyClient, EtsyHttpError } from "./lib/etsy/liveEtsyClient";
import {
  chargeEtsyRecommendationSearchQuota,
  readEtsyRecommendationSearchQuota,
} from "./lib/etsy/etsyRecommendationRateLimit";
import { requirePortalCustomer } from "./lib/etsy/requirePortalCustomer";
import { etsyXApiKeySecret } from "./lib/secrets";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof EtsyHttpError) {
    if (error.status === 429) {
      throw unavailable(
        "Search is busy right now. Please wait a moment and try again, or use the search links above.",
      );
    }
    throw unavailable(
      "We could not load listing previews right now. You can retry or open a search in a new tab using the links above.",
    );
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to search for designs right now.");
}

/** Test seam: inject a mock client so unit tests never hit the network. */
let etsyClientOverride: EtsyClient | null = null;

export function setEtsyClientForTests(client: EtsyClient | null): void {
  etsyClientOverride = client;
}

export async function runSearchEtsyRecommendations(input: {
  uid: string;
  requestId: string;
  client: EtsyClient | null;
}): Promise<SearchEtsyRecommendationsResponse> {
  const portalCustomer = await requirePortalCustomer(input.uid);

  if (typeof input.requestId !== "string" || !input.requestId.trim()) {
    throw invalidArgument("A request id is required.");
  }
  const requestId = input.requestId.trim();

  const snap = await adminDb.collection(ETSY_RECOMMENDATION_COLLECTION).doc(requestId).get();
  if (!snap.exists) {
    throw notFound("That design search could not be found.");
  }

  const data = snap.data() ?? {};
  if (data.customerUid !== portalCustomer.customerUid) {
    throw permissionDenied("You do not have access to this design search.");
  }

  try {
    assertEtsyRecommendationSchemaVersion(data.schemaVersion);
  } catch {
    throw failedPrecondition("This design search uses an unsupported schema version.");
  }

  if (data.route !== ETSY_RECOMMENDATION_ROUTE) {
    throw failedPrecondition("This request is not a design recommendations search.");
  }
  if (data.status !== "active") {
    throw failedPrecondition("Only active design searches can be refreshed.");
  }

  const canonicalQuery = typeof data.canonicalQuery === "string" ? data.canonicalQuery.trim() : "";
  const storedEtsySearchUrl = typeof data.etsySearchUrl === "string" ? data.etsySearchUrl.trim() : "";
  const etsySearchUrl =
    canonicalQuery.length > 0
      ? buildEtsyRecommendationSearchUrl(canonicalQuery)
      : storedEtsySearchUrl;
  if (!canonicalQuery || !etsySearchUrl) {
    throw failedPrecondition("This design search is missing its query.");
  }

  let answers;
  try {
    answers = parseEtsyRecommendationAnswers(data.answers);
  } catch {
    throw failedPrecondition("This design search has incomplete answers.");
  }

  const previewQuotaSnapshot = await readEtsyRecommendationSearchQuota({
    customerUid: portalCustomer.customerUid,
    requestId,
  });

  if (!input.client) {
    const emptyBase: SearchEtsyRecommendationsResponse = {
      requestId,
      canonicalQuery,
      etsySearchUrl,
      listings: [],
      status: "unavailable",
      previewQuota: previewQuotaSnapshot,
    };
    await persistEtsyRecommendationApiSearchSnapshot({
      requestId,
      status: "unavailable",
      listings: [],
    });
    return emptyBase;
  }

  const previewQuota = await chargeEtsyRecommendationSearchQuota({
    customerUid: portalCustomer.customerUid,
    requestId,
  });

  const executed = await executeEtsyRecommendationApiSearch({
    client: input.client,
    answers,
    requestId,
    logPrefix: "etsy.search",
  });

  await persistEtsyRecommendationApiSearchSnapshot({
    requestId,
    status: executed.status,
    listings: executed.listings,
    apiKeywordsUsed: executed.apiKeywordsUsed,
    keywordStrategy: executed.keywordStrategy,
  });

  return {
    requestId,
    canonicalQuery,
    etsySearchUrl,
    listings: executed.listings,
    status: executed.status,
    previewQuota,
    apiKeywordsUsed: executed.apiKeywordsUsed,
    keywordStrategy: executed.keywordStrategy,
  };
}

export const searchEtsyRecommendations = onCall(
  { secrets: [etsyXApiKeySecret] },
  async (request): Promise<SearchEtsyRecommendationsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const data = (request.data ?? {}) as SearchEtsyRecommendationsRequest &
        Record<string, unknown>;

      try {
        assertNoCustomEtsySearchParams(data);
      } catch (error) {
        throw invalidArgument(
          error instanceof Error ? error.message : "Custom search parameters are not allowed.",
        );
      }

      let client: EtsyClient | null = etsyClientOverride;
      if (!client) {
        try {
          const key = etsyXApiKeySecret.value();
          if (!key?.trim()) {
            client = null;
          } else {
            client = createLiveEtsyClient(key);
          }
        } catch {
          client = null;
        }
      }

      return await runSearchEtsyRecommendations({
        uid: request.auth.uid,
        requestId: data.requestId,
        client,
      });
    } catch (error) {
      logger.error("etsy.search.failed", {
        message: error instanceof Error ? error.message : "unknown",
        status: error instanceof EtsyHttpError ? error.status : undefined,
      });
      mapHttpsError(error);
    }
  },
);
