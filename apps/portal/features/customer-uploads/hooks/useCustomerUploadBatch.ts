'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { CUSTOMER_UPLOAD_TERMS_VERSION } from '@fresh-prints/shared/types/customerUpload/customerUpload.types';

import { useAuth } from '../../auth/context/AuthContext';
import {
  customerUploadService,
  type FinalizeCustomerUploadResponse,
} from '../services/customerUploadService';

export type UploadRowPhase =
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'validating'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'removed';

export interface UploadRowState {
  localId: string;
  file?: File;
  filename: string;
  fileSizeBytes?: number;
  uploadId?: string;
  sourceStoragePath?: string;
  phase: UploadRowPhase;
  progressLabel: string;
  uploadPercent?: number | null;
  errorMessage?: string;
  technicalFailureMessage?: string | null;
  previewStoragePath?: string | null;
}

function makeLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, Math.max(queue.length, 1)) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }
      await worker(next);
    }
  });
  await Promise.all(runners);
}

function mapTechnicalStatusToPhase(
  technicalStatus: string,
): UploadRowPhase {
  switch (technicalStatus) {
    case 'validating':
      return 'validating';
    case 'processing':
      return 'processing';
    case 'ready':
      return 'ready';
    case 'failed':
      return 'failed';
    case 'uploading':
      return 'uploading';
    default:
      return 'processing';
  }
}

