'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { derivePrintRequestListTab } from '@fresh-prints/shared/utils/printRequestListGrouping';
import {
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import { resolvePortalPrintProgressStage } from '@fresh-prints/shared/utils/portalPrintProgressStage';
import { sumPrintRequestItemQuantities } from '@fresh-prints/shared/utils/portalShowQueueCapacity';
import {
  sumAllocatedQuantityByItemId,
  sumRemainingUnallocatedQuantity,
} from '@fresh-prints/shared/utils/portalShowQueueFit';
import { PortalPrintRequestItemCard } from '../../../../features/print-requests/components/PortalPrintRequestItemCard';
import { PortalPrintRequestProgressPanel } from '../../../../features/print-requests/components/PortalPrintRequestProgressPanel';
import { PortalQueueToShowModal } from '../../../../features/print-requests/components/PortalQueueToShowModal';
import { PrintRequestDetailGuide } from '../../../../features/print-requests/components/PrintRequestDetailGuide';
import { catalogService } from '../../../../features/catalog/services/catalogService';
import type { CatalogDesign } from '../../../../features/catalog/types/catalog.types';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { usePortalPrintRequests } from '../../../../features/print-requests/context/PortalPrintRequestContext';
import { useAddDesignToRequestFlow } from '../../../../features/print-requests/hooks/useAddDesignToRequestFlow';
import { usePrintRequestDetail } from '../../../../features/print-requests/hooks/usePrintRequestDetail';
import { usePortalShowPrintProgress } from '../../../../features/print-requests/hooks/usePortalShowPrintProgress';
import {
  portalPrintRequestService,
  printRequestItemHasCustomerUpload,
} from '../../../../features/print-requests/services/portalPrintRequestService';
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
  const { refreshCustomer } = useAuth();
  const {
    allocationTotalsByRequestId,
    closeCurrentRequestDrawer,
    continuableRequests,
    createPrintRequest,
    refreshRequests,
    reloadWorkingItems,
    resetWorkingCart,
    summariesByRequestId,
  } = usePortalPrintRequests();
  const printRequestId = params.id;
  const [actionError, setActionError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({ status: 'idle' });
  const [unallocatedQuantity, setUnallocatedQuantity] = useState(0);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [itemPendingRemoval, setItemPendingRemoval] = useState<PrintRequestItem | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);
  /** Bumped per item id when remove confirm is cancelled so qty-0 input restores. */
  const [quantityResetKeys, setQuantityResetKeys] = useState<Record<string, number>>({});
  const [catalogReuseByDesignId, setCatalogReuseByDesignId] = useState<Map<string, CatalogDesign>>(
    () => new Map(),
  );
  const [catalogReuseReady, setCatalogReuseReady] = useState(false);

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
    reload,
  } = usePrintRequestDetail(printRequestId);

  const addDesignFlow = useAddDesignToRequestFlow({
    continuableRequests,
    createPrintRequest,
    refreshRequests,
    reloadWorkingItems,
  });

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

  const loadAllocationState = useCallback(async () => {
    if (!printRequestId) {
      setUnallocatedQuantity(0);
      return;
    }

    try {
      const [allocations, requestItems] = await Promise.all([
        portalPrintRequestService.listShowAllocationsForPrintRequests([printRequestId]),
        portalPrintRequestService.listPrintRequestItems(printRequestId),
      ]);
      const allocatedByItemId = sumAllocatedQuantityByItemId(
        allocations.map((allocation) => ({
          printRequestItemId: allocation.printRequestItemId,
          allocatedQuantity: allocation.allocatedQuantity,
          status: allocation.status,
        })),
      );
      setUnallocatedQuantity(sumRemainingUnallocatedQuantity(requestItems, allocatedByItemId));
    } catch {
      setUnallocatedQuantity(sumPrintRequestItemQuantities(items));
    }
  }, [items, printRequestId]);

  useEffect(() => {
    void loadAllocationState();
  }, [loadAllocationState, printRequest?.status, printRequest?.itemCount, items]);

  const catalogDesignIdsKey = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((item) => item.designId?.trim())
            .filter((designId): designId is string => Boolean(designId)),
        ),
      ]
        .sort()
        .join('|'),
    [items],
  );

  useEffect(() => {
    if (!catalogDesignIdsKey || isEditable) {
      setCatalogReuseByDesignId(new Map());
      setCatalogReuseReady(true);
      return;
    }

    let cancelled = false;
    setCatalogReuseReady(false);

    void (async () => {
      try {
        const designIds = catalogDesignIdsKey.split('|').filter(Boolean);
        const designs = await catalogService.getReadyDesignsByIds(designIds);
        if (cancelled) {
          return;
        }
        setCatalogReuseByDesignId(new Map(designs.map((design) => [design.id, design])));
      } catch {
        if (!cancelled) {
          setCatalogReuseByDesignId(new Map());
        }
      } finally {
        if (!cancelled) {
          setCatalogReuseReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogDesignIdsKey, isEditable]);

  const updateAutosaveState = useCallback(
    (status: Exclude<AutosaveStatus, 'idle'>, message?: string, retry?: () => Promise<void>) => {
      setAutosaveState({ status, message, retry });
    },
    [],
  );

  useEffect(() => {
    setAutosaveState({ status: 'idle' });
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
      input: { quantity: number; printWidthInches: number; printHeightInches: number },
    ) => {
      setActionError(null);
      // updateItem patches workingItems + Cap A optimistically; silent reload reconciles.
      await updateItem(item.id, input);
      void reloadWorkingItems({ silent: true });
    },
    [reloadWorkingItems, updateItem],
  );

  const handleDuplicateItem = useCallback(
    async (item: PrintRequestItem) => {
      setActionError(null);

      try {
        await duplicateItem(item.id);
        void reloadWorkingItems({ silent: true });
      } catch (duplicateError) {
        setActionError(
          duplicateError instanceof Error ? duplicateError.message : 'Unable to duplicate item.',
        );
      }
    },
    [duplicateItem, reloadWorkingItems],
  );

  const handleRemoveItem = useCallback(
    async (item: PrintRequestItem) => {
      setActionError(null);
      setIsRemovingItem(true);

      try {
        await removeItem(item.id);
        setItemPendingRemoval(null);
        void reloadWorkingItems({ silent: true });
      } catch (removeError) {
        setActionError(removeError instanceof Error ? removeError.message : 'Unable to remove item.');
      } finally {
        setIsRemovingItem(false);
      }
    },
    [reloadWorkingItems, removeItem],
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
  const progressStage = resolvePortalPrintProgressStage(listTab);
  const printProgress = usePortalShowPrintProgress(printRequestId, progressStage !== null);
  const hasAttachedDesigns = items.length > 0;

  const handleQueuedToShow = useCallback(async () => {
      // Clear Stash immediately — list reload can otherwise re-hydrate the just-queued request.
      resetWorkingCart();
      closeCurrentRequestDrawer();

      await Promise.all([
        reload({ silent: true }),
        refreshRequests({ silent: true }),
        refreshCustomer(),
      ]);
      await loadAllocationState();
    },
    [
      closeCurrentRequestDrawer,
      loadAllocationState,
      refreshCustomer,
      refreshRequests,
      reload,
      resetWorkingCart,
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
  const canQueueToShow = isEditable && items.length > 0 && unallocatedQuantity > 0;

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
                  {getStatusLabel(printRequest.status)}
                </span>
              ) : null}
              <span className="portal-request-detail-meta-pill">{designCountLabel}</span>
              <span className="portal-request-detail-meta-pill">{printCountLabel}</span>
            </div>
          </div>
        </div>

        {canQueueToShow ? (
          <div className="portal-request-detail-header-actions">
            <Link
              className="portal-button portal-button-secondary portal-button-leading-icon portal-request-detail-add-button"
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
              className="portal-button portal-button-secondary portal-button-leading-icon portal-request-detail-add-button"
              href={buildCatalogLibraryHref()}
            >
              <LibraryIcon />
              Browse Design Library
            </Link>
            <button
              className="portal-button portal-button-primary portal-button-leading-icon"
              onClick={() => setIsQueueModalOpen(true)}
              type="button"
            >
              <CalendarPlusIcon />
              Add Request to Show
            </button>
          </div>
        ) : isEditable && hasAttachedDesigns ? (
          <div className="portal-request-detail-header-actions">
            <Link
              className="portal-button portal-button-secondary portal-button-leading-icon portal-request-detail-add-button"
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
              className="portal-button portal-button-primary portal-button-leading-icon portal-request-detail-add-button"
              href={buildCatalogLibraryHref()}
            >
              <LibraryIcon />
              Browse Design Library
            </Link>
          </div>
        ) : null}
      </header>

      {progressStage ? (
        <PortalPrintRequestProgressPanel
          activeStage={progressStage}
          formattedElapsed={printProgress.formattedElapsed}
          isLive={printProgress.isRunning}
          isLoading={printProgress.isLoading}
          isPaused={printProgress.isPaused}
          showElapsed={
            progressStage === 'done'
              ? Boolean(printProgress.primaryShow) || printProgress.showElapsed
              : printProgress.showElapsed
          }
          waitingLabel={printProgress.statusHeadline}
        />
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
            const catalogDesignId = item.designId?.trim() ?? '';
            const catalogReuseDesign =
              !isEditable && catalogReuseReady && catalogDesignId
                ? (catalogReuseByDesignId.get(catalogDesignId) ?? null)
                : undefined;
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
                quantityResetKey={quantityResetKeys[item.id] ?? 0}
                readOnly={!isEditable}
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
        continuableRequests={continuableRequests}
        designTitle={addDesignFlow.pendingDesign?.title}
        isAdding={addDesignFlow.isAdding}
        isOpen={addDesignFlow.isPickerOpen}
        onClose={addDesignFlow.closePicker}
        onSelectRequest={addDesignFlow.confirmPickRequest}
      />
    </main>
  );
}
