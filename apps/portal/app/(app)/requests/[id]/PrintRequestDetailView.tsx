'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { PortalPrintRequestItemCard } from '../../../../features/print-requests/components/PortalPrintRequestItemCard';
import { PrintRequestDetailGuide } from '../../../../features/print-requests/components/PrintRequestDetailGuide';
import { usePrintRequestDetail } from '../../../../features/print-requests/hooks/usePrintRequestDetail';
import { ImagePlusIcon, LibraryIcon, RefreshIcon } from '../../../../features/shared/components/PortalIcons';

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
  const printRequestId = params.id;
  const [actionError, setActionError] = useState<string | null>(null);
  const [autosaveState, setAutosaveState] = useState<AutosaveState>({ status: 'idle' });

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
  } = usePrintRequestDetail(printRequestId);

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

      try {
        await removeItem(item.id);
      } catch (removeError) {
        setActionError(removeError instanceof Error ? removeError.message : 'Unable to remove item.');
      }
    },
    [removeItem],
  );

  if (isLoading) {
    return (
      <main className="portal-page portal-request-detail-page">
        <div className="portal-panel portal-muted">Loading print request…</div>
      </main>
    );
  }

  if (error || !printRequest) {
    return (
      <main className="portal-page portal-request-detail-page">
        <p className="portal-error" role="alert">
          {error ?? 'Print request not found.'}
        </p>
      </main>
    );
  }

  const designCountLabel = `${printRequest.itemCount} design${printRequest.itemCount === 1 ? '' : 's'}`;

  return (
    <main className="portal-page portal-request-detail-page">
      <header className="portal-page-header portal-request-detail-header">
        <div className="portal-request-detail-header-copy">
          <p className="portal-eyebrow">Print request</p>
          <div className="portal-request-detail-title-row">
            <h1>{printRequest.name}</h1>
            <div className="portal-request-detail-meta-pills">
              <span className="portal-request-detail-meta-pill">
                {getStatusLabel(printRequest.status)}
              </span>
              <span className="portal-request-detail-meta-pill">{designCountLabel}</span>
            </div>
          </div>
        </div>

        {isEditable && items.length > 0 ? (
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
                Browse design library
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
                onRemove={(nextItem) => void handleRemoveItem(nextItem)}
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
    </main>
  );
}
