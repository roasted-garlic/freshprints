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
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Unable to create print request.');
    } finally {
      setIsCreating(false);
    }
  }, [createPrintRequest, router]);

  const handleStartRequestClick = useCallback(() => {
    setActionError(null);

    if (continuableRequests.length > 0) {
      setIsChoiceModalOpen(true);
      return;
    }

    void createAndGoToSelection();
  }, [continuableRequests.length, createAndGoToSelection]);

  const handleContinueWorkingRequest = useCallback(() => {
    setIsChoiceModalOpen(false);
    navigateToContinue();
  }, [navigateToContinue]);

  const closeChoiceModal = useCallback(() => {
    if (!isCreating) {
      setIsChoiceModalOpen(false);
    }
  }, [isCreating]);

  return {
    actionError,
    closeChoiceModal,
    handleContinueWorkingRequest,
    handleStartRequestClick,
    handleStartNewRequest: createAndGoToSelection,
    isChoiceModalOpen,
    isCreating,
  };
}
