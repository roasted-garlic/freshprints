import {
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import {
  buildStaffInboxAlertDeliveryDocId,
  isLegacyStaffInboxAlertDeliveryDocId,
  type StaffInboxAlertDelivery,
  type StaffInboxAlertDeliveryKind,
} from "@fresh-prints/shared/staffInbox/staffInboxAlertDelivery.types";
import { runTracedWrite } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { db } from "../../../config/firebase";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

function mapDelivery(data: DocumentData): StaffInboxAlertDelivery | null {
  if (
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
    itemId: data.itemId,
    kind: data.kind,
    occurredAtMillis,
    soundPlayedAtMillis: soundPlayedAt?.toMillis() ?? Date.now(),
    deliveredByUserId:
      typeof data.deliveredByUserId === "string" && data.deliveredByUserId.trim()
        ? data.deliveredByUserId.trim()
        : typeof data.userId === "string" && data.userId.trim()
          ? data.userId.trim()
          : undefined,
  };
}

function dedupeDeliveriesByItemId(deliveries: StaffInboxAlertDelivery[]): StaffInboxAlertDelivery[] {
  const byItemId = new Map<string, StaffInboxAlertDelivery>();

  for (const delivery of deliveries) {
    const existing = byItemId.get(delivery.itemId);

    if (!existing || delivery.soundPlayedAtMillis > existing.soundPlayedAtMillis) {
      byItemId.set(delivery.itemId, delivery);
    }
  }

  return [...byItemId.values()];
}

let sharedDeliveryMigrationPromise: Promise<void> | null = null;

export const staffInboxAlertDeliveryService = {
  subscribe(
    onChange: (deliveries: StaffInboxAlertDelivery[]) => void,
    onError?: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      firestoreCollectionService.getStaffInboxAlertDeliveriesCollection(),
      (snapshot) => {
        const deliveries = snapshot.docs
          .map((entry) => mapDelivery(entry.data()))
          .filter((entry): entry is StaffInboxAlertDelivery => entry !== null);
        onChange(dedupeDeliveriesByItemId(deliveries));
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
    const docId = buildStaffInboxAlertDeliveryDocId(input.itemId);
    const ref = doc(firestoreCollectionService.getStaffInboxAlertDeliveriesCollection(), docId);
    await runTracedWrite(
      "setDoc",
      () =>
        setDoc(
          ref,
          {
            itemId: input.itemId,
            kind: input.kind,
            occurredAtMillis: input.occurredAtMillis,
            deliveredByUserId: input.userId,
            soundPlayedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      {
        app: "studio",
        collection: "staffInboxAlertDeliveries",
        documentPathPattern: "staffInboxAlertDeliveries/{staffInboxAlertDeliveryId}",
        source: "staffInboxAlertDeliveryService.markSoundPlayed",
      },
    );
  },

  async migrateLegacyPerUserDeliveriesToShared(): Promise<void> {
    if (sharedDeliveryMigrationPromise) {
      return sharedDeliveryMigrationPromise;
    }

    sharedDeliveryMigrationPromise = (async () => {
      const snapshot = await getDocs(firestoreCollectionService.getStaffInboxAlertDeliveriesCollection());
      const grouped = new Map<
        string,
        { canonicalId: string; entries: Array<{ docId: string; delivery: StaffInboxAlertDelivery }> }
      >();

      for (const document of snapshot.docs) {
        const mapped = mapDelivery(document.data());

        if (!mapped) {
          continue;
        }

        const canonicalId = buildStaffInboxAlertDeliveryDocId(mapped.itemId);
        const entry = grouped.get(mapped.itemId) ?? { canonicalId, entries: [] };
        entry.entries.push({ docId: document.id, delivery: mapped });
        grouped.set(mapped.itemId, entry);
      }

      for (const { canonicalId, entries } of grouped.values()) {
        const best = [...entries].sort(
          (left, right) => right.delivery.soundPlayedAtMillis - left.delivery.soundPlayedAtMillis,
        )[0]?.delivery;

        if (!best) {
          continue;
        }

        const hasCanonical = entries.some((entry) => entry.docId === canonicalId);

        if (!hasCanonical) {
          const canonicalRef = doc(
            firestoreCollectionService.getStaffInboxAlertDeliveriesCollection(),
            canonicalId,
          );
          await runTracedWrite(
            "setDoc",
            () =>
              setDoc(
                canonicalRef,
                {
                  itemId: best.itemId,
                  kind: best.kind,
                  occurredAtMillis: best.occurredAtMillis,
                  ...(best.deliveredByUserId ? { deliveredByUserId: best.deliveredByUserId } : {}),
                  soundPlayedAt: serverTimestamp(),
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              ),
            {
              app: "studio",
              collection: "staffInboxAlertDeliveries",
              documentPathPattern: "staffInboxAlertDeliveries/{staffInboxAlertDeliveryId}",
              source: "staffInboxAlertDeliveryService.migrateLegacyPerUserDeliveriesToShared",
            },
          );
        }

        const staleDocIds = entries
          .map((entry) => entry.docId)
          .filter(
            (docId) =>
              docId !== canonicalId &&
              isLegacyStaffInboxAlertDeliveryDocId(docId, entries[0]?.delivery.itemId ?? ""),
          );

        if (staleDocIds.length === 0) {
          continue;
        }

        const batch = writeBatch(db);
        for (const docId of staleDocIds) {
          batch.delete(
            doc(firestoreCollectionService.getStaffInboxAlertDeliveriesCollection(), docId),
          );
        }

        await runTracedWrite("writeBatch", () => batch.commit(), {
          app: "studio",
          collection: "staffInboxAlertDeliveries",
          documentPathPattern: "staffInboxAlertDeliveries/{staffInboxAlertDeliveryId}",
          source: "staffInboxAlertDeliveryService.migrateLegacyPerUserDeliveriesToShared",
        });
      }
    })().finally(() => {
      sharedDeliveryMigrationPromise = null;
    });

    return sharedDeliveryMigrationPromise;
  },
};
