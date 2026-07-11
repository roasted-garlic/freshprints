'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { shouldBlockPortalPrintRequestCreate } from '@fresh-prints/shared/utils/portalOneWorkingPrintRequest';

import { buildCatalogSelectionHref } from '../utils/catalogSelectionNavigation';

interface UsePrintRequestCreationFlowOptions {
  continuableRequests: PrintRequest[];
  createPrintRequest: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
}

export function usePrintRequestCreationFlow({
  continuableRequests,
  createPrintRequest,
}: UsePrintRequestCreationFlowOptions) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const navigateToContinue = useCallback(() => {
    if (continuableRequests.length === 1) {
      router.push(buildCatalogSelectionHref(continuableRequests[0]!.id));
      return;
    }

    router.push('/requests?tab=working');
  }, [continuableRequests, router]);

  const createAndGoToSelection = useCallback(async () => {
    setIsCreating(true);
    setActionError(null);

    try {
      const created = await createPrintRequest(undefined, { skipListReload: true });
      router.replace(buildCatalogSelectionHref(created.printRequestId));
      setIsConfirmModalOpen(false);
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Unable to create print request.');
      setIsCreating(false);
    }
  }, [createPrintRequest, router]);

  const finishCreating = useCallback(() => {
    setIsCreating(false);
  }, []);

  const openStartNewConfirm = useCallback(() => {
    setActionError(null);
    setIsConfirmModalOpen(true);
  }, []);

  const handleStartRequestClick = useCallback(() => {
    setActionError(null);

    if (shouldBlockPortalPrintRequestCreate(continuableRequests.length)) {
      navigateToContinue();
      return;
    }

    openStartNewConfirm();
  }, [continuableRequests.length, navigateToContinue, openStartNewConfirm]);

  const confirmStartNewRequest = useCallback(() => {
    void createAndGoToSelection();
  }, [createAndGoToSelection]);

  const closeConfirmModal = useCallback(() => {
    if (!isCreating) {
      setIsConfirmModalOpen(false);
    }
  }, [isCreating]);

  return {
    actionError,
    closeConfirmModal,
    confirmStartNewRequest,
    finishCreating,
    handleStartRequestClick,
    isConfirmModalOpen,
    isCreating,
  };
}
