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

import { ETSY_RECOMMENDATION_COLLECTION } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants";
import type { EtsyRecommendationAnswers } from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.types";
import type { EtsyRecommendationStatus } from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.enums";
import {
  buildEtsyRecommendationBroaderQuery,
  buildEtsyRecommendationSearchUrl,
} from "@fresh-prints/shared/utils/etsyRecommendationQueryBuilder";

import { db } from "../../../config/firebase";

const LIST_LIMIT = 100;

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
};
