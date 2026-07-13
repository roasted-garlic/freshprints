'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PortalPrintRequestListTab } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import type { PrintRequestAllocationTotals } from '@fresh-prints/shared/utils/showAllocationTotals';
import type { PrintRequestItemSummary } from '@fresh-prints/shared/utils/printRequestItemSummaries';
import type { CurrentRequestAggregates } from '@fresh-prints/shared/utils/currentRequestAggregates';

import { PortalStartPrintRequestModal } from '../../shared/components/PortalStartPrintRequestModal';
import { useMyPrintRequests } from '../hooks/useMyPrintRequests';
import { usePrintRequestCreationFlow } from '../hooks/usePrintRequestCreationFlow';
import { useWorkingCurrentRequestItems } from '../hooks/useWorkingCurrentRequestItems';
import type { PortalRequestDetailFrom } from '../utils/portalRequestDetailReturn';
import type { CustomerUploadDocSummary } from '../../customer-uploads/services/customerUploadService';

interface PortalPrintRequestContextValue {
  actionError: string | null;
  allocationTotalsByRequestId: Record<string, PrintRequestAllocationTotals>;
  /** Aggregates for the working Current Request (virtual empty when none). */
  currentRequestAggregates: CurrentRequestAggregates;
  /** True when authenticated customer has no working Firestore request yet. */
  isVirtualEmptyCurrentRequest: boolean;
  continuableRequests: PrintRequest[];
  createPrintRequest: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
  error: string | null;
  finishCreating: () => void;
  handleStartRequestClick: (options?: { from?: PortalRequestDetailFrom | null }) => void;
  isCreating: boolean;
  isCurrentRequestDrawerOpen: boolean;
  isLoading: boolean;
  isLoadingCurrentRequestItems: boolean;
  openCurrentRequestDrawer: () => void;
  closeCurrentRequestDrawer: () => void;
  refreshRequests: (options?: { silent?: boolean }) => Promise<void>;
  reloadWorkingItems: (options?: { silent?: boolean }) => Promise<void>;
  requests: PrintRequest[];
  requestsByTab: Record<PortalPrintRequestListTab, PrintRequest[]>;
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  uploadSummariesById: Map<string, CustomerUploadDocSummary | null>;
  designSummariesById: Map<
    string,
    Awaited<ReturnType<typeof import('../services/portalPrintRequestService').portalPrintRequestService.getReadyDesign>>
  >;
  /** The single working request, or null when virtual empty. */
  workingRequest: PrintRequest | null;
  workingItems: PrintRequestItem[];
}

const EMPTY_AGGREGATES: CurrentRequestAggregates = {
  distinctDesignCount: 0,
  totalPrintQuantity: 0,
  quantityByDesignId: {},
  primaryItemIdByDesignId: {},
  primaryQuantityByDesignId: {},
  attentionItems: [],
  attentionCount: 0,
};

const PortalPrintRequestContext = createContext<PortalPrintRequestContextValue | null>(null);

export function PortalPrintRequestProvider({ children }: { children: ReactNode }) {
  const printRequests = useMyPrintRequests();
  const [isCurrentRequestDrawerOpen, setIsCurrentRequestDrawerOpen] = useState(false);

  const workingRequest = printRequests.continuableRequests[0] ?? null;
  const isVirtualEmptyCurrentRequest =
    !printRequests.isLoading && printRequests.continuableRequests.length === 0;

  const {
    workingItems,
    designSummaries,
    uploadSummaries,
    aggregates,
    isLoadingItems,
    reloadWorkingItems,
  } = useWorkingCurrentRequestItems(workingRequest);

  const {
    actionError,
    chooseStartPath,
    closeConfirmModal,
    confirmStartNewRequest,
    finishCreating,
    handleStartRequestClick,
    isConfirmModalOpen,
    isCreating,
    modalStep,
  } = usePrintRequestCreationFlow({
    continuableRequests: printRequests.continuableRequests,
    createPrintRequest: printRequests.createPrintRequest,
  });

  const reloadRequests = printRequests.reload;

  const refreshRequests = useCallback(
    async (options?: { silent?: boolean }) => {
      await reloadRequests(options);
      await reloadWorkingItems({ silent: true });
    },
    [reloadRequests, reloadWorkingItems],
  );

  const openCurrentRequestDrawer = useCallback(() => {
    setIsCurrentRequestDrawerOpen(true);
  }, []);

  const closeCurrentRequestDrawer = useCallback(() => {
    setIsCurrentRequestDrawerOpen(false);
  }, []);

  const value: PortalPrintRequestContextValue = useMemo(
    () => ({
      actionError,
      allocationTotalsByRequestId: printRequests.allocationTotalsByRequestId,
      currentRequestAggregates: workingRequest ? aggregates : EMPTY_AGGREGATES,
      isVirtualEmptyCurrentRequest,
      continuableRequests: printRequests.continuableRequests,
      createPrintRequest: printRequests.createPrintRequest,
      error: printRequests.error,
      finishCreating,
      handleStartRequestClick,
      isCreating,
      isCurrentRequestDrawerOpen,
      isLoading: printRequests.isLoading,
      isLoadingCurrentRequestItems: isLoadingItems,
      openCurrentRequestDrawer,
      closeCurrentRequestDrawer,
      refreshRequests,
      reloadWorkingItems,
      requests: printRequests.requests,
      requestsByTab: printRequests.requestsByTab,
      summariesByRequestId: printRequests.summariesByRequestId,
      uploadSummariesById: uploadSummaries,
      designSummariesById: designSummaries,
      workingRequest,
      workingItems,
    }),
    [
      actionError,
      aggregates,
      closeCurrentRequestDrawer,
      designSummaries,
      finishCreating,
      handleStartRequestClick,
      isCreating,
      isCurrentRequestDrawerOpen,
      isLoadingItems,
      isVirtualEmptyCurrentRequest,
      openCurrentRequestDrawer,
      printRequests.allocationTotalsByRequestId,
      printRequests.continuableRequests,
      printRequests.createPrintRequest,
      printRequests.error,
      printRequests.isLoading,
      printRequests.requests,
      printRequests.requestsByTab,
      printRequests.summariesByRequestId,
      refreshRequests,
      reloadWorkingItems,
      uploadSummaries,
      workingItems,
      workingRequest,
    ],
  );

  return (
    <PortalPrintRequestContext.Provider value={value}>
      {children}
      <PortalStartPrintRequestModal
        isCreating={isCreating}
        isOpen={isConfirmModalOpen}
        onCancel={closeConfirmModal}
        onChoosePath={chooseStartPath}
        onConfirmStart={confirmStartNewRequest}
        step={modalStep}
      />
    </PortalPrintRequestContext.Provider>
  );
}

export function usePortalPrintRequests(): PortalPrintRequestContextValue {
  const context = useContext(PortalPrintRequestContext);

  if (!context) {
    throw new Error('usePortalPrintRequests must be used within PortalPrintRequestProvider');
  }

  return context;
}
