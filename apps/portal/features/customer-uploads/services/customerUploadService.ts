import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytesResumable, type UploadMetadata } from 'firebase/storage';

import { runTracedCallable } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import type {
  DeleteEligibleCustomerUploadResponse,
  PreviewCustomerUploadDeletionResponse,
} from '@fresh-prints/shared/types/deletion/deletion.types';
import { DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE } from '@fresh-prints/shared/types/deletion/deletion.types';
import {
  CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE,
  CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH,
  CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
  CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING,
  computeCustomerUploadMaxZipBytes,
} from '@fresh-prints/shared/constants/customerUpload/customerUploadLimits.constants';
import { CUSTOMER_UPLOAD_COLLECTIONS } from '@fresh-prints/shared/constants/customerUpload/customerUploadCollections.constants';
import type {
  ConfirmCustomerUploadsAndAttachToRequestRequest,
  ConfirmCustomerUploadsAndAttachToRequestResponse,
} from '@fresh-prints/shared/types/customerUpload/confirmCustomerUploadAttach.types';
import type {
  ConfirmCustomerUploadsForDonationRequest,
  ConfirmCustomerUploadsForDonationResponse,
} from '@fresh-prints/shared/types/customerUpload/confirmCustomerUploadDonate.types';
import type {
  GetCustomerUploadDailyQuotaRequest,
  GetCustomerUploadDailyQuotaResponse,
} from '@fresh-prints/shared/types/customerUpload/customerUploadDailyQuota.types';
import {
  CUSTOMER_UPLOAD_DONATE_TERMS_VERSION,
  CUSTOMER_UPLOAD_TERMS_VERSION,
} from '@fresh-prints/shared/types/customerUpload/customerUpload.types';
import type {
  CustomerUploadPurpose,
  CustomerUploadTechnicalProgressStage,
  CustomerUploadTechnicalStatus,
} from '@fresh-prints/shared/types/customerUpload/customerUpload.enums';
import { formatFileSize } from '@fresh-prints/shared/utils/formatFileSize';
import { getCustomerUploadProgressLabel } from '@fresh-prints/shared/utils/customerUploadProgressLabel';
import { resolveCustomerUploadPurpose } from '@fresh-prints/shared/utils/customerUploadPurpose';
import {
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
  traceWrappedUnsubscribe,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalAuth, getPortalDb, getPortalFunctions, getPortalStorage } from '../../../lib/firebase/client';
import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import { portalAuthService } from '../../auth/services/authService';
import {
  invalidateCustomerUploadQuota,
  loadCustomerUploadQuotaCached,
} from './customerUploadQuotaCache';

export interface CreateCustomerUploadBatchResponse {
  batchId: string;
  mode: 'direct_images' | 'zip';
  uploads?: Array<{
    uploadId: string;
    sourceStoragePath: string;
    originalFilename: string;
  }>;
  zipStoragePath?: string;
  reusedExisting: boolean;
}

export type AccountArtworkKind = 'upload' | 'donation';

export interface AccountArtworkGalleryItem {
  id: string;
  kind: AccountArtworkKind;
  title: string;
  previewStoragePath: string | null;
  thumbnailStoragePath: string | null;
  productionStoragePath: string | null;
  /** When set, this upload was promoted into a catalog design. */
  promotedDesignId: string | null;
  createdAtMs: number;
}

export interface FinalizeCustomerUploadResponse {
  uploadId: string;
  batchId: string;
  technicalStatus: CustomerUploadTechnicalStatus;
  alreadyReady: boolean;
  technicalFailureCode?: string | null;
  technicalFailureMessage?: string | null;
  productionStoragePath?: string | null;
  previewStoragePath?: string | null;
  thumbnailStoragePath?: string | null;
  approvedMaxPrintWidthInches?: number | null;
  approvedMaxPrintHeightInches?: number | null;
}

export interface FinalizeCustomerUploadZipFileResult {
  uploadId: string;
  entryName: string;
  technicalStatus: CustomerUploadTechnicalStatus;
  technicalFailureCode?: string | null;
  technicalFailureMessage?: string | null;
}

