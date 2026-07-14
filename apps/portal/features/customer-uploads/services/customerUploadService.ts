import { collection, doc, getDoc, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytesResumable, type UploadMetadata } from 'firebase/storage';

import {
  CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE,
  CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH,
  CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES,
  CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES,
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

import { getPortalDb, getPortalFunctions, getPortalStorage } from '../../../lib/firebase/client';
import { portalAuthService } from '../../auth/services/authService';

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
  ownershipConfirmed: boolean;
  catalogUseAcknowledged: boolean;
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
  return (
    type === 'image/png' ||
    type === 'image/webp' ||
    name.endsWith('.png') ||
    name.endsWith('.webp')
  );
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

export const customerUploadService = {
  maxFilesPerBatch: CUSTOMER_UPLOAD_MAX_FILES_PER_BATCH,
  maxConcurrentFinalize: CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE,
  termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
  donateTermsVersion: CUSTOMER_UPLOAD_DONATE_TERMS_VERSION,

  classifyFiles(files: File[]): { images: File[]; zips: File[]; rejected: string[] } {
    const images: File[] = [];
    const zips: File[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      if (isZipFile(file) && file.name.toLowerCase().endsWith('.zip')) {
        if (file.size > CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES) {
          rejected.push(
            `${file.name}: ZIP exceeds the ${formatFileSize(CUSTOMER_UPLOAD_MAX_ZIP_COMPRESSED_BYTES)} size limit.`,
          );
          continue;
        }
        zips.push(file);
        continue;
      }

      if (isAllowedImageFile(file)) {
        if (file.size > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES) {
          rejected.push(
            `${file.name}: image exceeds the ${formatFileSize(CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES)} size limit.`,
          );
          continue;
        }
        images.push(file);
        continue;
      }

      rejected.push(`${file.name}: use PNG, WebP, or ZIP.`);
    }

    return { images, zips, rejected };
  },

  async createDirectImageBatch(
    files: File[],
    options?: { existingBatchId?: string; purpose?: CustomerUploadPurpose },
  ): Promise<CreateCustomerUploadBatchResponse> {
    try {
      const createCallable = httpsCallable<
        {
          mode: 'direct_images';
          clientRequestId: string;
          purpose: CustomerUploadPurpose;
          files: Array<{ originalFilename: string; declaredSizeBytes: number }>;
          existingBatchId?: string;
        },
        CreateCustomerUploadBatchResponse
      >(getPortalFunctions(), 'createCustomerUploadBatch');

      const response = await createCallable({
        mode: 'direct_images',
        clientRequestId: newClientRequestId(),
        purpose: options?.purpose ?? 'print_request',
        files: files.map((file) => ({
          originalFilename: file.name,
          declaredSizeBytes: file.size,
        })),
        existingBatchId: options?.existingBatchId,
      });
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async createZipBatch(
    file: File,
    options?: { purpose?: CustomerUploadPurpose },
  ): Promise<CreateCustomerUploadBatchResponse> {
    try {
      const createCallable = httpsCallable<
        {
          mode: 'zip';
          clientRequestId: string;
          purpose: CustomerUploadPurpose;
          declaredZipSizeBytes: number;
        },
        CreateCustomerUploadBatchResponse
      >(getPortalFunctions(), 'createCustomerUploadBatch');

      const response = await createCallable({
        mode: 'zip',
        clientRequestId: newClientRequestId(),
        purpose: options?.purpose ?? 'print_request',
        declaredZipSizeBytes: file.size,
      });
      return response.data;
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
      const finalizeCallable = httpsCallable<
        { uploadId: string; batchId: string },
        FinalizeCustomerUploadResponse
      >(getPortalFunctions(), 'finalizeCustomerUpload', {
        timeout: FINALIZE_CALLABLE_TIMEOUT_MS,
      });
      const response = await finalizeCallable({ uploadId, batchId });
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async finalizeZip(batchId: string): Promise<FinalizeCustomerUploadZipResponse> {
    try {
      const finalizeCallable = httpsCallable<{ batchId: string }, FinalizeCustomerUploadZipResponse>(
        getPortalFunctions(),
        'finalizeCustomerUploadZip',
        { timeout: FINALIZE_CALLABLE_TIMEOUT_MS },
      );
      const response = await finalizeCallable({ batchId });
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async confirmAndAttach(
    input: ConfirmCustomerUploadsAndAttachToRequestRequest,
  ): Promise<ConfirmCustomerUploadsAndAttachToRequestResponse> {
    try {
      const attachCallable = httpsCallable<
        ConfirmCustomerUploadsAndAttachToRequestRequest,
        ConfirmCustomerUploadsAndAttachToRequestResponse
      >(getPortalFunctions(), 'confirmCustomerUploadsAndAttachToRequest');
      const response = await attachCallable(input);
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async confirmForDonation(
    input: ConfirmCustomerUploadsForDonationRequest,
  ): Promise<ConfirmCustomerUploadsForDonationResponse> {
    try {
      const donateCallable = httpsCallable<
        ConfirmCustomerUploadsForDonationRequest,
        ConfirmCustomerUploadsForDonationResponse
      >(getPortalFunctions(), 'confirmCustomerUploadsForDonation');
      const response = await donateCallable(input);
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async getUpload(uploadId: string): Promise<CustomerUploadDocSummary | null> {
    const snapshot = await getDoc(
      doc(getPortalDb(), CUSTOMER_UPLOAD_COLLECTIONS.customerUploads, uploadId),
    );
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
      ownershipConfirmed: data.ownershipConfirmed === true,
      catalogUseAcknowledged: data.catalogUseAcknowledged === true,
    };
  },

  async recordHalftoneResponse(
    uploadId: string,
    value: 'yes' | 'no',
  ): Promise<void> {
    try {
      const callable = httpsCallable<
        { uploadId: string; value: 'yes' | 'no' },
        { uploadId: string; value: string }
      >(getPortalFunctions(), 'recordCustomerUploadHalftoneResponse');
      await callable({ uploadId, value });
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  subscribeUploadProgress(
    uploadId: string,
    onProgress: (progress: CustomerUploadLiveProgress) => void,
  ): Unsubscribe {
    return onSnapshot(
      doc(getPortalDb(), CUSTOMER_UPLOAD_COLLECTIONS.customerUploads, uploadId),
      (snapshot) => {
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

    return onSnapshot(uploadsQuery, (snapshot) => {
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
          ownershipConfirmed: data.ownershipConfirmed === true,
          catalogUseAcknowledged: data.catalogUseAcknowledged === true,
        } satisfies CustomerUploadDocSummary;
      });
      onChange(uploads);
    });
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
};
