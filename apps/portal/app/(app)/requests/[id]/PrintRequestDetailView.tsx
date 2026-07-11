'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { derivePrintRequestListTab } from '@fresh-prints/shared/utils/printRequestListGrouping';
import {
  getPortalPrintRequestListTabLabel,
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import { resolvePortalPrintProgressStage } from '@fresh-prints/shared/utils/portalPrintProgressStage';
import { sumPrintRequestItemQuantities } from '@fresh-prints/shared/utils/portalShowQueueCapacity';

import { PortalPrintRequestItemCard } from '../../../../features/print-requests/components/PortalPrintRequestItemCard';
import { PortalPrintRequestProgressPanel } from '../../../../features/print-requests/components/PortalPrintRequestProgressPanel';
import { PortalQueueToShowModal } from '../../../../features/print-requests/components/PortalQueueToShowModal';
import { PrintRequestDetailGuide } from '../../../../features/print-requests/components/PrintRequestDetailGuide';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { usePortalPrintRequests } from '../../../../features/print-requests/context/PortalPrintRequestContext';
import { usePrintRequestDetail } from '../../../../features/print-requests/hooks/usePrintRequestDetail';
import { usePortalShowPrintProgress } from '../../../../features/print-requests/hooks/usePortalShowPrintProgress';
import { portalPrintRequestService } from '../../../../features/print-requests/services/portalPrintRequestService';
import { PortalConfirmModal } from '../../../../features/shared/components/PortalConfirmModal';
import { ArrowLeftIcon, ImagePlusIcon, LibraryIcon, RefreshIcon } from '../../../../features/shared/components/PortalIcons';

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

interface AutosaveState {
  status: AutosaveStatus;
  message?: string;
  retry?: () => Promise<void>;
}

function buildRequestsListHref(tab: PortalPrintRequestListTab): string {
  return `/requests?tab=${tab}`;
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
  const { refreshCustomer } = useAuth();
  const { allocationTotalsByRequestId, refreshRequests, summariesByRequestId } = usePortalPrintRequests();
  const printRequestId = params.id;
  const [actionError, setActionError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({ status: 'idle' });
  const [hasAllocations, setHasAllocations] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [itemPendingRemoval, setItemPendingRemoval] = useState<PrintRequestItem | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);

  const {
    printRequest,
    items,
    designSummaries,
    isLoading,
    error,
    isEditable,
    updateItem,
    duplicateItem,
    removeItem,
    reload,
  } = usePrintRequestDetail(printRequestId);

  const loadAllocationState = useCallback(async () => {
    if (!printRequestId) {
      setHasAllocations(false);
      return;
    }

    try {
      const allocations = await portalPrintRequestService.listShowAllocationsForPrintRequests([
        printRequestId,
      ]);
      const activeAllocations = allocations.filter((allocation) => allocation.status !== 'canceled');
      setHasAllocations(activeAllocations.length > 0);
    } catch {
      setHasAllocations(false);
    }
  }, [printRequestId]);

  useEffect(() => {
    void loadAllocationState();
  }, [loadAllocationState, printRequest?.status, printRequest?.itemCount]);

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
      await updateItem(item.id, input);
    },
    [updateItem],
  );

  const handleDuplicateItem = useCallback(
    async (item: PrintRequestItem) => {
      setActionError(null);

      try {
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
    itemPendingRemoval && designSummaries.get(itemPendingRemoval.designId)?.title
      ? designSummaries.get(itemPendingRemoval.designId)?.title
      : 'this design';

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

  const backHref = buildRequestsListHref(listTab);
  const backLabel = `Back to ${getPortalPrintRequestListTabLabel(listTab)}`;
  const progressStage = resolvePortalPrintProgressStage(listTab);
  const printProgress = usePortalShowPrintProgress(printRequestId, progressStage !== null);

  const handleQueuedToShow = useCallback(async () => {
    await Promise.all([reload(), refreshRequests({ silent: true }), refreshCustomer()]);
    await loadAllocationState();
    router.push('/requests?tab=queued');
  }, [loadAllocationState, refreshCustomer, refreshRequests, reload, router]);

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
  const canQueueToShow = isEditable && items.length > 0 && !hasAllocations;

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
              <span className="portal-request-detail-meta-pill">
                {getStatusLabel(printRequest.status)}
              </span>
              <span className="portal-request-detail-meta-pill">{designCountLabel}</span>
              <span className="portal-request-detail-meta-pill">{printCountLabel}</span>
            </div>
          </div>
        </div>

        {canQueueToShow ? (
          <div className="portal-request-detail-header-actions">
            <button
              className="portal-button portal-button-secondary portal-button-leading-icon portal-request-detail-add-button"
              onClick={() =>
                router.push(`/catalog?mode=request-selection&requestId=${printRequest.id}`)
              }
              type="button"
            >
              <ImagePlusIcon />
              Add designs
            </button>
            <button
              className="portal-button portal-button-primary"
              onClick={() => setIsQueueModalOpen(true)}
              type="button"
            >
              Add to show
            </button>
          </div>
        ) : isEditable && items.length > 0 ? (
          <button
            className="portal-button portal-button-primary portal-button-leading-icon portal-request-detail-add-button"
            onClick={() =>
              router.push(`/catalog?mode=request-selection&requestId=${printRequest.id}`)
            }
            type="button"
          >
            <ImagePlusIcon />
            Add designs
          </button>
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
              ? 'Browse the design library to add designs with quantities and print sizes.'
              : 'This request has no designs.'}
          </p>
          {isEditable ? (
            <div className="portal-requests-empty-actions">
              <button
                className="portal-button portal-button-primary portal-button-leading-icon"
                onClick={() =>
                  router.push(`/catalog?mode=request-selection&requestId=${printRequest.id}`)
                }
                type="button"
              >
                <LibraryIcon />
                Add designs
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <section aria-label="Request items" className="portal-request-item-editor-grid">
          {items.map((item) => {
            const design = designSummaries.get(item.designId);

            return (
              <PortalPrintRequestItemCard
                design={
                  design
                    ? {
                        id: design.id,
                        title: design.title,
                        width: design.width,
                        height: design.height,
                        thumbnailPath: design.thumbnailPath,
                        previewPath: design.previewPath,
                        printWidthInches: design.printWidthInches,
                        printHeightInches: design.printHeightInches,
                      }
                    : null
                }
                item={item}
                key={item.id}
                onDuplicate={(nextItem) => void handleDuplicateItem(nextItem)}
                onRemove={(nextItem) => setItemPendingRemoval(nextItem)}
                onUpdate={handleUpdateItem}
                onAutosaveStateChange={updateAutosaveState}
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
            setItemPendingRemoval(null);
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
    </main>
  );
}