export interface FinalizeCustomerUploadZipResponse {
  batchId: string;
  zipExtractionStatus: 'complete' | 'failed';
  alreadyComplete: boolean;
  files: FinalizeCustomerUploadZipFileResult[];
  readyCount: number;
  failedCount: number;
}

export interface CustomerUploadDocSummary {
  id: string;
  batchId: string;
  originalFilename: string;
  technicalStatus: CustomerUploadTechnicalStatus;
  technicalProgressStage: CustomerUploadTechnicalProgressStage | null;
  technicalFailureMessage: string | null;
  previewStoragePath: string | null;
  thumbnailStoragePath: string | null;
  widthPx: number | null;
  heightPx: number | null;
  printWidthInches: number | null;
  printHeightInches: number | null;
  approvedMaxPrintWidthInches: number | null;
  approvedMaxPrintHeightInches: number | null;
  wasUpscaled: boolean | null;
  interactiveEnhancedProductionStoragePath?: string | null;
  interactiveEnhancedWidthPx?: number | null;
  interactiveEnhancedHeightPx?: number | null;
  interactiveEnhanceGeneratedAt?: unknown;
  ownershipConfirmed: boolean;
  catalogUseAcknowledged: boolean;
  /** Set when this upload was copied from an Assisted Creation approved proof. */
  assistedCreationRequestId: string | null;
}

export interface CustomerUploadLiveProgress {
  technicalStatus: CustomerUploadTechnicalStatus;
  technicalProgressStage: CustomerUploadTechnicalProgressStage | null;
  technicalFailureMessage: string | null;
  previewStoragePath: string | null;
  progressLabel: string;
}

function newClientRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isAllowedImageFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return type === 'image/png' || name.endsWith('.png');
}

function isZipFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    type === 'application/zip' ||
    type === 'application/x-zip-compressed' ||
    type === 'application/octet-stream' ||
    name.endsWith('.zip')
  );
}

const FINALIZE_CALLABLE_TIMEOUT_MS = 540_000;

export type CustomerUploadSizeLimits = {
  maxSingleImageBytes: number;
  maxZipBytes: number;
};

export function defaultCustomerUploadSizeLimits(
  _purpose: CustomerUploadPurpose = 'print_request',
): CustomerUploadSizeLimits {
  void _purpose;
  return {
    maxSingleImageBytes: CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
    maxZipBytes: computeCustomerUploadMaxZipBytes(),
  };
}