export function useCustomerUploadBatch() {
  const { firebaseUser } = useAuth();
  const [rows, setRows] = useState<UploadRowState[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [catalogUseAcknowledged, setCatalogUseAcknowledged] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [batchNotes, setBatchNotes] = useState<string[]>([]);
  const abortRef = useRef(false);
  const batchIdRef = useRef<string | null>(null);
  const rowsRef = useRef<UploadRowState[]>([]);

  batchIdRef.current = batchId;
  rowsRef.current = rows;

  const readyRows = useMemo(
    () => rows.filter((row) => row.phase === 'ready' && row.uploadId),
    [rows],
  );
  const failedRows = useMemo(() => rows.filter((row) => row.phase === 'failed'), [rows]);
  const uploadingRows = useMemo(
    () => rows.filter((row) => row.phase === 'uploading' || row.phase === 'queued'),
    [rows],
  );
  const processingRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.phase === 'uploaded' ||
          row.phase === 'validating' ||
          row.phase === 'processing',
      ),
    [rows],
  );  const activeRows = useMemo(
    () => rows.filter((row) => row.phase !== 'removed'),
    [rows],
  );

  const canAttach =
    readyRows.length > 0 &&
    ownershipConfirmed &&
    !isProcessing &&
    !isAttaching;

  const updateRow = useCallback((localId: string, patch: Partial<UploadRowState>) => {
    setRows((current) =>
      current.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    );
  }, []);

  const removeRow = useCallback((localId: string) => {
    setRows((current) =>
      current.map((row) =>
        row.localId === localId
          ? { ...row, phase: 'removed', progressLabel: 'Removed', file: undefined }
          : row,
      ),
    );
  }, []);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!firebaseUser) {
        setBannerError('Sign in to upload artwork.');
        return;
      }

      setBannerError(null);
      const files = Array.from(fileList);
      const { images, zips, rejected } = customerUploadService.classifyFiles(files);
      setBatchNotes(rejected);

      if (images.length === 0 && zips.length === 0) {
        if (rejected.length === 0) {
          setBannerError('No supported files selected.');
        }
        return;
      }

      if (zips.length > 1 || (zips.length === 1 && images.length > 0)) {
        setBannerError('Upload one ZIP by itself, or upload PNG/WebP files (including folders).');
        return;
      }

      abortRef.current = false;
      setIsProcessing(true);

      try {
        if (zips.length === 1) {
          const zip = zips[0];
          const created = await customerUploadService.createZipBatch(zip);
          setBatchId(created.batchId);
          const zipRowId = makeLocalId();
          setRows([
            {
              localId: zipRowId,
              filename: zip.name,
              fileSizeBytes: zip.size,
              phase: 'uploading',
              progressLabel: 'Uploading ZIP…',
              file: zip,
            },
          ]);

          if (!created.zipStoragePath) {
            throw new Error('Upload path missing from server response.');
          }

          await customerUploadService.uploadSourceFile(
            created.zipStoragePath,
            zip,
            zip.type || 'application/zip',
            (percent) => {
              updateRow(zipRowId, {
                phase: 'uploading',
                progressLabel: `Uploading ZIP… ${percent}%`,
                uploadPercent: percent,
              });
            },
          );
          updateRow(zipRowId, {
            phase: 'processing',
            progressLabel: 'Extracting and processing ZIP…',
            uploadPercent: 100,
          });

          const finalized = await customerUploadService.finalizeZip(created.batchId);
          const nextRows: UploadRowState[] = finalized.files.map((result) => ({
            localId: makeLocalId(),
            filename: result.entryName,
            uploadId: result.uploadId,
            phase: result.technicalStatus === 'ready' ? 'ready' : 'failed',
            progressLabel: result.technicalStatus === 'ready' ? 'Ready' : 'Failed',
            technicalFailureMessage: result.technicalFailureMessage ?? null,
            errorMessage: result.technicalFailureMessage ?? undefined,
          }));
          setRows(nextRows);
          customerUploadService.persistSession(
            firebaseUser.uid,
            created.batchId,
            nextRows.map((row) => row.uploadId).filter((id): id is string => Boolean(id)),
          );
          return;
        }

        const activeRows = rowsRef.current.filter((row) => row.phase !== 'removed');
        const existingBatchId =
          batchIdRef.current && activeRows.length > 0 ? batchIdRef.current : null;
        const remainingSlots = existingBatchId
          ? Math.max(0, customerUploadService.maxFilesPerBatch - activeRows.length)
          : customerUploadService.maxFilesPerBatch;

        if (existingBatchId && remainingSlots <= 0) {
          setBannerError(
            `This upload session already has ${customerUploadService.maxFilesPerBatch} images. Add them to your request first, or remove some.`,
          );
          return;
        }

        const limitedImages = images.slice(0, remainingSlots);
        if (images.length > limitedImages.length) {
          setBatchNotes((notes) => [
            ...notes,
            `Only ${limitedImages.length} more image${limitedImages.length === 1 ? '' : 's'} could be added (max ${customerUploadService.maxFilesPerBatch} per session).`,
          ]);
        }

        const created = await customerUploadService.createDirectImageBatch(limitedImages, {
          existingBatchId: existingBatchId ?? undefined,
        });
        setBatchId(created.batchId);
        batchIdRef.current = created.batchId;
        if (!created.uploads || created.uploads.length === 0) {
          throw new Error('Server did not return upload slots.');
        }

        const newRows: UploadRowState[] = created.uploads.map((slot, index) => ({
          localId: makeLocalId(),
          file: limitedImages[index],
          filename: slot.originalFilename,
          fileSizeBytes: limitedImages[index]?.size,
          uploadId: slot.uploadId,
          sourceStoragePath: slot.sourceStoragePath,
          phase: 'queued' as const,
          progressLabel: 'Waiting…',
        }));

        setRows((current) => {
          const kept = existingBatchId
            ? current.filter((row) => row.phase !== 'removed')
            : [];
          return [...kept, ...newRows];
        });
        customerUploadService.persistSession(
          firebaseUser.uid,
          created.batchId,
          [...(existingBatchId ? activeRows : []), ...newRows]
            .map((row) => row.uploadId)
            .filter((id): id is string => Boolean(id)),
        );

        await runWithConcurrency(
          newRows,
          customerUploadService.maxConcurrentFinalize,
          async (row) => {
            if (abortRef.current || !row.file || !row.uploadId || !row.sourceStoragePath) {
              return;
            }

            try {
              updateRow(row.localId, {
                phase: 'uploading',
                progressLabel: 'Uploading… 0%',
                uploadPercent: 0,
              });
              const contentType =
                row.file.type ||
                (row.file.name.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png');
              const uploadStartedAt = performance.now();
              await customerUploadService.uploadSourceFile(
                row.sourceStoragePath,
                row.file,
                contentType,
                (percent) => {
                  updateRow(row.localId, {
                    phase: 'uploading',
                    progressLabel: `Uploading… ${percent}%`,
                    uploadPercent: percent,
                  });
                },
              );
              const uploadMs = Math.round(performance.now() - uploadStartedAt);
              console.info('[customer-upload] source upload complete', {
                uploadId: row.uploadId,
                uploadMs,
              });
              updateRow(row.localId, {
                phase: 'uploaded',
                progressLabel: 'Uploaded — starting checks…',
                uploadPercent: 100,
              });
              const finalizeStartedAt = performance.now();
              const unsubscribeProgress = customerUploadService.subscribeUploadProgress(
                row.uploadId,
                (progress) => {
                  updateRow(row.localId, {
                    phase: mapTechnicalStatusToPhase(progress.technicalStatus),
                    progressLabel: progress.progressLabel,
                    previewStoragePath: progress.previewStoragePath,
                    technicalFailureMessage: progress.technicalFailureMessage,
                    errorMessage:
                      progress.technicalStatus === 'failed'
                        ? (progress.technicalFailureMessage ?? 'Processing failed.')
                        : undefined,
                  });
                },
              );
              try {
                const result: FinalizeCustomerUploadResponse =
                  await customerUploadService.finalizeImage(row.uploadId, created.batchId);
                console.info('[customer-upload] finalize complete', {
                  uploadId: row.uploadId,
                  finalizeMs: Math.round(performance.now() - finalizeStartedAt),
                  status: result.technicalStatus,
                });
                if (result.technicalStatus === 'ready') {
                  updateRow(row.localId, {
                    phase: 'ready',
                    progressLabel: 'Ready',
                    previewStoragePath: result.previewStoragePath,
                    technicalFailureMessage: null,
                  });
                } else {
                  updateRow(row.localId, {
                    phase: 'failed',
                    progressLabel: 'Failed',
                    technicalFailureMessage: result.technicalFailureMessage,
                    errorMessage: result.technicalFailureMessage ?? 'Processing failed.',
                  });
                }
              } finally {
                unsubscribeProgress();
              }
            } catch (error) {
              updateRow(row.localId, {
                phase: 'failed',
                progressLabel: 'Failed',
                errorMessage: error instanceof Error ? error.message : 'Upload failed.',
              });
            }
          },
        );
      } catch (error) {
        setBannerError(error instanceof Error ? error.message : 'Unable to start upload.');
      } finally {
        setIsProcessing(false);
      }
    },
    [firebaseUser, updateRow],
  );

  const retryFailed = useCallback(async () => {
    if (!batchId || !firebaseUser) {
      return;
    }
    const retryTargets = rows.filter(
      (row) => row.phase === 'failed' && row.uploadId && row.file && row.sourceStoragePath,
    );
    if (retryTargets.length === 0) {
      setBannerError('Nothing to retry. Re-select files for a new upload.');
      return;
    }

    setBannerError(null);
    setIsProcessing(true);

    // Clear failure copy immediately so Retry doesn't leave the old error on screen.
    for (const row of retryTargets) {
      updateRow(row.localId, {
        errorMessage: undefined,
        technicalFailureMessage: null,
        progressLabel: 'Retrying…',
      });
    }

    try {
      await runWithConcurrency(
        retryTargets,
        customerUploadService.maxConcurrentFinalize,
        async (row) => {
          if (!row.file || !row.uploadId || !row.sourceStoragePath) {
            return;
          }
          try {
            updateRow(row.localId, {
              phase: 'uploading',
              progressLabel: 'Retrying upload…',
              errorMessage: undefined,
              technicalFailureMessage: null,
            });
            const contentType =
              row.file.type ||
              (row.file.name.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png');
            await customerUploadService.uploadSourceFile(
              row.sourceStoragePath,
              row.file,
              contentType,
            );
            const unsubscribeProgress = customerUploadService.subscribeUploadProgress(
              row.uploadId,
              (progress) => {
                updateRow(row.localId, {
                  phase: mapTechnicalStatusToPhase(progress.technicalStatus),
                  progressLabel: progress.progressLabel,
                  previewStoragePath: progress.previewStoragePath,
                  technicalFailureMessage: progress.technicalFailureMessage,
                  errorMessage:
                    progress.technicalStatus === 'failed'
                      ? (progress.technicalFailureMessage ?? 'Processing failed.')
                      : undefined,
                });
              },
            );
            try {
              const result = await customerUploadService.finalizeImage(row.uploadId, batchId);
              if (result.technicalStatus === 'ready') {
                updateRow(row.localId, {
                  phase: 'ready',
                  progressLabel: 'Ready',
                  previewStoragePath: result.previewStoragePath,
                  errorMessage: undefined,
                  technicalFailureMessage: null,
                });
              } else {
                updateRow(row.localId, {
                  phase: 'failed',
                  progressLabel: 'Failed',
                  technicalFailureMessage: result.technicalFailureMessage,
                  errorMessage: result.technicalFailureMessage ?? 'Processing failed.',
                });
              }
            } finally {
              unsubscribeProgress();
            }
          } catch (error) {
            updateRow(row.localId, {
              phase: 'failed',
              progressLabel: 'Failed',
              errorMessage: error instanceof Error ? error.message : 'Retry failed.',
            });
          }
        },
      );
    } finally {
      setIsProcessing(false);
    }
  }, [batchId, firebaseUser, rows, updateRow]);

  const attachToRequest = useCallback(async (): Promise<string | null> => {
    if (!batchId || !canAttach) {
      return null;
    }

    setIsAttaching(true);
    setBannerError(null);
    try {
      const response = await customerUploadService.confirmAndAttach({
        batchId,
        uploadIds: readyRows.map((row) => row.uploadId!),
        ownershipConfirmed: true,
        catalogUseAcknowledged,
        termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
        defaultQuantity: 1,
      });
      if (firebaseUser) {
        customerUploadService.clearSession(firebaseUser.uid);
      }
      return response.printRequestId;
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : 'Unable to add uploads to request.');
      return null;
    } finally {
      setIsAttaching(false);
    }
  }, [batchId, canAttach, catalogUseAcknowledged, firebaseUser, readyRows]);

  const reset = useCallback(() => {
    abortRef.current = true;
    setRows([]);
    setBatchId(null);
    setOwnershipConfirmed(false);
    setCatalogUseAcknowledged(true);
    setBannerError(null);
    setBatchNotes([]);
    if (firebaseUser) {
      customerUploadService.clearSession(firebaseUser.uid);
    }
  }, [firebaseUser]);

  return {
    rows: activeRows,
    batchId,
    isProcessing,
    isAttaching,
    ownershipConfirmed,
    catalogUseAcknowledged,
    setOwnershipConfirmed,
    setCatalogUseAcknowledged,
    bannerError,
    batchNotes,
    readyCount: readyRows.length,
    failedCount: failedRows.length,
    uploadingCount: uploadingRows.length,
    processingCount: processingRows.length,
    canAttach,
    addFiles,
    removeRow,
    retryFailed,
    attachToRequest,
    reset,
  };
}
