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
import { getBytes, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import {
  ASSISTED_CREATION_ALLOWED_PROOF_TYPES,
  ASSISTED_CREATION_COLLECTION,
  ASSISTED_CREATION_MAX_PROOF_BYTES,
  formatAssistedCreationStatus,
  type AssistedCreationStatus,
} from "@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants";
import type {
  StaffAddAssistedCreationFinalSourceRequest,
  StaffAddAssistedCreationFinalSourceResponse,
  StaffAddAssistedCreationProofRequest,
  StaffAddAssistedCreationProofResponse,
  StaffSendAssistedCreationMessageRequest,
  StaffSendAssistedCreationMessageResponse,
  StaffSuggestAssistedCreationCatalogDesignRequest,
  StaffSuggestAssistedCreationCatalogDesignResponse,
  StaffUpdateAssistedCreationStatusRequest,
  StaffUpdateAssistedCreationStatusResponse,
} from "@fresh-prints/shared/types/assistedCreation/assistedCreationActions.types";
import type {
  AssistedCreationAnswers,
  AssistedCreationFinalSource,
  AssistedCreationFulfillmentMode,
  AssistedCreationProof,
  AssistedCreationReferenceImage,
  AssistedCreationRevisionEntry,
  AssistedCreationSuggestedCatalogDesign,
} from "@fresh-prints/shared/types/assistedCreation/assistedCreation.types";
import {
  buildAssistedCreationFinalArtworkDownloadFileName,
  buildAssistedCreationOpaqueProofObjectId,
} from "@fresh-prints/shared/utils/assistedCreationProofFileName";
import { traceFirestoreListenerEmission } from "@fresh-prints/shared/utils/firestoreUsageTrace";
import { withTimeout } from "@fresh-prints/shared/utils/withTimeout";

import { db, storage } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";
import { createSharedFirestoreSubscription } from "../../firebase/utils/createSharedFirestoreSubscription";

const LIST_LIMIT = 100;
const RECENT_REQUESTS_TRACE = {
  app: "studio" as const,
  collection: ASSISTED_CREATION_COLLECTION,
  limit: LIST_LIMIT,
  orderBy: ["createdAt desc"],
  source: "assistedCreationRequestsService.subscribeRecent",
  triggerReason: "authentication" as const,
};

/** Electron/Firebase getBytes can hang indefinitely; never leave UI on Loading forever. */
const STORAGE_DOWNLOAD_TIMEOUT_MS = 12_000;

function normalizeStoragePath(storagePath: string): string {
  return storagePath.replace(/^\//, "").trim();
}

/** Redact uid segment: assisted-creation/<uid>/… → assisted-creation/<uid>/pending|…/file */
function storagePathPrefixForLog(storagePath: string): string {
  const parts = normalizeStoragePath(storagePath).split("/").filter(Boolean);
  if (parts.length === 0) {
    return "(empty)";
  }
  if (parts[0] === "assisted-creation" && parts.length >= 2) {
    const rest = parts.slice(2).join("/");
    return rest ? `assisted-creation/<uid>/${rest}` : "assisted-creation/<uid>";
  }
  return parts.slice(0, Math.min(3, parts.length)).join("/");
}

function storageErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) {
      return code.trim();
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 80);
  }
  return "unknown";
}

