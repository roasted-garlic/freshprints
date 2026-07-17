import {
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { buildAssistedCreationUpdateAckDocId } from "@fresh-prints/shared/utils/assistedCreationHistory";

import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

export interface AssistedCreationUpdateAckRecord {
  userId: string;
  requestId: string;
  readThroughAtMillis: number;
}

function mapAckRecord(data: DocumentData): AssistedCreationUpdateAckRecord | null {
  if (typeof data.userId !== "string" || typeof data.requestId !== "string") {
    return null;
  }
  const readThroughAt = mapFirestoreTimestamp(data.readThroughAt);
  if (!readThroughAt) {
    return null;
  }
  return {
    userId: data.userId,
    requestId: data.requestId,
    readThroughAtMillis: readThroughAt.toMillis(),
  };
}

export const assistedCreationUpdateAckService = {
  subscribe(
    userId: string,
    onChange: (records: AssistedCreationUpdateAckRecord[]) => void,
    onError?: (message: string) => void,
  ): Unsubscribe {
    const acksQuery = query(
      firestoreCollectionService.getAssistedCreationUpdateAcksCollection(),
      where("userId", "==", userId),
    );

    return onSnapshot(
      acksQuery,
      (snapshot) => {
        const records: AssistedCreationUpdateAckRecord[] = [];
        for (const document of snapshot.docs) {
          const mapped = mapAckRecord(document.data());
          if (mapped) {
            records.push(mapped);
          }
        }
        onChange(records);
      },
      (error) => {
        onError?.(error.message);
        onChange([]);
      },
    );
  },

  async markReadThrough(userId: string, requestId: string, readThroughAtMs: number): Promise<void> {
    const ackRef = doc(
      firestoreCollectionService.getAssistedCreationUpdateAcksCollection(),
      buildAssistedCreationUpdateAckDocId(userId, requestId),
    );
    const readThroughAt = Timestamp.fromMillis(readThroughAtMs);
    const existing = await getDoc(ackRef);
    if (existing.exists()) {
      await updateDoc(ackRef, {
        readThroughAt,
        updatedAt: serverTimestamp(),
      });
      return;
    }
    await setDoc(ackRef, {
      userId,
      requestId,
      readThroughAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },
};
