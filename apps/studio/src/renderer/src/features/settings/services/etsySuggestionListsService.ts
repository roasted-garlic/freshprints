import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants";
import type { AdminSuggestionOverlay } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestionLists";
import type {
  AddEtsyRecommendationSuggestionRequest,
  AddEtsyRecommendationSuggestionResponse,
  DeactivateEtsyRecommendationSuggestionRequest,
  DeactivateEtsyRecommendationSuggestionResponse,
  EtsyRecommendationSuggestionKind,
} from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types";

import { db, functions } from "../../../config/firebase";

function mapOverlay(
  id: string,
  data: Record<string, unknown>,
): AdminSuggestionOverlay | null {
  if (data.kind !== "subject" && data.kind !== "style") {
    return null;
  }
  if (typeof data.label !== "string" || !data.label.trim()) {
    return null;
  }
  if (data.active !== true) {
    return null;
  }
  const label = data.label.trim();
  const apiToken =
    typeof data.apiToken === "string" && data.apiToken.trim() ? data.apiToken.trim() : label;
  const labelKey =
    typeof data.labelKey === "string" && data.labelKey.trim()
      ? data.labelKey.trim()
      : label.toLowerCase();
  const aliases = Array.isArray(data.aliases)
    ? data.aliases.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
    : undefined;

  return {
    id,
    kind: data.kind,
    label,
    apiToken,
    ...(aliases?.length ? { aliases } : {}),
    active: true,
    labelKey,
  };
}

function mapCallableError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    return new Error(error.message);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error("Unable to update Etsy suggestion lists.");
}

export const etsySuggestionListsService = {
  subscribeActiveByKind(
    kind: EtsyRecommendationSuggestionKind,
    onData: (overlays: AdminSuggestionOverlay[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(
        collection(db, ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION),
        where("kind", "==", kind),
        where("active", "==", true),
      ),
      (snapshot) => {
        const overlays: AdminSuggestionOverlay[] = [];
        for (const docSnap of snapshot.docs) {
          const mapped = mapOverlay(docSnap.id, docSnap.data() as Record<string, unknown>);
          if (mapped) {
            overlays.push(mapped);
          }
        }
        overlays.sort((a, b) => a.label.localeCompare(b.label));
        onData(overlays);
      },
      (error) => {
        onError(error.message);
      },
    );
  },

  async addSuggestion(
    input: AddEtsyRecommendationSuggestionRequest,
  ): Promise<AddEtsyRecommendationSuggestionResponse> {
    try {
      const callable = httpsCallable<
        AddEtsyRecommendationSuggestionRequest,
        AddEtsyRecommendationSuggestionResponse
      >(functions, "addEtsyRecommendationSuggestion");
      const response = await callable(input);
      return response.data;
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async deactivateSuggestion(suggestionId: string): Promise<void> {
    try {
      const callable = httpsCallable<
        DeactivateEtsyRecommendationSuggestionRequest,
        DeactivateEtsyRecommendationSuggestionResponse
      >(functions, "deactivateEtsyRecommendationSuggestion");
      await callable({ suggestionId });
    } catch (error) {
      throw mapCallableError(error);
    }
  },
};
