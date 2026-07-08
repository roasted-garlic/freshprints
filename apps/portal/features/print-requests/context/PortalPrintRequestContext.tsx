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
  handleStartRequestClick: () => void;
  isCreating: boolean;
  isLoading: boolean;
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
    handleStartRequestClick,
    isCreating,
    isLoading: printRequests.isLoading,
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
          You will be taken to the design library to choose designs and set quantities.
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
