'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

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
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import type { PortalRequestDetailFrom } from '../utils/portalRequestDetailReturn';
import type { CustomerUploadDocSummary } from '../../customer-uploads/services/customerUploadService';

interface PortalPrintRequestContextValue {
  actionError: string | null;
  allocationTotalsByRequestId: Record<string, PrintRequestAllocationTotals>;
  /** Aggregates for the working Current Request (includes optimistic first-add items). */
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
  /** Immediate local item patch for snappy qty/remove UI; reconcile with reloadWorkingItems. */
  patchWorkingItems: Dispatch<SetStateAction<PrintRequestItem[]>>;
  /** Seed drawer title/thumb from a known catalog design before Firestore summaries load. */
  seedDesignSummary: (
    designId: string,
    summary: Awaited<
      ReturnType<typeof import('../services/portalPrintRequestService').portalPrintRequestService.getReadyDesign>
    >,
  ) => void;
  /** Fetch any missing design summaries for Current Request chrome. */
  ensureDesignSummaries: (designIds: string[]) => Promise<void>;
  /** Soft-archive Current Request (clears items) so a new cart can start. */
  clearWorkingRequest: () => Promise<void>;
  isClearingWorkingRequest: boolean;
  refreshRequests: (options?: { silent?: boolean; printRequestId?: string }) => Promise<void>;
  reloadWorkingItems: (options?: { silent?: boolean; printRequestId?: string }) => Promise<void>;
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

const PortalPrintRequestContext = createContext<PortalPrintRequestContextValue | null>(null);

export function PortalPrintRequestProvider({ children }: { children: ReactNode }) {
  const printRequests = useMyPrintRequests();
  const [isCurrentRequestDrawerOpen, setIsCurrentRequestDrawerOpen] = useState(false);
  const [isClearingWorkingRequest, setIsClearingWorkingRequest] = useState(false);

  const workingRequest = printRequests.continuableRequests[0] ?? null;
  const isVirtualEmptyCurrentRequest =
    !printRequests.isLoading && printRequests.continuableRequests.length === 0;

  const {
    workingItems,
    designSummaries,
    uploadSummaries,
    aggregates,
    isLoadingItems,
    ensureDesignSummaries,
    patchWorkingItems,
    seedDesignSummary,
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
    async (options?: { silent?: boolean; printRequestId?: string }) => {
      await reloadRequests(options);
      await reloadWorkingItems({
        silent: true,
        printRequestId: options?.printRequestId,
      });
    },
    [reloadRequests, reloadWorkingItems],
  );

  const openCurrentRequestDrawer = useCallback(() => {
    setIsCurrentRequestDrawerOpen(true);
  }, []);

  const closeCurrentRequestDrawer = useCallback(() => {
    setIsCurrentRequestDrawerOpen(false);
  }, []);

  const clearWorkingRequest = useCallback(async () => {
    if (!workingRequest || isClearingWorkingRequest) {
      return;
    }

    setIsClearingWorkingRequest(true);
    try {
      await portalPrintRequestService.clearWorkingPrintRequest(workingRequest.id);
      await reloadRequests({ silent: true });
      await reloadWorkingItems({ silent: true });
      setIsCurrentRequestDrawerOpen(false);
    } finally {
      setIsClearingWorkingRequest(false);
    }
  }, [isClearingWorkingRequest, reloadRequests, reloadWorkingItems, workingRequest]);

  const value: PortalPrintRequestContextValue = useMemo(
    () => ({
      actionError,
      allocationTotalsByRequestId: printRequests.allocationTotalsByRequestId,
      currentRequestAggregates: aggregates,
      isVirtualEmptyCurrentRequest,
      continuableRequests: printRequests.continuableRequests,
      createPrintRequest: printRequests.createPrintRequest,
      clearWorkingRequest,
      isClearingWorkingRequest,
      error: printRequests.error,
      finishCreating,
      handleStartRequestClick,
      isCreating,
      isCurrentRequestDrawerOpen,
      isLoading: printRequests.isLoading,
      isLoadingCurrentRequestItems: isLoadingItems,
      openCurrentRequestDrawer,
      closeCurrentRequestDrawer,
      patchWorkingItems,
      seedDesignSummary,
      ensureDesignSummaries,
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
      clearWorkingRequest,
      closeCurrentRequestDrawer,
      designSummaries,
      finishCreating,
      handleStartRequestClick,
      isClearingWorkingRequest,
      isCreating,
      isCurrentRequestDrawerOpen,
      isLoadingItems,
      isVirtualEmptyCurrentRequest,
      openCurrentRequestDrawer,
      patchWorkingItems,
      seedDesignSummary,
      ensureDesignSummaries,
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
