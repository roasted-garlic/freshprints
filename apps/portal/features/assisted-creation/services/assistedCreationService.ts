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
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import {
  ASSISTED_CREATION_ALLOWED_REFERENCE_TYPES,
  ASSISTED_CREATION_COLLECTION,
  ASSISTED_CREATION_MAX_REFERENCE_BYTES,
  ASSISTED_CREATION_MAX_REFERENCE_IMAGES,
  ASSISTED_CREATION_OPEN_STATUSES,
  type AssistedCreationStatus,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type {
  CancelAssistedCreationRequestRequest,
  CancelAssistedCreationRequestResponse,
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
  AssistedCreationReferenceImage,
  AssistedCreationRequest,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

import { getPortalAuth, getPortalDb, getPortalFunctions, getPortalStorage } from '../../../lib/firebase/client';
import { portalAuthService } from '../../auth/services/authService';

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
    approvedAt: data.approvedAt ?? undefined,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export const assistedCreationService = {
  validateReferenceFiles(files: File[]): string | null {
    if (files.length > ASSISTED_CREATION_MAX_REFERENCE_IMAGES) {
      return `Upload up to ${ASSISTED_CREATION_MAX_REFERENCE_IMAGES} reference images.`;
    }
    for (const file of files) {
      if (!(ASSISTED_CREATION_ALLOWED_REFERENCE_TYPES as readonly string[]).includes(file.type)) {
        return 'Reference images must be JPEG, PNG, or WebP.';
      }
      if (file.size <= 0 || file.size > ASSISTED_CREATION_MAX_REFERENCE_BYTES) {
        return `Each reference image must be ${ASSISTED_CREATION_MAX_REFERENCE_BYTES / (1024 * 1024)} MB or smaller.`;
      }
    }
    return null;
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
      const callable = httpsCallable<
        SubmitAssistedCreationRequestRequest,
        SubmitAssistedCreationRequestResponse
      >(getPortalFunctions(), 'submitAssistedCreationRequest');
      const result = await callable({ answers, referenceImages });
      return result.data;
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async cancelRequest(
    requestId: string,
    reason: string,
  ): Promise<CancelAssistedCreationRequestResponse> {
    try {
      const callable = httpsCallable<
        CancelAssistedCreationRequestRequest,
        CancelAssistedCreationRequestResponse
      >(getPortalFunctions(), 'cancelAssistedCreationRequest');
      const result = await callable({ requestId, reason });
      return result.data;
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
      const callable = httpsCallable<
        CustomerUpdateAssistedCreationRequestRequest,
        CustomerUpdateAssistedCreationRequestResponse
      >(getPortalFunctions(), 'customerUpdateAssistedCreationRequest');
      const result = await callable({
        requestId: input.requestId,
        answers: input.answers,
        referenceImages,
        updateNote: input.updateNote,
      });
      return result.data;
    } catch (error) {
      throw mapCallableError(error, 'update');
    }
  },

  async respondToProof(
    input: CustomerRespondToAssistedCreationProofRequest,
  ): Promise<CustomerRespondToAssistedCreationProofResponse> {
    try {
      const callable = httpsCallable<
        CustomerRespondToAssistedCreationProofRequest,
        CustomerRespondToAssistedCreationProofResponse
      >(getPortalFunctions(), 'customerRespondToAssistedCreationProof');
      const result = await callable(input);
      return result.data;
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async sendMessage(
    input: CustomerSendAssistedCreationMessageRequest,
  ): Promise<CustomerSendAssistedCreationMessageResponse> {
    try {
      const callable = httpsCallable<
        CustomerSendAssistedCreationMessageRequest,
        CustomerSendAssistedCreationMessageResponse
      >(getPortalFunctions(), 'customerSendAssistedCreationMessage');
      const result = await callable(input);
      return result.data;
    } catch (error) {
      throw mapCallableError(error);
    }
  },

  async getDownloadUrl(storagePath: string): Promise<string> {
    return getDownloadURL(ref(getPortalStorage(), storagePath.replace(/^\//, '')));
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
      const callable = httpsCallable<
        CustomerGetAssistedCreationApprovedProofFileRequest,
        CustomerGetAssistedCreationApprovedProofFileResponse
      >(getPortalFunctions(), 'customerGetAssistedCreationApprovedProofFile');
      const result = await callable({ requestId: trimmedId });
      const { contentBase64, contentType, fileName } = result.data;
      if (!contentBase64?.trim()) {
        throw new Error('Unable to download.');
      }
      const blob = base64ToBlob(contentBase64, contentType);
      this.triggerBrowserDownloadFromBlob(blob, fileName || 'proof.png');
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
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => parseRequestDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
          .filter((item): item is AssistedCreationRequest => item != null);
        onChange(items);
      },
      (error) => {
        onError?.(error);
      },
    );
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
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((docSnap) => parseRequestDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
          .filter((item): item is AssistedCreationRequest => item != null);
        onChange(items);
      },
      (error) => {
        onError?.(error);
      },
    );
  },
};
