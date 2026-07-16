import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION,
  ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION,
  ETSY_SUGGESTION_REQUEST_DAILY_CUSTOMER_LIMIT,
  ETSY_SUGGESTION_REQUESTS_COLLECTION,
} from "../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import {
  collectSubjectCollisionKeys,
  normalizeSuggestionLabelKey,
} from "../../packages/shared/src/constants/etsyRecommendation/etsyRecommendationSuggestionLists";
import type {
  ApproveEtsySuggestionRequestResponse,
  RejectEtsySuggestionRequestResponse,
  SubmitEtsySuggestionRequestResponse,
} from "../../packages/shared/src/types/etsyRecommendation/etsyRecommendationActions.types";

import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  notFound,
  permissionDenied,
  resourceExhausted,
  unauthenticated,
} from "./lib/errors";
import { requirePortalCustomer } from "./lib/etsy/requirePortalCustomer";
import {
  assertNoSuggestionCollision,
  validateAddEtsyRecommendationSuggestion,
} from "./lib/etsyRecommendationSuggestionValidation";
import {
  validateEtsySuggestionRequestInput,
  validateSuggestionRequestId,
} from "./lib/etsySuggestionRequestValidation";

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can review suggestion requests.");
  }
}

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

async function assertAndChargeSuggestionSubmitQuota(customerUid: string): Promise<void> {
  const dayKey = utcDayKey();
  const docId = `suggestionSubmit_${customerUid}_${dayKey}`;
  const ref = adminDb.collection(ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION).doc(docId);
  const limit = ETSY_SUGGESTION_REQUEST_DAILY_CUSTOMER_LIMIT;

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = snap.exists ? Number(snap.data()?.submitCount ?? 0) : 0;
    if (used >= limit) {
      throw resourceExhausted(
        `Daily suggestion request limit reached (${limit} per day, UTC). Try again tomorrow.`,
      );
    }
    tx.set(
      ref,
      {
        kind: "suggestion_submit",
        customerUid,
        utcDay: dayKey,
        submitCount: used + 1,
        updatedAt: FieldValue.serverTimestamp(),
        ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
  });
}

async function findPendingDuplicate(input: {
  customerUid: string;
  kind: "subject" | "style";
  labelKey: string;
}): Promise<{ id: string; label: string } | null> {
  const snapshot = await adminDb
    .collection(ETSY_SUGGESTION_REQUESTS_COLLECTION)
    .where("customerUid", "==", input.customerUid)
    .where("status", "==", "pending")
    .where("kind", "==", input.kind)
    .where("labelKey", "==", input.labelKey)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  const label = typeof doc.data().label === "string" ? doc.data().label : input.labelKey;
  return { id: doc.id, label };
}

async function findActiveOverlayByKindAndLabelKey(input: {
  kind: "subject" | "style";
  labelKey: string;
}): Promise<{ id: string; label: string } | null> {
  const snapshot = await adminDb
    .collection(ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION)
    .where("kind", "==", input.kind)
    .where("active", "==", true)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const existingKey =
      typeof data.labelKey === "string" && data.labelKey
        ? data.labelKey
        : normalizeSuggestionLabelKey(typeof data.label === "string" ? data.label : "");
    if (existingKey === input.labelKey) {
      const label = typeof data.label === "string" ? data.label : existingKey;
      return { id: doc.id, label };
    }
  }
  return null;
}

