import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getBytes, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import {
  ASSISTED_CREATION_ALLOWED_PROOF_TYPES,
  ASSISTED_CREATION_COLLECTION,
  ASSISTED_CREATION_MAX_PROOF_BYTES,
  formatAssistedCreationStatus,
  type AssistedCreationStatus,
} from "@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants";
import type {
  StaffAddAssistedCreationProofRequest,
  StaffAddAssistedCreationProofResponse,
  StaffUpdateAssistedCreationStatusRequest,
  StaffUpdateAssistedCreationStatusResponse,
} from "@fresh-prints/shared/types/assistedCreation/assistedCreationActions.types";
import type {
  AssistedCreationAnswers,
  AssistedCreationProof,
  AssistedCreationReferenceImage,
  AssistedCreationRevisionEntry,
} from "@fresh-prints/shared/types/assistedCreation/assistedCreation.types";

import { db, functions, storage } from "../../../config/firebase";

const LIST_LIMIT = 100;

export interface AssistedCreationRequestListItem {
  id: string;
  customerId: string;
  customerUid: string;
  customerDisplayName: string;
  status: AssistedCreationStatus;
  statusLabel: string;
  descriptionPreview: string;
  answers: AssistedCreationAnswers | null;
  referenceImages: AssistedCreationReferenceImage[];
  proofs: AssistedCreationProof[];
  revisionHistory: AssistedCreationRevisionEntry[];
  staffNotes: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function asTimestampDate(value: unknown): Date | null {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return null;
}

function mapDoc(
  id: string,
  data: Record<string, unknown>,
): AssistedCreationRequestListItem | null {
  if (typeof data.customerId !== "string" || !data.customerId.trim()) {
    return null;
  }
  if (typeof data.status !== "string") {
    return null;
  }
  const status = data.status as AssistedCreationStatus;
  const answers =
    data.answers && typeof data.answers === "object" && !Array.isArray(data.answers)
      ? (data.answers as AssistedCreationAnswers)
      : null;
  const description =
    answers && typeof answers.rawDescription === "string" ? answers.rawDescription.trim() : "";

  return {
    id,
    customerId: data.customerId.trim(),
    customerUid: typeof data.customerUid === "string" ? data.customerUid : "",
    customerDisplayName: data.customerId.trim(),
    status,
    statusLabel: formatAssistedCreationStatus(status),
    descriptionPreview: description.slice(0, 120),
    answers,
    referenceImages: Array.isArray(data.referenceImages)
      ? (data.referenceImages as AssistedCreationReferenceImage[])
      : [],
    proofs: Array.isArray(data.proofs) ? (data.proofs as AssistedCreationProof[]) : [],
    revisionHistory: Array.isArray(data.revisionHistory)
      ? (data.revisionHistory as AssistedCreationRevisionEntry[])
      : [],
    staffNotes: typeof data.staffNotes === "string" ? data.staffNotes : "",
    createdAt: asTimestampDate(data.createdAt),
    updatedAt: asTimestampDate(data.updatedAt),
  };
}

async function resolveDisplayNames(
  items: AssistedCreationRequestListItem[],
): Promise<AssistedCreationRequestListItem[]> {
  const ids = [...new Set(items.map((item) => item.customerId))];
  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (customerId) => {
      try {
        const snap = await getDoc(doc(db, "customers", customerId));
        const displayName = snap.data()?.displayName;
        if (typeof displayName === "string" && displayName.trim()) {
          names.set(customerId, displayName.trim());
        }
      } catch {
        // Keep id fallback.
      }
    }),
  );
  return items.map((item) => ({
    ...item,
    customerDisplayName: names.get(item.customerId) ?? item.customerDisplayName,
  }));
}

export const assistedCreationRequestsService = {
  subscribeRecent(
    onChange: (items: AssistedCreationRequestListItem[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    const q = query(
      collection(db, ASSISTED_CREATION_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(LIST_LIMIT),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        void (async () => {
          const mapped = snapshot.docs
            .map((docSnap) => mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
            .filter((item): item is AssistedCreationRequestListItem => item != null);
          onChange(await resolveDisplayNames(mapped));
        })().catch((error: unknown) => {
          onError(error instanceof Error ? error.message : "Unable to load assisted requests.");
        });
      },
      (error) => {
        onError(error.message);
      },
    );
  },

  async updateStatus(
    input: StaffUpdateAssistedCreationStatusRequest,
  ): Promise<StaffUpdateAssistedCreationStatusResponse> {
    const callable = httpsCallable<
      StaffUpdateAssistedCreationStatusRequest,
      StaffUpdateAssistedCreationStatusResponse
    >(functions, "staffUpdateAssistedCreationStatus");
    const result = await callable(input);
    return result.data;
  },

  async uploadAndAttachProof(input: {
    requestId: string;
    customerUid: string;
    file: File;
    note?: string;
  }): Promise<StaffAddAssistedCreationProofResponse> {
    if (!(ASSISTED_CREATION_ALLOWED_PROOF_TYPES as readonly string[]).includes(input.file.type)) {
      throw new Error("Proof must be JPEG, PNG, or WebP.");
    }
    if (input.file.size <= 0 || input.file.size > ASSISTED_CREATION_MAX_PROOF_BYTES) {
      throw new Error(
        `Proof must be ${ASSISTED_CREATION_MAX_PROOF_BYTES / (1024 * 1024)} MB or smaller.`,
      );
    }
    const proofId = crypto.randomUUID();
    const storagePath = `assisted-creation/${input.customerUid}/${input.requestId}/proofs/${proofId}`;
    await uploadBytes(ref(storage, storagePath), input.file, { contentType: input.file.type });

    const callable = httpsCallable<
      StaffAddAssistedCreationProofRequest,
      StaffAddAssistedCreationProofResponse
    >(functions, "staffAddAssistedCreationProof");
    const result = await callable({
      requestId: input.requestId,
      proof: {
        id: proofId,
        storagePath,
        fileName: input.file.name,
        contentType: input.file.type,
        sizeBytes: input.file.size,
        note: input.note,
      },
    });
    return result.data;
  },

  async getDownloadUrl(storagePath: string): Promise<string> {
    return getDownloadURL(ref(storage, storagePath.replace(/^\//, "")));
  },

  /** Authenticated Storage download — avoids Electron renderer CORS failures on signed URLs. */
  async downloadBytes(storagePath: string): Promise<Uint8Array> {
    const bytes = await getBytes(ref(storage, storagePath.replace(/^\//, "")));
    return new Uint8Array(bytes);
  },
};
