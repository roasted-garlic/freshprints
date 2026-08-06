import { FirebaseError } from 'firebase/app';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getBytes, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import {
  ASSISTED_CREATION_COLLECTION,
  ASSISTED_CREATION_OPEN_STATUSES,
  type AssistedCreationStatus,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type {
  CancelAssistedCreationRequestRequest,
  CancelAssistedCreationRequestResponse,
  CustomerAddAssistedApprovedProofToPrintRequestRequest,
  CustomerAddAssistedApprovedProofToPrintRequestResponse,
  CustomerGetAssistedCreationApprovedProofFileRequest,
  CustomerGetAssistedCreationApprovedProofFileResponse,
  CustomerRespondToAssistedCreationProofRequest,
  CustomerRespondToAssistedCreationProofResponse,
  CustomerSendAssistedCreationMessageRequest,
  CustomerSendAssistedCreationMessageResponse,
  CustomerUpdateAssistedCreationRequestRequest,
  CustomerUpdateAssistedCreationRequestResponse,
  SubmitAssistedCreationRequestRequest,
  SubmitAssistedCreationRequestResponse,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreationActions.types';
import type {
  AssistedCreationAnswers,
  AssistedCreationFinalSource,
  AssistedCreationFulfillmentMode,
  AssistedCreationPrintRequestIngest,
  AssistedCreationReferenceImage,
  AssistedCreationRequest,
  AssistedCreationSuggestedCatalogDesign,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';
import { buildAssistedCreationFinalArtworkDownloadFileName } from '@fresh-prints/shared/utils/assistedCreationProofFileName';
import { snapshotAssistedCatalogArtworkBackgroundHex } from '@fresh-prints/shared/utils/assistedCreationCatalogShareArtworkBackground';
import { withTimeout } from '@fresh-prints/shared/utils/withTimeout';

import { getPortalAuth, getPortalDb, getPortalStorage } from '../../../lib/firebase/client';
import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import { portalAuthService } from '../../auth/services/authService';
import { validateAssistedCreationReferenceFiles } from '../utils/assistedCreationReferenceFilesValidation';

/** Firebase getBytes can hang; never leave UI on “Loading proof image…” forever. */
const STORAGE_DOWNLOAD_TIMEOUT_MS = 12_000;

function normalizeStoragePath(storagePath: string): string {
  return storagePath.replace(/^\//, '').trim();
}

function storagePathPrefixForLog(storagePath: string): string {
  const parts = normalizeStoragePath(storagePath).split('/').filter(Boolean);
  if (parts.length === 0) {
    return '(empty)';
  }
  if (parts[0] === 'assisted-creation' && parts.length >= 2) {
    const rest = parts.slice(2).join('/');
    return rest ? `assisted-creation/<uid>/${rest}` : 'assisted-creation/<uid>';
  }
  return parts.slice(0, Math.min(3, parts.length)).join('/');
}

function storageErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim()) {
      return code.trim();
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 80);
  }
  return 'unknown';
}

function logAssistedStorageFailure(
  operation: 'downloadBytes' | 'getDownloadUrl',
  storagePath: string,
  error: unknown,
): void {
  console.warn(
    `[assistedCreation] ${operation} failed path=${storagePathPrefixForLog(storagePath)} code=${storageErrorCode(error)}`,
  );
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType || 'application/octet-stream' });
}

function mapStorageUploadError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    if (error.code === 'storage/unauthorized') {
      return new Error('Could not upload that reference image. Check the file type and try again.');
    }
    if (error.code === 'storage/canceled') {
      return new Error('Reference upload was canceled.');
    }
    if (error.code === 'storage/retry-limit-exceeded' || error.code === 'storage/unknown') {
      return new Error('Reference upload failed. Check your connection and try again.');
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error;
  }
  return new Error('Could not upload reference images. Please try again.');
}

