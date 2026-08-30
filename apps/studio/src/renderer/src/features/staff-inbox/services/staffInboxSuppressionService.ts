import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { buildStaffInboxSuppressionDocId } from "@fresh-prints/shared/staffInbox/staffInboxSuppression.types";
import { runTracedWrite } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { db } from "../../../config/firebase";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

export interface StaffInboxSuppressionRecord {
  itemId: string;
  deletedAtMillis: number;
  deletedByUserId: string;
  deletedByDisplayName?: string;
}

function mapSuppression(data: DocumentData): StaffInboxSuppressionRecord | null {
  if (typeof data.itemId !== "string" || typeof data.deletedByUserId !== "string") {
    return null;
  }

  const deletedAt = mapFirestoreTimestamp(data.deletedAt);

  return {
    itemId: data.itemId,
    deletedAtMillis: deletedAt?.toMillis() ?? Date.now(),
    deletedByUserId: data.deletedByUserId,
    deletedByDisplayName:
      typeof data.deletedByDisplayName === "string" && data.deletedByDisplayName.trim()
        ? data.deletedByDisplayName.trim()
        : undefined,
  };
}

export const staffInboxSuppressionService = {
  subscribe(
    onChange: (records: StaffInboxSuppressionRecord[]) => void,
    onError?: (message: string) => void,
  ): Unsubscribe {
    return onSnapshot(
      firestoreCollectionService.getStaffInboxSuppressionsCollection(),
      (snapshot) => {
        const records = snapshot.docs
          .map((entry) => mapSuppression(entry.data()))
          .filter((entry): entry is StaffInboxSuppressionRecord => entry !== null);
        onChange(records);
      },
      (error) => {
        onError?.(error.message);
        onChange([]);
      },
    );
  },

  async suppressItems(
    userId: string,
    itemIds: string[],
    options?: { displayName?: string | null },
  ): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }

    const displayName =
      typeof options?.displayName === "string" && options.displayName.trim()
        ? options.displayName.trim()
        : undefined;
    const batch = writeBatch(db);

    for (const itemId of itemIds) {
      const ref = doc(
        firestoreCollectionService.getStaffInboxSuppressionsCollection(),
        buildStaffInboxSuppressionDocId(itemId),
      );
      batch.set(ref, {
        itemId,
        deletedByUserId: userId,
        ...(displayName ? { deletedByDisplayName: displayName } : {}),
        deletedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await runTracedWrite("writeBatch", () => batch.commit(), {
      app: "studio",
      collection: "staffInboxSuppressions",
      documentPathPattern: "staffInboxSuppressions/{staffInboxSuppressionId}",
      source: "staffInboxSuppressionService.suppressItems",
    });
  },
};
