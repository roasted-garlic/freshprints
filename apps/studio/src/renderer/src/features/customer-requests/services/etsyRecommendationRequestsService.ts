import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { ETSY_RECOMMENDATION_COLLECTION } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants";
import type {
  EtsyRecommendationAnswers,
  EtsyRecommendationListing,
} from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.types";
import type { EtsyRecommendationStatus } from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.enums";
import type {
  SearchEtsyRecommendationsStatus,
  StaffSearchEtsyRecommendationApiResultsRequest,
  StaffSearchEtsyRecommendationApiResultsResponse,
} from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types";
import {
  buildEtsyRecommendationBroaderQuery,
  buildEtsyRecommendationSearchUrl,
} from "@fresh-prints/shared/utils/etsyRecommendationQueryBuilder";

import { db, functions } from "../../../config/firebase";

const LIST_LIMIT = 100;

export interface EtsyRecommendationApiSearchSnapshotView {
  searchedAt: Date | null;
  status: SearchEtsyRecommendationsStatus;
  listings: EtsyRecommendationListing[];
  apiKeywordsUsed: string;
  keywordStrategy: "focused" | "fallback" | null;
}

export interface EtsyRecommendationRequestListItem {
  id: string;
  customerId: string;
  /** Resolved from `customers/{id}.displayName` (falls back to customerId). */
  customerDisplayName: string;
  status: EtsyRecommendationStatus;
  subjectSummary: string;
  styleSummary: string;
  wording: string;
  canonicalQuery: string;
  etsySearchUrl: string;
  broaderSearchUrl: string;
  lastApiSearch: EtsyRecommendationApiSearchSnapshotView | null;
  createdAt: Date | null;
}

function asTimestampDate(value: unknown): Date | null {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return null;
}

function subjectFromAnswers(answers: Record<string, unknown> | null): string {
  if (!answers) {
    return "";
  }
  if (typeof answers.subjectText === "string" && answers.subjectText.trim()) {
    return answers.subjectText.trim();
  }
  if (Array.isArray(answers.subjects)) {
    return answers.subjects
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .join(", ");
  }
  return "";
}

function stylesFromAnswers(answers: Record<string, unknown> | null): string {
  if (!answers || !Array.isArray(answers.styles)) {
    return "";
  }
  return answers.styles
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
    .join(", ");
}

function mapListing(raw: unknown): EtsyRecommendationListing | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const listingId = typeof row.listingId === "number" ? row.listingId : Number(row.listingId);
  if (!Number.isInteger(listingId) || listingId <= 0) {
    return null;
  }
  if (typeof row.title !== "string" || !row.title.trim()) {
    return null;
  }
  if (typeof row.listingUrl !== "string" || !row.listingUrl.trim()) {
    return null;
  }
  return {
    listingId,
    title: row.title.trim(),
    listingUrl: row.listingUrl.trim(),
    imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
    shopName: typeof row.shopName === "string" ? row.shopName : null,
    priceAmount: typeof row.priceAmount === "string" ? row.priceAmount : null,
    currencyCode: typeof row.currencyCode === "string" ? row.currencyCode : null,
  };
}

function mapLastApiSearch(raw: unknown): EtsyRecommendationApiSearchSnapshotView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const data = raw as Record<string, unknown>;
  if (data.status !== "ok" && data.status !== "empty" && data.status !== "unavailable") {
    return null;
  }
  const listings = Array.isArray(data.listings)
    ? data.listings.map(mapListing).filter((entry): entry is EtsyRecommendationListing => entry != null)
    : [];
  return {
    searchedAt: asTimestampDate(data.searchedAt),
    status: data.status,
    listings,
    apiKeywordsUsed: typeof data.apiKeywordsUsed === "string" ? data.apiKeywordsUsed.trim() : "",
    keywordStrategy:
      data.keywordStrategy === "focused" || data.keywordStrategy === "fallback"
        ? data.keywordStrategy
        : null,
  };
}