function mapCallableError(error: unknown, context: 'update' | 'default' = 'default'): Error {
  if (error instanceof FirebaseError) {
    if (context === 'update' && error.code === 'functions/not-found') {
      return new Error(
        'Update is not available on the server yet. Redeploy customerUpdateAssistedCreationRequest to fresh-prints-dev, then try again.',
      );
    }
    if (context === 'update' && error.code === 'functions/internal') {
      const detail = error.message?.trim();
      if (detail && detail.toLowerCase() !== 'internal') {
        return new Error(detail);
      }
      return new Error(
        'Could not save your update. The update function is likely missing on the server — redeploy customerUpdateAssistedCreationRequest to fresh-prints-dev, then try again.',
      );
    }
    if (error.code === 'functions/not-found') {
      return new Error(
        'This action is not available on the server yet. Ask Fresh Prints to redeploy the related functions, then try again.',
      );
    }
    if (error.code === 'functions/internal') {
      const detail = error.message?.trim();
      if (detail && detail.toLowerCase() !== 'internal') {
        return new Error(detail);
      }
      return new Error('Something went wrong on the server. Please try again.');
    }
    return new Error(portalAuthService.getCallableErrorMessage(error));
  }
  return new Error(portalAuthService.getCallableErrorMessage(error));
}

