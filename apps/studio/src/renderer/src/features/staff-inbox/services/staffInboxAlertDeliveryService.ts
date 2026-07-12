import {
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import {
  buildStaffInboxAlertDeliveryDocId,
  type StaffInboxAlertDelivery,
  type StaffInboxAlertDeliveryKind,
} from "@fresh-prints/shared/staffInbox/staffInboxAlertDelivery.types";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

function mapDelivery(data: DocumentData): StaffInboxAlertDelivery | null {
  if (
    typeof data.userId !== "string" ||
    typeof data.itemId !== "string" ||
    (data.kind !== "portal_queued" && data.kind !== "show_queue_full")
  ) {
    return null;
  }

  const soundPlayedAt = mapFirestoreTimestamp(data.soundPlayedAt);
  const occurredAtMillis =
    typeof data.occurredAtMillis === "number" && Number.isFinite(data.occurredAtMillis)
      ? data.occurredAtMillis
      : 0;

  return {
    userId: data.userId,
    itemId: data.itemId,
    kind: data.kind,
    occurredAtMillis,
    soundPlayedAtMillis: soundPlayedAt?.toMillis() ?? Date.now(),
  };
}

export const staffInboxAlertDeliveryService = {
  subscribe(
    userId: string,
    onChange: (deliveries: StaffInboxAlertDelivery[]) => void,
    onError?: (message: string) => void,
  ): Unsubscribe {
    const deliveryQuery = query(
      firestoreCollectionService.getStaffInboxAlertDeliveriesCollection(),
      where("userId", "==", userId),
    );

    return onSnapshot(
      deliveryQuery,
      (snapshot) => {
        const deliveries = snapshot.docs
          .map((entry) => mapDelivery(entry.data()))
          .filter((entry): entry is StaffInboxAlertDelivery => entry !== null);
        onChange(deliveries);
      },
      (error) => {
        onError?.(error.message);
      },
    );
  },

  async markSoundPlayed(input: {
    userId: string;
    itemId: string;
    kind: StaffInboxAlertDeliveryKind;
    occurredAtMillis: number;
  }): Promise<void> {
    const docId = buildStaffInboxAlertDeliveryDocId(input.userId, input.itemId);
    const ref = doc(firestoreCollectionService.getStaffInboxAlertDeliveriesCollection(), docId);
    await setDoc(
      ref,
      {
        userId: input.userId,
        itemId: input.itemId,
        kind: input.kind,
        occurredAtMillis: input.occurredAtMillis,
        soundPlayedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },
};
