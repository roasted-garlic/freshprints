'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { isCustomerUploadPrintRequestItem } from '@fresh-prints/shared/utils/printRequestItemSource';

import { useAuth } from '../../auth/context/AuthContext';
import { CatalogThumbnailPanel } from '../../catalog/components/CatalogThumbnailPanel';
import { customerUploadService } from '../../customer-uploads/services/customerUploadService';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import {
  ImageUpIcon,
  LibraryIcon,
  ShoppingBagIcon,
  TrashIcon,
  XIcon,
} from '../../shared/components/PortalIcons';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import {
  buildRequestArtworkHref,
  CATALOG_HOME_PATH,
  REQUEST_ARTWORK_PATH,
} from '../utils/catalogSelectionNavigation';
import { buildRequestDetailHref } from '../utils/portalRequestDetailReturn';

function groupKeyForItem(item: {
  id: string;
  designId?: string;
  customerUploadId?: string;
  sourceType?: 'catalog_design' | 'customer_upload';
}): string {
  if (isCustomerUploadPrintRequestItem(item) && item.customerUploadId) {
    return `upload:${item.customerUploadId}`;
  }
  if (item.designId) {
    return `design:${item.designId}`;
  }
  return `item:${item.id}`;
}

function itemCreatedAtMs(item: {
  createdAt?: { toMillis?: () => number } | null;
}): number {
  if (item.createdAt && typeof item.createdAt.toMillis === 'function') {
    return item.createdAt.toMillis();
  }
  return 0;
}

