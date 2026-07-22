import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

import {
  ETSY_RECOMMENDATION_COLLECTION,
  ETSY_RECOMMENDATION_ROUTE,
} from "../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import type {
  StaffSearchEtsyRecommendationApiResultsRequest,
  StaffSearchEtsyRecommendationApiResultsResponse,
} from "../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";
import { buildEtsyRecommendationSearchUrl } from "../../packages/shared/src/utils/etsyRecommendationQueryBuilder";
import {
  assertEtsyRecommendationSchemaVersion,
  parseEtsyRecommendationAnswers,
} from "../../packages/shared/src/utils/etsyRecommendationValidation";

import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  notFound,
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
import { etsyXApiKeySecret } from "./lib/secrets";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof EtsyHttpError) {
    if (error.status === 429) {
      throw unavailable(
        "Etsy search is busy right now. Please wait a moment and try again.",
      );
    }
    throw unavailable("Could not load Etsy API results right now. Please try again.");
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to search Etsy API results right now.");
}

/** Test seam: inject a mock client so unit tests never hit the network. */
let etsyClientOverride: EtsyClient | null = null;

export function setStaffEtsyClientForTests(client: EtsyClient | null): void {
  etsyClientOverride = client;
}

export async function runStaffSearchEtsyRecommendationApiResults(input: {
  uid: string;
  requestId: string;
  client: EtsyClient | null;
}): Promise<StaffSearchEtsyRecommendationApiResultsResponse> {
  const caller = await loadCallerProfile(input.uid);
  assertStaffCaller(caller);

  if (typeof input.requestId !== "string" || !input.requestId.trim()) {
    throw invalidArgument("A request id is required.");
  }
  const requestId = input.requestId.trim();

  const snap = await adminDb.collection(ETSY_RECOMMENDATION_COLLECTION).doc(requestId).get();
  if (!snap.exists) {
    throw notFound("That Etsy search could not be found.");
  }

  const data = snap.data() ?? {};

  try {
    assertEtsyRecommendationSchemaVersion(data.schemaVersion);
  } catch {
    throw failedPrecondition("This design search uses an unsupported schema version.");
  }

  if (data.route !== ETSY_RECOMMENDATION_ROUTE) {
    throw failedPrecondition("This request is not a design recommendations search.");
  }

  const status = data.status;
  if (status !== "active" && status !== "completed" && status !== "cancelled") {
    throw failedPrecondition("This design search has an unsupported status.");
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

  const executed = await executeEtsyRecommendationApiSearch({
    client: input.client,
    answers,
    requestId,
    logPrefix: "etsy.staff_search",
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
    apiKeywordsUsed: executed.apiKeywordsUsed,
    keywordStrategy: executed.keywordStrategy,
  };
}

export const staffSearchEtsyRecommendationApiResults = onCall(
  { secrets: [etsyXApiKeySecret] },
  async (request): Promise<StaffSearchEtsyRecommendationApiResultsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const data = (request.data ?? {}) as StaffSearchEtsyRecommendationApiResultsRequest &
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

      return await runStaffSearchEtsyRecommendationApiResults({
        uid: request.auth.uid,
        requestId: data.requestId,
        client,
      });
    } catch (error) {
      logger.error("etsy.staff_search.failed", {
        message: error instanceof Error ? error.message : "unknown",
        status: error instanceof EtsyHttpError ? error.status : undefined,
      });
      mapHttpsError(error);
    }
  },
);
