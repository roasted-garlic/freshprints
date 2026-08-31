'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import type { PortalCustomerShowSchedule } from '@fresh-prints/shared/utils/portalCustomerShowSchedule';
import type { CurrentRequestAggregates } from '@fresh-prints/shared/utils/currentRequestAggregates';
import {
  filterLegacyContinuablePrintRequests,
  filterPortalEditableContinuablePrintRequests,
  selectPortalWorkingPrintRequest,
} from '@fresh-prints/shared/utils/portalPrintRequestEditability';

import { PortalStartPrintRequestModal } from '../../shared/components/PortalStartPrintRequestModal';
import { useMyPrintRequests } from '../hooks/useMyPrintRequests';
import {
  usePortalWorkingRequestLimitState,
  type PortalWorkingRequestLimitState,
} from '../hooks/usePortalWorkingRequestLimitState';
import { usePrintRequestCreationFlow } from '../hooks/usePrintRequestCreationFlow';
import { useWorkingCurrentRequestItems } from '../hooks/useWorkingCurrentRequestItems';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import type { PortalRequestDetailFrom } from '../utils/portalRequestDetailReturn';
import type { CustomerUploadDocSummary } from '../../customer-uploads/services/customerUploadService';
import type { PortalRequestDesignSummary } from '../hooks/useWorkingCurrentRequestItems';

interface PortalPrintRequestContextValue {
  actionError: string | null;
  allocationTotalsByRequestId: Record<string, PrintRequestAllocationTotals>;
  schedulesByRequestId: Record<string, PortalCustomerShowSchedule[]>;
  /** Aggregates for the working Current Request (includes optimistic first-add items). */
  currentRequestAggregates: CurrentRequestAggregates;
  /** True when authenticated customer has no working Firestore request yet. */
  isVirtualEmptyCurrentRequest: boolean;
  /** All draft/editing requests for this customer (including legacy Studio drafts). */
  continuableRequests: PrintRequest[];
  /** Draft/editing requests the Portal may mutate (portal_customer, non-internal). */
  portalEditableContinuableRequests: PrintRequest[];
  /** Continuable Studio/legacy requests that cannot be edited from Portal. */
  legacyContinuableRequests: PrintRequest[];
  /** Explicit working-request selection when multiple Portal-editable drafts exist. */
  selectedWorkingRequestId: string | null;
  setSelectedWorkingRequestId: (printRequestId: string | null) => void;
  createPrintRequest: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
  /**
   * Shared create-or-reuse for the single working Current Request.
   * Concurrent callers await the same in-flight create; after success the id is
   * cached until the list catches up so rapid adds never trigger a second create.
   */
  ensureWorkingPrintRequestId: () => Promise<string>;
  error: string | null;
  finishCreating: () => void;
  handleStartRequestClick: (options?: { from?: PortalRequestDetailFrom | null }) => void;
  isCreating: boolean;
  /** True while the shared ensureWorkingPrintRequestId create callable is in flight. */
  isEnsuringWorkingRequest: boolean;
  isCurrentRequestDrawerOpen: boolean;
  isLoading: boolean;
  isLoadingCurrentRequestItems: boolean;
  openCurrentRequestDrawer: () => void;
  closeCurrentRequestDrawer: () => void;
  /** Immediate local item patch for snappy qty/remove UI; reconcile with reloadWorkingItems. */
  patchWorkingItems: Dispatch<SetStateAction<PrintRequestItem[]>>;
  /**
   * Mark item ids as optimistically removed so silent list reloads cannot resurrect them
   * while concurrent removes are still in flight.
   */
  beginPendingItemRemovals: (itemIds: string[]) => void;
  /** Clear pending-remove marks after the callable settles (success or error rollback). */
  endPendingItemRemovals: (itemIds: string[]) => void;
  /**
   * Working request id known locally before list reload (create just succeeded).
   * Lets add-flow treat branch as "single" during the list lag window.
   */
  pendingWorkingRequestId: string | null;
  /** Seed drawer title/thumb from a known catalog design before Firestore summaries load. */
  seedDesignSummary: (
    designId: string,
    summary: PortalRequestDesignSummary,
  ) => void;
  /** Fetch any missing design summaries for Current Request chrome. */
  ensureDesignSummaries: (designIds: string[]) => Promise<void>;
  /** Empty Current Request items; keeps the same open draft/editing request. */
  clearWorkingRequest: () => Promise<void>;
  /** Empty items on any open draft/editing request (detail page, continuable requests). */
  clearPrintRequestItems: (printRequestId: string) => Promise<void>;
  isClearingWorkingRequest: boolean;
  /** Shared working-request limit for disable gates and situational errors. */
  workingRequestLimit: PortalWorkingRequestLimitState;
  refreshRequests: (options?: {
    silent?: boolean;
    printRequestId?: string;
    /** Skip items fetch — use after create-path flushes that already patched local cart. */
    skipWorkingItems?: boolean;
  }) => Promise<void>;
  reloadWorkingItems: (options?: { silent?: boolean; printRequestId?: string }) => Promise<void>;
  /** Immediate local cart clear (e.g. after queue-to-show before list reload finishes). */
  resetWorkingCart: () => void;
  reconcileQueuedRequest: (
    printRequestId: string,
    allocationResult?: { totalAllocatedQuantity: number },
  ) => void;
  requests: PrintRequest[];
  requestsByTab: Record<PortalPrintRequestListTab, PrintRequest[]>;
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  uploadSummariesById: Map<string, CustomerUploadDocSummary | null>;
  designSummariesById: Map<
    string,
    PortalRequestDesignSummary
  >;
  /** The single working request, or null when virtual empty. */
  workingRequest: PrintRequest | null;
  workingItems: PrintRequestItem[];
}

