'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { buildCatalogSelectionHref } from '../utils/catalogSelectionNavigation';

interface UsePrintRequestCreationFlowOptions {
  continuableRequests: PrintRequest[];
  createPrintRequest: (notes?: string) => Promise<{ printRequestId: string }>;
}

export function usePrintRequestCreationFlow({
  continuableRequests,
  createPrintRequest,
}: UsePrintRequestCreationFlowOptions) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const navigateToContinue = useCallback(() => {
    if (continuableRequests.length === 1) {
      router.push(`/requests/${continuableRequests[0]!.id}`);
      return;
    }

    router.push('/requests?tab=working');
  }, [continuableRequests, router]);

  const createAndGoToSelection = useCallback(async () => {
    setIsCreating(true);
    setActionError(null);

    try {
      const created = await createPrintRequest();
      router.replace(buildCatalogSelectionHref(created.printRequestId));
      setIsChoiceModalOpen(false);
      setIsConfirmModalOpen(false);
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Unable to create print request.');
    } finally {
      setIsCreating(false);
    }
  }, [createPrintRequest, router]);

  const openStartNewConfirm = useCallback(() => {
    setActionError(null);
    setIsConfirmModalOpen(true);
  }, []);

  const handleStartRequestClick = useCallback(() => {
    setActionError(null);

    if (continuableRequests.length > 0) {
      setIsChoiceModalOpen(true);
      return;
    }

    openStartNewConfirm();
  }, [continuableRequests.length, openStartNewConfirm]);

  const handleStartNewRequest = useCallback(() => {
    setIsChoiceModalOpen(false);
    openStartNewConfirm();
  }, [openStartNewConfirm]);

  const confirmStartNewRequest = useCallback(() => {
    void createAndGoToSelection();
  }, [createAndGoToSelection]);

  const handleContinueWorkingRequest = useCallback(() => {
    setIsChoiceModalOpen(false);
    navigateToContinue();
  }, [navigateToContinue]);

  const closeChoiceModal = useCallback(() => {
    if (!isCreating) {
      setIsChoiceModalOpen(false);
    }
  }, [isCreating]);

  const closeConfirmModal = useCallback(() => {
    if (!isCreating) {
      setIsConfirmModalOpen(false);
    }
  }, [isCreating]);

  return {
    actionError,
    closeChoiceModal,
    closeConfirmModal,
    confirmStartNewRequest,
    handleContinueWorkingRequest,
    handleStartRequestClick,
    handleStartNewRequest,
    isChoiceModalOpen,
    isConfirmModalOpen,
    isCreating,
  };
}
