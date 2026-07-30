import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";

import { ETSY_SUGGESTION_REQUESTS_COLLECTION } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants";
import type {
  ApproveEtsySuggestionRequestResponse,
  EtsyRecommendationSuggestionKind,
  EtsySuggestionRequestStatus,
  RejectEtsySuggestionRequestResponse,
  ResolveEtsySuggestionRequestRequest,
} from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types";

import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

export interface EtsySuggestionRequestItem {
  id: string;
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  apiToken: string;
  labelKey: string;
  status: EtsySuggestionRequestStatus;
  customerUid: string;
  customerId: string;
  createdAt: Date | null;
}

function mapRequest(
  id: string,
  data: Record<string, unknown>,
): EtsySuggestionRequestItem | null {
  if (data.kind !== "subject" && data.kind !== "style") {
    return null;
  }
  if (typeof data.label !== "string" || !data.label.trim()) {
    return null;
  }
  if (data.status !== "pending" && data.status !== "approved" && data.status !== "rejected") {
    return null;
  }
  if (typeof data.customerUid !== "string" || typeof data.customerId !== "string") {
    return null;
  }
  const label = data.label.trim();
  const createdAt =
    data.createdAt && typeof (data.createdAt as Timestamp).toDate === "function"
      ? (data.createdAt as Timestamp).toDate()
      : null;

  return {
    id,
    kind: data.kind,
    label,
    apiToken:
      typeof data.apiToken === "string" && data.apiToken.trim() ? data.apiToken.trim() : label,
    labelKey:
      typeof data.labelKey === "string" && data.labelKey.trim()
        ? data.labelKey.trim()
        : label.toLowerCase(),
    status: data.status,
    customerUid: data.customerUid,
    customerId: data.customerId,
    createdAt,
  };
}

function mapCallableError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    return new Error(error.message);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error("Unable to update that suggestion request.");
}

export const etsySuggestionRequestsService = {
  subscribePending(
    onData: (items: EtsySuggestionRequestItem[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(
        collection(db, ETSY_SUGGESTION_REQUESTS_COLLECTION),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
      ),
      (snapshot) => {
        const items: EtsySuggestionRequestItem[] = [];
        for (const docSnap of snapshot.docs) {
          const mapped = mapRequest(docSnap.id, docSnap.data() as Record<string, unknown>);
          if (mapped) {
            items.push(mapped);
          }
        }
        onData(items);
      },
      (error) => {
        onError(error.message);
      },
    );
  },

  async approve(requestId: string): Promise<ApproveEtsySuggestionRequestResponse> {
    try {
      return await callTracedFunction<
        ResolveEtsySuggestionRequestRequest,
        ApproveEtsySuggestionRequestResponse
      >("approveEtsySuggestionRequest", {
        source: "etsySuggestionRequestsService.approve",
      })({ requestId });
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async reject(requestId: string, rejectReason?: string): Promise<RejectEtsySuggestionRequestResponse> {
    try {
      return await callTracedFunction<
        ResolveEtsySuggestionRequestRequest,
        RejectEtsySuggestionRequestResponse
      >("rejectEtsySuggestionRequest", {
        source: "etsySuggestionRequestsService.reject",
      })({
        requestId,
        ...(rejectReason?.trim() ? { rejectReason: rejectReason.trim() } : {}),
      });
    } catch (error) {
      throw mapCallableError(error);
    }
  },
};