function logAssistedStorageFailure(
  operation: "downloadBytes" | "getDownloadUrl",
  storagePath: string,
  error: unknown,
): void {
  console.warn(
    `[assistedCreation] ${operation} failed path=${storagePathPrefixForLog(storagePath)} code=${storageErrorCode(error)}`,
  );
}

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
  customerCancelReason: string;
  approvedProofId: string | null;
  finalSource: AssistedCreationFinalSource | null;
  fulfillmentMode: AssistedCreationFulfillmentMode | null;
  suggestedCatalogDesign: AssistedCreationSuggestedCatalogDesign | null;
  approvedCatalogDesignId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function asTimestampDate(value: unknown): Date | null {
  if (value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return null;
}

/** Normalize Firestore reference image rows (skip broken entries; trim paths). */
function parseReferenceImages(value: unknown): AssistedCreationReferenceImage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: AssistedCreationReferenceImage[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const storagePath =
      typeof record.storagePath === "string" ? record.storagePath.trim().replace(/^\//, "") : "";
    if (!id || !storagePath) {
      continue;
    }
    const fileName = typeof record.fileName === "string" ? record.fileName.trim() : "";
    const contentType =
      typeof record.contentType === "string" && record.contentType.trim()
        ? record.contentType.trim()
        : "application/octet-stream";
    const sizeBytes =
      typeof record.sizeBytes === "number" && Number.isFinite(record.sizeBytes)
        ? Math.max(0, Math.floor(record.sizeBytes))
        : 0;
    out.push({
      id,
      storagePath,
      fileName: fileName || id,
      contentType,
      sizeBytes,
      uploadedAt: record.uploadedAt ?? null,
    });
  }
  return out;
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
    referenceImages: parseReferenceImages(data.referenceImages),
    proofs: Array.isArray(data.proofs) ? (data.proofs as AssistedCreationProof[]) : [],
    revisionHistory: Array.isArray(data.revisionHistory)
      ? (data.revisionHistory as AssistedCreationRevisionEntry[])
      : [],
    staffNotes: typeof data.staffNotes === "string" ? data.staffNotes : "",
    customerCancelReason:
      typeof data.customerCancelReason === "string" ? data.customerCancelReason.trim() : "",
    approvedProofId:
      typeof data.approvedProofId === "string" && data.approvedProofId.trim()
        ? data.approvedProofId.trim()
        : null,
    finalSource: parseFinalSource(data.finalSource),
    fulfillmentMode:
      data.fulfillmentMode === "catalog_share" || data.fulfillmentMode === "proof_image"
        ? data.fulfillmentMode
        : null,
    suggestedCatalogDesign: parseSuggestedCatalogDesign(data.suggestedCatalogDesign),
    approvedCatalogDesignId:
      typeof data.approvedCatalogDesignId === "string" && data.approvedCatalogDesignId.trim()
        ? data.approvedCatalogDesignId.trim()
        : null,
    createdAt: asTimestampDate(data.createdAt),
    updatedAt: asTimestampDate(data.updatedAt),
  };
}

function parseSuggestedCatalogDesign(
  value: unknown,
): AssistedCreationSuggestedCatalogDesign | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const designId = typeof record.designId === "string" ? record.designId.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!designId || !title) {
    return null;
  }
  return {
    designId,
    title,
    ...(typeof record.previewImageUrl === "string" && record.previewImageUrl.trim()
      ? { previewImageUrl: record.previewImageUrl.trim() }
      : {}),
    suggestedAt: record.suggestedAt ?? null,
    suggestedByUid:
      typeof record.suggestedByUid === "string" ? record.suggestedByUid.trim() : "",
  };
}

