import { getMessaging } from "firebase-admin/messaging";

import { isAssistedBrowserPushOptedIn } from "../../../../packages/shared/src/utils/customerNotifications";

import { adminDb } from "../admin";

const MAX_TOKENS = 20;

export async function sendCustomerWebPushForNotification(input: {
  customerId: string;
  customerUid: string;
  title: string;
  body: string;
  href: string;
  notificationId: string;
}): Promise<void> {
  try {
    const customerSnap = await adminDb.collection("customers").doc(input.customerId).get();
    if (!customerSnap.exists) {
      console.info("[customerNotifications] web push skip: customer missing", {
        customerId: input.customerId,
        notificationId: input.notificationId,
      });
      return;
    }
    const customer = customerSnap.data() ?? {};
    if (customer.userId !== input.customerUid) {
      console.info("[customerNotifications] web push skip: userId mismatch", {
        customerId: input.customerId,
        notificationId: input.notificationId,
      });
      return;
    }
    if (!isAssistedBrowserPushOptedIn(customer.assistedBrowserPushOptIn)) {
      console.info("[customerNotifications] web push skip: opted out", {
        customerId: input.customerId,
        notificationId: input.notificationId,
      });
      return;
    }

    const subsSnap = await adminDb
      .collection("customers")
      .doc(input.customerId)
      .collection("webPushSubscriptions")
      .where("enabled", "==", true)
      .limit(MAX_TOKENS)
      .get();

    const tokens = subsSnap.docs
      .map((doc) => {
        const token = doc.data().token;
        return typeof token === "string" ? token.trim() : "";
      })
      .filter(Boolean);

    if (tokens.length === 0) {
      console.info("[customerNotifications] web push skip: no enabled tokens", {
        customerId: input.customerId,
        notificationId: input.notificationId,
      });
      return;
    }

    // Data-only web push: SW onBackgroundMessage / page onMessage own display.
    // Do not send top-level or webpush `notification` + relative fcmOptions.link —
    // relative links are invalid for Chrome click actions and have suppressed OS
    // toasts while FCM still reported successCount >= 1. Click routing uses SW
    // notificationclick + data.href instead.
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      data: {
        title: input.title,
        body: input.body,
        href: input.href,
        notificationId: input.notificationId,
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
      },
    });

    const failureSummaries = response.responses
      .map((result, index) =>
        result.success
          ? null
          : {
              index,
              code: result.error?.code ?? "unknown",
              message: result.error?.message ?? "",
            },
      )
      .filter((value): value is { index: number; code: string; message: string } => value != null);

    console.info("[customerNotifications] web push send result", {
      customerId: input.customerId,
      notificationId: input.notificationId,
      tokenCount: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      payload: "data_only",
      failures: failureSummaries.slice(0, 5),
    });

    const staleTokenIndexes = failureSummaries
      .filter(
        ({ code }) =>
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token",
      )
      .map(({ index }) => index);

    await Promise.all(
      staleTokenIndexes.map(async (index) => {
        const token = tokens[index];
        const staleDoc = subsSnap.docs.find((doc) => doc.data().token === token);
        if (staleDoc) {
          await staleDoc.ref.set(
            { enabled: false, disabledAt: new Date(), disabledReason: "fcm_invalid_token" },
            { merge: true },
          );
        }
      }),
    );
  } catch (error) {
    console.error("[customerNotifications] web push send failed", error);
  }
}
