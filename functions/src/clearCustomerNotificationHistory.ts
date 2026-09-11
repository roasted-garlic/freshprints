import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_NOTIFICATIONS_COLLECTION } from "../../packages/shared/src/types/customerNotifications/customerNotifications.types";
import { isCustomerNotificationKind } from "../../packages/shared/src/types/customerNotifications/customerNotifications.types";
import { isCustomerNotificationPreservedFromHistoryClear } from "../../packages/shared/src/utils/customerNotifications";

import { adminDb } from "./lib/admin";
import { unauthenticated } from "./lib/errors";
import { assertPortalMaintenanceAllowsCustomerMutation } from "./lib/portalMaintenance";
import { requirePortalCustomer } from "./lib/portalCustomer";

/** Match Portal inbox query window so clear history aligns with what the modal shows. */
const CLEAR_HISTORY_QUERY_LIMIT = 50;

export interface ClearCustomerNotificationHistoryResponse {
  clearedCount: number;
  preservedCount: number;
}

export const clearCustomerNotificationHistory = onCall(
  async (request): Promise<ClearCustomerNotificationHistoryResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const portalCustomer = await requirePortalCustomer(request.auth.uid);
    await assertPortalMaintenanceAllowsCustomerMutation(request.auth.uid);

    const snapshot = await adminDb
      .collection(CUSTOMER_NOTIFICATIONS_COLLECTION)
      .where("customerUid", "==", request.auth.uid)
      .orderBy("createdAt", "desc")
      .limit(CLEAR_HISTORY_QUERY_LIMIT)
      .get();

    let clearedCount = 0;
    let preservedCount = 0;
    let batch = adminDb.batch();
    let batchOps = 0;

    const commitBatch = async () => {
      if (batchOps === 0) {
        return;
      }
      await batch.commit();
      batch = adminDb.batch();
      batchOps = 0;
    };

    for (const doc of snapshot.docs) {
      const data = doc.data() ?? {};
      if (data.customerId !== portalCustomer.customerId) {
        continue;
      }
      if (!isCustomerNotificationKind(data.kind)) {
        continue;
      }
      if (
        isCustomerNotificationPreservedFromHistoryClear({
          kind: data.kind,
          readAt: data.readAt ?? null,
        })
      ) {
        preservedCount += 1;
        continue;
      }
      if (data.clearedFromHistoryAt != null) {
        continue;
      }

      batch.update(doc.ref, {
        clearedFromHistoryAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      batchOps += 1;
      clearedCount += 1;
      if (batchOps >= 400) {
        await commitBatch();
      }
    }

    await commitBatch();

    return { clearedCount, preservedCount };
  },
);
