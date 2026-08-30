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
  buildStaffInboxAckDocId,
  isLegacyStaffInboxAckDocId,
} from "@fresh-prints/shared/staffInbox/staffInboxAck.types";
import type { StaffInboxCompletedItem, StaffInboxItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";
import { runTracedWrite } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { db } from "../../../config/firebase";
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
  const acknowledgedByUserId =
    typeof data.acknowledgedByUserId === "string" && data.acknowledgedByUserId.trim()
      ? data.acknowledgedByUserId.trim()
      : typeof data.userId === "string" && data.userId.trim()
        ? data.userId.trim()
        : undefined;

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
    acknowledgedByUserId,
    acknowledgedByDisplayName:
      typeof data.acknowledgedByDisplayName === "string" && data.acknowledgedByDisplayName.trim()
        ? data.acknowledgedByDisplayName.trim()
        : undefined,
  };
}

function dedupeAckRecordsByItemId(records: StaffInboxAckRecord[]): StaffInboxAckRecord[] {
  const byItemId = new Map<string, StaffInboxAckRecord>();

  for (const record of records) {
    const existing = byItemId.get(record.itemId);

    if (!existing || record.acknowledgedAtMillis > existing.acknowledgedAtMillis) {
      byItemId.set(record.itemId, record);
    }
  }

  return [...byItemId.values()].sort((left, right) => right.acknowledgedAtMillis - left.acknowledgedAtMillis);
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

let sharedAckMigrationPromise: Promise<void> | null = null;

export const staffInboxAckService = {
  subscribe(
    onChange: (records: StaffInboxAckRecord[]) => void,
    onError?: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      firestoreCollectionService.getStaffInboxAcksCollection(),
      (snapshot) => {
        const records: StaffInboxAckRecord[] = [];

        for (const document of snapshot.docs) {
          const mapped = mapAckRecord(document.data());

          if (mapped) {
            records.push(mapped);
          }
        }

        onChange(dedupeAckRecordsByItemId(records));
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
      buildStaffInboxAckDocId(item.id),
    );
    const displayName =
      typeof options?.displayName === "string" && options.displayName.trim()
        ? options.displayName.trim()
        : undefined;

    await runTracedWrite(
      "setDoc",
      () =>
        setDoc(ackRef, {
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

  async restore(itemId: string): Promise<void> {
    const ackRef = doc(
      firestoreCollectionService.getStaffInboxAcksCollection(),
      buildStaffInboxAckDocId(itemId),
    );
    await runTracedWrite("deleteDoc", () => deleteDoc(ackRef), {
      app: "studio",
      collection: "staffInboxAcks",
      documentPathPattern: "staffInboxAcks/{staffInboxAckId}",
      source: "staffInboxAckService.restore",
    });
  },

  async deleteAck(itemId: string): Promise<void> {
    await this.restore(itemId);
  },

  async deleteAcks(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    const batch = writeBatch(db);
    for (const itemId of itemIds) {
      batch.delete(
        doc(firestoreCollectionService.getStaffInboxAcksCollection(), buildStaffInboxAckDocId(itemId)),
      );
    }

    await runTracedWrite("writeBatch", () => batch.commit(), {
      app: "studio",
      collection: "staffInboxAcks",
      documentPathPattern: "staffInboxAcks/{staffInboxAckId}",
      source: "staffInboxAckService.deleteAcks",
    });
  },

  async pruneResolvedShowQueueFull(
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

    await Promise.all(stale.map((record) => this.restore(record.itemId)));
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

  /**
   * Consolidate legacy per-user ack docs into shared item-id docs.
   */
  async migrateLegacyPerUserAcksToShared(): Promise<void> {
    if (sharedAckMigrationPromise) {
      return sharedAckMigrationPromise;
    }

    sharedAckMigrationPromise = (async () => {
      const snapshot = await getDocs(firestoreCollectionService.getStaffInboxAcksCollection());
      const grouped = new Map<string, { canonicalId: string; records: Array<{ docId: string; record: StaffInboxAckRecord }> }>();

      for (const document of snapshot.docs) {
        const mapped = mapAckRecord(document.data());

        if (!mapped) {
          continue;
        }

        const canonicalId = buildStaffInboxAckDocId(mapped.itemId);
        const entry = grouped.get(mapped.itemId) ?? { canonicalId, records: [] };
        entry.records.push({ docId: document.id, record: mapped });
        grouped.set(mapped.itemId, entry);
      }

      for (const { canonicalId, records } of grouped.values()) {
        const best = [...records].sort(
          (left, right) => right.record.acknowledgedAtMillis - left.record.acknowledgedAtMillis,
        )[0]?.record;

        if (!best) {
          continue;
        }

        const canonicalRef = doc(firestoreCollectionService.getStaffInboxAcksCollection(), canonicalId);
        const hasCanonical = records.some((entry) => entry.docId === canonicalId);

        if (!hasCanonical && best.acknowledgedByUserId) {
          await runTracedWrite(
            "setDoc",
            () =>
              setDoc(canonicalRef, {
                itemId: best.itemId,
                kind: best.kind,
                title: best.title,
                subtitle: best.subtitle,
                ...(best.printRequestId ? { printRequestId: best.printRequestId } : {}),
                ...(best.upcomingShowId ? { upcomingShowId: best.upcomingShowId } : {}),
                ...(best.printRequestTab ? { printRequestTab: best.printRequestTab } : {}),
                occurredAtMillis: best.createdAtMillis || best.acknowledgedAtMillis,
                acknowledgedByUserId: best.acknowledgedByUserId,
                ...(best.acknowledgedByDisplayName
                  ? { acknowledgedByDisplayName: best.acknowledgedByDisplayName }
                  : {}),
                acknowledgedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }),
            {
              app: "studio",
              collection: "staffInboxAcks",
              documentPathPattern: "staffInboxAcks/{staffInboxAckId}",
              source: "staffInboxAckService.migrateLegacyPerUserAcksToShared",
            },
          );
        }

        const staleDocIds = records
          .map((entry) => entry.docId)
          .filter(
            (docId) =>
              docId !== canonicalId &&
              isLegacyStaffInboxAckDocId(docId, records[0]?.record.itemId ?? ""),
          );

        await Promise.all(
          staleDocIds.map((docId) =>
            runTracedWrite(
              "deleteDoc",
              () => deleteDoc(doc(firestoreCollectionService.getStaffInboxAcksCollection(), docId)),
              {
                app: "studio",
                collection: "staffInboxAcks",
                documentPathPattern: "staffInboxAcks/{staffInboxAckId}",
                source: "staffInboxAckService.migrateLegacyPerUserAcksToShared",
              },
            ),
          ),
        );
      }
    })().finally(() => {
      sharedAckMigrationPromise = null;
    });

    return sharedAckMigrationPromise;
  },
};