function mapDoc(
  id: string,
  data: Record<string, unknown>,
): EtsyRecommendationRequestListItem | null {
  if (typeof data.customerId !== "string" || !data.customerId.trim()) {
    return null;
  }
  if (
    data.status !== "active" &&
    data.status !== "completed" &&
    data.status !== "cancelled"
  ) {
    return null;
  }
  if (typeof data.canonicalQuery !== "string" || typeof data.etsySearchUrl !== "string") {
    return null;
  }
  const answers =
    data.answers && typeof data.answers === "object" && !Array.isArray(data.answers)
      ? (data.answers as Record<string, unknown>)
      : null;

  const sharedAnswers: EtsyRecommendationAnswers = {
    subjectText: typeof answers?.subjectText === "string" ? answers.subjectText : undefined,
    styles: Array.isArray(answers?.styles)
      ? answers.styles.filter((entry): entry is string => typeof entry === "string")
      : undefined,
    wording: typeof answers?.wording === "string" ? answers.wording : undefined,
  };
  let broaderSearchUrl = "";
  try {
    broaderSearchUrl = buildEtsyRecommendationSearchUrl(
      buildEtsyRecommendationBroaderQuery(sharedAnswers),
    );
  } catch {
    broaderSearchUrl = "";
  }

  return {
    id,
    customerId: data.customerId.trim(),
    customerDisplayName: data.customerId.trim(),
    status: data.status,
    subjectSummary: subjectFromAnswers(answers),
    styleSummary: stylesFromAnswers(answers),
    wording:
      answers && typeof answers.wording === "string" ? answers.wording.trim() : "",
    canonicalQuery: data.canonicalQuery.trim(),
    etsySearchUrl: data.etsySearchUrl.trim(),
    broaderSearchUrl,
    lastApiSearch: mapLastApiSearch(data.lastApiSearch),
    createdAt: asTimestampDate(data.createdAt),
  };
}

async function resolveCustomerDisplayNames(
  customerIds: readonly string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(customerIds.filter(Boolean))];
  const names = new Map<string, string>();

  await Promise.all(
    uniqueIds.map(async (customerId) => {
      try {
        const snap = await getDoc(doc(db, "customers", customerId));
        if (!snap.exists()) {
          names.set(customerId, customerId);
          return;
        }
        const data = snap.data();
        const displayName =
          typeof data.displayName === "string" && data.displayName.trim()
            ? data.displayName.trim()
            : typeof data.username === "string" && data.username.trim()
              ? data.username.trim()
              : customerId;
        names.set(customerId, displayName);
      } catch {
        names.set(customerId, customerId);
      }
    }),
  );

  return names;
}

function callableErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

export const etsyRecommendationRequestsService = {
  subscribeRecent(
    onData: (items: EtsyRecommendationRequestListItem[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, ETSY_RECOMMENDATION_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(LIST_LIMIT),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const mapped: EtsyRecommendationRequestListItem[] = [];
        for (const docSnap of snapshot.docs) {
          const item = mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
          if (item) {
            mapped.push(item);
          }
        }

        void resolveCustomerDisplayNames(mapped.map((item) => item.customerId))
          .then((names) => {
            onData(
              mapped.map((item) => ({
                ...item,
                customerDisplayName: names.get(item.customerId) ?? item.customerId,
              })),
            );
          })
          .catch(() => {
            onData(mapped);
          });
      },
      (error) => {
        onError(error.message || "Unable to load Etsy searches.");
      },
    );
  },

  async fetchApiResults(
    requestId: string,
  ): Promise<StaffSearchEtsyRecommendationApiResultsResponse> {
    const callable = httpsCallable<
      StaffSearchEtsyRecommendationApiResultsRequest,
      StaffSearchEtsyRecommendationApiResultsResponse
    >(functions, "staffSearchEtsyRecommendationApiResults");
    try {
      const result = await callable({ requestId });
      return result.data;
    } catch (error) {
      throw new Error(
        callableErrorMessage(error, "Unable to fetch Etsy API results for this search."),
      );
    }
  },
};
