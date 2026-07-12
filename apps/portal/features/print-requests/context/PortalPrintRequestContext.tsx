'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PortalPrintRequestListTab } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import type { PrintRequestAllocationTotals } from '@fresh-prints/shared/utils/showAllocationTotals';
import type { PrintRequestItemSummary } from '@fresh-prints/shared/utils/printRequestItemSummaries';

import { PortalStartPrintRequestModal } from '../../shared/components/PortalStartPrintRequestModal';
import { useMyPrintRequests } from '../hooks/useMyPrintRequests';
import { usePrintRequestCreationFlow } from '../hooks/usePrintRequestCreationFlow';
import type { PortalRequestDetailFrom } from '../utils/portalRequestDetailReturn';

interface PortalPrintRequestContextValue {
  actionError: string | null;
  allocationTotalsByRequestId: Record<string, PrintRequestAllocationTotals>;
  continuableRequests: PrintRequest[];
  createPrintRequest: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
  error: string | null;
  finishCreating: () => void;
  handleStartRequestClick: (options?: { from?: PortalRequestDetailFrom | null }) => void;
  isCreating: boolean;
  isLoading: boolean;
  refreshRequests: (options?: { silent?: boolean }) => Promise<void>;
  requests: PrintRequest[];
  requestsByTab: Record<PortalPrintRequestListTab, PrintRequest[]>;
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
}

const PortalPrintRequestContext = createContext<PortalPrintRequestContextValue | null>(null);

export function PortalPrintRequestProvider({ children }: { children: ReactNode }) {
  const printRequests = useMyPrintRequests();
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

  const value: PortalPrintRequestContextValue = {
    actionError,
    allocationTotalsByRequestId: printRequests.allocationTotalsByRequestId,
    continuableRequests: printRequests.continuableRequests,
    createPrintRequest: printRequests.createPrintRequest,
    error: printRequests.error,
    finishCreating,
    handleStartRequestClick,
    isCreating,
    isLoading: printRequests.isLoading,
    refreshRequests: printRequests.reload,
    requests: printRequests.requests,
    requestsByTab: printRequests.requestsByTab,
    summariesByRequestId: printRequests.summariesByRequestId,
  };

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
