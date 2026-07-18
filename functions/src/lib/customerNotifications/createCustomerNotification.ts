import { FieldValue } from "firebase-admin/firestore";

import { CUSTOMER_NOTIFICATIONS_COLLECTION } from "../../../../packages/shared/src/types/customerNotifications/customerNotifications.types";
import type { CustomerNotificationKind } from "../../../../packages/shared/src/types/customerNotifications/customerNotifications.types";
import {
  buildCustomerNotificationHref,
  truncateCustomerNotificationBody,
} from "../../../../packages/shared/src/utils/customerNotifications";

import { adminDb } from "../admin";
import { sendCustomerWebPushForNotification } from "./sendCustomerWebPush";

export async function createCustomerNotification(input: {
  id: string;
  customerId: string;
  customerUid: string;
  kind: CustomerNotificationKind;
  title: string;
  body?: string | null;
  requestId: string;
  proofId?: string;
}): Promise<void> {
  const ref = adminDb.collection(CUSTOMER_NOTIFICATIONS_COLLECTION).doc(input.id);
  const existing = await ref.get();
  if (existing.exists) {
    console.info("[customerNotifications] skip existing", {
      id: input.id,
      kind: input.kind,
      customerUid: input.customerUid,
    });
    return;
  }

  const body = truncateCustomerNotificationBody(input.body);
  const href = buildCustomerNotificationHref(input.kind);

  await ref.set({
    id: input.id,
    customerId: input.customerId,
    customerUid: input.customerUid,
    kind: input.kind,
    title: input.title,
    body,
    href,
    requestId: input.requestId,
    ...(input.proofId ? { proofId: input.proofId } : {}),
    readAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.info("[customerNotifications] created", {
    id: input.id,
    kind: input.kind,
    customerUid: input.customerUid,
    customerId: input.customerId,
    requestId: input.requestId,
  });

  // Push failures must not look like write failures — already caught inside helper.
  await sendCustomerWebPushForNotification({
    customerId: input.customerId,
    customerUid: input.customerUid,
    title: input.title,
    body,
    href,
    notificationId: input.id,
  });
}