export const customerUploadService = {
  maxFilesPerBatch: CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH,
  maxConcurrentFinalize: CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE,
  termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
  donateTermsVersion: CUSTOMER_UPLOAD_DONATE_TERMS_VERSION,

  classifyFiles(
    files: File[],
    sizeLimits?: Partial<CustomerUploadSizeLimits>,
  ): { images: File[]; zips: File[]; rejected: string[] } {
    const maxSingleImageBytes =
      sizeLimits?.maxSingleImageBytes ?? CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES;
    const maxZipBytes = sizeLimits?.maxZipBytes ?? CUSTOMER_UPLOAD_MAX_ZIP_BYTES_CEILING;
    const images: File[] = [];
    const zips: File[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      if (isZipFile(file) && file.name.toLowerCase().endsWith('.zip')) {
        if (file.size > maxZipBytes) {
          rejected.push(
            `${file.name}: ZIP exceeds the ${formatFileSize(maxZipBytes)} size limit.`,
          );
          continue;
        }
        zips.push(file);
        continue;
      }

      if (isAllowedImageFile(file)) {
        if (file.size > maxSingleImageBytes) {
          rejected.push(
            `${file.name}: image exceeds the ${formatFileSize(maxSingleImageBytes)} size limit.`,
          );
          continue;
        }
        images.push(file);
        continue;
      }

      rejected.push(`${file.name}: use PNG or ZIP.`);
    }

    return { images, zips, rejected };
  },

  async createDirectImageBatch(
    files: File[],
    options?: { existingBatchId?: string; purpose?: CustomerUploadPurpose },
  ): Promise<CreateCustomerUploadBatchResponse> {
    try {
      return await callTracedFunction<
        {
          mode: 'direct_images';
          clientRequestId: string;
          purpose: CustomerUploadPurpose;
          files: Array<{ originalFilename: string; declaredSizeBytes: number }>;
          existingBatchId?: string;
        },
        CreateCustomerUploadBatchResponse
      >('createCustomerUploadBatch', {
        source: 'customerUploadService.createDirectImageBatch',
      })({
        mode: 'direct_images',
        clientRequestId: newClientRequestId(),
        purpose: options?.purpose ?? 'print_request',
        files: files.map((file) => ({
          originalFilename: file.name,
          declaredSizeBytes: file.size,
        })),
        existingBatchId: options?.existingBatchId,
      });
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async createZipBatch(
    file: File,
    options?: { purpose?: CustomerUploadPurpose },
  ): Promise<CreateCustomerUploadBatchResponse> {
    try {
      return await callTracedFunction<
        {
          mode: 'zip';
          clientRequestId: string;
          purpose: CustomerUploadPurpose;
          declaredZipSizeBytes: number;
        },
        CreateCustomerUploadBatchResponse
      >('createCustomerUploadBatch', {
        source: 'customerUploadService.createZipBatch',
      })({
        mode: 'zip',
        clientRequestId: newClientRequestId(),
        purpose: options?.purpose ?? 'print_request',
        declaredZipSizeBytes: file.size,
      });
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async uploadSourceFile(
    storagePath: string,
    file: File,
    contentType: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    const storageRef = ref(getPortalStorage(), storagePath.replace(/^\//, ''));
    const metadata: UploadMetadata = { contentType };
    const task = uploadBytesResumable(storageRef, file, metadata);

    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snapshot) => {
          if (!onProgress || snapshot.totalBytes <= 0) {
            return;
          }
          const percent = Math.min(
            100,
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          );
          onProgress(percent);
        },
        (error) => {
          reject(error);
        },
        () => {
          onProgress?.(100);
          resolve();
        },
      );
    });
  },

  async finalizeImage(uploadId: string, batchId: string): Promise<FinalizeCustomerUploadResponse> {
    try {
      return await runTracedCallable<
        { uploadId: string; batchId: string },
        FinalizeCustomerUploadResponse
      >(
        'finalizeCustomerUpload',
        (req) =>
          httpsCallable<{ uploadId: string; batchId: string }, FinalizeCustomerUploadResponse>(
            getPortalFunctions(),
            'finalizeCustomerUpload',
            { timeout: FINALIZE_CALLABLE_TIMEOUT_MS },
          )(req),
        { uploadId, batchId },
        { app: 'portal', source: 'customerUploadService.finalizeImage' },
      );
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async finalizeZip(batchId: string): Promise<FinalizeCustomerUploadZipResponse> {
    try {
      return await runTracedCallable<{ batchId: string }, FinalizeCustomerUploadZipResponse>(
        'finalizeCustomerUploadZip',
        (req) =>
          httpsCallable<{ batchId: string }, FinalizeCustomerUploadZipResponse>(
            getPortalFunctions(),
            'finalizeCustomerUploadZip',
            { timeout: FINALIZE_CALLABLE_TIMEOUT_MS },
          )(req),
        { batchId },
        { app: 'portal', source: 'customerUploadService.finalizeZip' },
      );
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async getDailyQuota(
    purpose: CustomerUploadPurpose = 'print_request',
  ): Promise<GetCustomerUploadDailyQuotaResponse> {
    try {
      const key = `${getPortalAuth().currentUser?.uid ?? 'signed-out'}:${purpose}`;
      return await loadCustomerUploadQuotaCached(key, () =>
        callTracedFunction<
          GetCustomerUploadDailyQuotaRequest,
          GetCustomerUploadDailyQuotaResponse
        >('getCustomerUploadDailyQuota', {
          source: 'customerUploadService.getDailyQuota',
        })({ purpose }),
      );
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  invalidateDailyQuota(): void {
    const uid = getPortalAuth().currentUser?.uid;
    invalidateCustomerUploadQuota(uid ? `${uid}:` : undefined);
  },

  confirmationPhrase: DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE,

  async previewOwnUploadDeletion(
    customerUploadId: string,
  ): Promise<PreviewCustomerUploadDeletionResponse> {
    try {
      return await callTracedFunction<
        { customerUploadId: string },
        PreviewCustomerUploadDeletionResponse
      >('previewPortalCustomerUploadDeletion', {
        source: 'customerUploadService.previewOwnUploadDeletion',
      })({ customerUploadId });
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async deleteOwnUpload(
    customerUploadId: string,
    confirmationPhrase: string = DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE,
  ): Promise<DeleteEligibleCustomerUploadResponse> {
    try {
      return await callTracedFunction<
        { customerUploadId: string; confirmationPhrase: string },
        DeleteEligibleCustomerUploadResponse
      >('deletePortalCustomerUpload', {
        source: 'customerUploadService.deleteOwnUpload',
      })({ customerUploadId, confirmationPhrase });
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async confirmAndAttach(
    input: ConfirmCustomerUploadsAndAttachToRequestRequest,
  ): Promise<ConfirmCustomerUploadsAndAttachToRequestResponse> {
    try {
      return await callTracedFunction<
        ConfirmCustomerUploadsAndAttachToRequestRequest,
        ConfirmCustomerUploadsAndAttachToRequestResponse
      >('confirmCustomerUploadsAndAttachToRequest', {
        source: 'customerUploadService.confirmAndAttach',
      })(input);
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async confirmForDonation(
    input: ConfirmCustomerUploadsForDonationRequest,
  ): Promise<ConfirmCustomerUploadsForDonationResponse> {
    try {
      return await callTracedFunction<
        ConfirmCustomerUploadsForDonationRequest,
        ConfirmCustomerUploadsForDonationResponse
      >('confirmCustomerUploadsForDonation', {
        source: 'customerUploadService.confirmForDonation',
      })(input);
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async getUpload(uploadId: string): Promise<CustomerUploadDocSummary | null> {
    const traceMetadata = {
      app: 'portal' as const,
      collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
      documentPathPattern: `${CUSTOMER_UPLOAD_COLLECTIONS.customerUploads}/{workingRequestUploadId}`,
      source: 'customerUploadService.getUpload',
      triggerReason: 'authentication' as const,
    };
    traceFirestoreOneShotStart('getDoc', traceMetadata);
    const snapshot = await getDoc(
      doc(getPortalDb(), CUSTOMER_UPLOAD_COLLECTIONS.customerUploads, uploadId),
    );
    traceFirestoreOneShotComplete('getDoc', traceMetadata, snapshot.exists() ? 1 : 0);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data();
    return {
      id: snapshot.id,
      batchId: String(data.batchId ?? ''),
      originalFilename: String(data.originalFilename ?? 'Uploaded artwork'),
      technicalStatus: data.technicalStatus as CustomerUploadTechnicalStatus,
      technicalProgressStage:
        typeof data.technicalProgressStage === 'string'
          ? (data.technicalProgressStage as CustomerUploadTechnicalProgressStage)
          : null,
      technicalFailureMessage:
        typeof data.technicalFailureMessage === 'string' ? data.technicalFailureMessage : null,
      previewStoragePath: typeof data.previewStoragePath === 'string' ? data.previewStoragePath : null,
      thumbnailStoragePath:
        typeof data.thumbnailStoragePath === 'string' ? data.thumbnailStoragePath : null,
      widthPx: typeof data.widthPx === 'number' ? data.widthPx : null,
      heightPx: typeof data.heightPx === 'number' ? data.heightPx : null,
      printWidthInches: typeof data.printWidthInches === 'number' ? data.printWidthInches : null,
      printHeightInches: typeof data.printHeightInches === 'number' ? data.printHeightInches : null,
      approvedMaxPrintWidthInches:
        typeof data.approvedMaxPrintWidthInches === 'number'
          ? data.approvedMaxPrintWidthInches
          : null,
      approvedMaxPrintHeightInches:
        typeof data.approvedMaxPrintHeightInches === 'number'
          ? data.approvedMaxPrintHeightInches
          : null,
      wasUpscaled: typeof data.wasUpscaled === 'boolean' ? data.wasUpscaled : null,
      interactiveEnhancedProductionStoragePath:
        typeof data.interactiveEnhancedProductionStoragePath === 'string'
          ? data.interactiveEnhancedProductionStoragePath
          : null,
      interactiveEnhancedWidthPx:
        typeof data.interactiveEnhancedWidthPx === 'number' ? data.interactiveEnhancedWidthPx : null,
      interactiveEnhancedHeightPx:
        typeof data.interactiveEnhancedHeightPx === 'number'
          ? data.interactiveEnhancedHeightPx
          : null,
      interactiveEnhanceGeneratedAt: data.interactiveEnhanceGeneratedAt,
      ownershipConfirmed: data.ownershipConfirmed === true,
      catalogUseAcknowledged: data.catalogUseAcknowledged === true,
      assistedCreationRequestId:
        typeof data.assistedCreationRequestId === 'string' && data.assistedCreationRequestId.trim()
          ? data.assistedCreationRequestId.trim()
          : null,
    };
  },

  async recordHalftoneResponse(
    uploadId: string,
    value: 'yes' | 'no',
  ): Promise<void> {
    try {
      await callTracedFunction<
        { uploadId: string; value: 'yes' | 'no' },
        { uploadId: string; value: string }
      >('recordCustomerUploadHalftoneResponse', {
        source: 'customerUploadService.recordHalftoneResponse',
      })({ uploadId, value });
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  subscribeUploadProgress(
    uploadId: string,
    onProgress: (progress: CustomerUploadLiveProgress) => void,
  ): Unsubscribe {
    const traceMetadata = {
      app: 'portal' as const,
      collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
      documentPathPattern: `${CUSTOMER_UPLOAD_COLLECTIONS.customerUploads}/{uploadId}`,
      source: 'customerUploadService.subscribeUploadProgress',
      triggerReason: 'route' as const,
    };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(
      doc(getPortalDb(), CUSTOMER_UPLOAD_COLLECTIONS.customerUploads, uploadId),
      (snapshot) => {
        traceFirestoreListenerEmission(traceMetadata, snapshot.exists() ? 1 : 0);
        if (!snapshot.exists()) {
          return;
        }
        const data = snapshot.data();
        const technicalStatus = data.technicalStatus as CustomerUploadTechnicalStatus;
        const technicalProgressStage =
          typeof data.technicalProgressStage === 'string'
            ? (data.technicalProgressStage as CustomerUploadTechnicalProgressStage)
            : null;
        onProgress({
          technicalStatus,
          technicalProgressStage,
          technicalFailureMessage:
            typeof data.technicalFailureMessage === 'string' ? data.technicalFailureMessage : null,
          previewStoragePath:
            typeof data.previewStoragePath === 'string' ? data.previewStoragePath : null,
          progressLabel: getCustomerUploadProgressLabel({
            technicalStatus,
            technicalProgressStage,
          }),
        });
      },
    );
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },

  subscribeBatchUploads(
    batchId: string,
    customerUid: string,
    onChange: (uploads: CustomerUploadDocSummary[]) => void,
  ): Unsubscribe {
    const uploadsQuery = query(
      collection(getPortalDb(), CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
      where('batchId', '==', batchId),
      where('customerUid', '==', customerUid),
    );

    const traceMetadata = {
      app: 'portal' as const,
      collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
      constraints: ['batchId==currentBatch', 'customerUid==currentUser'],
      source: 'customerUploadService.subscribeBatchUploads',
      triggerReason: 'route' as const,
    };
    traceFirestoreListenerAttach(traceMetadata);
    const unsubscribe = onSnapshot(uploadsQuery, (snapshot) => {
      traceFirestoreListenerEmission(traceMetadata, snapshot.size);
      const uploads = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          batchId: String(data.batchId ?? ''),
          originalFilename: String(data.originalFilename ?? 'Uploaded artwork'),
          technicalStatus: data.technicalStatus as CustomerUploadTechnicalStatus,
          technicalProgressStage:
            typeof data.technicalProgressStage === 'string'
              ? (data.technicalProgressStage as CustomerUploadTechnicalProgressStage)
              : null,
          technicalFailureMessage:
            typeof data.technicalFailureMessage === 'string' ? data.technicalFailureMessage : null,
          previewStoragePath:
            typeof data.previewStoragePath === 'string' ? data.previewStoragePath : null,
          thumbnailStoragePath:
            typeof data.thumbnailStoragePath === 'string' ? data.thumbnailStoragePath : null,
          widthPx: typeof data.widthPx === 'number' ? data.widthPx : null,
          heightPx: typeof data.heightPx === 'number' ? data.heightPx : null,
          printWidthInches: typeof data.printWidthInches === 'number' ? data.printWidthInches : null,
          printHeightInches:
            typeof data.printHeightInches === 'number' ? data.printHeightInches : null,
          approvedMaxPrintWidthInches:
            typeof data.approvedMaxPrintWidthInches === 'number'
              ? data.approvedMaxPrintWidthInches
              : null,
          approvedMaxPrintHeightInches:
            typeof data.approvedMaxPrintHeightInches === 'number'
              ? data.approvedMaxPrintHeightInches
              : null,
          wasUpscaled: typeof data.wasUpscaled === 'boolean' ? data.wasUpscaled : null,
          interactiveEnhancedProductionStoragePath:
            typeof data.interactiveEnhancedProductionStoragePath === 'string'
              ? data.interactiveEnhancedProductionStoragePath
              : null,
          interactiveEnhancedWidthPx:
            typeof data.interactiveEnhancedWidthPx === 'number'
              ? data.interactiveEnhancedWidthPx
              : null,
          interactiveEnhancedHeightPx:
            typeof data.interactiveEnhancedHeightPx === 'number'
              ? data.interactiveEnhancedHeightPx
              : null,
          interactiveEnhanceGeneratedAt: data.interactiveEnhanceGeneratedAt,
          ownershipConfirmed: data.ownershipConfirmed === true,
          catalogUseAcknowledged: data.catalogUseAcknowledged === true,
          assistedCreationRequestId:
            typeof data.assistedCreationRequestId === 'string' &&
            data.assistedCreationRequestId.trim()
              ? data.assistedCreationRequestId.trim()
              : null,
        } satisfies CustomerUploadDocSummary;
      });
      onChange(uploads);
    });
    return traceWrappedUnsubscribe(traceMetadata, unsubscribe);
  },

  async getDownloadUrl(storagePath: string | null | undefined): Promise<string | null> {
    if (!storagePath?.trim()) {
      return null;
    }
    try {
      return await getDownloadURL(ref(getPortalStorage(), storagePath.replace(/^\//, '')));
    } catch {
      return null;
    }
  },

  sessionKey(uid: string): string {
    return `fp-customer-upload-batch:${uid}`;
  },

  persistSession(uid: string, batchId: string, uploadIds: string[]): void {
    try {
      sessionStorage.setItem(
        this.sessionKey(uid),
        JSON.stringify({ batchId, uploadIds, savedAt: Date.now() }),
      );
    } catch {
      // Ignore quota / private mode.
    }
  },

  loadSession(uid: string): { batchId: string; uploadIds: string[] } | null {
    try {
      const raw = sessionStorage.getItem(this.sessionKey(uid));
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as { batchId?: string; uploadIds?: string[] };
      if (!parsed.batchId || !Array.isArray(parsed.uploadIds)) {
        return null;
      }
      return { batchId: parsed.batchId, uploadIds: parsed.uploadIds.filter(Boolean) };
    } catch {
      return null;
    }
  },

  clearSession(uid: string): void {
    try {
      sessionStorage.removeItem(this.sessionKey(uid));
    } catch {
      // Ignore.
    }
  },

  /** Confirmed catalog donations for the signed-in customer (account overview). */
  async countConfirmedCatalogDonations(customerUid: string): Promise<number> {
    const gallery = await this.listAccountArtworkGallery(customerUid);
    return gallery.filter((item) => item.kind === 'donation').length;
  },

  /**
   * Confirmed print-request uploads and catalog donations only — processing must have finished
   * (`technicalStatus: ready`) and the customer must have submitted the batch
   * (`ownershipConfirmed`, set by confirm callables). In-progress or abandoned drafts stay out.
   *
   * Bounded by recent `createdAt` (existing customerUid+createdAt index) so abandoned drafts
   * do not force a full collection read. Cap is high enough for account gallery + reusable designs.
   */
  async listAccountArtworkGallery(customerUid: string): Promise<AccountArtworkGalleryItem[]> {
    const ACCOUNT_GALLERY_FETCH_LIMIT = 150;
    const traceMetadata = {
      app: 'portal' as const,
      collection: CUSTOMER_UPLOAD_COLLECTIONS.customerUploads,
      constraints: ['customerUid==currentUser'],
      orderBy: ['createdAt desc'],
      limit: ACCOUNT_GALLERY_FETCH_LIMIT,
      source: 'customerUploadService.listAccountArtworkGallery',
      triggerReason: 'route' as const,
    };
    traceFirestoreOneShotStart('getDocs', traceMetadata);
    const snapshot = await getDocs(
      query(
        collection(getPortalDb(), CUSTOMER_UPLOAD_COLLECTIONS.customerUploads),
        where('customerUid', '==', customerUid),
        orderBy('createdAt', 'desc'),
        limit(ACCOUNT_GALLERY_FETCH_LIMIT),
      ),
    );
    traceFirestoreOneShotComplete('getDocs', traceMetadata, snapshot.size);

    const items: AccountArtworkGalleryItem[] = [];

    for (const document of snapshot.docs) {
      const data = document.data();
      const purpose = resolveCustomerUploadPurpose(data.purpose);
      const isDonation = purpose === 'catalog_donation';
      const isSubmitted =
        data.technicalStatus === 'ready' && data.ownershipConfirmed === true;

      if (!isSubmitted) {
        continue;
      }

      const thumbnailStoragePath =
        typeof data.thumbnailStoragePath === 'string' && data.thumbnailStoragePath.trim()
          ? data.thumbnailStoragePath.trim()
          : null;
      const previewStoragePath =
        typeof data.previewStoragePath === 'string' && data.previewStoragePath.trim()
          ? data.previewStoragePath.trim()
          : null;
      const productionStoragePath =
        typeof data.productionStoragePath === 'string' && data.productionStoragePath.trim()
          ? data.productionStoragePath.trim()
          : null;

      if (!thumbnailStoragePath && !previewStoragePath && !productionStoragePath) {
        continue;
      }

      const createdAt = data.createdAt;
      const createdAtMs =
        createdAt && typeof createdAt.toMillis === 'function'
          ? createdAt.toMillis()
          : typeof createdAt?.seconds === 'number'
            ? createdAt.seconds * 1000
            : 0;

      const promotedDesignId =
        typeof data.promotedDesignId === 'string' && data.promotedDesignId.trim()
          ? data.promotedDesignId.trim()
          : null;

      items.push({
        id: document.id,
        kind: isDonation ? 'donation' : 'upload',
        title:
          typeof data.originalFilename === 'string' && data.originalFilename.trim()
            ? data.originalFilename.trim()
            : isDonation
              ? 'Donated design'
              : 'Uploaded design',
        previewStoragePath,
        thumbnailStoragePath,
        productionStoragePath,
        promotedDesignId,
        createdAtMs,
      });
    }

    items.sort((a, b) => b.createdAtMs - a.createdAtMs);
    return items;
  },

  async resolveAccountArtworkImageUrl(item: AccountArtworkGalleryItem): Promise<string | null> {
    return (
      (await this.getDownloadUrl(item.thumbnailStoragePath)) ??
      (await this.getDownloadUrl(item.previewStoragePath)) ??
      (await this.getDownloadUrl(item.productionStoragePath))
    );
  },
};
