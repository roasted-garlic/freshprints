import { useCallback, useEffect, useRef, useState } from 'react';

import {
  portalAdminStaffArtworkService,
  validatePortalStaffArtworkFile,
} from '../services/portalAdminStaffArtworkService';
import type { PortalAdminStaffArtworkUploadItem } from '../types/portalAdminStaffArtwork.types';
import { createPortalStaffArtworkLocalItemId } from '../utils/portalAdminStaffArtworkUploadIds';

function localItemId(file: File): string {
  return createPortalStaffArtworkLocalItemId(file);
}

export function usePortalAdminStaffArtworkUpload() {
  const [items, setItems] = useState<PortalAdminStaffArtworkUploadItem[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const mountedRef = useRef(true);
  const processingRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    // React development Strict Mode runs an effect cleanup/setup cycle. Re-arm the guard on setup
    // so a valid file selection is not treated as an update to an unmounted hook after that cycle.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateItem = useCallback(
    (itemId: string, update: Partial<PortalAdminStaffArtworkUploadItem>) => {
      if (!mountedRef.current) return;
      setItems((current) =>
        current.map((item) => (item.id === itemId ? { ...item, ...update } : item)),
      );
    },
    [],
  );

  const addFiles = useCallback((files: File[]) => {
    const next: PortalAdminStaffArtworkUploadItem[] = [];
    const errors: string[] = [];
    for (const file of files) {
      const validationError = validatePortalStaffArtworkFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }
      next.push({
        id: localItemId(file),
        file,
        fileName: file.name,
        status: 'queued',
        progressPercent: 0,
      });
    }
    if (mountedRef.current) {
      setSelectionError(errors.length > 0 ? errors.join(' ') : null);
      if (next.length > 0) {
        setSuccessMessage(null);
        setItems((current) => [...current, ...next]);
      }
    }
  }, []);

  const processItem = useCallback(
    async (itemId: string): Promise<'ready' | 'failed' | 'skipped'> => {
      const item = itemsRef.current.find((candidate) => candidate.id === itemId);
      if (!item) return 'skipped';

      updateItem(itemId, { status: 'uploading', errorMessage: undefined, progressPercent: 0 });
      try {
        const result = await portalAdminStaffArtworkService.uploadFile(item.file, {
          staffArtworkId: item.staffArtworkId,
          onCreated: (staffArtworkId) => updateItem(itemId, { staffArtworkId }),
          onPhase: (phase) => updateItem(itemId, { status: phase }),
          onProgress: (progressPercent) => updateItem(itemId, { progressPercent }),
        });
        const status = result.status === 'ready' ? 'ready' : 'failed';
        updateItem(itemId, {
          status,
          progressPercent: 100,
          staffArtworkId: result.staffArtworkId,
          errorMessage: status === 'failed' ? result.errorMessage || 'Processing failed.' : undefined,
        });
        return status;
      } catch (error) {
        updateItem(itemId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Upload failed. Try again.',
        });
        return 'failed';
      }
    },
    [updateItem],
  );

  const processItems = useCallback(
    async (itemIds: string[]) => {
      if (processingRef.current || itemIds.length === 0) return;
      processingRef.current = true;
      setIsProcessing(true);
      let readyInBatch = 0;
      try {
        for (const itemId of itemIds) {
          const outcome = await processItem(itemId);
          if (outcome === 'ready') readyInBatch += 1;
        }
      } finally {
        processingRef.current = false;
        if (mountedRef.current) {
          setIsProcessing(false);
          if (readyInBatch > 0) {
            setSuccessMessage(
              `${readyInBatch} file${readyInBatch === 1 ? '' : 's'} ready in Studio Staff Artwork.`,
            );
            setItems((current) => current.filter((item) => item.status !== 'ready'));
          }
        }
      }
    },
    [processItem],
  );

  const startUpload = useCallback(() => {
    const queuedIds = itemsRef.current
      .filter((item) => item.status === 'queued')
      .map((item) => item.id);
    void processItems(queuedIds);
  }, [processItems]);

  const retryFailed = useCallback(() => {
    const failedIds = itemsRef.current
      .filter((item) => item.status === 'failed')
      .map((item) => item.id);
    if (mountedRef.current) {
      setItems((current) =>
        current.map((item) =>
          failedIds.includes(item.id) ? { ...item, status: 'queued', errorMessage: undefined } : item,
        ),
      );
    }
    void processItems(failedIds);
  }, [processItems]);

  const clearCompleted = useCallback(() => {
    setItems((current) => current.filter((item) => item.status !== 'ready'));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    if (!mountedRef.current) return;
    setItems((current) =>
      current.filter((item) => {
        if (item.id !== itemId) return true;
        // Only drop files that have not started or that already failed; in-flight/ready stay.
        return item.status !== 'queued' && item.status !== 'failed';
      }),
    );
  }, []);

  const clearAll = useCallback(() => {
    if (!mountedRef.current) return;
    // Keep in-flight uploads; drop queued, failed, and finished rows.
    setItems((current) =>
      current.filter((item) => item.status === 'uploading' || item.status === 'processing'),
    );
    setSelectionError(null);
    setSuccessMessage(null);
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setSelectionError(null);
    setSuccessMessage(null);
  }, []);

  const queuedCount = items.filter((item) => item.status === 'queued').length;
  const readyCount = items.filter((item) => item.status === 'ready').length;
  const failedCount = items.filter((item) => item.status === 'failed').length;
  const clearableCount = items.filter(
    (item) =>
      item.status === 'queued' || item.status === 'failed' || item.status === 'ready',
  ).length;

  return {
    addFiles,
    clearAll,
    clearCompleted,
    clearableCount,
    failedCount,
    isProcessing,
    items,
    queuedCount,
    readyCount,
    removeItem,
    reset,
    retryFailed,
    selectionError,
    startUpload,
    successMessage,
  };
}
