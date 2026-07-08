'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PortalPrintRequestListTab } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import type { PrintRequestAllocationTotals } from '@fresh-prints/shared/utils/showAllocationTotals';
import type { PrintRequestItemSummary } from '@fresh-prints/shared/utils/printRequestItemSummaries';

import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { PortalWorkingRequestChoiceModal } from '../../shared/components/PortalWorkingRequestChoiceModal';
import { useMyPrintRequests } from '../hooks/useMyPrintRequests';
import { usePrintRequestCreationFlow } from '../hooks/usePrintRequestCreationFlow';

interface PortalPrintRequestContextValue {
  actionError: string | null;
  allocationTotalsByRequestId: Record<string, PrintRequestAllocationTotals>;
  continuableRequests: PrintRequest[];
  error: string | null;
  finishCreating: () => void;
  handleStartRequestClick: () => void;
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
    closeChoiceModal,
    closeConfirmModal,
    confirmStartNewRequest,
    finishCreating,
    handleContinueWorkingRequest,
    handleStartRequestClick,
    handleStartNewRequest,
    isChoiceModalOpen,
    isConfirmModalOpen,
    isCreating,
  } = usePrintRequestCreationFlow({
    continuableRequests: printRequests.continuableRequests,
    createPrintRequest: printRequests.createPrintRequest,
  });

  const value: PortalPrintRequestContextValue = {
    actionError,
    allocationTotalsByRequestId: printRequests.allocationTotalsByRequestId,
    continuableRequests: printRequests.continuableRequests,
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
      <PortalWorkingRequestChoiceModal
        continuableRequests={printRequests.continuableRequests}
        isCreating={isCreating}
        isOpen={isChoiceModalOpen}
        onClose={closeChoiceModal}
        onContinue={handleContinueWorkingRequest}
        onStartNew={handleStartNewRequest}
      />
      <PortalConfirmModal
        confirmLabel={isCreating ? 'Starting…' : 'Start request'}
        isConfirmLoading={isCreating}
        isOpen={isConfirmModalOpen}
        onCancel={closeConfirmModal}
        onConfirm={() => void confirmStartNewRequest()}
        title="Start a new print request?"
      >
        <p className="portal-muted portal-confirm-modal-message">
          Starting a request will activate selection mode to browse designs and set quantities. Your choices are
          saved to a new request, which can later be added to a show&apos;s print run.
        </p>
      </PortalConfirmModal>
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
