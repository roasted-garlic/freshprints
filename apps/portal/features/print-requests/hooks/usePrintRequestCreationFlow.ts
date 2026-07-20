'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { shouldBlockPortalPrintRequestCreate } from '@fresh-prints/shared/utils/portalOneWorkingPrintRequest';

import {
  buildCatalogSelectionHref,
  buildRequestUploadHref,
} from '../utils/catalogSelectionNavigation';
import type { PortalRequestDetailFrom } from '../utils/portalRequestDetailReturn';
import type {
  PortalStartPrintRequestPath,
  PortalStartPrintRequestStep,
} from '../../shared/components/PortalStartPrintRequestModal';

interface UsePrintRequestCreationFlowOptions {
  continuableRequests: PrintRequest[];
  createPrintRequest: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
  /** Shared create mutex — prefer over raw createPrintRequest when starting a cart. */
  ensureWorkingPrintRequestId?: () => Promise<string>;
}

export function usePrintRequestCreationFlow({
  continuableRequests,
  createPrintRequest,
  ensureWorkingPrintRequestId,
}: UsePrintRequestCreationFlowOptions) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<PortalStartPrintRequestStep>('confirm');
  const [actionError, setActionError] = useState<string | null>(null);
  const returnFromRef = useRef<PortalRequestDetailFrom | null>(null);

  const navigateToContinue = useCallback(
    (from: PortalRequestDetailFrom | null) => {
      if (continuableRequests.length === 1) {
        router.push(
          buildCatalogSelectionHref(continuableRequests[0]!.id, {
            from: from ?? 'library',
          }),
        );
        return;
      }

      router.push('/requests?tab=working');
    },
    [continuableRequests, router],
  );

  const createAndGoToPath = useCallback(
    async (path: PortalStartPrintRequestPath) => {
      setIsCreating(true);
      setActionError(null);
      const from = returnFromRef.current;

      try {
        const printRequestId = ensureWorkingPrintRequestId
          ? await ensureWorkingPrintRequestId()
          : (await createPrintRequest(undefined, { skipListReload: true })).printRequestId;
        const href =
          path === 'upload'
            ? buildRequestUploadHref(printRequestId, { from })
            : buildCatalogSelectionHref(printRequestId, { from: from ?? 'library' });
        router.replace(href);
        setIsConfirmModalOpen(false);
        setModalStep('confirm');
        returnFromRef.current = null;
      } catch (createError) {
        setActionError(
          createError instanceof Error ? createError.message : 'Unable to create print request.',
        );
        setIsCreating(false);
      }
    },
    [createPrintRequest, ensureWorkingPrintRequestId, router],
  );

  const finishCreating = useCallback(() => {
    setIsCreating(false);
  }, []);

  const openStartNewConfirm = useCallback((from: PortalRequestDetailFrom | null) => {
    setActionError(null);
    returnFromRef.current = from;
    setModalStep('confirm');
    setIsConfirmModalOpen(true);
  }, []);

  const handleStartRequestClick = useCallback(
    (options?: { from?: PortalRequestDetailFrom | null }) => {
      setActionError(null);
      const from = options?.from ?? null;

      if (shouldBlockPortalPrintRequestCreate(continuableRequests.length)) {
        navigateToContinue(from);
        return;
      }

      openStartNewConfirm(from);
    },
    [continuableRequests.length, navigateToContinue, openStartNewConfirm],
  );

  const confirmStartNewRequest = useCallback(() => {
    setModalStep('choosePath');
  }, []);

  const chooseStartPath = useCallback(
    (path: PortalStartPrintRequestPath) => {
      void createAndGoToPath(path);
    },
    [createAndGoToPath],
  );

  const closeConfirmModal = useCallback(() => {
    if (!isCreating) {
      setIsConfirmModalOpen(false);
      setModalStep('confirm');
      returnFromRef.current = null;
    }
  }, [isCreating]);

  return {
    actionError,
    chooseStartPath,
    closeConfirmModal,
    confirmStartNewRequest,
    finishCreating,
    handleStartRequestClick,
    isConfirmModalOpen,
    isCreating,
    modalStep,
  };
}
