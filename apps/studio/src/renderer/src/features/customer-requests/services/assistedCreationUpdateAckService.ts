import {
  doc,
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

  /**
   * Advance the per-staff read-through cursor for a request (monotonic).
   * Avoids getDoc-before-create: rules that require resource.data deny reads of
   * non-existent ack docs, which previously made first-time Read a silent no-op.
   *
   * @param knownReadThroughAtMs - cursor from the live subscription when known
   */
  async markReadThrough(
    userId: string,
    requestId: string,
    readThroughAtMs: number,
    knownReadThroughAtMs?: number | null,
  ): Promise<void> {
    const ackRef = doc(
      firestoreCollectionService.getAssistedCreationUpdateAcksCollection(),
      buildAssistedCreationUpdateAckDocId(userId, requestId),
    );
    const existingMs = knownReadThroughAtMs ?? null;
    // Read-through is monotonic: never move the cursor backward.
    if (existingMs != null && existingMs >= readThroughAtMs) {
      return;
    }

    const patch = {
      readThroughAt: Timestamp.fromMillis(readThroughAtMs),
      updatedAt: serverTimestamp(),
    };

    if (existingMs != null) {
      await updateDoc(ackRef, patch);
      return;
    }

    try {
      await setDoc(ackRef, {
        userId,
        requestId,
        ...patch,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      // Doc may already exist (subscription lag / race). Prefer a field patch so
      // createdAt stays stable under update rules.
      try {
        await updateDoc(ackRef, patch);
      } catch {
        throw error;
      }
    }
  },
};
