'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { derivePrintRequestListTab } from '@fresh-prints/shared/utils/printRequestListGrouping';
import {
  resolvePortalPrintRequestProgressLabel,
} from '@fresh-prints/shared/utils/printRequestConversion';
import {
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import {
  resolvePortalMountedProgressAuthority,
  resolvePortalPrintProgressStage,
  type PortalPrintProgressStage,
} from '@fresh-prints/shared/utils/portalPrintProgressStage';
import { formatPortalCustomerShowScheduleLabel } from '@fresh-prints/shared/utils/portalCustomerShowSchedule';
import { sumPrintRequestItemQuantities } from '@fresh-prints/shared/utils/portalShowQueueCapacity';
import {
  summarizePrintRequestPersistenceHealth,
  type PrintRequestItemPersistenceHealth,
} from '@fresh-prints/shared/utils/printRequestItemPersistenceHealth';
import {
  sumAllocatedQuantityByItemId,
  sumRemainingUnallocatedQuantity,
} from '@fresh-prints/shared/utils/portalShowQueueFit';
import { PortalPrintRequestItemCard } from '../../../../features/print-requests/components/PortalPrintRequestItemCard';
import { PortalPrintRequestProgressPanel } from '../../../../features/print-requests/components/PortalPrintRequestProgressPanel';
import { PortalPrintRequestScheduleSection } from '../../../../features/print-requests/components/PortalPrintRequestScheduleSection';
import {
  PortalQueueToShowModal,
  type PortalQueueToShowResult,
} from '../../../../features/print-requests/components/PortalQueueToShowModal';
import { PrintRequestDetailGuide } from '../../../../features/print-requests/components/PrintRequestDetailGuide';
import { usePortalPrintRequests } from '../../../../features/print-requests/context/PortalPrintRequestContext';
import { useAddDesignToRequestFlow } from '../../../../features/print-requests/hooks/useAddDesignToRequestFlow';
import { usePrintRequestDetail } from '../../../../features/print-requests/hooks/usePrintRequestDetail';
import { usePortalStandardPrintSizes } from '../../../../features/print-requests/hooks/usePortalStandardPrintSizes';
import { usePortalShowPrintProgress } from '../../../../features/print-requests/hooks/usePortalShowPrintProgress';
import { usePortalPrintRequestShowSchedules } from '../../../../features/print-requests/hooks/usePortalPrintRequestShowSchedules';
import {
  portalPrintRequestService,
  printRequestItemHasCustomerUpload,
} from '../../../../features/print-requests/services/portalPrintRequestService';
import { prefetchPortalAllocatableShows } from '../../../../features/print-requests/services/portalShowSelectionService';
import { buildCatalogLibraryHref, buildRequestArtworkHref } from '../../../../features/print-requests/utils/catalogSelectionNavigation';
import {
  parsePortalRequestDetailFrom,
  resolvePortalRequestDetailBack,
} from '../../../../features/print-requests/utils/portalRequestDetailReturn';
import { PortalConfirmModal } from '../../../../features/shared/components/PortalConfirmModal';
import { PortalPickContinuableRequestModal } from '../../../../features/shared/components/PortalPickContinuableRequestModal';
import { ArrowLeftIcon, CalendarPlusIcon, ImagePlusIcon, LibraryIcon, RefreshIcon } from '../../../../features/shared/components/PortalIcons';

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

interface AutosaveState {
  status: AutosaveStatus;
  message?: string;
  retry?: () => Promise<void>;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'editing':
      return 'Editing';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
}

export default function PrintRequestDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    allocationTotalsByRequestId,
    closeCurrentRequestDrawer,
    continuableRequests,
    createPrintRequest,
    refreshRequests,
    reloadWorkingItems,
    reconcileQueuedRequest,
    resetWorkingCart,
    summariesByRequestId,
  } = usePortalPrintRequests();
  const printRequestId = params.id;
  const [actionError, setActionError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({ status: 'idle' });
  const [itemPersistenceHealth, setItemPersistenceHealth] = useState<
    Record<string, PrintRequestItemPersistenceHealth>
  >({});
  const itemFlushersRef = useRef(new Map<string, () => Promise<boolean>>());
  const [isFlushingQueue, setIsFlushingQueue] = useState(false);
  const [unallocatedQuantity, setUnallocatedQuantity] = useState(0);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [itemPendingRemoval, setItemPendingRemoval] = useState<PrintRequestItem | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);
  /** Bumped per item id when remove confirm is cancelled so qty-0 input restores. */
  const [quantityResetKeys, setQuantityResetKeys] = useState<Record<string, number>>({});

  const {
    printRequest,
    items,
    designSummaries,
    uploadSummaries,
    isLoading,
    error,
    isEditable,
    updateItem,
    duplicateItem,
    getItemClientKey,
    removeItem,
    reconcileQueued,
  } = usePrintRequestDetail(printRequestId);
  const { settings: standardPrintSizesSettings } = usePortalStandardPrintSizes();

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    refreshRequests,
    reloadWorkingItems,
  });

  useEffect(() => {
    void prefetchPortalAllocatableShows();
  }, []);

  useEffect(() => {
    if (searchParams.get('upload') !== '1') {
      return;
    }

    if (isLoading || !printRequestId) {
      return;
    }

    const from = parsePortalRequestDetailFrom(searchParams.get('from'));
    router.replace(
      buildRequestArtworkHref({
        requestId: printRequestId,
        from,
      }),
    );
  }, [isLoading, printRequestId, router, searchParams]);

  // Queue success fully allocates the request and the handler already applies the authoritative
  // post-queue state locally (unallocated = 0). The status flip it causes must not re-run the
  // allocation query — that was the +N allocation reread the owner traced after queue success
  // (Wave C comprehensive-audit pass 2, 2026-07-25). One-shot suppression; explicit refresh and
  // fresh navigation stay authoritative.
  const skipAllocationLoadAfterQueueRef = useRef(false);

  const loadAllocationState = useCallback(async () => {
    if (!printRequestId) {
      setUnallocatedQuantity(0);
      return;
    }

    try {
      const allocations =
        await portalPrintRequestService.listShowAllocationsForPrintRequests([printRequestId]);
      const allocatedByItemId = sumAllocatedQuantityByItemId(
        allocations.map((allocation) => ({
          printRequestItemId: allocation.printRequestItemId,
          allocatedQuantity: allocation.allocatedQuantity,
          status: allocation.status,
        })),
      );
      setUnallocatedQuantity(sumRemainingUnallocatedQuantity(items, allocatedByItemId));
    } catch {
      setUnallocatedQuantity(sumPrintRequestItemQuantities(items));
    }
  }, [items, printRequestId]);

  useEffect(() => {
    if (skipAllocationLoadAfterQueueRef.current) {
      skipAllocationLoadAfterQueueRef.current = false;
      return;
    }
    void loadAllocationState();
  }, [loadAllocationState, printRequest?.status, printRequest?.itemCount, items]);

  const updateAutosaveState = useCallback(
    (status: Exclude<AutosaveStatus, 'idle'>, message?: string, retry?: () => Promise<void>) => {
      setAutosaveState({ status, message, retry });
    },
    [],
  );

  const handlePersistenceHealthChange = useCallback(
    (itemId: string, health: PrintRequestItemPersistenceHealth) => {
      setItemPersistenceHealth((current) =>
        current[itemId] === health ? current : { ...current, [itemId]: health },
      );
    },
    [],
  );

  const handleRegisterFlush = useCallback((itemId: string, flush: (() => Promise<boolean>) | null) => {
    if (flush) {
      itemFlushersRef.current.set(itemId, flush);
      return;
    }
    itemFlushersRef.current.delete(itemId);
  }, []);

  const persistenceSummary = summarizePrintRequestPersistenceHealth(itemPersistenceHealth);

  useEffect(() => {
    setAutosaveState({ status: 'idle' });
    setItemPersistenceHealth({});
  }, [printRequestId]);

  useEffect(() => {
    if (autosaveState.status !== 'saved') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAutosaveState({ status: 'idle' });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [autosaveState.status]);

  const handleUpdateItem = useCallback(
    async (
      item: PrintRequestItem,
      input: {
        quantity: number;
        printWidthInches: number;
        printHeightInches: number;
        standardSizePresetKey?: string | null;
      },
    ): Promise<{ quantity: number }> => {
      setActionError(null);
      // updateItem already synchronously reconciles both local items and shared workingItems
      // (patchWorkingItems) on success — a follow-up reloadWorkingItems here was a redundant,
      // unguarded server refetch that raced this reconciliation and could resurrect stale
      // pre-save data (owner runtime QA FAIL, Plan Section 19.1/19.2).
      // The server-accepted quantity is returned (not discarded) so the requesting
      // PortalPrintRequestItemCard can reconcile its own local draft directly on success
      // (Plan Section 21.4 point 1 — this middle layer must not silently drop the value).
      return updateItem(item.id, input);
    },
    [updateItem],
  );

  const handleDuplicateItem = useCallback(
    async (item: PrintRequestItem) => {
      setActionError(null);

      try {
        // duplicateItem already synchronously reconciles both local items and workingItems for
        // its optimistic insert and its real-id swap — no follow-up reload needed (Section 19.2).
        await duplicateItem(item.id);
      } catch (duplicateError) {
        setActionError(
          duplicateError instanceof Error ? duplicateError.message : 'Unable to duplicate item.',
        );
      }
    },
    [duplicateItem],
  );

  const handleRemoveItem = useCallback(
    async (item: PrintRequestItem) => {
      setActionError(null);
      setIsRemovingItem(true);

      try {
        // removeItem already synchronously filters both local items and workingItems on success
        // (plus its own beginPendingItemRemovals/endPendingItemRemovals guard) — no follow-up
        // reload needed; it was the actual source of the resurrection defect (Section 19.2).
        await removeItem(item.id);
        setItemPendingRemoval(null);
      } catch (removeError) {
        setActionError(removeError instanceof Error ? removeError.message : 'Unable to remove item.');
      } finally {
        setIsRemovingItem(false);
      }
    },
    [removeItem],
  );

  const pendingRemovalTitle =
    itemPendingRemoval?.titleSnapshot ||
    (itemPendingRemoval?.designId
      ? designSummaries.get(itemPendingRemoval.designId)?.title
      : undefined) ||
    (itemPendingRemoval?.customerUploadId
      ? uploadSummaries.get(itemPendingRemoval.customerUploadId)?.originalFilename
      : undefined) ||
    'this design';

  const totalPrintCount = useMemo(() => sumPrintRequestItemQuantities(items), [items]);

  const listTab = useMemo((): PortalPrintRequestListTab => {
    if (!printRequest) {
      return 'working';
    }

    const summary = summariesByRequestId[printRequest.id];
    const allocationTotals = allocationTotalsByRequestId[printRequest.id];

    return derivePrintRequestListTab({
      totalRequestedQuantity: summary?.totalQuantity ?? totalPrintCount,
      totalAllocatedQuantity: allocationTotals?.totalAllocatedQuantity ?? 0,
      totalInProgressQuantity: allocationTotals?.totalInProgressQuantity ?? 0,
      totalPrintedQuantity: allocationTotals?.totalPrintedQuantity ?? 0,
      status: printRequest.status,
    });
  }, [allocationTotalsByRequestId, printRequest, summariesByRequestId, totalPrintCount]);

  const returnFrom = parsePortalRequestDetailFrom(searchParams.get('from'));
  const { href: backHref, label: backLabel } = resolvePortalRequestDetailBack(returnFrom, listTab);
  const progressWatermarkRef = useRef<{
    printRequestId: string;
    stage: PortalPrintProgressStage | null;
  }>({ printRequestId, stage: null });
  if (progressWatermarkRef.current.printRequestId !== printRequestId) {
    progressWatermarkRef.current = { printRequestId, stage: null };
  }
  const persistedProgressStage = resolvePortalPrintProgressStage(listTab);
  const preLiveAuthority = resolvePortalMountedProgressAuthority(
    progressWatermarkRef.current.stage,
    persistedProgressStage,
  );
  const printProgress = usePortalShowPrintProgress(printRequestId, preLiveAuthority.pollingEnabled);
  const {
    reload: reloadRequestSchedules,
    schedules: requestSchedules,
  } = usePortalPrintRequestShowSchedules(printRequestId);
  const mountedAuthority = resolvePortalMountedProgressAuthority(
    preLiveAuthority.stage,
    persistedProgressStage,
    printProgress.primaryShow?.productionStatus,
  );
  const progressStage = mountedAuthority.stage;
  progressWatermarkRef.current.stage = progressStage;
  const scheduledShowEntries = useMemo(
    () =>
      requestSchedules.map((schedule) => ({
        id: schedule.upcomingShowId,
        label: formatPortalCustomerShowScheduleLabel(schedule),
      })),
    [requestSchedules],
  );
  const hasAttachedDesigns = items.length > 0;

  const handleQueuedToShow = useCallback(
    async (result: PortalQueueToShowResult) => {
      // Clear Stash immediately — list reload can otherwise re-hydrate the just-queued request.
      // Suppress the status-change allocation reread before reconciling: the request is now fully
      // allocated and unallocated quantity is authoritatively 0 from the callable outcome.
      skipAllocationLoadAfterQueueRef.current = true;
      reconcileQueued();
      // Pass the callable's own authoritative result through so allocationTotalsByRequestId is
      // patched locally (zero new reads) — this is what lets derivePrintRequestListTab return
      // 'queued' immediately, without waiting for the /requests or /dashboard 'full'-scope reload.
      reconcileQueuedRequest(printRequestId, {
        totalAllocatedQuantity: result.totalAllocatedQuantity,
      });
      void reloadRequestSchedules();
      setUnallocatedQuantity(0);
      resetWorkingCart();
      closeCurrentRequestDrawer();
    },
    [
      closeCurrentRequestDrawer,
      printRequestId,
      reconcileQueued,
      reconcileQueuedRequest,
      resetWorkingCart,
      reloadRequestSchedules,
    ],
  );

  if (isLoading) {
    return (
      <main className="portal-page portal-request-detail-page">
        <Link className="portal-request-detail-back" href="/requests?tab=working">
          <ArrowLeftIcon />
          Back to Print requests
        </Link>
        <div className="portal-panel portal-muted">Loading print request…</div>
      </main>
    );
  }

  if (error || !printRequest) {
    return (
      <main className="portal-page portal-request-detail-page">
        <Link className="portal-request-detail-back" href="/requests?tab=working">
          <ArrowLeftIcon />
          Back to Print requests
        </Link>
        <p className="portal-error" role="alert">
          {error ?? 'Print request not found.'}
        </p>
      </main>
    );
  }

  const designCountLabel = `${printRequest.itemCount} design${printRequest.itemCount === 1 ? '' : 's'}`;
  const printCountLabel = `${totalPrintCount} print${totalPrintCount === 1 ? '' : 's'}`;
  const canShowQueueCta = isEditable && items.length > 0 && unallocatedQuantity > 0;
  const canQueueToShow =
    canShowQueueCta && persistenceSummary.canOpenQueue && !isFlushingQueue;

  async function handleOpenQueueModal() {
    if (!persistenceSummary.canOpenQueue) {
      setActionError(persistenceSummary.blockReason);
      return;
    }
    if (persistenceSummary.needsFlush) {
      setIsFlushingQueue(true);
      try {
        const results = await Promise.all(
          [...itemFlushersRef.current.values()].map((flush) => flush()),
        );
        if (results.some((ok) => !ok)) {
          setActionError('Save item sizes before adding this request to a show.');
          return;
        }
      } finally {
        setIsFlushingQueue(false);
      }
    }
    setIsQueueModalOpen(true);
  }

  return (
    <main className="portal-page portal-request-detail-page">
      <Link className="portal-request-detail-back" href={backHref}>
        <ArrowLeftIcon />
        {backLabel}
      </Link>

      <header className="portal-page-header portal-request-detail-header">
        <div className="portal-request-detail-header-copy">
          <p className="portal-eyebrow">Print request</p>
          <div className="portal-request-detail-title-row">
            <h1 title={printRequest.name}>{printRequest.name}</h1>
            <div className="portal-request-detail-meta-pills">
              {!isEditable ? (
                <span className="portal-request-detail-meta-pill">
                  {resolvePortalPrintRequestProgressLabel({
                    closureKind: printRequest.closureKind,
                    status: printRequest.status,
                    defaultLabel: getStatusLabel(printRequest.status),
                  })}
                </span>
              ) : null}
              <span className="portal-request-detail-meta-pill">{designCountLabel}</span>
              <span className="portal-request-detail-meta-pill">{printCountLabel}</span>
            </div>
          </div>
          {isEditable && hasAttachedDesigns ? (
            <div className="portal-request-detail-show-hint">
              <p className="portal-muted">
                When your request is ready, add it to a show to have your prints included.
              </p>
            </div>
          ) : null}
        </div>

        {canShowQueueCta ? (
          <div className="portal-request-detail-header-actions">
            <button
              className="portal-button portal-button-primary portal-button-leading-icon portal-request-detail-show-cta"
              disabled={!canQueueToShow}
              onClick={() => void handleOpenQueueModal()}
              type="button"
            >
              <CalendarPlusIcon />
              Add Request to Whatnot Show
            </button>
            {!persistenceSummary.canOpenQueue && persistenceSummary.blockReason ? (
              <p className="portal-muted portal-request-detail-show-cta-hint" role="status">
                {persistenceSummary.blockReason}
              </p>
            ) : (
              <p className="portal-muted portal-request-detail-show-cta-hint">
                Final step: choose the show you want this request added to.
              </p>
            )}
          </div>
        ) : null}
      </header>

      {progressStage ? (
        <PortalPrintRequestProgressPanel
          activeStage={progressStage}
          isLive={printProgress.isRunning}
          isLoading={printProgress.isLoading}
          isPaused={printProgress.isPaused}
          scheduledShowEntries={scheduledShowEntries}
          showElapsed={
            progressStage === 'done'
              ? Boolean(printProgress.primaryShow) || printProgress.showElapsed
              : printProgress.showElapsed
          }
          waitingLabel={printProgress.statusHeadline}
        />
      ) : scheduledShowEntries.length > 0 ? (
        <section className="portal-panel" aria-label="Scheduled shows">
          <PortalPrintRequestScheduleSection entries={scheduledShowEntries} />
        </section>
      ) : null}

      {isEditable ? <PrintRequestDetailGuide /> : null}

      {actionError ? (
        <p className="portal-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {items.length === 0 ? (
        <section className="portal-panel portal-requests-empty">
          <h2>No designs yet</h2>
          <p className="portal-muted">
            {isEditable
              ? 'Upload your own artwork or browse the Design Library to add designs with quantities and print sizes.'
              : 'This request has no designs.'}
          </p>
          {isEditable ? (
            <div className="portal-requests-empty-actions">
              <Link
                className="portal-button portal-button-primary portal-button-leading-icon"
                href={buildRequestArtworkHref({
                  requestId: printRequest.id,
                  from: returnFrom ?? 'library',
                  returnTo: `/requests/${printRequest.id}${
                    searchParams.toString() ? `?${searchParams.toString()}` : ''
                  }`,
                })}
              >
                <ImagePlusIcon />
                Upload Designs
              </Link>
              <Link
                className="portal-button portal-button-secondary portal-button-leading-icon"
                href={buildCatalogLibraryHref()}
              >
                <LibraryIcon />
                Browse Design Library
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <section aria-label="Request items" className="portal-request-item-editor-grid">
          {items.map((item) => {
            const design = item.designId ? designSummaries.get(item.designId) : null;
            const upload = item.customerUploadId
              ? uploadSummaries.get(item.customerUploadId)
              : null;
            const catalogReuseDesign = !isEditable ? (design ?? null) : undefined;
            const isAddingThisDesign =
              Boolean(catalogReuseDesign) &&
              addDesignFlow.addingDesignId === catalogReuseDesign?.id;

            return (
              <PortalPrintRequestItemCard
                canAddPrints={addDesignFlow.canAddPrints}
                catalogReuseDesign={catalogReuseDesign}
                exhaustedHelperText={addDesignFlow.exhaustedHelperText}
                exhaustedStatusText={addDesignFlow.exhaustedStatusText}
                design={
                  design
                    ? {
                        id: design.id,
                        title: design.title,
                        width: design.width,
                        height: design.height,
                        thumbnailPath: design.thumbnailPath,
                        previewPath: design.previewPath,
                        artworkBackgroundHex: design.artworkBackgroundHex,
                        printWidthInches: design.printWidthInches,
                        printHeightInches: design.printHeightInches,
                        updatedAtMs: design.updatedAtMs,
                      }
                    : null
                }
                upload={
                  printRequestItemHasCustomerUpload(item)
                    ? {
                        title: upload?.originalFilename ?? item.titleSnapshot ?? 'Uploaded artwork',
                        previewPath: upload?.previewStoragePath,
                        thumbnailPath: upload?.thumbnailStoragePath,
                        widthPx: upload?.widthPx,
                        heightPx: upload?.heightPx,
                        printWidthInches: upload?.printWidthInches,
                        printHeightInches: upload?.printHeightInches,
                        approvedMaxPrintWidthInches: upload?.approvedMaxPrintWidthInches,
                        approvedMaxPrintHeightInches: upload?.approvedMaxPrintHeightInches,
                        wasUpscaled: upload?.wasUpscaled,
                        fromAssistedCreation: Boolean(upload?.assistedCreationRequestId),
                      }
                    : null
                }
                isAddingToRequest={isAddingThisDesign}
                item={item}
                key={getItemClientKey(item.id)}
                onAddToRequest={addDesignFlow.addDesign}
                onDuplicate={(nextItem) => void handleDuplicateItem(nextItem)}
                onRemove={(nextItem) => setItemPendingRemoval(nextItem)}
                onUpdate={handleUpdateItem}
                onAutosaveStateChange={updateAutosaveState}
                onPersistenceHealthChange={handlePersistenceHealthChange}
                onRegisterFlush={handleRegisterFlush}
                quantityResetKey={quantityResetKeys[item.id] ?? 0}
                readOnly={!isEditable}
                standardPrintSizesSettings={standardPrintSizesSettings}
              />
            );
          })}
        </section>
      )}

      {autosaveState.status !== 'idle' ? (
        <div className={`portal-autosave-indicator is-${autosaveState.status}`} role="status">
          <span>
            {autosaveState.status === 'saving'
              ? 'Saving…'
              : autosaveState.status === 'saved'
                ? 'Saved'
                : 'Save failed'}
          </span>
          {autosaveState.status === 'failed' && autosaveState.message ? (
            <span className="portal-autosave-message">{autosaveState.message}</span>
          ) : null}
          {autosaveState.status === 'failed' && autosaveState.retry ? (
            <button
              className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon"
              onClick={() => void autosaveState.retry?.()}
              type="button"
            >
              <RefreshIcon size={14} />
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      <PortalQueueToShowModal
        isOpen={isQueueModalOpen}
        items={items}
        onClose={() => setIsQueueModalOpen(false)}
        onQueued={handleQueuedToShow}
        printRequest={printRequest}
      />

      <PortalConfirmModal
        cancelLabel="Keep design"
        confirmLabel="Remove"
        confirmVariant="danger"
        isConfirmLoading={isRemovingItem}
        isOpen={itemPendingRemoval !== null}
        onCancel={() => {
          if (!isRemovingItem) {
            const pending = itemPendingRemoval;
            setItemPendingRemoval(null);
            if (pending) {
              setQuantityResetKeys((previous) => ({
                ...previous,
                [pending.id]: (previous[pending.id] ?? 0) + 1,
              }));
            }
          }
        }}
        onConfirm={() => {
          if (itemPendingRemoval) {
            void handleRemoveItem(itemPendingRemoval);
          }
        }}
        title="Remove design?"
      >
        <p className="portal-muted portal-confirm-modal-message">
          Remove <strong>{pendingRemovalTitle}</strong> from this print request? This cannot be undone.
        </p>
      </PortalConfirmModal>

      <PortalConfirmModal
        confirmLabel={addDesignFlow.isAdding ? 'Adding…' : 'Add to request'}
        isConfirmLoading={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isConfirmOpen}
        onCancel={addDesignFlow.closeConfirm}
        onConfirm={addDesignFlow.confirmAddDesign}
        title="Add to request?"
      >
        <p className="portal-muted portal-confirm-modal-message">{addDesignFlow.confirmMessage}</p>
      </PortalConfirmModal>

      <PortalPickContinuableRequestModal
        continuableRequests={addDesignFlow.pickerContinuableRequests}
        designTitle={addDesignFlow.pendingDesign?.title}
        isAdding={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isPickerOpen}
        onClose={addDesignFlow.closePicker}
        onSelectRequest={addDesignFlow.confirmPickRequest}
      />
    </main>
  );
}
