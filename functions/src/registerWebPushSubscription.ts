import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { adminDb } from "./lib/admin";
import { invalidArgument, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/etsy/requirePortalCustomer";

interface ExistingSubscriptionData {
  disabledAt?: unknown;
  disabledReason?: unknown;
  enabled?: unknown;
  origin?: unknown;
  token?: unknown;
  userAgent?: unknown;
}
export const WEB_PUSH_SIBLING_LIMIT = 25;

export function shouldWriteCurrentWebPushSubscription(
  existing: ExistingSubscriptionData | undefined,
  desired: {
    enabled: boolean;
    origin: string;
    token: string;
    userAgent: string;
  },
): boolean {
  if (!existing) return true;
  return (
    existing.token !== desired.token ||
    existing.enabled !== desired.enabled ||
    (typeof existing.userAgent === "string" ? existing.userAgent : "") !== desired.userAgent ||
    (typeof existing.origin === "string" ? existing.origin : "") !== desired.origin ||
    (desired.enabled && (existing.disabledAt != null || existing.disabledReason != null))
  );
}

export const registerWebPushSubscription = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }

  try {
    const portalCustomer = await requirePortalCustomer(request.auth.uid);
    const data = (request.data ?? {}) as {
      token?: unknown;
      enabled?: unknown;
      userAgent?: unknown;
      origin?: unknown;
      reason?: unknown;
    };
    const token = typeof data.token === "string" ? data.token.trim() : "";
    if (!token || token.length > 4096) {
      throw invalidArgument("A valid push token is required.");
    }
    const enabled = data.enabled !== false;
    const userAgent =
      typeof data.userAgent === "string" ? data.userAgent.trim().slice(0, 500) : "";
    const origin =
      typeof data.origin === "string" ? data.origin.trim().slice(0, 200) : "";
    const invocationReason =
      data.reason === "user-enable" || data.reason === "session-sync"
        ? data.reason
        : "unknown";

    const subscriptionId = createHash("sha256").update(token).digest("hex").slice(0, 40);
    const customerRef = adminDb.collection("customers").doc(portalCustomer.customerId);
    const ref = customerRef.collection("webPushSubscriptions").doc(subscriptionId);

    const existing = await ref.get();
    const shouldWriteCurrent = shouldWriteCurrentWebPushSubscription(
      existing.exists ? existing.data() : undefined,
      { enabled, origin, token, userAgent },
    );
    if (shouldWriteCurrent) {
      await ref.set(
        {
          id: subscriptionId,
          customerId: portalCustomer.customerId,
          customerUid: request.auth.uid,
          token,
          enabled,
          ...(userAgent ? { userAgent } : {}),
          ...(origin ? { origin } : {}),
          // Clear prior disable markers when re-enabling a refreshed token.
          ...(enabled
            ? { disabledReason: FieldValue.delete(), disabledAt: FieldValue.delete() }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
          ...(!existing.exists ? { createdAt: FieldValue.serverTimestamp() } : {}),
        },
        { merge: true },
      );
    }

    // Only one enabled token set should win after refresh — disable siblings so
    // sends do not mix a fresh token with older UNREGISTERED ones.
    if (enabled) {
      const siblings = await customerRef
        .collection("webPushSubscriptions")
        .where("enabled", "==", true)
        .limit(WEB_PUSH_SIBLING_LIMIT)
        .get();
      const olderSiblings = siblings.docs.filter((doc) => doc.id !== subscriptionId);
      await Promise.all(
        olderSiblings.map((doc) =>
            doc.ref.set(
              {
                enabled: false,
                disabledAt: new Date(),
                disabledReason: "replaced_by_newer_token",
              },
              { merge: true },
            ),
          ),
      );
      const reads = 3 + Math.max(1, siblings.size);
      const writes = (shouldWriteCurrent ? 1 : 0) + olderSiblings.length;
      if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
        console.info("portal-web-push-subscription-accounting", {
          currentSubscriptionOutcome: shouldWriteCurrent
            ? existing.exists ? "updated" : "created"
            : "unchanged",
          olderSiblingsDisabled: olderSiblings.length,
          totalFirestoreReads: reads,
          totalFirestoreWrites: writes,
          invocationReason,
        });
      }
    } else if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
      console.info("portal-web-push-subscription-accounting", {
        currentSubscriptionOutcome: shouldWriteCurrent
          ? existing.exists ? "updated" : "created"
          : "unchanged",
        olderSiblingsDisabled: 0,
        totalFirestoreReads: 3,
        totalFirestoreWrites: shouldWriteCurrent ? 1 : 0,
        invocationReason,
      });
    }

    return { subscriptionId, enabled };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Unable to save browser notification settings right now.");
  }
});