function parseFinalSource(value: unknown): AssistedCreationFinalSource | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const storagePath = typeof record.storagePath === "string" ? record.storagePath.trim() : "";
  const fileName = typeof record.fileName === "string" ? record.fileName.trim() : "";
  const contentType = typeof record.contentType === "string" ? record.contentType.trim() : "";
  const sizeBytes =
    typeof record.sizeBytes === "number" && Number.isFinite(record.sizeBytes)
      ? Math.floor(record.sizeBytes)
      : 0;
  const uploadedByUid =
    typeof record.uploadedByUid === "string" ? record.uploadedByUid.trim() : "";
  if (!id || !storagePath || !contentType || sizeBytes <= 0) {
    return null;
  }
  return {
    id,
    storagePath,
    fileName: fileName || buildAssistedCreationFinalArtworkDownloadFileName(contentType),
    contentType,
    sizeBytes,
    uploadedByUid,
    uploadedAt: record.uploadedAt ?? null,
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

const sharedRecentSubscription = createSharedFirestoreSubscription<AssistedCreationRequestListItem[]>({
  traceKey: "assistedCreationRequests:recent",
  traceMetadata: RECENT_REQUESTS_TRACE,
  start: ({ next, error }) => {
    const recentQuery = query(
      collection(db, ASSISTED_CREATION_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(LIST_LIMIT),
    );
    return onSnapshot(
      recentQuery,
      (snapshot) => {
        traceFirestoreListenerEmission(RECENT_REQUESTS_TRACE, snapshot.size);
        void (async () => {
          const mapped = snapshot.docs
            .map((docSnap) => mapDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
            .filter((item): item is AssistedCreationRequestListItem => item != null);
          next(await resolveDisplayNames(mapped));
        })().catch((loadError: unknown) => {
          error(
            loadError instanceof Error ? loadError.message : "Unable to load assisted requests.",
          );
        });
      },
      (snapshotError) => {
        error(snapshotError.message);
      },
    );
  },
});

export const assistedCreationRequestsService = {
  subscribeRecent(
    onChange: (items: AssistedCreationRequestListItem[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    return sharedRecentSubscription.subscribe(onChange, onError);
  },

  async updateStatus(
    input: StaffUpdateAssistedCreationStatusRequest,
  ): Promise<StaffUpdateAssistedCreationStatusResponse> {
    return callTracedFunction<
      StaffUpdateAssistedCreationStatusRequest,
      StaffUpdateAssistedCreationStatusResponse
    >("staffUpdateAssistedCreationStatus", {
      source: "assistedCreationRequestsService.updateStatus",
    })(input);
  },

  async sendMessage(
    input: StaffSendAssistedCreationMessageRequest,
  ): Promise<StaffSendAssistedCreationMessageResponse> {
    return callTracedFunction<
      StaffSendAssistedCreationMessageRequest,
      StaffSendAssistedCreationMessageResponse
    >("staffSendAssistedCreationMessage", {
      source: "assistedCreationRequestsService.sendMessage",
    })(input);
  },

  async uploadAndAttachProof(input: {
    requestId: string;
    customerUid: string;
    file: File;
    /** Chronological proof number (1-based); retained for callers / display only. */
    proofNumber: number;
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
    // Opaque Storage object id (no extension); contentType set on the object.
    const objectId = buildAssistedCreationOpaqueProofObjectId();
    const storagePath = `assisted-creation/${input.customerUid}/${input.requestId}/proofs/${objectId}`;
    await uploadBytes(ref(storage, storagePath), input.file, { contentType: input.file.type });

    return callTracedFunction<
      StaffAddAssistedCreationProofRequest,
      StaffAddAssistedCreationProofResponse
    >("staffAddAssistedCreationProof", {
      source: "assistedCreationRequestsService.uploadAndAttachProof",
    })({
      requestId: input.requestId,
      proof: {
        id: proofId,
        storagePath,
        fileName: objectId,
        contentType: input.file.type,
        sizeBytes: input.file.size,
        note: input.note,
      },
    });
  },

  async uploadAndAttachFinalSource(input: {
    requestId: string;
    customerUid: string;
    file: File;
  }): Promise<StaffAddAssistedCreationFinalSourceResponse> {
    if (!(ASSISTED_CREATION_ALLOWED_PROOF_TYPES as readonly string[]).includes(input.file.type)) {
      throw new Error("Final artwork must be JPEG, PNG, or WebP.");
    }
    if (input.file.size <= 0 || input.file.size > ASSISTED_CREATION_MAX_PROOF_BYTES) {
      throw new Error(
        `Final artwork must be ${ASSISTED_CREATION_MAX_PROOF_BYTES / (1024 * 1024)} MB or smaller.`,
      );
    }
    const sourceId = crypto.randomUUID();
    const objectId = buildAssistedCreationOpaqueProofObjectId();
    const storagePath = `assisted-creation/${input.customerUid}/${input.requestId}/final/${objectId}`;
    await uploadBytes(ref(storage, storagePath), input.file, { contentType: input.file.type });

    return callTracedFunction<
      StaffAddAssistedCreationFinalSourceRequest,
      StaffAddAssistedCreationFinalSourceResponse
    >("staffAddAssistedCreationFinalSource", {
      source: "assistedCreationRequestsService.uploadAndAttachFinalSource",
    })({
      requestId: input.requestId,
      finalSource: {
        id: sourceId,
        storagePath,
        fileName: buildAssistedCreationFinalArtworkDownloadFileName(input.file.type),
        contentType: input.file.type,
        sizeBytes: input.file.size,
      },
    });
  },

  async suggestCatalogDesign(input: {
    requestId: string;
    designId: string;
    note?: string;
  }): Promise<StaffSuggestAssistedCreationCatalogDesignResponse> {
    return callTracedFunction<
      StaffSuggestAssistedCreationCatalogDesignRequest,
      StaffSuggestAssistedCreationCatalogDesignResponse
    >("staffSuggestAssistedCreationCatalogDesign", {
      source: "assistedCreationRequestsService.suggestCatalogDesign",
    })({
      requestId: input.requestId,
      designId: input.designId,
      note: input.note,
    });
  },

  async getDownloadUrl(storagePath: string): Promise<string> {
    const path = normalizeStoragePath(storagePath);
    if (!path) {
      throw new Error("Missing storage path");
    }
    try {
      return await withTimeout(
        getDownloadURL(ref(storage, path)),
        STORAGE_DOWNLOAD_TIMEOUT_MS,
        "Storage download URL timed out",
      );
    } catch (error) {
      logAssistedStorageFailure("getDownloadUrl", path, error);
      throw error;
    }
  },

  /** Authenticated Storage download — avoids Electron renderer CORS failures on signed URLs. */
  async downloadBytes(storagePath: string): Promise<Uint8Array> {
    const path = normalizeStoragePath(storagePath);
    if (!path) {
      throw new Error("Missing storage path");
    }
    try {
      const bytes = await withTimeout(
        getBytes(ref(storage, path)),
        STORAGE_DOWNLOAD_TIMEOUT_MS,
        "Storage download timed out",
      );
      return new Uint8Array(bytes);
    } catch (error) {
      logAssistedStorageFailure("downloadBytes", path, error);
      throw error;
    }
  },
};