async function loadActiveAdminCollisionKeys(kind: "subject" | "style"): Promise<Set<string>> {
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

export const submitEtsySuggestionRequest = onCall(
  async (request): Promise<SubmitEtsySuggestionRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const { customerId, customerUid } = await requirePortalCustomer(request.auth.uid);
    const validated = validateEtsySuggestionRequestInput(request.data);

    const existingPending = await findPendingDuplicate({
      customerUid,
      kind: validated.kind,
      labelKey: validated.labelKey,
    });
    if (existingPending) {
      return {
        requestId: existingPending.id,
        kind: validated.kind,
        label: existingPending.label,
        labelKey: validated.labelKey,
        status: "pending",
        alreadyPending: true,
      };
    }

    await assertAndChargeSuggestionSubmitQuota(customerUid);

    const ref = adminDb.collection(ETSY_SUGGESTION_REQUESTS_COLLECTION).doc();
    await ref.set({
      id: ref.id,
      kind: validated.kind,
      label: validated.label,
      apiToken: validated.apiToken,
      labelKey: validated.labelKey,
      status: "pending",
      customerUid,
      customerId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      requestId: ref.id,
      kind: validated.kind,
      label: validated.label,
      labelKey: validated.labelKey,
      status: "pending",
    };
  },
);

export const approveEtsySuggestionRequest = onCall(
  async (request): Promise<ApproveEtsySuggestionRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const actorUid = request.auth.uid;
    const caller = await loadCallerProfile(actorUid);
    assertOwnerAdminCaller(caller);

    const requestId = validateSuggestionRequestId(request.data);
    const requestRef = adminDb.collection(ETSY_SUGGESTION_REQUESTS_COLLECTION).doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      throw notFound("That suggestion request could not be found.");
    }
    const requestData = requestSnap.data()!;
    if (requestData.status !== "pending") {
      throw failedPrecondition("Only pending suggestion requests can be approved.");
    }
    if (requestData.kind !== "subject" && requestData.kind !== "style") {
      throw invalidArgument("Suggestion request kind is invalid.");
    }
    if (typeof requestData.label !== "string" || !requestData.label.trim()) {
      throw invalidArgument("Suggestion request label is invalid.");
    }

    const kind = requestData.kind as "subject" | "style";
    const label = requestData.label.trim();
    const apiToken =
      typeof requestData.apiToken === "string" && requestData.apiToken.trim()
        ? requestData.apiToken.trim()
        : label;
    const labelKey =
      typeof requestData.labelKey === "string" && requestData.labelKey
        ? requestData.labelKey
        : normalizeSuggestionLabelKey(label);

    const existingOverlay = await findActiveOverlayByKindAndLabelKey({ kind, labelKey });
    if (existingOverlay) {
      await requestRef.update({
        status: "approved",
        resultingSuggestionId: existingOverlay.id,
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: actorUid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        requestId,
        status: "approved",
        suggestionId: existingOverlay.id,
        alreadyExisted: true,
      };
    }

    const validated = validateAddEtsyRecommendationSuggestion({
      kind,
      label,
      ...(kind === "subject" ? { apiToken } : {}),
    });
    const existingKeys = await loadActiveAdminCollisionKeys(kind);
    assertNoSuggestionCollision(validated.kind, validated.collisionKeys, existingKeys);

    const suggestionRef = adminDb.collection(ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION).doc();
    await adminDb.runTransaction(async (tx) => {
      const fresh = await tx.get(requestRef);
      if (!fresh.exists || fresh.data()?.status !== "pending") {
        throw failedPrecondition("Only pending suggestion requests can be approved.");
      }
      tx.set(suggestionRef, {
        id: suggestionRef.id,
        kind: validated.kind,
        label: validated.label,
        apiToken: validated.apiToken,
        aliases: validated.aliases,
        active: true,
        labelKey: validated.labelKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: actorUid,
        updatedBy: actorUid,
        sourceSuggestionRequestId: requestId,
      });
      tx.update(requestRef, {
        status: "approved",
        resultingSuggestionId: suggestionRef.id,
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: actorUid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      requestId,
      status: "approved",
      suggestionId: suggestionRef.id,
    };
  },
);

export const rejectEtsySuggestionRequest = onCall(
  async (request): Promise<RejectEtsySuggestionRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdminCaller(caller);

    const requestId = validateSuggestionRequestId(request.data);
    let rejectReason: string | undefined;
    if (request.data && typeof request.data === "object" && !Array.isArray(request.data)) {
      const raw = (request.data as Record<string, unknown>).rejectReason;
      if (raw != null) {
        if (typeof raw !== "string") {
          throw invalidArgument("Reject reason must be text.");
        }
        const trimmed = raw.trim();
        if (trimmed.length > 240) {
          throw invalidArgument("Reject reason must be 240 characters or fewer.");
        }
        if (trimmed) {
          rejectReason = trimmed;
        }
      }
    }

    const requestRef = adminDb.collection(ETSY_SUGGESTION_REQUESTS_COLLECTION).doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      throw notFound("That suggestion request could not be found.");
    }
    if (requestSnap.data()?.status !== "pending") {
      throw failedPrecondition("Only pending suggestion requests can be rejected.");
    }

    await requestRef.update({
      status: "rejected",
      ...(rejectReason ? { rejectReason } : {}),
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { requestId, status: "rejected" };
  },
);