const PortalPrintRequestContext = createContext<PortalPrintRequestContextValue | null>(null);

const SELECTED_WORKING_REQUEST_STORAGE_KEY = 'portal.selectedWorkingRequestId';

export function PortalPrintRequestProvider({ children }: { children: ReactNode }) {
  const printRequests = useMyPrintRequests();
  const createPrintRequest = printRequests.createPrintRequest;
  const [isCurrentRequestDrawerOpen, setIsCurrentRequestDrawerOpen] = useState(false);
  const [isClearingWorkingRequest, setIsClearingWorkingRequest] = useState(false);
  const [isEnsuringWorkingRequest, setIsEnsuringWorkingRequest] = useState(false);
  const [pendingWorkingRequestId, setPendingWorkingRequestId] = useState<string | null>(null);
  const [selectedWorkingRequestId, setSelectedWorkingRequestIdState] = useState<string | null>(
    () => {
      if (typeof window === 'undefined') {
        return null;
      }
      return window.sessionStorage.getItem(SELECTED_WORKING_REQUEST_STORAGE_KEY);
    },
  );
  /** In-flight create shared across all catalog/favorites add callers. */
  const ensureWorkingPromiseRef = useRef<Promise<string> | null>(null);
  /** Survives after create resolves until list reload exposes the working request. */
  const ensuredWorkingRequestIdRef = useRef<string | null>(null);

  const allContinuableRequests = printRequests.continuableRequests;
  const portalEditableContinuableRequests = useMemo(
    () => filterPortalEditableContinuablePrintRequests(allContinuableRequests),
    [allContinuableRequests],
  );
  const legacyContinuableRequests = useMemo(
    () => filterLegacyContinuablePrintRequests(allContinuableRequests),
    [allContinuableRequests],
  );

  const setSelectedWorkingRequestId = useCallback((printRequestId: string | null) => {
    setSelectedWorkingRequestIdState(printRequestId);
    if (typeof window === 'undefined') {
      return;
    }
    if (printRequestId) {
      window.sessionStorage.setItem(SELECTED_WORKING_REQUEST_STORAGE_KEY, printRequestId);
    } else {
      window.sessionStorage.removeItem(SELECTED_WORKING_REQUEST_STORAGE_KEY);
    }
  }, []);

  const workingRequest = useMemo(
    () =>
      selectPortalWorkingPrintRequest(
        portalEditableContinuableRequests,
        selectedWorkingRequestId,
      ),
    [portalEditableContinuableRequests, selectedWorkingRequestId],
  );

  useEffect(() => {
    if (!selectedWorkingRequestId) {
      return;
    }

    const stillValid = portalEditableContinuableRequests.some(
      (request) => request.id === selectedWorkingRequestId,
    );
    if (!stillValid) {
      setSelectedWorkingRequestId(null);
    }
  }, [portalEditableContinuableRequests, selectedWorkingRequestId, setSelectedWorkingRequestId]);

  const isVirtualEmptyCurrentRequest =
    !printRequests.isLoading && portalEditableContinuableRequests.length === 0;

  const clearEnsuredWorkingRequest = useCallback(() => {
    ensuredWorkingRequestIdRef.current = null;
    ensureWorkingPromiseRef.current = null;
    setPendingWorkingRequestId(null);
    setIsEnsuringWorkingRequest(false);
  }, []);

  // Prefer list truth once it catches up; drop local pending id.
  useEffect(() => {
    if (workingRequest?.id) {
      ensuredWorkingRequestIdRef.current = workingRequest.id;
      setPendingWorkingRequestId(null);
    }
  }, [workingRequest?.id]);

  const {
    workingItems,
    designSummaries,
    uploadSummaries,
    aggregates,
    isLoadingItems,
    hydratedWorkingRequestId,
    beginPendingItemRemovals,
    discardPendingWorkingItemLoads,
    endPendingItemRemovals,
    ensureDesignSummaries,
    patchWorkingItems,
    seedDesignSummary,
    reloadWorkingItems,
    resetWorkingCart: resetWorkingCartItems,
  } = useWorkingCurrentRequestItems(workingRequest);

  const workingRequestLimit = usePortalWorkingRequestLimitState(workingItems, {
    isRequestsLoading: printRequests.isLoading,
    isItemsLoading: isLoadingItems,
    workingRequestId: workingRequest?.id ?? null,
    hydratedWorkingRequestId,
  });

  const resetWorkingCart = useCallback(() => {
    clearEnsuredWorkingRequest();
    resetWorkingCartItems();
  }, [clearEnsuredWorkingRequest, resetWorkingCartItems]);

  const ensureWorkingPrintRequestId = useCallback(async (): Promise<string> => {
    if (workingRequest?.id) {
      ensuredWorkingRequestIdRef.current = workingRequest.id;
      return workingRequest.id;
    }

    if (ensuredWorkingRequestIdRef.current) {
      return ensuredWorkingRequestIdRef.current;
    }

    if (ensureWorkingPromiseRef.current) {
      return ensureWorkingPromiseRef.current;
    }

    setIsEnsuringWorkingRequest(true);
    const createPromise = createPrintRequest(undefined, { skipListReload: true })
      .then((created) => {
        ensuredWorkingRequestIdRef.current = created.printRequestId;
        setPendingWorkingRequestId(created.printRequestId);
        return created.printRequestId;
      })
      .catch((error: unknown) => {
        ensuredWorkingRequestIdRef.current = null;
        setPendingWorkingRequestId(null);
        throw error;
      })
      .finally(() => {
        ensureWorkingPromiseRef.current = null;
        setIsEnsuringWorkingRequest(false);
      });

    ensureWorkingPromiseRef.current = createPromise;
    return createPromise;
  }, [createPrintRequest, workingRequest?.id]);

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
    continuableRequests: portalEditableContinuableRequests,
    createPrintRequest: printRequests.createPrintRequest,
    ensureWorkingPrintRequestId,
  });

  const reloadRequests = printRequests.reload;
  const reconcileClearedRequest = printRequests.reconcileClearedRequest;

  const refreshRequests = useCallback(
    async (options?: {
      silent?: boolean;
      printRequestId?: string;
      skipWorkingItems?: boolean;
    }) => {
      await reloadRequests(options);
      if (options?.skipWorkingItems) {
        return;
      }
      // Only force a specific request id when callers pass it (first create).
      // After queue-to-show, workingRequestIdRef is already cleared via resetWorkingCart /
      // the working-request effect — do not reload the just-queued request into Stash.
      await reloadWorkingItems({
        silent: true,
        ...(options?.printRequestId ? { printRequestId: options.printRequestId } : {}),
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

  const clearPrintRequestItems = useCallback(
    async (printRequestId: string) => {
      const clearedRequestId = printRequestId.trim();
      if (!clearedRequestId || isClearingWorkingRequest) {
        return;
      }

      setIsClearingWorkingRequest(true);
      try {
        const result = await portalPrintRequestService.clearWorkingPrintRequest(clearedRequestId);
        // Keep ensure cache + pending id so next Add reuses this request during list lag.
        // Do not call resetWorkingCart() — that clears the id (queue-to-show only).
        ensuredWorkingRequestIdRef.current = clearedRequestId;
        setPendingWorkingRequestId(clearedRequestId);
        if (workingRequest?.id === clearedRequestId) {
          // Post-clear state is fully known from the callable: reconcile locally with zero refetch
          // reads, and invalidate any pre-clear in-flight item load so a late resolve cannot
          // resurrect the cleared rows (owner live-test evidence: cart/detail stayed full until a
          // browser refresh — the 30s read cache had been serving the pre-clear items back to the
          // silent reloads this block previously awaited).
          discardPendingWorkingItemLoads();
          patchWorkingItems([]);
        }
        reconcileClearedRequest(clearedRequestId, result.status);
      } finally {
        setIsClearingWorkingRequest(false);
      }
    },
    [
      discardPendingWorkingItemLoads,
      isClearingWorkingRequest,
      patchWorkingItems,
      reconcileClearedRequest,
      workingRequest?.id,
    ],
  );

  const clearWorkingRequest = useCallback(async () => {
    if (!workingRequest) {
      return;
    }

    await clearPrintRequestItems(workingRequest.id);
    setIsCurrentRequestDrawerOpen(false);
  }, [clearPrintRequestItems, workingRequest]);

  const value: PortalPrintRequestContextValue = useMemo(
    () => ({
      actionError,
      allocationTotalsByRequestId: printRequests.allocationTotalsByRequestId,
      schedulesByRequestId: printRequests.schedulesByRequestId,
      currentRequestAggregates: aggregates,
      isVirtualEmptyCurrentRequest,
      continuableRequests: allContinuableRequests,
      portalEditableContinuableRequests,
      legacyContinuableRequests,
      selectedWorkingRequestId,
      setSelectedWorkingRequestId,
      createPrintRequest: printRequests.createPrintRequest,
      ensureWorkingPrintRequestId,
      clearWorkingRequest,
      clearPrintRequestItems,
      isClearingWorkingRequest,
      isEnsuringWorkingRequest,
      pendingWorkingRequestId,
      workingRequestLimit,
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
      beginPendingItemRemovals,
      endPendingItemRemovals,
      seedDesignSummary,
      ensureDesignSummaries,
      refreshRequests,
      reloadWorkingItems,
      resetWorkingCart,
      reconcileQueuedRequest: printRequests.reconcileQueuedRequest,
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
      beginPendingItemRemovals,
      clearWorkingRequest,
      clearPrintRequestItems,
      closeCurrentRequestDrawer,
      designSummaries,
      endPendingItemRemovals,
      ensureWorkingPrintRequestId,
      finishCreating,
      handleStartRequestClick,
      isClearingWorkingRequest,
      isCreating,
      isCurrentRequestDrawerOpen,
      isEnsuringWorkingRequest,
      isLoadingItems,
      isVirtualEmptyCurrentRequest,
      openCurrentRequestDrawer,
      patchWorkingItems,
      pendingWorkingRequestId,
      seedDesignSummary,
      ensureDesignSummaries,
      printRequests.allocationTotalsByRequestId,
      printRequests.schedulesByRequestId,
      allContinuableRequests,
      portalEditableContinuableRequests,
      legacyContinuableRequests,
      selectedWorkingRequestId,
      setSelectedWorkingRequestId,
      printRequests.createPrintRequest,
      printRequests.error,
      printRequests.isLoading,
      printRequests.requests,
      printRequests.requestsByTab,
      printRequests.reconcileQueuedRequest,
      printRequests.summariesByRequestId,
      refreshRequests,
      reloadWorkingItems,
      resetWorkingCart,
      uploadSummaries,
      workingItems,
      workingRequest,
      workingRequestLimit,
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
