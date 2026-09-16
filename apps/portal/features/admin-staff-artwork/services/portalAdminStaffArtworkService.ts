import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytesResumable, type UploadMetadata } from 'firebase/storage';

import { CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES } from '@fresh-prints/shared/constants/customerUpload/customerUploadLimits.constants';
import {
  getStaffArtworkSourceStoragePath,
  isCanonicalStaffArtworkStoragePath,
} from '@fresh-prints/shared/constants/staffArtwork/staffArtworkStoragePaths';
import { runTracedCallable } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';
import { getPortalFunctions, getPortalStorage } from '../../../lib/firebase/client';
import { createPortalStaffArtworkClientId } from '../utils/portalAdminStaffArtworkUploadIds';
import type {
  CreateStaffArtworkUploadResponse,
  FinalizeStaffArtworkResponse,
} from '../types/portalAdminStaffArtwork.types';

const FINALIZE_TIMEOUT_MS = 540_000;

interface CreateStaffArtworkUploadRequest {
  staffArtworkId: string;
  sourceFileName: string;
  contentType: 'image/png';
  customerId: null;
  artworkBackgroundChoice: 'auto';
}

interface FinalizeStaffArtworkRequest {
  staffArtworkId: string;
}

export function validatePortalStaffArtworkFile(file: File): string | null {
  const isPng = file.type.toLowerCase() === 'image/png' || /\.png$/i.test(file.name);
  if (!isPng) {
    return 'Only PNG files are supported.';
  }
  if (file.size <= 0) {
    return 'This file is empty.';
  }
  if (file.size > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES) {
    return `Files must be ${Math.round(CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES / (1024 * 1024))} MB or smaller.`;
  }
  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return error.message || 'Staff Artwork upload could not be completed.';
  }
  return error instanceof Error ? error.message : 'Staff Artwork upload could not be completed.';
}

function isNotFoundCallableError(error: unknown): boolean {
  return (
    (error instanceof FirebaseError && error.code === 'functions/not-found') ||
    (error instanceof Error &&
      (error as Error & { code?: string }).code === 'functions/not-found')
  );
}

async function finalizeStaffArtwork(staffArtworkId: string): Promise<FinalizeStaffArtworkResponse> {
  try {
    return await runTracedCallable<FinalizeStaffArtworkRequest, FinalizeStaffArtworkResponse>(
      'finalizeStaffArtwork',
      (request) =>
        httpsCallable<FinalizeStaffArtworkRequest, FinalizeStaffArtworkResponse>(
          getPortalFunctions(),
          'finalizeStaffArtwork',
          { timeout: FINALIZE_TIMEOUT_MS },
        )(request),
      { staffArtworkId },
      { app: 'portal', source: 'portalAdminStaffArtworkService.finalizeStaffArtwork' },
    );
  } catch (error) {
    const wrapped = new Error(getErrorMessage(error));
    if (error instanceof FirebaseError) {
      Object.assign(wrapped, { code: error.code });
    }
    throw wrapped;
  }
}

async function createStaffArtworkUpload(
  request: CreateStaffArtworkUploadRequest,
): Promise<CreateStaffArtworkUploadResponse> {
  try {
    return await callTracedFunction<
      CreateStaffArtworkUploadRequest,
      CreateStaffArtworkUploadResponse
    >('createStaffArtworkUpload', {
      source: 'portalAdminStaffArtworkService.createStaffArtworkUpload',
    })(request);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

async function uploadSourceFile(
  storagePath: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const storageRef = ref(getPortalStorage(), storagePath.replace(/^\//, ''));
  const metadata: UploadMetadata = { contentType: 'image/png' };
  const task = uploadBytesResumable(storageRef, file, metadata);

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          onProgress?.(Math.min(100, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)));
        }
      },
      reject,
      () => {
        onProgress?.(100);
        resolve();
      },
    );
  });
}

export const portalAdminStaffArtworkService = {
  async uploadFile(
    file: File,
    options?: {
      staffArtworkId?: string;
      onCreated?: (staffArtworkId: string) => void;
      onPhase?: (phase: 'uploading' | 'processing') => void;
      onProgress?: (percent: number) => void;
    },
  ): Promise<FinalizeStaffArtworkResponse> {
    const validationError = validatePortalStaffArtworkFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const reusedStaffArtworkId = options?.staffArtworkId?.trim() || '';
    const staffArtworkId = reusedStaffArtworkId || createPortalStaffArtworkClientId();

    // Only probe finalize for a known ID from a prior attempt (retry / lost response recovery).
    // Fresh IDs would always 404 and spam the browser console before create.
    if (reusedStaffArtworkId) {
      try {
        const existing = await finalizeStaffArtwork(staffArtworkId);
        if (existing.status === 'ready') {
          return existing;
        }
      } catch (error) {
        if (!isNotFoundCallableError(error)) {
          throw error;
        }
      }
    }

    const created = await createStaffArtworkUpload({
      staffArtworkId,
      sourceFileName: file.name,
      contentType: 'image/png',
      customerId: null,
      artworkBackgroundChoice: 'auto',
    });

    if (
      created.staffArtworkId !== staffArtworkId ||
      !isCanonicalStaffArtworkStoragePath(created.sourceStoragePath, staffArtworkId)
    ) {
      throw new Error('The upload source path was not accepted by the Staff Artwork boundary.');
    }

    options?.onCreated?.(created.staffArtworkId);
    options?.onPhase?.('uploading');
    await uploadSourceFile(created.sourceStoragePath, file, options?.onProgress);
    options?.onPhase?.('processing');

    const finalized = await finalizeStaffArtwork(staffArtworkId);
    if (finalized.status === 'failed') {
      throw new Error(finalized.errorMessage || 'Staff Artwork processing failed.');
    }
    return finalized;
  },

  getCanonicalSourcePath(staffArtworkId: string): string {
    return getStaffArtworkSourceStoragePath(staffArtworkId);
  },
};
