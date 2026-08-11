'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CUSTOMER_UPLOAD_TERMS_VERSION } from '@fresh-prints/shared/types/customerUpload/customerUpload.types';
import type { CustomerUploadPurpose } from '@fresh-prints/shared/types/customerUpload/customerUpload.enums';
import { getCustomerUploadProgressLabel } from '@fresh-prints/shared/utils/customerUploadProgressLabel';
import {
  formatWorkingRequestUploadRoomCapNote,
  resolveUploadSessionImageCap,
} from '@fresh-prints/shared/utils/printRequestWorkingRequestMax';

import { useAuth } from '../../auth/context/AuthContext';
import {
  customerUploadService,
  defaultCustomerUploadSizeLimits,
  type CustomerUploadSizeLimits,
  type FinalizeCustomerUploadResponse,
} from '../services/customerUploadService';
import { buildPersistedUploadSessionIds } from '../utils/uploadSessionRows';

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
  /** Selected customer response (yes = marked as halftone). Default unanswered/off. */
  halftoneResponseDraft?: 'yes' | 'no' | null;
  /** Last value successfully persisted to the server. */
  halftoneResponseConfirmed?: 'yes' | 'no' | null;
  /** True while a background save is in flight (UI stays interactive). */
  halftoneResponseSaving?: boolean;
  halftoneResponseError?: string | null;
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