function parsePrintRequestIngest(
  value: unknown,
): AssistedCreationPrintRequestIngest | null | undefined {
  if (value == null) {
    return value === null ? null : undefined;
  }
  if (typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const customerUploadId =
    typeof record.customerUploadId === 'string' ? record.customerUploadId.trim() : '';
  const printRequestItemId =
    typeof record.printRequestItemId === 'string' ? record.printRequestItemId.trim() : '';
  const printRequestId =
    typeof record.printRequestId === 'string' ? record.printRequestId.trim() : '';
  const assistedProofId =
    typeof record.assistedProofId === 'string' ? record.assistedProofId.trim() : '';
  if (!customerUploadId || !printRequestItemId || !printRequestId) {
    return undefined;
  }
  return {
    customerUploadId,
    printRequestItemId,
    printRequestId,
    assistedProofId,
    ingestedAt: record.ingestedAt ?? null,
    ...(typeof record.catalogUseAcknowledged === 'boolean'
      ? { catalogUseAcknowledged: record.catalogUseAcknowledged }
      : {}),
  };
}

function parseRequestDoc(
  id: string,
  data: Record<string, unknown> | undefined,
): AssistedCreationRequest | null {
  if (!data) {
    return null;
  }
  const status = data.status;
  if (typeof status !== 'string') {
    return null;
  }
  return {
    id,
    schemaVersion: 1,
    customerId: String(data.customerId ?? ''),
    customerUid: String(data.customerUid ?? ''),
    status: status as AssistedCreationStatus,
    answers: data.answers as AssistedCreationAnswers,
    referenceImages: Array.isArray(data.referenceImages) ? data.referenceImages : [],
    proofs: Array.isArray(data.proofs) ? data.proofs : [],
    revisionHistory: Array.isArray(data.revisionHistory) ? data.revisionHistory : [],
    staffNotes: typeof data.staffNotes === 'string' ? data.staffNotes : undefined,
    customerCancelReason:
      typeof data.customerCancelReason === 'string' && data.customerCancelReason.trim()
        ? data.customerCancelReason.trim()
        : undefined,
    customerRating:
      typeof data.customerRating === 'number' &&
      Number.isInteger(data.customerRating) &&
      data.customerRating >= 1 &&
      data.customerRating <= 5
        ? (data.customerRating as 1 | 2 | 3 | 4 | 5)
        : undefined,
    customerApprovalNote:
      typeof data.customerApprovalNote === 'string' ? data.customerApprovalNote : undefined,
    approvedProofId:
      typeof data.approvedProofId === 'string' && data.approvedProofId.trim()
        ? data.approvedProofId.trim()
        : undefined,
    finalSource: parseFinalSource(data.finalSource),
    fulfillmentMode:
      data.fulfillmentMode === 'catalog_share' || data.fulfillmentMode === 'proof_image'
        ? (data.fulfillmentMode as AssistedCreationFulfillmentMode)
        : undefined,
    suggestedCatalogDesign: parseSuggestedCatalogDesign(data.suggestedCatalogDesign),
    approvedCatalogDesignId:
      typeof data.approvedCatalogDesignId === 'string' && data.approvedCatalogDesignId.trim()
        ? data.approvedCatalogDesignId.trim()
        : undefined,
    approvedAt: data.approvedAt ?? undefined,
    printRequestIngest: parsePrintRequestIngest(data.printRequestIngest),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function parseSuggestedCatalogDesign(
  value: unknown,
): AssistedCreationSuggestedCatalogDesign | null | undefined {
  if (value == null) {
    return value === null ? null : undefined;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const designId = typeof record.designId === 'string' ? record.designId.trim() : '';
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  if (!designId || !title) {
    return undefined;
  }
  const artworkBackgroundHex = snapshotAssistedCatalogArtworkBackgroundHex(
    record.artworkBackgroundHex,
  );
  return {
    designId,
    title,
    ...(typeof record.previewImageUrl === 'string' && record.previewImageUrl.trim()
      ? { previewImageUrl: record.previewImageUrl.trim() }
      : {}),
    ...(artworkBackgroundHex ? { artworkBackgroundHex } : {}),
    suggestedAt: record.suggestedAt ?? null,
    suggestedByUid:
      typeof record.suggestedByUid === 'string' ? record.suggestedByUid.trim() : '',
  };
}

function parseFinalSource(value: unknown): AssistedCreationFinalSource | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const storagePath = typeof record.storagePath === 'string' ? record.storagePath.trim() : '';
  const contentType = typeof record.contentType === 'string' ? record.contentType.trim() : '';
  const sizeBytes =
    typeof record.sizeBytes === 'number' && Number.isFinite(record.sizeBytes)
      ? Math.floor(record.sizeBytes)
      : 0;
  const uploadedByUid =
    typeof record.uploadedByUid === 'string' ? record.uploadedByUid.trim() : '';
  if (!id || !storagePath || !contentType || sizeBytes <= 0) {
    return undefined;
  }
  const fileName =
    typeof record.fileName === 'string' && record.fileName.trim()
      ? record.fileName.trim()
      : buildAssistedCreationFinalArtworkDownloadFileName(contentType);
  return {
    id,
    storagePath,
    fileName,
    contentType,
    sizeBytes,
    uploadedByUid,
    uploadedAt: record.uploadedAt ?? null,
  };
}

export const assistedCreationService = {
  /**
   * Pure pre-upload gate — called before any file is uploaded. `existingRetainedBytes` is the sum
   * of already-saved reference images the caller intends to keep (0 for a brand-new submission;
   * the sum of `keptReferences[].sizeBytes` for an update where some existing images are retained).
   * Removed/replaced images must already be excluded from `existingRetainedBytes` by the caller —
   * this function only sums what it is given. Delegates to the pure, directly-testable
   * `validateAssistedCreationReferenceFiles` (no Firebase dependency).
   */
  validateReferenceFiles(files: File[], existingRetainedBytes = 0): string | null {
    return validateAssistedCreationReferenceFiles(files, existingRetainedBytes);
  },

  async uploadPendingReferences(files: File[]): Promise<
    Array<{
      id: string;
      storagePath: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    }>
  > {
    const uid = getPortalAuth().currentUser?.uid;
    if (!uid) {
      throw new Error('Sign in to upload reference images.');
    }
    const validationError = this.validateReferenceFiles(files);
    if (validationError) {
      throw new Error(validationError);
    }

    const uploaded = [];
    try {
      for (const file of files) {
        const id = crypto.randomUUID();
        const storagePath = `assisted-creation/${uid}/pending/${id}`;
        const storageRef = ref(getPortalStorage(), storagePath);
        await uploadBytes(storageRef, file, { contentType: file.type });
        uploaded.push({
          id,
          storagePath,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        });
      }
    } catch (error) {
      throw mapStorageUploadError(error);
    }
    return uploaded;
  },

  async submitRequest(
    answers: AssistedCreationAnswers,
    referenceFiles: File[],
  ): Promise<SubmitAssistedCreationRequestResponse> {
    const referenceImages =
      answers.hasReferences && referenceFiles.length > 0
        ? await this.uploadPendingReferences(referenceFiles)
        : [];

    try {
      return await callTracedFunction<
        SubmitAssistedCreationRequestRequest,
        SubmitAssistedCreationRequestResponse
      >('submitAssistedCreationRequest', {
        source: 'assistedCreationService.submitRequest',
      })({ answers, referenceImages });
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async cancelRequest(
    requestId: string,
    reason: string,
  ): Promise<CancelAssistedCreationRequestResponse> {
    try {
      return await callTracedFunction<
        CancelAssistedCreationRequestRequest,
        CancelAssistedCreationRequestResponse
      >('cancelAssistedCreationRequest', {
        source: 'assistedCreationService.cancelRequest',
      })({ requestId, reason });
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async updateRequest(input: {
    requestId: string;
    answers: AssistedCreationAnswers;
    keepReferences: AssistedCreationReferenceImage[];
    newReferenceFiles: File[];
    updateNote?: string;
  }): Promise<CustomerUpdateAssistedCreationRequestResponse> {
    const uploaded =
      input.newReferenceFiles.length > 0
        ? await this.uploadPendingReferences(input.newReferenceFiles)
        : [];

    const referenceImages = [
      ...input.keepReferences.map((image) => ({
        id: image.id,
        storagePath: image.storagePath,
        fileName: image.fileName,
        contentType: image.contentType,
        sizeBytes: image.sizeBytes,
      })),
      ...uploaded,
    ];

    try {
      return await callTracedFunction<
        CustomerUpdateAssistedCreationRequestRequest,
        CustomerUpdateAssistedCreationRequestResponse
      >('customerUpdateAssistedCreationRequest', {
        source: 'assistedCreationService.updateRequest',
      })({
        requestId: input.requestId,
        answers: input.answers,
        referenceImages,
        updateNote: input.updateNote,
      });
    } catch (error) {
      throw mapCallableError(error, 'update');
    }
  },

  async respondToProof(
    input: CustomerRespondToAssistedCreationProofRequest,
  ): Promise<CustomerRespondToAssistedCreationProofResponse> {
    try {
      return await callTracedFunction<
        CustomerRespondToAssistedCreationProofRequest,
        CustomerRespondToAssistedCreationProofResponse
      >('customerRespondToAssistedCreationProof', {
        source: 'assistedCreationService.respondToProof',
      })(input);
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async sendMessage(
    input: CustomerSendAssistedCreationMessageRequest,
  ): Promise<CustomerSendAssistedCreationMessageResponse> {
    try {
      return await callTracedFunction<
        CustomerSendAssistedCreationMessageRequest,
        CustomerSendAssistedCreationMessageResponse
      >('customerSendAssistedCreationMessage', {
        source: 'assistedCreationService.sendMessage',
      })(input);
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async getDownloadUrl(storagePath: string): Promise<string> {
    const path = normalizeStoragePath(storagePath);
    if (!path) {
      throw new Error('Missing storage path');
    }
    try {
      return await withTimeout(
        getDownloadURL(ref(getPortalStorage(), path)),
        STORAGE_DOWNLOAD_TIMEOUT_MS,
        'Storage download URL timed out',
      );
    } catch (error) {
      logAssistedStorageFailure('getDownloadUrl', path, error);
      throw error;
    }
  },

  /**
   * Proof/final preview URL for `<img src>`.
   * Prefer timed signed download URL (fast); fall back to timed getBytes → blob URL.
   * Never hang forever — callers must surface Preview unavailable on throw.
   */
  async getPreviewObjectUrl(
    storagePath: string,
    contentType?: string | null,
  ): Promise<string> {
    const path = normalizeStoragePath(storagePath);
    if (!path) {
      throw new Error('Missing storage path');
    }

    try {
      return await this.getDownloadUrl(path);
    } catch {
      // Fall through to authenticated bytes.
    }

    try {
      const bytes = await withTimeout(
        getBytes(ref(getPortalStorage(), path)),
        STORAGE_DOWNLOAD_TIMEOUT_MS,
        'Storage download timed out',
      );
      const blob = new Blob([bytes], {
        type: (contentType ?? '').trim() || 'image/png',
      });
      return URL.createObjectURL(blob);
    } catch (error) {
      logAssistedStorageFailure('downloadBytes', path, error);
      throw error;
    }
  },

  /**
   * Download approved proof full-res via callable (Admin bytes → base64 → blob).
   * AuthZ + 14-day eligibility enforced server-side. Avoids GCS in-tab PNG and CORS fetch failures.
   */
  async downloadApprovedProof(requestId: string): Promise<void> {
    const trimmedId = requestId.trim();
    if (!trimmedId) {
      throw new Error('Request id is required.');
    }
    try {
      const result = await callTracedFunction<
        CustomerGetAssistedCreationApprovedProofFileRequest,
        CustomerGetAssistedCreationApprovedProofFileResponse
      >('customerGetAssistedCreationApprovedProofFile', {
        source: 'assistedCreationService.downloadApprovedProof',
      })({ requestId: trimmedId });
      const { contentBase64, contentType, fileName } = result;
      if (!contentBase64?.trim()) {
        throw new Error('Unable to download.');
      }
      const blob = base64ToBlob(contentBase64, contentType);
      this.triggerBrowserDownloadFromBlob(blob, fileName || 'proof.png');
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  /**
   * Copy approved proof into Current Request and Studio custom-design intake.
   * `catalogUseAcknowledged` matches print-upload / donate consent (same intake fields).
   */
  async addApprovedProofToPrintRequest(
    requestId: string,
    options: { catalogUseAcknowledged: boolean },
  ): Promise<CustomerAddAssistedApprovedProofToPrintRequestResponse> {
    const trimmedId = requestId.trim();
    if (!trimmedId) {
      throw new Error('Request id is required.');
    }
    try {
      return await callTracedFunction<
        CustomerAddAssistedApprovedProofToPrintRequestRequest,
        CustomerAddAssistedApprovedProofToPrintRequestResponse
      >('customerAddAssistedApprovedProofToPrintRequest', {
        source: 'assistedCreationService.addApprovedProofToPrintRequest',
      })({
        requestId: trimmedId,
        catalogUseAcknowledged: options.catalogUseAcknowledged === true,
      });
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  /** Same-origin object URL download (reliable after callable→blob). */
  triggerBrowserDownloadFromBlob(blob: Blob, fileName: string): void {
    const safeName = fileName.trim() || 'proof.png';
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = safeName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  },

  subscribeOpenRequestsForCustomer(
    customerUid: string,
    onChange: (requests: AssistedCreationRequest[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const q = query(
      collection(getPortalDb(), ASSISTED_CREATION_COLLECTION),
      where('customerUid', '==', customerUid),
      where('status', 'in', [...ASSISTED_CREATION_OPEN_STATUSES]),
      limit(5),
    );
    const traceMetadata = {
      app: 'portal' as const,
      collection: ASSISTED_CREATION_COLLECTION,
      constraints: ['customerUid==currentUser', 'status in openStatuses'],
      limit: 5,
      source: 'assistedCreationService.subscribeOpenRequests',
      triggerReason: 'authentication' as const,
    };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        traceFirestoreListenerEmission(traceMetadata, snapshot.size);
        const items = snapshot.docs
          .map((docSnap) => parseRequestDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
          .filter((item): item is AssistedCreationRequest => item != null);
        onChange(items);
      },
      (error) => {
        onError?.(error);
      },
    );
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },

  subscribeRecentRequestsForCustomer(
    customerUid: string,
    onChange: (requests: AssistedCreationRequest[]) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const q = query(
      collection(getPortalDb(), ASSISTED_CREATION_COLLECTION),
      where('customerUid', '==', customerUid),
      orderBy('createdAt', 'desc'),
      limit(10),
    );
    const traceMetadata = {
      app: 'portal' as const,
      collection: ASSISTED_CREATION_COLLECTION,
      constraints: ['customerUid==currentUser'],
      orderBy: ['createdAt desc'],
      limit: 10,
      source: 'assistedCreationService.subscribeRecentRequests',
      triggerReason: 'authentication' as const,
    };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        traceFirestoreListenerEmission(traceMetadata, snapshot.size);
        const items = snapshot.docs
          .map((docSnap) => parseRequestDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
          .filter((item): item is AssistedCreationRequest => item != null);
        onChange(items);
      },
      (error) => {
        onError?.(error);
      },
    );
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },
};
