import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION } from "../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import {
  collectSubjectCollisionKeys,
  normalizeSuggestionLabelKey,
} from "../../packages/shared/src/constants/etsyRecommendation/etsyRecommendationSuggestionLists";
import type {
  AddEtsyRecommendationSuggestionResponse,
  DeactivateEtsyRecommendationSuggestionResponse,
} from "../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";

import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { notFound, permissionDenied, unauthenticated } from "./lib/errors";
import {
  assertNoSuggestionCollision,
  validateAddEtsyRecommendationSuggestion,
  validateDeactivateSuggestionId,
} from "./lib/etsyRecommendationSuggestionValidation";

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can manage Etsy suggestion lists.");
  }
}

async function loadActiveAdminCollisionKeys(
  kind: "subject" | "style",
): Promise<Set<string>> {
  const snapshot = await adminDb
    .collection(ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION)
    .where("kind", "==", kind)
    .where("active", "==", true)
    .get();

  const keys = new Set<string>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (kind === "style") {
      const labelKey =
        typeof data.labelKey === "string"
          ? data.labelKey
          : normalizeSuggestionLabelKey(typeof data.label === "string" ? data.label : "");
      if (labelKey) {
        keys.add(labelKey);
      }
      continue;
    }
    const label = typeof data.label === "string" ? data.label : "";
    const apiToken = typeof data.apiToken === "string" ? data.apiToken : label;
    const aliases = Array.isArray(data.aliases)
      ? data.aliases.filter((entry): entry is string => typeof entry === "string")
      : [];
    for (const key of collectSubjectCollisionKeys({ label, apiToken, aliases })) {
      keys.add(key);
    }
  }
  return keys;
}

export const addEtsyRecommendationSuggestion = onCall(
  async (request): Promise<AddEtsyRecommendationSuggestionResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdminCaller(caller);

    const validated = validateAddEtsyRecommendationSuggestion(request.data);
    const existingKeys = await loadActiveAdminCollisionKeys(validated.kind);
    assertNoSuggestionCollision(validated.kind, validated.collisionKeys, existingKeys);

    const ref = adminDb.collection(ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION).doc();
    const payload = {
      id: ref.id,
      kind: validated.kind,
      label: validated.label,
      apiToken: validated.apiToken,
      aliases: validated.aliases,
      active: true as const,
      labelKey: validated.labelKey,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
      updatedBy: request.auth.uid,
    };
    await ref.set(payload);

    return {
      suggestionId: ref.id,
      kind: validated.kind,
      label: validated.label,
      apiToken: validated.apiToken,
      aliases: validated.aliases,
      labelKey: validated.labelKey,
      active: true,
    };
  },
);

export const deactivateEtsyRecommendationSuggestion = onCall(
  async (request): Promise<DeactivateEtsyRecommendationSuggestionResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdminCaller(caller);

    const suggestionId = validateDeactivateSuggestionId(request.data);
    const ref = adminDb.collection(ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION).doc(suggestionId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw notFound("That suggestion could not be found.");
    }

    await ref.update({
      active: false,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    });

    return { suggestionId, active: false };
  },
);
