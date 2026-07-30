import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";

import { ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants";
import type { AdminSuggestionOverlay } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestionLists";
import type {
  AddEtsyRecommendationSuggestionRequest,
  AddEtsyRecommendationSuggestionResponse,
  DeactivateEtsyRecommendationSuggestionRequest,
  DeactivateEtsyRecommendationSuggestionResponse,
  EtsyRecommendationSuggestionKind,
} from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types";

import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";

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
  const sourceSuggestionRequestId =
    typeof data.sourceSuggestionRequestId === "string" && data.sourceSuggestionRequestId.trim()
      ? data.sourceSuggestionRequestId.trim()
      : undefined;

  return {
    id,
    kind: data.kind,
    label,
    apiToken,
    ...(aliases?.length ? { aliases } : {}),
    active: true,
    labelKey,
    ...(sourceSuggestionRequestId ? { sourceSuggestionRequestId } : {}),
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

function mapSnapshotOverlays(
  docs: { id: string; data: () => Record<string, unknown> }[],
): AdminSuggestionOverlay[] {
  const overlays: AdminSuggestionOverlay[] = [];
  for (const docSnap of docs) {
    const mapped = mapOverlay(docSnap.id, docSnap.data());
    if (mapped) {
      overlays.push(mapped);
    }
  }
  overlays.sort((a, b) => a.label.localeCompare(b.label));
  return overlays;
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
        onData(
          mapSnapshotOverlays(
            snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              data: () => docSnap.data() as Record<string, unknown>,
            })),
          ),
        );
      },
      (error) => {
        onError(error.message);
      },
    );
  },

  /** Active admin overlays of any kind (Portal live list additions). */
  subscribeActiveAll(
    onData: (overlays: AdminSuggestionOverlay[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(
        collection(db, ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION),
        where("active", "==", true),
      ),
      (snapshot) => {
        onData(
          mapSnapshotOverlays(
            snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              data: () => docSnap.data() as Record<string, unknown>,
            })),
          ),
        );
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
      return await callTracedFunction<
        AddEtsyRecommendationSuggestionRequest,
        AddEtsyRecommendationSuggestionResponse
      >("addEtsyRecommendationSuggestion", {
        source: "etsySuggestionListsService.addSuggestion",
      })(input);
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async deactivateSuggestion(suggestionId: string): Promise<void> {
    try {
      await callTracedFunction<
        DeactivateEtsyRecommendationSuggestionRequest,
        DeactivateEtsyRecommendationSuggestionResponse
      >("deactivateEtsyRecommendationSuggestion", {
        source: "etsySuggestionListsService.deactivateSuggestion",
      })({ suggestionId });
    } catch (error) {
      throw mapCallableError(error);
    }
  },
};
