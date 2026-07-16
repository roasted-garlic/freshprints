import { FieldValue } from "firebase-admin/firestore";

import {
  ETSY_RECOMMENDATION_PREVIEW_QUOTA_EXEMPT_UIDS,
  ETSY_RECOMMENDATION_PREVIEW_SEARCH_DAILY_CUSTOMER_LIMIT,
  ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION,
} from "../../../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import type { EtsyRecommendationPreviewQuota } from "../../../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";

import { adminDb } from "../admin";
import { resourceExhausted } from "../errors";

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function isPreviewQuotaExempt(customerUid: string): boolean {
  return (ETSY_RECOMMENDATION_PREVIEW_QUOTA_EXEMPT_UIDS as readonly string[]).includes(customerUid);
}

function buildPreviewQuotaSnapshot(input: {
  customerUsed: number;
  dayKey?: string;
  unlimited?: boolean;
}): EtsyRecommendationPreviewQuota {
  const dayKey = input.dayKey ?? utcDayKey();

  if (input.unlimited) {
    return {
      utcDay: dayKey,
      customerUsed: input.customerUsed,
      customerLimit: 0,
      customerRemaining: Number.MAX_SAFE_INTEGER,
      unlimited: true,
    };
  }

  const customerLimit = ETSY_RECOMMENDATION_PREVIEW_SEARCH_DAILY_CUSTOMER_LIMIT;
  return {
    utcDay: dayKey,
    customerUsed: input.customerUsed,
    customerLimit,
    customerRemaining: Math.max(0, customerLimit - input.customerUsed),
  };
}

async function readCustomerUsageCount(input: {
  customerUid: string;
  dayKey?: string;
}): Promise<{ customerUsed: number; dayKey: string }> {
  const dayKey = input.dayKey ?? utcDayKey();
  const customerDocId = `${input.customerUid}_${dayKey}`;
  const customerSnap = await adminDb
    .collection(ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION)
    .doc(customerDocId)
    .get();

  return {
    dayKey,
    customerUsed: customerSnap.exists ? Number(customerSnap.data()?.searchCount ?? 0) : 0,
  };
}

export async function readEtsyRecommendationSearchQuota(input: {
  customerUid: string;
  requestId: string;
}): Promise<EtsyRecommendationPreviewQuota> {
  void input.requestId;
  if (isPreviewQuotaExempt(input.customerUid)) {
    return buildPreviewQuotaSnapshot({ customerUsed: 0, unlimited: true });
  }
  const usage = await readCustomerUsageCount({ customerUid: input.customerUid });
  return buildPreviewQuotaSnapshot(usage);
}

function previewLimitMessage(quota: EtsyRecommendationPreviewQuota): string {
  return `Daily listing preview limit reached (${quota.customerLimit} per day, UTC). You can still open Best match and More options on Etsy without limit. Resets tomorrow.`;
}

export async function chargeEtsyRecommendationSearchQuota(input: {
  customerUid: string;
  requestId: string;
}): Promise<EtsyRecommendationPreviewQuota> {
  void input.requestId;

  if (isPreviewQuotaExempt(input.customerUid)) {
    return buildPreviewQuotaSnapshot({ customerUsed: 0, unlimited: true });
  }

  const dayKey = utcDayKey();
  const customerDocId = `${input.customerUid}_${dayKey}`;
  const customerRef = adminDb.collection(ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION).doc(customerDocId);

  return adminDb.runTransaction(async (tx) => {
    const customerSnap = await tx.get(customerRef);
    const customerCount = customerSnap.exists ? Number(customerSnap.data()?.searchCount ?? 0) : 0;
    const quotaBeforeCharge = buildPreviewQuotaSnapshot({
      customerUsed: customerCount,
      dayKey,
    });

    if (customerCount >= ETSY_RECOMMENDATION_PREVIEW_SEARCH_DAILY_CUSTOMER_LIMIT) {
      throw resourceExhausted(previewLimitMessage(quotaBeforeCharge), {
        previewQuota: quotaBeforeCharge,
      });
    }

    const nextCustomerCount = customerCount + 1;

    if (!customerSnap.exists) {
      tx.set(customerRef, {
        kind: "customer",
        customerUid: input.customerUid,
        utcDay: dayKey,
        searchCount: 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.update(customerRef, {
        searchCount: nextCustomerCount,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return buildPreviewQuotaSnapshot({
      customerUsed: nextCustomerCount,
      dayKey,
    });
  });
}