export function useCustomerUploadBatch(options?: {
  purpose?: CustomerUploadPurpose;
  sizeLimits?: CustomerUploadSizeLimits | null;
  /**
   * Print slots left on Current Request (ADR-FP-102). Caps how many images this
   * session may select/attach. Omit or null for donation / limit-not-ready.
   */
  maxImagesForRequest?: number | null;
}) {
  const purpose = options?.purpose ?? 'print_request';
  const isDonation = purpose === 'catalog_donation';
  const maxImagesForRequest =
    isDonation || options?.maxImagesForRequest == null
      ? null
      : Math.max(0, Math.floor(options.maxImagesForRequest));
  const { firebaseUser } = useAuth();
  const sizeLimitsRef = useRef<CustomerUploadSizeLimits>(
    options?.sizeLimits ?? defaultCustomerUploadSizeLimits(purpose),
  );
  sizeLimitsRef.current = options?.sizeLimits ?? defaultCustomerUploadSizeLimits(purpose);
  const maxImagesForRequestRef = useRef(maxImagesForRequest);
  maxImagesForRequestRef.current = maxImagesForRequest;
  const [rows, setRows] = useState<UploadRowState[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(true);
  // Both flows default checked; user can uncheck. Donate still requires catalog consent to attach.
  const [catalogUseAcknowledged, setCatalogUseAcknowledged] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [batchNotes, setBatchNotes] = useState<string[]>([]);
  const abortRef = useRef(false);
  const batchIdRef = useRef<string | null>(null);
  const rowsRef = useRef<UploadRowState[]>([]);
  /** Latest-wins token per row so stale callable responses cannot clobber newer toggles. */
  const halftoneSaveGenerationRef = useRef<Map<string, number>>(new Map());

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
  );
  const activeRows = useMemo(
    () => rows.filter((row) => row.phase !== 'removed'),
    [rows],
  );

  const canAttach =
    readyRows.length > 0 &&
    ownershipConfirmed &&
    (!isDonation || catalogUseAcknowledged) &&
    !isProcessing &&
    !isAttaching &&
    (maxImagesForRequest == null || readyRows.length <= maxImagesForRequest);

  const updateRow = useCallback((localId: string, patch: Partial<UploadRowState>) => {
    setRows((current) =>
      current.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    );
  }, []);

  const removeRow = useCallback(async (localId: string) => {
    const existing = rowsRef.current.find((row) => row.localId === localId);
    setRows((current) =>
      current.map((row) =>
        row.localId === localId
          ? { ...row, phase: 'removed', progressLabel: 'Removed', file: undefined }
          : row,
      ),
    );

    const uploadId = existing?.uploadId;
    if (!uploadId) {
      return;
    }

    try {
      await customerUploadService.deleteOwnUpload(uploadId);
      customerUploadService.invalidateDailyQuota();
    } catch (error: unknown) {
      console.warn('[customer-upload] remove delete failed', {
        uploadId,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }, []);

  const abandonUnconfirmedUploads = useCallback(async () => {
    abortRef.current = true;
    const uploadIds = [
      ...new Set(
        rowsRef.current
          .filter((row) => row.phase !== 'removed' && Boolean(row.uploadId))
          .map((row) => row.uploadId as string),
      ),
    ];

    if (uploadIds.length > 0) {
      await Promise.allSettled(
        uploadIds.map(async (uploadId) => {
          await customerUploadService.deleteOwnUpload(uploadId);
        }),
      );
      customerUploadService.invalidateDailyQuota();
    }

    setRows([]);
    setBatchId(null);
    setOwnershipConfirmed(false);
    setCatalogUseAcknowledged(!isDonation);
    setBannerError(null);
    setBatchNotes([]);
    if (firebaseUser) {
      customerUploadService.clearSession(firebaseUser.uid);
    }
  }, [firebaseUser, isDonation]);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const uploadUser = firebaseUser;
      if (!uploadUser) {
        setBannerError('Sign in to upload artwork.');
        return;
      }

      setBannerError(null);
      const files = Array.from(fileList);
      const { images, zips, rejected } = customerUploadService.classifyFiles(
        files,
        sizeLimitsRef.current,
      );
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

      if (isDonation && uploadUser.isAnonymous && zips.length > 0) {
        setBannerError('Guest donations support image uploads only. Sign in to upload a ZIP.');
        return;
      }

      abortRef.current = false;
      setIsProcessing(true);

      try {
        if (zips.length === 1) {
          const sessionCap = resolveUploadSessionImageCap({
            maxFilesPerBatch: customerUploadService.maxFilesPerBatch,
            maxImagesForRequest: maxImagesForRequestRef.current,
          });
          if (sessionCap < 1) {
            setBannerError(
              'This request has no print slots left for more uploads. Remove prints or add the request to a show first.',
            );
            return;
          }

          const zip = zips[0];
          const zipRowId = makeLocalId();
          setRows([
            {
              localId: zipRowId,
              filename: zip.name,
              fileSizeBytes: zip.size,
              phase: 'queued',
              progressLabel: 'Preparing ZIP…',
              file: zip,
            },
          ]);

          const created = await customerUploadService.createZipBatch(zip, { purpose });
          setBatchId(created.batchId);
          batchIdRef.current = created.batchId;

          if (!created.zipStoragePath) {
            throw new Error('Upload path missing from server response.');
          }

          updateRow(zipRowId, {
            phase: 'uploading',
            progressLabel: 'Uploading ZIP… 0%',
            uploadPercent: 0,
          });

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
            progressLabel: 'Discovering images in ZIP…',
            uploadPercent: 100,
          });

          const unsubscribeBatch = customerUploadService.subscribeBatchUploads(
            created.batchId,
            uploadUser.uid,
            (uploads) => {
              if (uploads.length === 0) {
                return;
              }
              setRows(
                uploads.map((upload) => ({
                  localId: `zip_${upload.id}`,
                  filename: upload.originalFilename,
                  uploadId: upload.id,
                  phase: mapTechnicalStatusToPhase(upload.technicalStatus),
                  progressLabel: getCustomerUploadProgressLabel({
                    technicalStatus: upload.technicalStatus,
                    technicalProgressStage: upload.technicalProgressStage,
                  }),
                  previewStoragePath: upload.previewStoragePath,
                  technicalFailureMessage: upload.technicalFailureMessage,
                  errorMessage:
                    upload.technicalStatus === 'failed'
                      ? (upload.technicalFailureMessage ?? 'Processing failed.')
                      : undefined,
                })),
              );
            },
          );

          try {
            const finalized = await customerUploadService.finalizeZip(created.batchId);
            const cappedFiles = finalized.files.slice(0, sessionCap);
            if (finalized.files.length > cappedFiles.length) {
              setBannerError(
                formatWorkingRequestUploadRoomCapNote(
                  cappedFiles.length,
                  finalized.files.length,
                ),
              );
            }
            setRows((current) => {
              const byUploadId = new Map(
                current
                  .filter((row) => row.uploadId)
                  .map((row) => [row.uploadId!, row] as const),
              );
              return cappedFiles.map((result) => {
                const existing = byUploadId.get(result.uploadId);
                return {
                  localId: `zip_${result.uploadId}`,
                  filename: existing?.filename ?? result.entryName,
                  uploadId: result.uploadId,
                  phase: (result.technicalStatus === 'ready' ? 'ready' : 'failed') as UploadRowPhase,
                  progressLabel: result.technicalStatus === 'ready' ? 'Ready' : 'Failed',
                  previewStoragePath: existing?.previewStoragePath ?? null,
                  technicalFailureMessage: result.technicalFailureMessage ?? null,
                  errorMessage: result.technicalFailureMessage ?? undefined,
                };
              });
            });
            customerUploadService.persistSession(
              uploadUser.uid,
              created.batchId,
              cappedFiles.map((file) => file.uploadId),
            );
          } finally {
            unsubscribeBatch();
          }
          return;
        }

        const activeRowsForCap = rowsRef.current.filter((row) => row.phase !== 'removed');
        const existingBatchId =
          batchIdRef.current && activeRowsForCap.length > 0 ? batchIdRef.current : null;
        const sessionCap = resolveUploadSessionImageCap({
          maxFilesPerBatch: customerUploadService.maxFilesPerBatch,
          maxImagesForRequest: maxImagesForRequestRef.current,
        });
        const remainingSlots = existingBatchId
          ? Math.max(0, sessionCap - activeRowsForCap.length)
          : sessionCap;

        if (remainingSlots <= 0) {
          setBannerError(
            maxImagesForRequestRef.current != null &&
              maxImagesForRequestRef.current < customerUploadService.maxFilesPerBatch
              ? 'This request has no print slots left for more uploads. Remove prints from Current Request, or remove images from this list first.'
              : `This upload session already has ${customerUploadService.maxFilesPerBatch} images. Add them to your request first, or remove some.`,
          );
          return;
        }

        const limitedImages = images.slice(0, remainingSlots);
        if (images.length > limitedImages.length) {
          const isRequestRoomCap =
            maxImagesForRequestRef.current != null &&
            limitedImages.length <= maxImagesForRequestRef.current;
          const note = isRequestRoomCap
            ? formatWorkingRequestUploadRoomCapNote(limitedImages.length, images.length)
            : `Only ${limitedImages.length} more image${limitedImages.length === 1 ? '' : 's'} could be added (max ${customerUploadService.maxFilesPerBatch} per session).`;
          if (isRequestRoomCap) {
            setBannerError(note);
          } else {
            setBatchNotes((notes) => [...notes, note]);
          }
        }

        const pendingRows: UploadRowState[] = limitedImages.map((file) => ({
          localId: makeLocalId(),
          file,
          filename: file.name,
          fileSizeBytes: file.size,
          phase: 'queued' as const,
          progressLabel: 'Preparing…',
        }));

        setRows((current) => {
          const kept = existingBatchId
            ? current.filter((row) => row.phase !== 'removed')
            : [];
          return [...kept, ...pendingRows];
        });

        const created = await customerUploadService.createDirectImageBatch(limitedImages, {
          existingBatchId: existingBatchId ?? undefined,
          purpose,
        });
        setBatchId(created.batchId);
        batchIdRef.current = created.batchId;
        if (!created.uploads || created.uploads.length === 0) {
          throw new Error('Server did not return upload slots.');
        }

        const newRows: UploadRowState[] = pendingRows.map((row, index) => {
          const slot = created.uploads![index];
          return {
            ...row,
            filename: slot?.originalFilename ?? row.filename,
            uploadId: slot?.uploadId,
            sourceStoragePath: slot?.sourceStoragePath,
            phase: 'queued' as const,
            progressLabel: 'Waiting…',
          };
        });

        setRows((current) => {
          const byLocalId = new Map(newRows.map((row) => [row.localId, row] as const));
          const next = current.map((row) => byLocalId.get(row.localId) ?? row);
          // Keep the ref current for remove/abort checks before React re-renders.
          rowsRef.current = next;
          return next;
        });
        customerUploadService.persistSession(
          uploadUser.uid,
          created.batchId,
          buildPersistedUploadSessionIds([
            ...(existingBatchId ? activeRowsForCap : []),
            ...newRows,
          ]),
        );

        await runWithConcurrency(
          newRows,
          customerUploadService.maxConcurrentFinalize,
          async (row) => {
            // Prefer the queue row for upload targets. rowsRef can still be stale immediately
            // after setRows, which made every worker exit early and left rows on "Waiting…".
            if (abortRef.current || !row.file || !row.uploadId || !row.sourceStoragePath) {
              return;
            }

            const isRemoved = () =>
              rowsRef.current.find((item) => item.localId === row.localId)?.phase === 'removed';

            if (isRemoved()) {
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
                  if (isRemoved()) {
                    return;
                  }
                  updateRow(row.localId, {
                    phase: 'uploading',
                    progressLabel: `Uploading… ${percent}%`,
                    uploadPercent: percent,
                  });
                },
              );
              if (isRemoved()) {
                return;
              }
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
                  if (isRemoved()) {
                    return;
                  }
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
                if (isRemoved()) {
                  return;
                }
                const result: FinalizeCustomerUploadResponse =
                  await customerUploadService.finalizeImage(row.uploadId, created.batchId);
                if (isRemoved()) {
                  return;
                }
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
                    halftoneResponseDraft: null,
                    halftoneResponseConfirmed: null,
                    halftoneResponseSaving: false,
                    halftoneResponseError: null,
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
              if (isRemoved()) {
                return;
              }
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
        setRows((current) =>
          current.map((row) =>
            row.phase === 'queued' &&
            (row.progressLabel === 'Preparing…' || row.progressLabel === 'Preparing ZIP…')
              ? {
                  ...row,
                  phase: 'failed' as const,
                  progressLabel: 'Failed',
                  errorMessage: error instanceof Error ? error.message : 'Unable to start upload.',
                }
              : row,
          ),
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [firebaseUser, isDonation, purpose, updateRow],
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
    if (isDonation || !batchId || !canAttach) {
      return null;
    }

    if (
      maxImagesForRequestRef.current != null &&
      readyRows.length > maxImagesForRequestRef.current
    ) {
      setBannerError(
        formatWorkingRequestUploadRoomCapNote(
          maxImagesForRequestRef.current,
          readyRows.length,
        ),
      );
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
  }, [batchId, canAttach, catalogUseAcknowledged, firebaseUser, isDonation, readyRows]);

  const submitDonation = useCallback(async (): Promise<boolean> => {
    if (!isDonation || !batchId || !canAttach) {
      return false;
    }

    setIsAttaching(true);
    setBannerError(null);
    try {
      await customerUploadService.confirmForDonation({
        batchId,
        uploadIds: readyRows.map((row) => row.uploadId!),
        ownershipConfirmed: true,
        catalogUseAcknowledged: true,
        termsVersion: customerUploadService.donateTermsVersion,
      });
      if (firebaseUser) {
        customerUploadService.clearSession(firebaseUser.uid);
      }
      return true;
    } catch (error) {
      setBannerError(error instanceof Error ? error.message : 'Unable to submit donation.');
      return false;
    } finally {
      setIsAttaching(false);
    }
  }, [batchId, canAttach, firebaseUser, isDonation, readyRows]);

  const respondToHalftone = useCallback(
    (localId: string, value: 'yes' | 'no') => {
      const row = rowsRef.current.find((item) => item.localId === localId);
      if (!row?.uploadId || row.phase !== 'ready') {
        return;
      }
      if (row.halftoneResponseDraft === value && !row.halftoneResponseError) {
        return;
      }

      const uploadId = row.uploadId;
      const generation = (halftoneSaveGenerationRef.current.get(localId) ?? 0) + 1;
      halftoneSaveGenerationRef.current.set(localId, generation);

      // Paint instantly; persist in the background.
      updateRow(localId, {
        halftoneResponseDraft: value,
        halftoneResponseSaving: true,
        halftoneResponseError: null,
      });

      void customerUploadService
        .recordHalftoneResponse(uploadId, value)
        .then(() => {
          if (halftoneSaveGenerationRef.current.get(localId) !== generation) {
            return;
          }
          updateRow(localId, {
            halftoneResponseDraft: value,
            halftoneResponseConfirmed: value,
            halftoneResponseSaving: false,
            halftoneResponseError: null,
          });
        })
        .catch((error: unknown) => {
          if (halftoneSaveGenerationRef.current.get(localId) !== generation) {
            return;
          }
          // Keep the optimistic selection so Retry can resend it; server remains authoritative on attach.
          updateRow(localId, {
            halftoneResponseDraft: value,
            halftoneResponseSaving: false,
            halftoneResponseError:
              error instanceof Error ? error.message : 'Unable to save halftone selection.',
          });
        });
    },
    [updateRow],
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    setRows([]);
    setBatchId(null);
    setOwnershipConfirmed(false);
    setCatalogUseAcknowledged(!isDonation);
    setBannerError(null);
    setBatchNotes([]);
    if (firebaseUser) {
      customerUploadService.clearSession(firebaseUser.uid);
    }
  }, [firebaseUser, isDonation]);

  // Recover from refresh / leave without submit: hard-delete leftover session uploads so
  // donation day quota is restored for charged-but-unconfirmed ready items. Delayed so React
  // Strict Mode remounts / in-panel state restore are not raced.
  useEffect(() => {
    if (!firebaseUser) {
      return;
    }
    const session = customerUploadService.loadSession(firebaseUser.uid);
    if (!session || session.uploadIds.length === 0) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      const stillActive = rowsRef.current.some(
        (row) => row.uploadId && session.uploadIds.includes(row.uploadId),
      );
      if (stillActive || rowsRef.current.length > 0) {
        return;
      }
      void (async () => {
        await Promise.allSettled(
          session.uploadIds.map(async (uploadId) => {
            await customerUploadService.deleteOwnUpload(uploadId);
          }),
        );
        if (cancelled) {
          return;
        }
        customerUploadService.clearSession(firebaseUser.uid);
        customerUploadService.invalidateDailyQuota();
      })();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [firebaseUser]);

  return {
    rows: activeRows,
    batchId,
    purpose,
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
    abandonUnconfirmedUploads,
    retryFailed,
    attachToRequest,
    submitDonation,
    respondToHalftone,
    reset,
  };
}
