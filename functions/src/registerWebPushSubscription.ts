import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { adminDb } from "./lib/admin";
import { invalidArgument, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/etsy/requirePortalCustomer";

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

    const subscriptionId = createHash("sha256").update(token).digest("hex").slice(0, 40);
    const customerRef = adminDb.collection("customers").doc(portalCustomer.customerId);
    const ref = customerRef.collection("webPushSubscriptions").doc(subscriptionId);

    const existing = await ref.get();
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

    // Only one enabled token set should win after refresh — disable siblings so
    // sends do not mix a fresh token with older UNREGISTERED ones.
    if (enabled) {
      const siblings = await customerRef
        .collection("webPushSubscriptions")
        .where("enabled", "==", true)
        .limit(25)
        .get();
      await Promise.all(
        siblings.docs
          .filter((doc) => doc.id !== subscriptionId)
          .map((doc) =>
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
    }

    console.info("[registerWebPushSubscription] saved", {
      customerId: portalCustomer.customerId,
      subscriptionIdPrefix: subscriptionId.slice(0, 8),
      enabled,
      origin: origin || null,
    });

    return { subscriptionId, enabled };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Unable to save browser notification settings right now.");
  }
});