export function CurrentRequestDrawer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { firebaseUser } = useAuth();
  const {
    clearWorkingRequest,
    closeCurrentRequestDrawer,
    currentRequestAggregates,
    designSummariesById,
    isClearingWorkingRequest,
    isCurrentRequestDrawerOpen,
    patchWorkingItems,
    reloadWorkingItems,
    uploadSummariesById,
    workingItems,
    workingRequest,
  } = usePortalPrintRequests();

  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [uploadThumbUrls, setUploadThumbUrls] = useState<Record<string, string>>({});
  /** Prevents double-submit on the same row; other rows stay clickable. */
  const removingKeysRef = useRef(new Set<string>());

  const groups = useMemo(() => {
    const map = new Map<string, typeof workingItems>();
    for (const item of workingItems) {
      const key = groupKeyForItem(item);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }

    // Newest added groups first (by latest item createdAt in the group).
    return [...map.entries()].sort(([, itemsA], [, itemsB]) => {
      const newestA = Math.max(0, ...itemsA.map(itemCreatedAtMs));
      const newestB = Math.max(0, ...itemsB.map(itemCreatedAtMs));
      return newestB - newestA;
    });
  }, [workingItems]);

  useEffect(() => {
    let cancelled = false;
    async function loadUploadThumbs() {
      const next: Record<string, string> = {};
      await Promise.all(
        groups.map(async ([, items]) => {
          const first = items[0];
          if (!first || !isCustomerUploadPrintRequestItem(first) || !first.customerUploadId) {
            return;
          }
          const upload = uploadSummariesById.get(first.customerUploadId);
          const path = upload?.thumbnailStoragePath ?? upload?.previewStoragePath;
          if (!path) {
            return;
          }
          try {
            const url = await customerUploadService.getDownloadUrl(path);
            if (url) {
              next[first.customerUploadId] = url;
            }
          } catch {
            // leave missing
          }
        }),
      );
      if (!cancelled) {
        setUploadThumbUrls(next);
      }
    }
    void loadUploadThumbs();
    return () => {
      cancelled = true;
    };
  }, [groups, uploadSummariesById]);

  const handleRemoveGroup = useCallback(
    (key: string, itemIds: string[]) => {
      if (!workingRequest || !firebaseUser) {
        return;
      }
      if (removingKeysRef.current.has(key)) {
        return;
      }

      const removeIdSet = new Set(itemIds);
      removingKeysRef.current.add(key);
      setRemoveError(null);
      // Optimistic: row disappears immediately so the next trash is ready on first tap.
      patchWorkingItems((items) => items.filter((item) => !removeIdSet.has(item.id)));

      void (async () => {
        try {
          for (const itemId of itemIds) {
            await portalPrintRequestService.removePrintRequestItem({
              itemId,
              printRequestId: workingRequest.id,
              userId: firebaseUser.uid,
            });
          }
          await reloadWorkingItems({ silent: true });
        } catch (error) {
          setRemoveError(error instanceof Error ? error.message : 'Unable to remove item.');
          await reloadWorkingItems({ silent: true });
        } finally {
          removingKeysRef.current.delete(key);
        }
      })();
    },
    [firebaseUser, patchWorkingItems, reloadWorkingItems, workingRequest],
  );

  if (!isCurrentRequestDrawerOpen) {
    return null;
  }

  const { distinctDesignCount, totalPrintQuantity, attentionCount } = currentRequestAggregates;
  const isEmpty = workingItems.length === 0;
  const reviewHref = workingRequest
    ? buildRequestDetailHref(workingRequest.id, { from: 'library' })
    : '/requests?tab=working';

  const query = searchParams.toString();
  const currentLocation = `${pathname}${query ? `?${query}` : ''}`;
  const uploadReturnTo =
    pathname === REQUEST_ARTWORK_PATH || pathname.startsWith(`${REQUEST_ARTWORK_PATH}/`)
      ? CATALOG_HOME_PATH
      : currentLocation;
  const uploadHref = buildRequestArtworkHref({ returnTo: uploadReturnTo });

  return (
    <div className="current-request-drawer-root" role="presentation">
      <button
        aria-label="Close Your Stash"
        className="current-request-drawer-scrim"
        onClick={closeCurrentRequestDrawer}
        type="button"
      />
      <aside
        aria-labelledby="current-request-drawer-title"
        className={`current-request-drawer${isEmpty ? ' is-empty' : ''}`}
        role="dialog"
      >
        <header className="current-request-drawer-header">
          <div className="current-request-drawer-heading">
            <h2 id="current-request-drawer-title">Your Stash</h2>
            <p className="current-request-drawer-subtitle">Current Request</p>
            <div className="current-request-drawer-summary-row">
              <p className="current-request-drawer-summary">
                {distinctDesignCount} {distinctDesignCount === 1 ? 'design' : 'designs'} ·{' '}
                {totalPrintQuantity} {totalPrintQuantity === 1 ? 'print' : 'prints'}
                {attentionCount > 0
                  ? ` · ${attentionCount} ${attentionCount === 1 ? 'item needs' : 'items need'} attention`
                  : ''}
              </p>
              {workingRequest && !isEmpty ? (
                <button
                  className="current-request-drawer-clear"
                  disabled={isClearingWorkingRequest}
                  onClick={() => {
                    setClearError(null);
                    setIsClearConfirmOpen(true);
                  }}
                  type="button"
                >
                  {isClearingWorkingRequest ? 'Clearing…' : 'Clear request'}
                </button>
              ) : null}
            </div>
          </div>
          <button
            aria-label="Close Your Stash"
            className="current-request-drawer-close"
            onClick={closeCurrentRequestDrawer}
            type="button"
          >
            <XIcon size={22} />
          </button>
        </header>

        {removeError ? (
          <p className="portal-error" role="alert">
            {removeError}
          </p>
        ) : null}

        <div className="current-request-drawer-body">
          {isEmpty ? (
            <div className="current-request-drawer-empty">
              <div aria-hidden className="current-request-drawer-empty-icon">
                <ShoppingBagIcon size={28} />
              </div>
              <p className="current-request-drawer-empty-title">Your Stash is empty</p>
              <p className="current-request-drawer-empty-copy">
                Add designs from the catalog, or upload your own artwork to print.
              </p>
            </div>
          ) : (
            <ul className="current-request-drawer-groups">
              {groups.map(([key, items]) => {
                const first = items[0]!;
                const upload =
                  isCustomerUploadPrintRequestItem(first) && first.customerUploadId
                    ? uploadSummariesById.get(first.customerUploadId)
                    : null;
                const design =
                  first.designId && !isCustomerUploadPrintRequestItem(first)
                    ? designSummariesById.get(first.designId)
                    : null;
                const title =
                  design?.title ??
                  upload?.originalFilename ??
                  first.titleSnapshot ??
                  'Untitled artwork';
                const catalogPath = design?.thumbnailPath ?? design?.previewPath;
                const uploadUrl =
                  first.customerUploadId && uploadThumbUrls[first.customerUploadId]
                    ? uploadThumbUrls[first.customerUploadId]
                    : null;

                const isUpload = isCustomerUploadPrintRequestItem(first);
                const sourceLabel = isUpload ? 'Uploaded' : 'Library';

                return (
                  <li className="current-request-drawer-group" key={key}>
                    <div className="current-request-drawer-row">
                      {catalogPath ? (
                        <CatalogThumbnailPanel
                          alt=""
                          catalogPath={catalogPath}
                          className="current-request-drawer-thumb"
                          contentVersion={design?.updatedAtMs}
                          decorative
                          fallbackLabel="Art"
                          loadingLabel=""
                        />
                      ) : uploadUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
                        <img alt="" className="current-request-drawer-thumb-img" src={uploadUrl} />
                      ) : (
                        <div aria-hidden className="current-request-drawer-thumb" />
                      )}
                      <div className="current-request-drawer-main">
                        <div className="current-request-drawer-copy">
                          <p className="current-request-drawer-title" title={title}>
                            {title}
                          </p>
                          <span
                            className={`current-request-drawer-source-pill${
                              isUpload
                                ? ' current-request-drawer-source-pill-upload'
                                : ' current-request-drawer-source-pill-library'
                            }`}
                          >
                            {sourceLabel}
                          </span>
                          <p className="current-request-drawer-meta-line">
                            {items.length === 1 ? '1 Size' : `${items.length} Sizes`}
                            {' · '}
                            Qty {items.reduce((sum, item) => sum + item.quantity, 0)}
                          </p>
                        </div>
                        <button
                          aria-label={`Remove ${title} from Your Stash`}
                          className="current-request-drawer-trash"
                          onClick={() => handleRemoveGroup(key, items.map((item) => item.id))}
                          type="button"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className={`current-request-drawer-footer${isEmpty ? ' is-empty' : ''}`}>
          {isEmpty ? (
            <div className="current-request-drawer-empty-actions">
              <Link
                className="portal-button portal-button-primary portal-button-leading-icon"
                href={CATALOG_HOME_PATH}
                onClick={closeCurrentRequestDrawer}
              >
                <LibraryIcon />
                Browse designs
              </Link>
              <Link
                className="portal-button portal-button-secondary portal-button-leading-icon"
                href={uploadHref}
                onClick={closeCurrentRequestDrawer}
              >
                <ImageUpIcon />
                Upload Designs
              </Link>
            </div>
          ) : (
            <Link
              className="portal-button portal-button-primary"
              href={reviewHref}
              onClick={closeCurrentRequestDrawer}
            >
              Review Request
            </Link>
          )}
        </footer>
      </aside>

      <PortalConfirmModal
        cancelLabel="Keep request"
        confirmLabel="Clear request"
        confirmVariant="danger"
        isConfirmLoading={isClearingWorkingRequest}
        isOpen={isClearConfirmOpen}
        onCancel={() => {
          if (!isClearingWorkingRequest) {
            setIsClearConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          void (async () => {
            try {
              setClearError(null);
              await clearWorkingRequest();
              setIsClearConfirmOpen(false);
            } catch (error) {
              setClearError(
                error instanceof Error ? error.message : 'Unable to clear Your Stash.',
              );
            }
          })();
        }}
        title="Clear Your Stash?"
      >
        <p className="portal-muted portal-confirm-modal-message">
          This removes all designs from Your Stash so you can start fresh. You can add designs again
          anytime.
        </p>
        {clearError ? (
          <p className="portal-error" role="alert">
            {clearError}
          </p>
        ) : null}
      </PortalConfirmModal>
    </div>
  );
}
