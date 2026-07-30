import {
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { buildStaffInboxAckDocId } from "@fresh-prints/shared/staffInbox/staffInboxAck.types";
import type { StaffInboxCompletedItem, StaffInboxItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";
import { runTracedWrite } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";
import {
  clearLegacyStaffInboxAckLocalStorage,
  loadLegacyStaffInboxAckRecords,
  type StaffInboxAckRecord,
} from "./staffInboxAckLegacyLocalStore";

function mapAckRecord(data: DocumentData): StaffInboxAckRecord | null {
  if (
    typeof data.itemId !== "string" ||
    (data.kind !== "portal_queued" && data.kind !== "show_queue_full") ||
    typeof data.title !== "string" ||
    typeof data.subtitle !== "string"
  ) {
    return null;
  }

  const acknowledgedAt = mapFirestoreTimestamp(data.acknowledgedAt);
  const occurredAtMillis =
    typeof data.occurredAtMillis === "number" && Number.isFinite(data.occurredAtMillis)
      ? data.occurredAtMillis
      : 0;

  return {
    itemId: data.itemId,
    kind: data.kind,
    title: data.title,
    subtitle: data.subtitle,
    printRequestId: typeof data.printRequestId === "string" ? data.printRequestId : undefined,
    upcomingShowId: typeof data.upcomingShowId === "string" ? data.upcomingShowId : undefined,
    printRequestTab:
      data.printRequestTab === "working" ||
      data.printRequestTab === "queued" ||
      data.printRequestTab === "printing" ||
      data.printRequestTab === "printed"
        ? data.printRequestTab
        : undefined,
    createdAtMillis: occurredAtMillis,
    acknowledgedAtMillis: acknowledgedAt?.toMillis() ?? Date.now(),
    acknowledgedByUserId:
      typeof data.acknowledgedByUserId === "string" && data.acknowledgedByUserId.trim()
        ? data.acknowledgedByUserId.trim()
        : undefined,
    acknowledgedByDisplayName:
      typeof data.acknowledgedByDisplayName === "string" && data.acknowledgedByDisplayName.trim()
        ? data.acknowledgedByDisplayName.trim()
        : undefined,
  };
}

export function mapAckRecordsToCompletedItems(records: StaffInboxAckRecord[]): StaffInboxCompletedItem[] {
  return records.map((record) => ({
    id: record.itemId,
    kind: record.kind,
    printRequestId: record.printRequestId,
    upcomingShowId: record.upcomingShowId,
    title: record.title,
    subtitle: record.subtitle,
    printRequestTab: record.printRequestTab,
    occurredAtMillis: record.createdAtMillis || record.acknowledgedAtMillis,
    acknowledgedAtMillis: record.acknowledgedAtMillis,
    acknowledgedByUserId: record.acknowledgedByUserId,
    acknowledgedByDisplayName: record.acknowledgedByDisplayName,
  }));
}

export const staffInboxAckService = {
  subscribe(
    userId: string,
    onChange: (records: StaffInboxAckRecord[]) => void,
    onError?: (message: string) => void,
  ): Unsubscribe {
    const acksQuery = query(
      firestoreCollectionService.getStaffInboxAcksCollection(),
      where("userId", "==", userId),
    );

    return onSnapshot(
      acksQuery,
      (snapshot) => {
        const records: StaffInboxAckRecord[] = [];

        for (const document of snapshot.docs) {
          const mapped = mapAckRecord(document.data());

          if (mapped) {
            records.push(mapped);
          }
        }

        records.sort((left, right) => right.acknowledgedAtMillis - left.acknowledgedAtMillis);
        onChange(records);
      },
      (error) => {
        onError?.(error.message);
        onChange([]);
      },
    );
  },

  async acknowledge(
    userId: string,
    item: StaffInboxItem,
    options?: { displayName?: string | null },
  ): Promise<void> {
    const ackRef = doc(
      firestoreCollectionService.getStaffInboxAcksCollection(),
      buildStaffInboxAckDocId(userId, item.id),
    );
    const displayName =
      typeof options?.displayName === "string" && options.displayName.trim()
        ? options.displayName.trim()
        : undefined;

    await runTracedWrite(
      "setDoc",
      () =>
        setDoc(ackRef, {
          userId,
          itemId: item.id,
          kind: item.kind,
          title: item.title,
          subtitle: item.subtitle,
          ...(item.printRequestId ? { printRequestId: item.printRequestId } : {}),
          ...(item.upcomingShowId ? { upcomingShowId: item.upcomingShowId } : {}),
          ...(item.printRequestTab ? { printRequestTab: item.printRequestTab } : {}),
          occurredAtMillis: item.occurredAtMillis,
          acknowledgedByUserId: userId,
          ...(displayName ? { acknowledgedByDisplayName: displayName } : {}),
          acknowledgedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      {
        app: "studio",
        collection: "staffInboxAcks",
        documentPathPattern: "staffInboxAcks/{staffInboxAckId}",
        source: "staffInboxAckService.acknowledge",
      },
    );
  },

  async restore(userId: string, itemId: string): Promise<void> {
    const ackRef = doc(
      firestoreCollectionService.getStaffInboxAcksCollection(),
      buildStaffInboxAckDocId(userId, itemId),
    );
    await runTracedWrite("deleteDoc", () => deleteDoc(ackRef), {
      app: "studio",
      collection: "staffInboxAcks",
      documentPathPattern: "staffInboxAcks/{staffInboxAckId}",
      source: "staffInboxAckService.restore",
    });
  },

  async pruneResolvedShowQueueFull(
    userId: string,
    records: StaffInboxAckRecord[],
    fullShowIds: ReadonlySet<string>,
  ): Promise<void> {
    const stale = records.filter((record) => {
      if (record.kind !== "show_queue_full") {
        return false;
      }

      const showId = record.upcomingShowId ?? record.itemId.split(":")[1];
      return !showId || !fullShowIds.has(showId);
    });

    await Promise.all(stale.map((record) => this.restore(userId, record.itemId)));
  },

  /**
   * One-shot: copy legacy localStorage acks into Firestore, then clear the local key.
   */
  async migrateLegacyLocalStorage(userId: string): Promise<void> {
    const legacyRecords = loadLegacyStaffInboxAckRecords(userId);

    if (legacyRecords.length === 0) {
      clearLegacyStaffInboxAckLocalStorage(userId);
      return;
    }

    await Promise.all(
      legacyRecords.map((record) =>
        this.acknowledge(userId, {
          id: record.itemId,
          kind: record.kind,
          title: record.title,
          subtitle: record.subtitle,
          printRequestId: record.printRequestId,
          upcomingShowId: record.upcomingShowId,
          printRequestTab: record.printRequestTab,
          occurredAtMillis: record.createdAtMillis || record.acknowledgedAtMillis,
        }),
      ),
    );

    clearLegacyStaffInboxAckLocalStorage(userId);
  },
};
